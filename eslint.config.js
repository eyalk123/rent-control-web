import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Allow intentionally-unused identifiers prefixed with `_` (e.g. when
      // destructuring to omit a field).
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // HMR-only optimisation. We intentionally co-locate some context providers
      // with their hooks/constants; this has no effect on production builds.
      'react-refresh/only-export-components': 'off',
      // Experimental rule that flags legitimate "sync state on prop change"
      // effects in our form drawers (reset-on-close, derived state). Disabled;
      // these patterns are intentional and covered by the e2e suite.
      'react-hooks/set-state-in-effect': 'off',
      // React-Compiler advisory about react-hook-form's watch() — not actionable
      // without dropping watch(); informational only.
      'react-hooks/incompatible-library': 'off',
    },
  },
  {
    // Playwright e2e files: `use` is a Playwright fixture, not a React hook.
    files: ['e2e/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
])
