#!/usr/bin/env node --experimental-modules

const vm = require('vm');
const fs = require('fs');
const path = require('path');
const mod = require('module');
const commander = require('commander');
const package = require('../package.json');

import('../lib')
	.then(({parse, compile, compileToAST, tokenize}) => {
		commander
			.version(package.version, '-v, --version')
			.option('-e, --execute', 'Execute defscript file')
			.option('-a, --ast <ast>', 'Output "JS" or "DFS" AST', /^(js|dfs)$/i)
			.option('-t, --tokenize', 'Tokenize file with rewriter')
			.option('-T, --tokenize-raw', 'Tokenize file without rewriter')
			.action((file, opts) => {

				const getSource = () => {
					const location = path.join(process.cwd(), file);
					const source = fs.readFileSync(location, 'utf8');

					return source;
				}

				if (opts.execute) {
					const source = getSource();
					const output = compile(source);
					const fn = vm.runInThisContext(mod.wrap(output));
					const module = {exports: {}};
					const filename = path.join(process.cwd(), file);
					const dirname = path.dirname(filename);
					function injectedRequire(dest) {
						return require(path.join(dirname, dest));
					}

					fn(module.exports, injectedRequire, module, filename, dirname);

					return;
				}

				if (opts.ast) {
					if (opts.ast.toLowerCase() === 'dfs') {
						const ast = parse(getSource());

						console.log(JSON.stringify(ast, null, 2));
						return;
					}

					if (opts.ast.toLowerCase() === 'js') {
						const ast = compileToAST(getSource());

						console.log(JSON.stringify(ast, null, 2));
						return;
					}

					throw new Error('This should be impossible!');
				}

				if (opts.tokenize) {
					for (const token of tokenize(getSource())) {
						const string =
						  token.source
						  	.slice(...token.range)
						  	.replace(/\n/g, '\\n')
						  	.replace(/\t/g, '\\t');
						console.log(token.type, ':', `"${string}"`);
					}

					return;
				}

				if (opts.tokenizeRaw) {
					for (const token of tokenize(getSource(), false)) {
						const string =
						  token.source
						  	.slice(...token.range)
						  	.replace(/\n/g, '\\n')
						  	.replace(/\t/g, '\\t');
						console.log(token.type, ':', `"${string}"`);
					}

					return;
				}

				console.log(compile(getSource()));
			})
			.parse(process.argv);
	});