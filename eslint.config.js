import antfu from '@antfu/eslint-config'

export default antfu(
  {
    vue: true,
  },
  {
    /**
     * The `shared/ui` boundary, as a lint rule rather than a convention.
     *
     * Reka UI is an implementation detail of our own components: a feature that imports `Dialog`
     * directly gets a dialog nobody has styled, wired to no token, and the next primitive swap has
     * to find every call site. `@internationalized/date` is here for the same reason — `UiDateField`
     * is the one file allowed to know `DateValue` exists, so `IsoDate` is what the rest of the app
     * passes around.
     *
     * Settled by [#5](https://github.com/LouisLP/driving-school/issues/5); the reasoning is written
     * up in `docs/students-slice.md`, decision 1.
     */
    name: 'driving-school/shared-ui-boundary',
    files: ['src/**/*.{ts,vue}'],
    ignores: ['src/shared/ui/**'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: 'reka-ui',
            message: 'Import the wrapper from `@/shared/ui`. Only `src/shared/ui/**` may reach for Reka.',
          },
          {
            name: '@internationalized/date',
            message: '`DateValue` stops at `UiDateField`. Pass `IsoDate` — see docs/students-slice.md.',
          },
        ],
        patterns: [
          {
            group: ['reka-ui/*', '@internationalized/date/*'],
            message: 'Import the wrapper from `@/shared/ui`. Only `src/shared/ui/**` may reach for Reka.',
          },
          {
            group: ['@/shared/ui/*'],
            message: '`shared/ui` is a published boundary: import from `@/shared/ui`, not from a file inside it.',
          },
        ],
      }],
    },
  },
)
