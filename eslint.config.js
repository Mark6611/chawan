import prettier from 'eslint-config-prettier';
import path from 'node:path';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	{
		// Native platform folders are generated scaffolding + copied web
		// bundles (ios/App/App/public is the built site) — Xcode's domain,
		// not a lint surface. includeIgnoreFile only reads the ROOT
		// .gitignore, so ios/'s own nested .gitignore doesn't help here.
		ignores: ['ios/', 'android/']
	},
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			'no-undef': 'off',
			// Underscore prefix = intentionally unused (kept-for-signature params
			// like parsePrice's _code, destructuring discards in tests).
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }
			]
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig
			}
		}
	},
	{
		rules: {
			// Chawan deploys at the root path everywhere it runs (Vercel root
			// domain, Capacitor webview root) — there is no paths.base, so
			// plain "/..." hrefs and goto() targets are correct as-is.
			// Threading resolve() through ~50 call sites buys nothing here;
			// revisit only if the app ever moves under a base path.
			'svelte/no-navigation-without-resolve': 'off',
			// Our reactive convention is wholesale recompute: Maps/Dates/
			// URLSearchParams are built fresh inside $derived/handlers and
			// never mutated afterwards, so the reactive wrappers (SvelteMap
			// etc.) add nothing. The rule targets long-lived mutated
			// instances in $state — a pattern this codebase doesn't use.
			'svelte/prefer-svelte-reactivity': 'off'
		}
	}
);
