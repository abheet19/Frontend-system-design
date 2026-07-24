const js = require('@eslint/js');
const tseslint = require('typescript-eslint');

// Style rules shared by BOTH .js and .ts files, so Prettier and ESLint never
// disagree regardless of which extension a file has.
const styleRules = {
  indent: ['error', 2, { SwitchCase: 1 }],
  'linebreak-style': ['error', 'unix'],
  quotes: ['error', 'single', { avoidEscape: true }],
  semi: ['error', 'always'],
  'no-console': ['warn'],
};

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
      ...styleRules,
      'no-unused-vars': ['warn'],
      'no-var': ['error'],
      'prefer-const': ['error'],
    },
  },
  // TypeScript files: typescript-eslint's recommended rules (type-aware
  // unused-vars, no-explicit-any warnings, etc.) plus the SAME style rules as
  // the .js block above, so formatting is identical across the whole repo.
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.ts'],
  })),
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      ...styleRules,
      // TS's own unused-vars replaces the base JS rule (understands types,
      // and lets us prefix intentionally-unused params with `_`).
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
];
