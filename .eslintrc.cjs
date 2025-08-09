/* ESLint configuration for project */
const js = require('@eslint/js');

module.exports = {
  root: true,
  ignores: ['dist', 'node_modules'],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  plugins: ['import', 'jsdoc'],
  extends: [js.configs.recommended],
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'import/order': ['warn', { 'newlines-between': 'always', groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']] }],
    'jsdoc/require-jsdoc': ['off'],
    'jsdoc/check-alignment': 'warn',
    'jsdoc/check-indentation': 'warn'
  }
};
