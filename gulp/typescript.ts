/**
 * Compile Typescript files
 */
import Gulp from 'gulp';
import GulpTypescript from 'gulp-typescript';
import SrcMap from 'gulp-sourcemaps';
import ts from 'typescript';
import GulpRename from 'gulp-rename';

const { src, dest, lastRun } = Gulp;

// import {transform} from 'ts-transform-import-path-rewrite'

const isProd = process.argv.includes('--prod');

const TsProject = GulpTypescript.createProject('tsconfig.json', {
	removeComments: isProd,
	pretty: !isProd,
	target: 'ESNext',
	module: 'ESNext'
});

const TsProjectCommonjs = GulpTypescript.createProject('tsconfig.json', {
	removeComments: isProd,
	pretty: !isProd,
	target: 'ES2015',
	module: 'CommonJS'
});

// import babel from 'gulp-babel';

export function typescriptCompile() {
	return src('src/**/*.ts', {
		nodir: true,
		since: lastRun(typescriptCompile)
	})
		.pipe(SrcMap.init())
		.pipe(TsProject())
		.pipe(GulpRename({ extname: '.mjs' }))
		.pipe(SrcMap.write('.'))
		.pipe(dest('dist/module'));
}

export function CompileTsCommonJs() {
	return src('src/**/*.ts', {
		nodir: true,
		since: lastRun(typescriptCompile)
	})
		.pipe(SrcMap.init())
		.pipe(TsProjectCommonjs())
		.pipe(SrcMap.write('.'))
		.pipe(dest('dist/commonjs'));
}
