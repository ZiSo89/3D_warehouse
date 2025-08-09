// ESLint flat config for project (ESLint v9+)
import js from '@eslint/js';
import pluginImport from 'eslint-plugin-import';
import pluginJsdoc from 'eslint-plugin-jsdoc';

export default [
  {
    ignores: ['dist', 'node_modules']
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        performance: 'readonly',
        fetch: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        Blob: 'readonly',
    prompt: 'readonly',
        URL: 'readonly',
        FileReader: 'readonly',
        alert: 'readonly',
        navigator: 'readonly',
        TWEEN: 'readonly'
  ,CustomEvent: 'readonly'
      }
    },
    plugins: {
      import: pluginImport,
      jsdoc: pluginJsdoc
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'import/order': ['warn', { 'newlines-between': 'always', groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']] }],
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/check-alignment': 'warn',
      'jsdoc/check-indentation': 'warn'
    }
  }
];
