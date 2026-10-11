import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'public/', 'node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...svelte.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      // Derived values build fresh, never-mutated sets and maps; only mutable state needs Svelte's.
      'svelte/prefer-svelte-reactivity': 'off',
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
);
