import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // database.types.ts é gerado por `npm run db:types` — não se edita à mão.
    ignores: ['dist', 'node_modules', 'coverage', 'public/sw.js', 'src/lib/database.types.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'unused-imports': unusedImports,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Import não usado é erro auto-corrigível; variável não usada só avisa,
      // e o prefixo _ marca "intencionalmente ignorado".
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // `any` esconde exatamente o tipo de defeito que esta etapa foi corrigir.
      '@typescript-eslint/no-explicit-any': 'error',

      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Feedback de ação precisa ser UI, não diálogo nativo do navegador.
      'no-alert': 'error',
    },
  },
  {
    files: ['**/*.{test,spec}.{ts,tsx}', 'src/test/**'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // No servidor, `console` É o mecanismo de log — é assim que a Vercel coleta.
    // O registro de quem criou qual conta é trilha de auditoria, não depuração.
    files: ['api/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['vite.config.ts', 'eslint.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Scripts de operação, rodados à mão no terminal. `console` é a interface
    // deles com quem está olhando, não depuração esquecida.
    files: ['scripts/**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
    rules: {
      'no-console': 'off',
    },
  }
);
