# typescript-path-fix

Fix path resolution when compiling typescript.

# Why you need this module?

As you know, Typescript introduced the flexible way of resolving paths using a mapping inside "tsconfig.json". Those paths are prefixed with symbol "@".
Unfortunately, those paths do not work when compiling typescript to JavaScript.
This package resolves this issue by replacing them with relative paths and setting the files extensions.
You need to execute this package _after_ compiling typescript in your pipeline.

---

Typescript do not support to import or export files with extension ".mjs". Because of this restriction, you need to execute this package on the compiled code.
Otherwise, you can execute this package before or after the typescript compilation process.

---

```typescript
//* Convert flexible typescript path like:
import { abc } from '@src/some/file';
// And
const myLib = await import('@lib/somelib');
// And
export * from '@src/some/file';

//* Into supported javascript relative paths:
import { abc } from '../some/file.js';
// OR
import { abc } from '../some/file/index.js';

const myLib = await import('../lib/somelib/index.js');
export * from './some/file.js';

// OR any extension: .mjs or .cjs
```

# Using with Gulp

Gulp is the wildly used task runner for NodeJS.

## Using old CommonJs

```javascript
const { src, dest }= require('gulp');
const { Converter }= require('typescript-path-fix');
const GulpTypescript = require('gulp-typescript');

// Create your compiling logic
const TsProject = GulpTypescript.createProject('tsconfig.json');

// Create Converter instance
const tsPathFix = new Converter('tsconfig.json');

/** Your compiler function */
export.default= function(){
	return src('src/**/*.ts')
		// COMPILE TS TO JS
		.pipe(TsProject())
		// EXEC CONVERTER
		.pipe(tsPathFix.gulp())
		.pipe(dest('dist'));
};
```

## Using typescript or Js modules

```typescript
import Gulp from 'gulp';
import GulpTypescript from 'gulp-typescript';
import { Converter } from 'typescript-path-fix';

// -> because Gulp is a commonjs module
const { src, dest } = Gulp;

//* Init your converter
const tsPathFix = new Converter('tsconfig.json');

//* Init your typescript compiler
const TsProject = GulpTypescript.createProject('tsconfig.json');

/** Your compiler function */
export default function () {
	return (
		src('src/**/*.ts')
			// COMPILE TS TO JS
			.pipe(TsProject())
			// EXEC CONVERTER
			.pipe(tsPathFix.gulp())
			.pipe(dest('dist'))
	);
}
```

## Make your app to support both old CommonJs and new ESNEXT

```typescript
import Gulp from 'gulp';
import GulpTypescript from 'gulp-typescript';
import { Converter } from 'typescript-path-fix';

// -> because Gulp is a commonjs module
const { src, dest } = Gulp;

//* Init your converter
const tsPathFix = new Converter('tsconfig.json');

//* Init typescript compiler for CommonJs
const TsProjectCommonJs = GulpTypescript.createProject('tsconfig.json');
//* Init typescript compiler for ESNEXT
const TsProjectEsnext = GulpTypescript.createProject('tsconfig.json', {
	target: 'ESNext',
	module: 'ESNext'
});

/** Your compiler function */
export function compileCommonJS() {
	return (
		src('src/**/*.ts')
			// COMPILE TS TO JS
			.pipe(TsProjectCommonJs())
			// EXEC CONVERTER
			.pipe(tsPathFix.gulp())
			.pipe(dest('dist/commonjs'))
	);
}

export function compileEsnext() {
	return (
		src('src/**/*.ts')
			// COMPILE TS TO JS
			.pipe(TsProjectEsnext())
			// EXEC CONVERTER: Set target extension to ".mjs"
			.pipe(tsPathFix.gulp('.mjs'))
			.pipe(dest('dist/esnext'))
	);
}
```

# Compile using an other task runner or standalone:

In this case, write your own adapter for your task runner or use it as standalone as follow:

```typescript
import { Converter } from 'typescript-path-fix';

//* Start by creating the converter object
const tsPathFix = new Converter('tsconfig.json');

//* Compile your file
var fileContent: string= tsPathFix.convert(
	/**
	 * Path to target source file
	 */
	filePath: string,
	/**
	 * @Optional file content. If missing, the module will load it Synchronously
	 */
	contents?: Buffer | string,
	/**
	 * @Optional Destination file extension,
	 * @default ".js"
	 */
	targetExt: '.js' | '.mjs' | '.cjs' = '.js'
	);
```

# Author

_khalid RAFIK_
Senior full Stack Web, Mobile, Data & Security Engineer
khalid.rfk@gmail.com
