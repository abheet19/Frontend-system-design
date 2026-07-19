const js = require('@eslint/js');

module.exports = [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
    ],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      // SwitchCase: 1 keeps ESLint's indent rule in agreement with Prettier,
      // which indents `case` clauses one level inside `switch`. Without it the
      // two tools fight over any switch statement.
      indent: ['error', 2, { SwitchCase: 1 }],
      'linebreak-style': ['error', 'unix'],
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
      'no-unused-vars': ['warn'],
      'no-console': ['warn'],
      'no-var': ['error'],
      'prefer-const': ['error'],
    },
  },
];
