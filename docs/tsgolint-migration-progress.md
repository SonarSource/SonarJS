# Tsgolint Migration Progress

Generated from the current branch state.

## Scope

- `@typescript-eslint` section tracks the full migration scope for Sonar rules in the Node analyzer that import `@typescript-eslint`, split into `pure external` vs `decorated/composite`.
- The `Typechecked` column comes from the local `@typescript-eslint/eslint-plugin` metadata (`meta.docs.requiresTypeChecking`).
- `In tsgolint` comes from the vendored `tsgolint/internal/rules` set in this branch.
- In the full `@typescript-eslint` inventory table, `SonarJS` shows `-` when SonarJS does not wrap the upstream rule, or the Sonar rule key when it does; `Migrated` means that wrapper is already routed through `TSGOLINT_RULES`.
- The full inventory is ordered by `SonarJS` first, then `In tsgolint`, then upstream rule name.
- `Original SonarJS` section tracks SonarJS-owned rules whose generated metadata currently sets `requiresTypeChecking: true`.
- `Other external` section tracks non-`@typescript-eslint` external rules whose SonarJS wrapper/decorator currently consults TypeScript type services.
- Optional type-aware paths that are not marked `requiresTypeChecking` (for example `S1301`, `S4328`, `S8479`) are intentionally excluded from the `Original SonarJS` section.
- `S4123` is counted as typechecked in the `@typescript-eslint` section because upstream `await-thenable` metadata says `requiresTypeChecking: true`, even though the generated Sonar metadata currently says `false`.
- The grand total migration scope includes all `@typescript-eslint` rules used by SonarJS, not only the upstream typechecked subset.

## Summary

| Bucket                                                   | Count | Migrated | Notes                                                                  |
| -------------------------------------------------------- | ----: | -------: | ---------------------------------------------------------------------- |
| `@typescript-eslint` full scope                          |    39 |       14 | 19 pure external, 20 decorated/composite                               |
| `@typescript-eslint` upstream typechecked subset         |    14 |       14 | All SonarJS-wrapped upstream typechecked rules are now migrated        |
| `@typescript-eslint` non-typechecked subset              |    25 |        0 | Remaining migration target                                             |
| Original SonarJS rules with `requiresTypeChecking: true` |    67 |        1 | SonarJS-owned typechecked rules                                        |
| Other external rules decorated with typechecker          |     6 |        0 | All current matches are Unicorn-backed                                 |
| Grand total migration scope                              |   112 |       15 | 39 `@typescript-eslint` + 67 original SonarJS + 6 other external       |
| Typechecker-focused sub-scope                            |    87 |       15 | 14 typed `@typescript-eslint` + 67 original SonarJS + 6 other external |

Local upstream inventory: `@typescript-eslint/eslint-plugin 8.58.2` exposes 134 rules; vendored `tsgolint` currently implements 58 of them. SonarJS wraps 39, with 14 already migrated and 25 remaining.

Current headline:

- Remaining `@typescript-eslint` rules not yet migrated: `25` total.
- Remaining upstream typechecked `@typescript-eslint` rules not yet migrated: `0`.
- Remaining non-typechecked `@typescript-eslint` rules not yet migrated: `25`.
- All `14` SonarJS-wrapped upstream typechecked `@typescript-eslint` rules are now migrated.
- The only migrated original SonarJS typechecked rule is `S2870`.

## @typescript-eslint Rules In Node Analyzer

### Upstream Typechecked (14)

| Sonar | Upstream rule(s)                 | Impl                | Migrated |
| ----- | -------------------------------- | ------------------- | -------- |
| S4123 | `await-thenable`                 | pure external       | Yes      |
| S6551 | `no-base-to-string`              | decorated/composite | Yes      |
| S6544 | `no-misused-promises`            | decorated/composite | Yes      |
| S6583 | `no-mixed-enums`                 | pure external       | Yes      |
| S6571 | `no-redundant-type-constituents` | decorated/composite | Yes      |
| S4157 | `no-unnecessary-type-arguments`  | pure external       | Yes      |
| S4325 | `no-unnecessary-type-assertion`  | decorated/composite | Yes      |
| S6606 | `prefer-nullish-coalescing`      | decorated/composite | Yes      |
| S6582 | `prefer-optional-chain`          | decorated/composite | Yes      |
| S6671 | `prefer-promise-reject-errors`   | pure external       | Yes      |
| S2933 | `prefer-readonly`                | pure external       | Yes      |
| S6565 | `prefer-return-this-type`        | pure external       | Yes      |
| S6557 | `prefer-string-starts-ends-with` | decorated/composite | Yes      |
| S131  | `switch-exhaustiveness-check`    | decorated/composite | Yes      |

### Not Upstream Typechecked (25)

| Sonar | Upstream rule(s)                  | Impl                | Migrated |
| ----- | --------------------------------- | ------------------- | -------- |
| S4136 | `adjacent-overload-signatures`    | pure external       | No       |
| S4137 | `consistent-type-assertions`      | pure external       | No       |
| S1788 | `default-param-last`              | decorated/composite | No       |
| S6568 | `no-confusing-non-null-assertion` | pure external       | No       |
| S1534 | `no-dupe-class-members`           | decorated/composite | No       |
| S6578 | `no-duplicate-enum-values`        | pure external       | No       |
| S1186 | `no-empty-function`               | decorated/composite | No       |
| S4023 | `no-empty-interface`              | decorated/composite | No       |
| S4204 | `no-explicit-any`                 | pure external       | No       |
| S2094 | `no-extraneous-class`             | pure external       | No       |
| S3257 | `no-inferrable-types`             | pure external       | No       |
| S109  | `no-magic-numbers`                | decorated/composite | No       |
| S4124 | `no-misused-new`                  | pure external       | No       |
| S2966 | `no-non-null-assertion`           | pure external       | No       |
| S2814 | `no-redeclare`                    | decorated/composite | No       |
| S1117 | `no-shadow`                       | pure external       | No       |
| S4327 | `no-this-alias`                   | decorated/composite | No       |
| S6569 | `no-unnecessary-type-constraint`  | pure external       | No       |
| S905  | `no-unused-expressions`           | decorated/composite | No       |
| S6590 | `prefer-as-const`                 | pure external       | No       |
| S6572 | `prefer-enum-initializers`        | decorated/composite | No       |
| S4138 | `prefer-for-of`                   | decorated/composite | No       |
| S6598 | `prefer-function-type`            | decorated/composite | No       |
| S6550 | `prefer-literal-enum-member`      | pure external       | No       |
| S4156 | `prefer-namespace-keyword`        | decorated/composite | No       |

## All @typescript-eslint Rules (134)

Local source: `@typescript-eslint/eslint-plugin 8.58.2`. The table is ordered by SonarJS presence first, then tsgolint presence, then upstream rule name.

| Upstream rule                                  | Typechecked | In tsgolint | SonarJS | Migrated |
| ---------------------------------------------- | ----------- | ----------- | ------- | -------- |
| `await-thenable`                               | Yes         | Yes         | S4123   | Yes      |
| `no-base-to-string`                            | Yes         | Yes         | S6551   | Yes      |
| `no-misused-promises`                          | Yes         | Yes         | S6544   | Yes      |
| `no-mixed-enums`                               | Yes         | Yes         | S6583   | Yes      |
| `no-redundant-type-constituents`               | Yes         | Yes         | S6571   | Yes      |
| `no-unnecessary-type-arguments`                | Yes         | Yes         | S4157   | Yes      |
| `no-unnecessary-type-assertion`                | Yes         | Yes         | S4325   | Yes      |
| `prefer-nullish-coalescing`                    | Yes         | Yes         | S6606   | Yes      |
| `prefer-optional-chain`                        | Yes         | Yes         | S6582   | Yes      |
| `prefer-promise-reject-errors`                 | Yes         | Yes         | S6671   | Yes      |
| `prefer-readonly`                              | Yes         | Yes         | S2933   | Yes      |
| `prefer-return-this-type`                      | Yes         | Yes         | S6565   | Yes      |
| `prefer-string-starts-ends-with`               | Yes         | Yes         | S6557   | Yes      |
| `switch-exhaustiveness-check`                  | Yes         | Yes         | S131    | Yes      |
| `adjacent-overload-signatures`                 | No          | No          | S4136   | No       |
| `consistent-type-assertions`                   | No          | No          | S4137   | No       |
| `default-param-last`                           | No          | No          | S1788   | No       |
| `no-confusing-non-null-assertion`              | No          | No          | S6568   | No       |
| `no-dupe-class-members`                        | No          | No          | S1534   | No       |
| `no-duplicate-enum-values`                     | No          | No          | S6578   | No       |
| `no-empty-function`                            | No          | No          | S1186   | No       |
| `no-empty-interface`                           | No          | No          | S4023   | No       |
| `no-explicit-any`                              | No          | No          | S4204   | No       |
| `no-extraneous-class`                          | No          | No          | S2094   | No       |
| `no-inferrable-types`                          | No          | No          | S3257   | No       |
| `no-magic-numbers`                             | No          | No          | S109    | No       |
| `no-misused-new`                               | No          | No          | S4124   | No       |
| `no-non-null-assertion`                        | No          | No          | S2966   | No       |
| `no-redeclare`                                 | No          | No          | S2814   | No       |
| `no-shadow`                                    | No          | No          | S1117   | No       |
| `no-this-alias`                                | No          | No          | S4327   | No       |
| `no-unnecessary-type-constraint`               | No          | No          | S6569   | No       |
| `no-unused-expressions`                        | No          | No          | S905    | No       |
| `prefer-as-const`                              | No          | No          | S6590   | No       |
| `prefer-enum-initializers`                     | No          | No          | S6572   | No       |
| `prefer-for-of`                                | No          | No          | S4138   | No       |
| `prefer-function-type`                         | No          | No          | S6598   | No       |
| `prefer-literal-enum-member`                   | No          | No          | S6550   | No       |
| `prefer-namespace-keyword`                     | No          | No          | S4156   | No       |
| `consistent-return`                            | Yes         | Yes         | -       | -        |
| `consistent-type-exports`                      | Yes         | Yes         | -       | -        |
| `dot-notation`                                 | Yes         | Yes         | -       | -        |
| `no-array-delete`                              | Yes         | Yes         | -       | -        |
| `no-confusing-void-expression`                 | Yes         | Yes         | -       | -        |
| `no-deprecated`                                | Yes         | Yes         | -       | -        |
| `no-duplicate-type-constituents`               | Yes         | Yes         | -       | -        |
| `no-floating-promises`                         | Yes         | Yes         | -       | -        |
| `no-for-in-array`                              | Yes         | Yes         | -       | -        |
| `no-implied-eval`                              | Yes         | Yes         | -       | -        |
| `no-meaningless-void-operator`                 | Yes         | Yes         | -       | -        |
| `no-misused-spread`                            | Yes         | Yes         | -       | -        |
| `no-unnecessary-boolean-literal-compare`       | Yes         | Yes         | -       | -        |
| `no-unnecessary-condition`                     | Yes         | Yes         | -       | -        |
| `no-unnecessary-qualifier`                     | Yes         | Yes         | -       | -        |
| `no-unnecessary-template-expression`           | Yes         | Yes         | -       | -        |
| `no-unnecessary-type-conversion`               | Yes         | Yes         | -       | -        |
| `no-unnecessary-type-parameters`               | Yes         | Yes         | -       | -        |
| `no-unsafe-argument`                           | Yes         | Yes         | -       | -        |
| `no-unsafe-assignment`                         | Yes         | Yes         | -       | -        |
| `no-unsafe-call`                               | Yes         | Yes         | -       | -        |
| `no-unsafe-enum-comparison`                    | Yes         | Yes         | -       | -        |
| `no-unsafe-member-access`                      | Yes         | Yes         | -       | -        |
| `no-unsafe-return`                             | Yes         | Yes         | -       | -        |
| `no-unsafe-type-assertion`                     | Yes         | Yes         | -       | -        |
| `no-unsafe-unary-minus`                        | Yes         | Yes         | -       | -        |
| `non-nullable-type-assertion-style`            | Yes         | Yes         | -       | -        |
| `only-throw-error`                             | Yes         | Yes         | -       | -        |
| `prefer-find`                                  | Yes         | Yes         | -       | -        |
| `prefer-includes`                              | Yes         | Yes         | -       | -        |
| `prefer-readonly-parameter-types`              | Yes         | Yes         | -       | -        |
| `prefer-reduce-type-parameter`                 | Yes         | Yes         | -       | -        |
| `prefer-regexp-exec`                           | Yes         | Yes         | -       | -        |
| `promise-function-async`                       | Yes         | Yes         | -       | -        |
| `related-getter-setter-pairs`                  | Yes         | Yes         | -       | -        |
| `require-array-sort-compare`                   | Yes         | Yes         | -       | -        |
| `require-await`                                | Yes         | Yes         | -       | -        |
| `restrict-plus-operands`                       | Yes         | Yes         | -       | -        |
| `restrict-template-expressions`                | Yes         | Yes         | -       | -        |
| `return-await`                                 | Yes         | Yes         | -       | -        |
| `strict-boolean-expressions`                   | Yes         | Yes         | -       | -        |
| `strict-void-return`                           | Yes         | Yes         | -       | -        |
| `unbound-method`                               | Yes         | Yes         | -       | -        |
| `use-unknown-in-catch-callback-variable`       | Yes         | Yes         | -       | -        |
| `array-type`                                   | No          | No          | -       | -        |
| `ban-ts-comment`                               | No          | No          | -       | -        |
| `ban-tslint-comment`                           | No          | No          | -       | -        |
| `class-literal-property-style`                 | No          | No          | -       | -        |
| `class-methods-use-this`                       | No          | No          | -       | -        |
| `consistent-generic-constructors`              | No          | No          | -       | -        |
| `consistent-indexed-object-style`              | No          | No          | -       | -        |
| `consistent-type-definitions`                  | No          | No          | -       | -        |
| `consistent-type-imports`                      | No          | No          | -       | -        |
| `explicit-function-return-type`                | No          | No          | -       | -        |
| `explicit-member-accessibility`                | No          | No          | -       | -        |
| `explicit-module-boundary-types`               | No          | No          | -       | -        |
| `init-declarations`                            | No          | No          | -       | -        |
| `max-params`                                   | No          | No          | -       | -        |
| `member-ordering`                              | No          | No          | -       | -        |
| `method-signature-style`                       | No          | No          | -       | -        |
| `naming-convention`                            | Yes         | No          | -       | -        |
| `no-array-constructor`                         | No          | No          | -       | -        |
| `no-dynamic-delete`                            | No          | No          | -       | -        |
| `no-empty-object-type`                         | No          | No          | -       | -        |
| `no-extra-non-null-assertion`                  | No          | No          | -       | -        |
| `no-import-type-side-effects`                  | No          | No          | -       | -        |
| `no-invalid-this`                              | No          | No          | -       | -        |
| `no-invalid-void-type`                         | No          | No          | -       | -        |
| `no-loop-func`                                 | No          | No          | -       | -        |
| `no-loss-of-precision`                         | No          | No          | -       | -        |
| `no-namespace`                                 | No          | No          | -       | -        |
| `no-non-null-asserted-nullish-coalescing`      | No          | No          | -       | -        |
| `no-non-null-asserted-optional-chain`          | No          | No          | -       | -        |
| `no-require-imports`                           | No          | No          | -       | -        |
| `no-restricted-imports`                        | No          | No          | -       | -        |
| `no-restricted-types`                          | No          | No          | -       | -        |
| `no-type-alias`                                | No          | No          | -       | -        |
| `no-unnecessary-parameter-property-assignment` | No          | No          | -       | -        |
| `no-unsafe-declaration-merging`                | No          | No          | -       | -        |
| `no-unsafe-function-type`                      | No          | No          | -       | -        |
| `no-unused-private-class-members`              | No          | No          | -       | -        |
| `no-unused-vars`                               | No          | No          | -       | -        |
| `no-use-before-define`                         | No          | No          | -       | -        |
| `no-useless-constructor`                       | No          | No          | -       | -        |
| `no-useless-default-assignment`                | Yes         | No          | -       | -        |
| `no-useless-empty-export`                      | No          | No          | -       | -        |
| `no-var-requires`                              | No          | No          | -       | -        |
| `no-wrapper-object-types`                      | No          | No          | -       | -        |
| `parameter-properties`                         | No          | No          | -       | -        |
| `prefer-destructuring`                         | Yes         | No          | -       | -        |
| `prefer-ts-expect-error`                       | No          | No          | -       | -        |
| `sort-type-constituents`                       | No          | No          | -       | -        |
| `triple-slash-reference`                       | No          | No          | -       | -        |
| `typedef`                                      | No          | No          | -       | -        |
| `unified-signatures`                           | No          | No          | -       | -        |

## Original SonarJS Rules Using Typechecker

| Sonar | Migrated |
| ----- | -------- |
| S1128 | No       |
| S1154 | No       |
| S1488 | No       |
| S1529 | No       |
| S1874 | No       |
| S2077 | No       |
| S2201 | No       |
| S2234 | No       |
| S2259 | No       |
| S2301 | No       |
| S2639 | No       |
| S2692 | No       |
| S2699 | No       |
| S2817 | No       |
| S2819 | No       |
| S2870 | Yes      |
| S2871 | No       |
| S2999 | No       |
| S3003 | No       |
| S3402 | No       |
| S3403 | No       |
| S3525 | No       |
| S3533 | No       |
| S3579 | No       |
| S3735 | No       |
| S3757 | No       |
| S3758 | No       |
| S3760 | No       |
| S3782 | No       |
| S3785 | No       |
| S3796 | No       |
| S3800 | No       |
| S3801 | No       |
| S3981 | No       |
| S4043 | No       |
| S4139 | No       |
| S4324 | No       |
| S4335 | No       |
| S4619 | No       |
| S4623 | No       |
| S4782 | No       |
| S4822 | No       |
| S5247 | No       |
| S5725 | No       |
| S5842 | No       |
| S5843 | No       |
| S5850 | No       |
| S5852 | No       |
| S5856 | No       |
| S5860 | No       |
| S5867 | No       |
| S5868 | No       |
| S5869 | No       |
| S6019 | No       |
| S6035 | No       |
| S6323 | No       |
| S6324 | No       |
| S6326 | No       |
| S6328 | No       |
| S6331 | No       |
| S6353 | No       |
| S6397 | No       |
| S6439 | No       |
| S6594 | No       |
| S6759 | No       |
| S6959 | No       |
| S7059 | No       |

## Other External Rules Decorated With Typechecker

| Sonar | External plugin | Upstream rule                   | Migrated |
| ----- | --------------- | ------------------------------- | -------- |
| S7727 | unicorn         | `no-array-callback-reference`   | No       |
| S7728 | unicorn         | `no-array-for-each`             | No       |
| S7729 | unicorn         | `no-array-method-this-argument` | No       |
| S7755 | unicorn         | `prefer-at`                     | No       |
| S7778 | unicorn         | `prefer-single-call`            | No       |
| S7785 | unicorn         | `prefer-top-level-await`        | No       |
