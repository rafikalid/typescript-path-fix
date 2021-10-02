import { readFileSync, statSync } from 'fs';
import ts from 'typescript';
import Through from 'through2';
import Vinyl from 'vinyl';
import { resolve, dirname, relative, sep as PathSep } from 'path';
const isWindows = PathSep === '\\';

export class Converter {
	#tsConfig: ts.CompilerOptions;
	#paths: Map<string, string> = new Map();
	#targetExt: TargetExtension;
	/** Target extension */
	/**
	 * @param tsConfig - Compiler options or tsconfig filepath
	 */
	constructor(
		tsConfig: ts.CompilerOptions | string,
		targetExt: TargetExtension = '.js'
	) {
		// Resolve tsConfig
		if (typeof tsConfig === 'string') {
			tsConfig = resolve(tsConfig);
			tsConfig = _parseTsConfig(tsConfig);
		}
		this.#tsConfig = tsConfig;
		this.#targetExt = targetExt;
		// Map paths
		const baseDir = resolve(
			typeof tsConfig.baseUrl === 'string' ? tsConfig.baseUrl : '.'
		);
		const paths = tsConfig.paths ?? {};
		var pathMap = this.#paths;
		for (let k in paths) {
			var v = paths[k];
			if (v.length != 1)
				throw new Error(
					`Expected path to have only one entry, found ${v.length} at ${k}`
				);
			// remove trailing slash
			k = k.replace(/\/\*?$/, '');
			pathMap.set(k, resolve(baseDir, v[0].replace(/\/\*?$/, '')));
		}
	}

	/** Convert file */
	convert(
		filePath: string,
		contents?: Buffer | string,
		targetExt?: TargetExtension
	): string {
		return _resolvePaths(
			this.#tsConfig,
			this.#paths,
			targetExt ?? this.#targetExt,
			filePath,
			contents
		);
	}

	/** gulp Adapter */
	gulp(targetExt?: TargetExtension) {
		targetExt ??= this.#targetExt;
		return Through.obj(
			(file: Vinyl, _: any, cb: Through.TransformCallback) => {
				let ext = file.extname;
				if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx') {
					// generate model
					if (file.isStream())
						cb(
							new Error(
								`Streams are not supported. Received file: ${file.basename}`
							)
						);
					else {
						let content = _resolvePaths(
							this.#tsConfig,
							this.#paths,
							targetExt!,
							file.path,
							file.contents as Buffer | undefined
						);
						file = new Vinyl({
							path: file.path,
							base: file.base,
							cwd: file.cwd,
							contents: Buffer.from(content)
						});
					}
				}
				cb(null, file);
			}
		);
	}
}

/** Target extensions */
export type TargetExtension = '.js' | '.mjs' | '.cjs';

/** Resolve paths */
function _resolvePaths(
	compilerOptions: ts.CompilerOptions,
	paths: Map<string, string>,
	targetExt: TargetExtension,
	filePath: string,
	content?: Buffer | string
) {
	// Resolve content
	if (content == null) content = readFileSync(filePath, 'utf-8');
	else if (typeof content === 'string') {
	} else content = content.toString('utf-8');
	// Create AST
	var srcFile = ts.createSourceFile(
		filePath,
		content,
		compilerOptions.target ?? ts.ScriptTarget.Latest,
		true
	);
	const _dirname = dirname(filePath);
	const f = ts.factory;
	const replacerRegex = /^(@[^\/\\'"`]+)/;
	srcFile = ts.transform(srcFile, [_trans]).transformed[0] as ts.SourceFile;
	// return text
	return ts.createPrinter().printFile(srcFile);

	//* Transformer
	function _trans(ctx: ts.TransformationContext) {
		return _visitor;
		function _visitor(node: ts.Node): ts.Node {
			if (
				ts.isImportDeclaration(node) &&
				!node.importClause?.isTypeOnly
			) {
				//* Import declaration
				return f.updateImportDeclaration(
					node,
					node.decorators,
					node.modifiers,
					node.importClause,
					f.createStringLiteral(
						_resolvePath(node.moduleSpecifier.getText())
					)
				);
			} else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
				//* Export declaration
				return f.updateExportDeclaration(
					node,
					node.decorators,
					node.modifiers,
					node.isTypeOnly,
					node.exportClause,
					f.createStringLiteral(
						_resolvePath(node.moduleSpecifier.getText())
					)
				);
			} else if (
				ts.isCallExpression(node) &&
				node.expression.kind === ts.SyntaxKind.ImportKeyword
			) {
				//* Dynamic import
				if (node.arguments.length !== 1)
					throw new Error(
						`Dynamic import must have one specifier as an argument at ${filePath}: ${node.getText()}`
					);
				var expr: ts.Expression = node.arguments[0];
				if (ts.isStringLiteral(expr)) {
					expr = f.createStringLiteral(
						_resolvePath(node.arguments[0].getText())
					);
				} else {
					expr = ts.visitEachChild<ts.Expression>(
						expr,
						function (n: ts.Node) {
							if (ts.isStringLiteral(n))
								n = f.createStringLiteral(
									_resolvePath(n.getText())
								);
							return n;
						},
						ctx
					);
				}
				return f.updateCallExpression(
					node,
					node.expression,
					node.typeArguments,
					[expr]
				);
			}
			return ts.visitEachChild(node, _visitor, ctx);
		}
	}
	/** Resolve path */
	function _resolvePath(path: string) {
		// Remove quotes, parsing using JSON.parse fails on simple quoted strings
		//TODO find better solution to parse string
		path = path.slice(1, -1);
		// replace @specifier
		let startsWithAt;
		if ((startsWithAt = path.charAt(0) === '@') || path.charAt(0) === '.') {
			// get absolute path
			if (startsWithAt) path = path.replace(replacerRegex, _replaceCb);
			else path = resolve(_dirname, path);
			// check file exists
			path = _resolveFilePath(path);
			// create relative path to current file
			path = relative(_dirname, path);
			// Replace windows antislashes
			if (isWindows) path = path.replace(/\\/g, '/');
			// Add prefix "./"
			if (path.charAt(0) === '/') path = '.' + path;
			else if (path.charAt(0) !== '.') path = './' + path;
		}
		return path;
	}
	// Path replacer
	function _replaceCb(txt: string, k: string) {
		return paths.get(k) ?? txt;
	}
	// Resolve file path
	function _resolveFilePath(path: string) {
		// Check if directory
		try {
			// If isnt directory, we will not change it's extension
			if (statSync(path).isDirectory())
				path = resolve(path, 'index' + targetExt);
		} catch (err) {
			try {
				if (statSync(path + '.ts').isFile()) path += targetExt;
			} catch (e) {
				// try {
				// 	if (
				// 		-!path.endsWith('.js') &&
				// 		statSync(path + '.js').isFile()
				// 	)
				// 		path += '.js';
				// } catch (e) {
				console.error(err);
				// }
			}
		}
		return path;
	}
}

/** Parse tsConfig */
function _parseTsConfig(tsConfigPath: string) {
	//* Parse tsConfig
	var tsP = ts.parseConfigFileTextToJson(
		tsConfigPath,
		readFileSync(tsConfigPath, 'utf-8')
	);
	if (tsP.error)
		throw new Error(
			'Config file parse fails:' + tsP.error.messageText.toString()
		);
	var tsP2 = ts.convertCompilerOptionsFromJson(
		tsP.config.compilerOptions,
		process.cwd(),
		tsConfigPath
	);
	if (tsP2.errors?.length)
		throw new Error(
			'Config file parse fails:' +
			tsP2.errors.map(e => e.messageText.toString())
		);
	return tsP2.options;
}
