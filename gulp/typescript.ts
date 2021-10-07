/**
 * Compile Typescript files
 */
import Gulp from 'gulp';
import GulpTypescript from 'gulp-typescript';
import SrcMap from 'gulp-sourcemaps';
import ts from 'typescript';
import GulpRename from 'gulp-rename';
import { minifyJs } from './minifyjs';

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
	var glp: NodeJS.ReadWriteStream = src('src/**/*.ts', {
		nodir: true,
		since: lastRun(typescriptCompile)
	})
		.pipe(SrcMap.init())
		.pipe(TsProject())
		.pipe(GulpRename({ extname: '.mjs' }));
	if (isProd) glp = glp.pipe(minifyJs());
	return glp.pipe(SrcMap.write('.'))
		.pipe(dest('dist/module'));
}

export function CompileTsCommonJs() {
	var glp: NodeJS.ReadWriteStream = src('src/**/*.ts', {
		nodir: true,
		since: lastRun(typescriptCompile)
	})
		.pipe(SrcMap.init())
		.pipe(TsProjectCommonjs());
	if (isProd) glp = glp.pipe(minifyJs());
	return glp.pipe(SrcMap.write('.'))
		.pipe(dest('dist/commonjs'));
}
