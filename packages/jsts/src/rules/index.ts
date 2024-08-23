/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import fs from 'fs';
import { findParent } from './helpers';
import { PackageJson } from 'type-fest';
import { Rule } from 'eslint';
import type { TSESLint } from '@typescript-eslint/utils';
import type { FlatConfig } from '@typescript-eslint/utils/ts-eslint';

import { rule as S2376 } from './S2376'; // accessor-pairs
import { rule as S1077 } from './S1077'; // alt-text
import { rule as S6827 } from './S6827'; // anchor-has-content
import { rule as S6844 } from './S6844'; // anchor-is-valid
import { rule as S5850 } from './S5850'; // anchor-precedence
import { rule as S3782 } from './S3782'; // argument-type
import { rule as S2234 } from './S2234'; // arguments-order
import { rule as S3513 } from './S3513'; // arguments-usage
import { rule as S3796 } from './S3796'; // array-callback-without-return
import { rule as S1528 } from './S1528'; // array-constructor
import { rule as S3524 } from './S3524'; // arrow-function-convention
import { rule as S2699 } from './S2699'; // assertions-in-tests
import { rule as S6333 } from './S6333'; // aws-apigateway-public-api
import { rule as S6329 } from './S6329'; // aws-ec2-rds-dms-public
import { rule as S6275 } from './S6275'; // aws-ec2-unencrypted-ebs-volume
import { rule as S6332 } from './S6332'; // aws-efs-unencrypted
import { rule as S6302 } from './S6302'; // aws-iam-all-privileges
import { rule as S6304 } from './S6304'; // aws-iam-all-resources-accessible
import { rule as S6317 } from './S6317'; // aws-iam-privilege-escalation
import { rule as S6270 } from './S6270'; // aws-iam-public-access
import { rule as S6308 } from './S6308'; // aws-opensearchservice-domain
import { rule as S6303 } from './S6303'; // aws-rds-unencrypted-databases
import { rule as S6321 } from './S6321'; // aws-restricted-ip-admin-access
import { rule as S6265 } from './S6265'; // aws-s3-bucket-granted-access
import { rule as S6249 } from './S6249'; // aws-s3-bucket-insecure-http
import { rule as S6281 } from './S6281'; // aws-s3-bucket-public-access
import { rule as S6245 } from './S6245'; // aws-s3-bucket-server-encryption
import { rule as S6252 } from './S6252'; // aws-s3-bucket-versioning
import { rule as S6319 } from './S6319'; // aws-sagemaker-unencrypted-notebook
import { rule as S6327 } from './S6327'; // aws-sns-unencrypted-topics
import { rule as S6330 } from './S6330'; // aws-sqs-unencrypted-queue
import { rule as S1529 } from './S1529'; // bitwise-operators
import { rule as S4798 } from './S4798'; // bool-param-default
import { rule as S1105 } from './S1105'; // brace-style
import { rule as S1472 } from './S1472'; // call-argument-line
import { rule as S5742 } from './S5742'; // certificate-transparency
import { rule as S6092 } from './S6092'; // chai-determinate-assertion
import { rule as S101 } from './S101'; // class-name
import { rule as S3525 } from './S3525'; // class-prototype
import { rule as S1523 } from './S1523'; // code-eval
import { rule as S3776 } from './S3776'; // cognitive-complexity
import { rule as S3616 } from './S3616'; // comma-or-logical-or-case
import { rule as S124 } from './S124'; // comment-regex
import { rule as S6353 } from './S6353'; // concise-regex
import { rule as S3973 } from './S3973'; // conditional-indentation
import { rule as S5757 } from './S5757'; // confidential-information-logging
import { rule as S1848 } from './S1848'; // constructor-for-side-effects
import { rule as S5693 } from './S5693'; // content-length
import { rule as S5728 } from './S5728'; // content-security-policy
import { rule as S3330 } from './S3330'; // cookie-no-httponly
import { rule as S2255 } from './S2255'; // cookies
import { rule as S5122 } from './S5122'; // cors
import { rule as S4502 } from './S4502'; // csrf
import { rule as S1541 } from './S1541'; // cyclomatic-complexity
import { rule as S3798 } from './S3798'; // declarations-in-global-scope
import { rule as S1788 } from './S1788'; // default-param-last
import { rule as S1874 } from './S1874'; // deprecation
import { rule as S3514 } from './S3514'; // destructuring-assignment-syntax
import { rule as S3403 } from './S3403'; // different-types-comparison
import { rule as S5247 } from './S5247'; // disabled-auto-escaping
import { rule as S5725 } from './S5725'; // disabled-resource-integrity
import { rule as S6080 } from './S6080'; // disabled-timeout
import { rule as S5743 } from './S5743'; // dns-prefetching
import { rule as S5869 } from './S5869'; // duplicates-in-character-class
import { rule as S126 } from './S126'; // elseif-without-else
import { rule as S5842 } from './S5842'; // empty-string-repetition
import { rule as S4787 } from './S4787'; // encryption
import { rule as S5542 } from './S5542'; // encryption-secure-mode
import { rule as S3723 } from './S3723'; // enforce-trailing-comma
import { rule as S6328 } from './S6328'; // existing-groups
import { rule as S1067 } from './S1067'; // expression-complexity
import { rule as S1451 } from './S1451'; // file-header
import { rule as S3317 } from './S3317'; // file-name-differ-from-class
import { rule as S2612 } from './S2612'; // file-permissions
import { rule as S2598 } from './S2598'; // file-uploads
import { rule as S1134 } from './S1134'; // fixme-tag
import { rule as S1535 } from './S1535'; // for-in
import { rule as S2251 } from './S2251'; // for-loop-increment-sign
import { rule as S5732 } from './S5732'; // frame-ancestors
import { rule as S1515 } from './S1515'; // function-inside-loop
import { rule as S100 } from './S100'; // function-name
import { rule as S3800 } from './S3800'; // function-return-type
import { rule as S1527 } from './S1527'; // future-reserved-words
import { rule as S3531 } from './S3531'; // generator-without-yield
import { rule as S4790 } from './S4790'; // hashing
import { rule as S5691 } from './S5691'; // hidden-files
import { rule as S6754 } from './S6754'; // hook-use-state
import { rule as S5254 } from './S5254'; // html-has-lang
import { rule as S3785 } from './S3785'; // in-operator-type-error
import { rule as S3686 } from './S3686'; // inconsistent-function-call
import { rule as S2692 } from './S2692'; // index-of-compare-to-positive-number
import { rule as S2092 } from './S2092'; // insecure-cookie
import { rule as S5659 } from './S5659'; // insecure-jwt-token
import { rule as S3415 } from './S3415'; // inverted-assertion-arguments
import { rule as S6477 } from './S6477'; // jsx-key
import { rule as S6481 } from './S6481'; // jsx-no-constructed-context-values
import { rule as S6749 } from './S6749'; // jsx-no-useless-fragment
import { rule as S6853 } from './S6853'; // label-has-associated-control
import { rule as S1439 } from './S1439'; // label-position
import { rule as S5148 } from './S5148'; // link-with-target-blank
import { rule as S1479 } from './S1479'; // max-switch-cases
import { rule as S4622 } from './S4622'; // max-union-size
import { rule as S4084 } from './S4084'; // media-has-caption
import { rule as S1994 } from './S1994'; // misplaced-loop-counter
import { rule as S1082 } from './S1082'; // mouse-events-a11y
import { rule as S134 } from './S134'; // nested-control-flow
import { rule as S2430 } from './S2430'; // new-cap
import { rule as S2999 } from './S2999'; // new-operator-misuse
import { rule as S4275 } from './S4275'; // no-accessor-field-mismatch
import { rule as S3923 } from './S3923'; // no-all-duplicated-branches
import { rule as S2871 } from './S2871'; // no-alphabetical-sort
import { rule as S6268 } from './S6268'; // no-angular-bypass-sanitization
import { rule as S2870 } from './S2870'; // no-array-delete
import { rule as S6479 } from './S6479'; // no-array-index-key
import { rule as S3579 } from './S3579'; // no-associative-arrays
import { rule as S6551 } from './S6551'; // no-base-to-string
import { rule as S2424 } from './S2424'; // no-built-in-override
import { rule as S1219 } from './S1219'; // no-case-label-in-switch
import { rule as S5332 } from './S5332'; // no-clear-text-protocols
import { rule as S6079 } from './S6079'; // no-code-after-done
import { rule as S1066 } from './S1066'; // no-collapsible-if
import { rule as S3981 } from './S3981'; // no-collection-size-mischeck
import { rule as S125 } from './S125'; // no-commented-code
import { rule as S1854 } from './S1854'; // no-dead-store
import { rule as S3001 } from './S3001'; // no-delete-var
import { rule as S6957 } from './S6957'; // no-deprecated-react
import { rule as S4621 } from './S4621'; // no-duplicate-in-composite
import { rule as S1192 } from './S1192'; // no-duplicate-string
import { rule as S1871 } from './S1871'; // no-duplicated-branches
import { rule as S4143 } from './S4143'; // no-element-overwrite
import { rule as S6019 } from './S6019'; // no-empty-after-reluctant
import { rule as S6323 } from './S6323'; // no-empty-alternatives
import { rule as S4158 } from './S4158'; // no-empty-collection
import { rule as S1186 } from './S1186'; // no-empty-function
import { rule as S6331 } from './S6331'; // no-empty-group
import { rule as S4023 } from './S4023'; // no-empty-interface
import { rule as S2187 } from './S2187'; // no-empty-test-file
import { rule as S888 } from './S888'; // no-equals-in-for-termination
import { rule as S6426 } from './S6426'; // no-exclusive-tests
import { rule as S6643 } from './S6643'; // no-extend-native
import { rule as S930 } from './S930'; // no-extra-arguments
import { rule as S1116 } from './S1116'; // no-extra-semi
import { rule as S6788 } from './S6788'; // no-find-dom-node
import { rule as S4139 } from './S4139'; // no-for-in-iterable
import { rule as S1530 } from './S1530'; // no-function-declaration-in-block
import { rule as S2990 } from './S2990'; // no-global-this
import { rule as S2137 } from './S2137'; // no-globals-shadowing
import { rule as S2589 } from './S2589'; // no-gratuitous-expressions
import { rule as S2068 } from './S2068'; // no-hardcoded-credentials
import { rule as S1313 } from './S1313'; // no-hardcoded-ip
import { rule as S6442 } from './S6442'; // no-hook-setter-in-body
import { rule as S1862 } from './S1862'; // no-identical-conditions
import { rule as S1764 } from './S1764'; // no-identical-expressions
import { rule as S4144 } from './S4144'; // no-identical-functions
import { rule as S2486 } from './S2486'; // no-ignored-exceptions
import { rule as S2201 } from './S2201'; // no-ignored-return
import { rule as S4328 } from './S4328'; // no-implicit-dependencies
import { rule as S2703 } from './S2703'; // no-implicit-global
import { rule as S4619 } from './S4619'; // no-in-misuse
import { rule as S1940 } from './S1940'; // no-inverted-boolean-check
import { rule as S2970 } from './S2970'; // no-incomplete-assertions
import { rule as S3801 } from './S3801'; // no-inconsistent-returns
import { rule as S3402 } from './S3402'; // no-incorrect-string-concat
import { rule as S2189 } from './S2189'; // no-infinite-loop
import { rule as S5604 } from './S5604'; // no-intrusive-permissions
import { rule as S4123 } from './S4123'; // no-invalid-await
import { rule as S3516 } from './S3516'; // no-invariant-returns
import { rule as S5759 } from './S5759'; // no-ip-forward
import { rule as S1119 } from './S1119'; // no-labels
import { rule as S6958 } from './S6958'; // no-literal-call
import { rule as S6660 } from './S6660'; // no-lonely-if
import { rule as S5734 } from './S5734'; // no-mime-sniff
import { rule as S4043 } from './S4043'; // no-misleading-array-reverse
import { rule as S6544 } from './S6544'; // no-misused-promises
import { rule as S5730 } from './S5730'; // no-mixed-content
import { rule as S1121 } from './S1121'; // no-nested-assignment
import { rule as S3358 } from './S3358'; // no-nested-conditional
import { rule as S2004 } from './S2004'; // no-nested-functions
import { rule as S1821 } from './S1821'; // no-nested-switch
import { rule as S4624 } from './S4624'; // no-nested-template-literals
import { rule as S881 } from './S881'; // no-nested-incdec
import { rule as S1751 } from './S1751'; // no-one-iteration-loop
import { rule as S4036 } from './S4036'; // no-os-command-from-path
import { rule as S1226 } from './S1226'; // no-parameter-reassignment
import { rule as S1533 } from './S1533'; // no-primitive-wrappers
import { rule as S2814 } from './S2814'; // no-redeclare
import { rule as S4165 } from './S4165'; // no-redundant-assignments
import { rule as S1125 } from './S1125'; // no-redundant-boolean
import { rule as S3626 } from './S3626'; // no-redundant-jump
import { rule as S4782 } from './S4782'; // no-redundant-optional
import { rule as S1110 } from './S1110'; // no-redundant-parentheses
import { rule as S6571 } from './S6571'; // no-redundant-type-constituents
import { rule as S3827 } from './S3827'; // no-reference-error
import { rule as S5736 } from './S5736'; // no-referrer-policy
import { rule as S3533 } from './S3533'; // no-require-or-define
import { rule as S4324 } from './S4324'; // no-return-type-any
import { rule as S5863 } from './S5863'; // no-same-argument-assert
import { rule as S3972 } from './S3972'; // no-same-line-conditional
import { rule as S6679 } from './S6679'; // no-self-compare
import { rule as S1301 } from './S1301'; // no-small-switch
import { rule as S105 } from './S105'; // no-tab
import { rule as S5257 } from './S5257'; // no-table-as-layout
import { rule as S4327 } from './S4327'; // no-this-alias
import { rule as S3696 } from './S3696'; // no-throw-literal
import { rule as S4822 } from './S4822'; // no-try-promise
import { rule as S4623 } from './S4623'; // no-undefined-argument
import { rule as S2138 } from './S2138'; // no-undefined-assignment
import { rule as S2681 } from './S2681'; // no-unenclosed-multiline-block
import { rule as S6486 } from './S6486'; // no-uniq-key
import { rule as S6747 } from './S6747'; // no-unknown-property
import { rule as S1763 } from './S1763'; // no-unreachable
import { rule as S6791 } from './S6791'; // no-unsafe
import { rule as S5042 } from './S5042'; // no-unsafe-unzip
import { rule as S6478 } from './S6478'; // no-unstable-nested-components
import { rule as S3984 } from './S3984'; // no-unthrown-error
import { rule as S4030 } from './S4030'; // no-unused-collection
import { rule as S905 } from './S905'; // no-unused-expressions
import { rule as S1172 } from './S1172'; // no-unused-function-argument
import { rule as S1068 } from './S1068'; // no-unused-private-class-members
import { rule as S3699 } from './S3699'; // no-use-of-empty-return-value
import { rule as S6676 } from './S6676'; // no-useless-call
import { rule as S2737 } from './S2737'; // no-useless-catch
import { rule as S6647 } from './S6647'; // no-useless-constructor
import { rule as S2123 } from './S2123'; // no-useless-increment
import { rule as S4335 } from './S4335'; // no-useless-intersection
import { rule as S6443 } from './S6443'; // no-useless-react-setstate
import { rule as S3504 } from './S3504'; // no-var
import { rule as S1526 } from './S1526'; // no-variable-usage-before-declaration
import { rule as S6299 } from './S6299'; // no-vue-bypass-sanitization
import { rule as S5547 } from './S5547'; // no-weak-cipher
import { rule as S4426 } from './S4426'; // no-weak-keys
import { rule as S2208 } from './S2208'; // no-wildcard-import
import { rule as S2757 } from './S2757'; // non-existent-operator
import { rule as S3760 } from './S3760'; // non-number-in-arithmetic-expression
import { rule as S2259 } from './S2259'; // null-dereference
import { rule as S5264 } from './S5264'; // object-alt-content
import { rule as S3498 } from './S3498'; // object-shorthand
import { rule as S3757 } from './S3757'; // operation-returning-nan
import { rule as S4721 } from './S4721'; // os-command
import { rule as S2819 } from './S2819'; // post-message
import { rule as S4524 } from './S4524'; // prefer-default-last
import { rule as S6572 } from './S6572'; // prefer-enum-initializers
import { rule as S4138 } from './S4138'; // prefer-for-of
import { rule as S6598 } from './S6598'; // prefer-function-type
import { rule as S1488 } from './S1488'; // prefer-immediate-return
import { rule as S4156 } from './S4156'; // prefer-namespace-keyword
import { rule as S6606 } from './S6606'; // prefer-nullish-coalescing
import { rule as S2428 } from './S2428'; // prefer-object-literal
import { rule as S6661 } from './S6661'; // prefer-object-spread
import { rule as S4634 } from './S4634'; // prefer-promise-shorthand
import { rule as S1126 } from './S1126'; // prefer-single-boolean-return
import { rule as S6666 } from './S6666'; // prefer-spread
import { rule as S6557 } from './S6557'; // prefer-string-starts-ends-with
import { rule as S3512 } from './S3512'; // prefer-template
import { rule as S4322 } from './S4322'; // prefer-type-guard
import { rule as S1264 } from './S1264'; // prefer-while
import { rule as S4823 } from './S4823'; // process-argv
import { rule as S4507 } from './S4507'; // production-debug
import { rule as S2245 } from './S2245'; // pseudo-random
import { rule as S1444 } from './S1444'; // public-static-readonly
import { rule as S5443 } from './S5443'; // publicly-writable-directories
import { rule as S6959 } from './S6959'; // reduce-initial-value
import { rule as S6564 } from './S6564'; // redundant-type-aliases
import { rule as S5843 } from './S5843'; // regex-complexity
import { rule as S4784 } from './S4784'; // regular-expr
import { rule as S6440 } from './S6440'; // rules-of-hooks
import { rule as S1438 } from './S1438'; // semi
import { rule as S5876 } from './S5876'; // session-regeneration
import { rule as S3499 } from './S3499'; // shorthand-property-grouping
import { rule as S6397 } from './S6397'; // single-char-in-character-classes
import { rule as S6035 } from './S6035'; // single-character-alternation
import { rule as S5852 } from './S5852'; // slow-regex
import { rule as S4818 } from './S4818'; // sockets
import { rule as S2392 } from './S2392'; // sonar-block-scoped-var
import { rule as S6439 } from './S6439'; // sonar-jsx-no-leaked-render
import { rule as S104 } from './S104'; // sonar-max-lines
import { rule as S138 } from './S138'; // sonar-max-lines-per-function
import { rule as S107 } from './S107'; // sonar-max-params
import { rule as S6324 } from './S6324'; // sonar-no-control-regex
import { rule as S1534 } from './S1534'; // sonar-no-dupe-keys
import { rule as S2639 } from './S2639'; // sonar-no-empty-character-class
import { rule as S128 } from './S128'; // sonar-no-fallthrough
import { rule as S5856 } from './S5856'; // sonar-no-invalid-regexp
import { rule as S109 } from './S109'; // sonar-no-magic-numbers
import { rule as S5868 } from './S5868'; // sonar-no-misleading-character-class
import { rule as S6326 } from './S6326'; // sonar-no-regex-spaces
import { rule as S6441 } from './S6441'; // sonar-no-unused-class-component-methods
import { rule as S1481 } from './S1481'; // sonar-no-unused-vars
import { rule as S6582 } from './S6582'; // sonar-prefer-optional-chain
import { rule as S6759 } from './S6759'; // sonar-prefer-read-only-props
import { rule as S6594 } from './S6594'; // sonar-prefer-regexp-exec
import { rule as S2077 } from './S2077'; // sql-queries
import { rule as S5973 } from './S5973'; // stable-tests
import { rule as S4829 } from './S4829'; // standard-input
import { rule as S6351 } from './S6351'; // stateful-regex
import { rule as S5739 } from './S5739'; // strict-transport-security
import { rule as S3003 } from './S3003'; // strings-comparison
import { rule as S3854 } from './S3854'; // super-invocation
import { rule as S131 } from './S131'; // switch-without-default
import { rule as S5256 } from './S5256'; // table-header
import { rule as S5260 } from './S5260'; // table-header-reference
import { rule as S5958 } from './S5958'; // test-check-exception
import { rule as S1135 } from './S1135'; // todo-tag
import { rule as S135 } from './S135'; // too-many-break-or-continue-in-loop
import { rule as S5867 } from './S5867'; // unicode-aware-regex
import { rule as S6535 } from './S6535'; // unnecessary-character-escapes
import { rule as S1128 } from './S1128'; // unused-import
import { rule as S5860 } from './S5860'; // unused-named-groups
import { rule as S4830 } from './S4830'; // unverified-certificate
import { rule as S5527 } from './S5527'; // unverified-hostname
import { rule as S3500 } from './S3500'; // updated-const-var
import { rule as S2310 } from './S2310'; // updated-loop-counter
import { rule as S2688 } from './S2688'; // use-isnan
import { rule as S4323 } from './S4323'; // use-type-alias
import { rule as S1154 } from './S1154'; // useless-string-operation
import { rule as S3758 } from './S3758'; // values-not-convertible-to-numbers
import { rule as S117 } from './S117'; // variable-name
import { rule as S3735 } from './S3735'; // void-use
import { rule as S4423 } from './S4423'; // weak-ssl
import { rule as S2817 } from './S2817'; // web-sql-database
import { rule as S5689 } from './S5689'; // x-powered-by
import { rule as S2755 } from './S2755'; // xml-parser-xxe
import { rule as S4817 } from './S4817';
import { eslintRules } from './core';
import { rules as a11yPluginRules } from 'eslint-plugin-jsx-a11y';
import { tsEslintRules } from './typescript-eslint';
import { rules as importPluginRules } from 'eslint-plugin-import';
import { rules as reactPluginRules } from 'eslint-plugin-react'; // xpath

const bridgeRules: { [key: string]: Rule.RuleModule } = {
  S100,
  S101,
  S103: eslintRules['max-len'],
  S104,
  S105,
  S106: eslintRules['no-console'],
  S1066,
  S1067,
  S1068,
  S107,
  S1077,
  S108: eslintRules['no-empty'],
  S1082,
  S109,
  S1090: a11yPluginRules['iframe-has-title'],
  S1105,
  S1110,
  S1116,
  S1117: tsEslintRules['no-shadow'],
  S1119,
  S1121,
  S1125,
  S1126,
  S1128,
  S113: eslintRules['eol-last'],
  S1131: eslintRules['no-trailing-spaces'],
  S1134,
  S1135,
  S1143: eslintRules['no-unsafe-finally'],
  S1154,
  S117,
  S1172,
  S1186,
  S1192,
  S1199: eslintRules['no-lone-blocks'],
  S121: eslintRules['curly'],
  S1219,
  S122: eslintRules['max-statements-per-line'],
  S1226,
  S124,
  S125,
  S126,
  S1264,
  S128,
  S1301,
  S131,
  S1313,
  S1314: eslintRules['no-octal'],
  S1321: eslintRules['no-with'],
  S134,
  S135,
  S138,
  S139: eslintRules['line-comment-position'],
  S1438,
  S1439,
  S1440: eslintRules['eqeqeq'],
  S1441: eslintRules['quotes'],
  S1442: eslintRules['no-alert'],
  S1444,
  S1451,
  S1472,
  S1479,
  S1481,
  S1488,
  S1515,
  S1516: eslintRules['no-multi-str'],
  S1523,
  S1525: eslintRules['no-debugger'],
  S1526,
  S1527,
  S1528,
  S1529,
  S1530,
  S1533,
  S1534,
  S1535,
  S1536: eslintRules['no-dupe-args'],
  S1537: tsEslintRules['comma-dangle'],
  S1539: eslintRules['strict'],
  S1541,
  S1656: eslintRules['no-self-assign'],
  S1751,
  S1763,
  S1764,
  S1774: eslintRules['no-ternary'],
  S1788,
  S1821,
  S1848,
  S1854,
  S1862,
  S1871,
  S1874,
  S1940,
  S1994,
  S2004,
  S2068,
  S2077,
  S2092,
  S2094: tsEslintRules['no-extraneous-class'],
  S2123,
  S2137,
  S2138,
  S2187,
  S2189,
  S2201,
  S2208,
  S2234,
  S2245,
  S2251,
  S2255,
  S2259,
  S2310,
  S2376,
  S2392,
  S2424,
  S2427: eslintRules['radix'],
  S2430,
  S2432: eslintRules['no-setter-return'],
  S2428,
  S2486,
  S2589,
  S2598,
  S2612,
  S2639,
  S2681,
  S2685: eslintRules['no-caller'],
  S2688,
  S2692,
  S2699,
  S2703,
  S2737,
  S2755,
  S2757,
  S2814,
  S2817,
  S2819,
  S2870,
  S2871,
  S2933: tsEslintRules['prefer-readonly'],
  S2966: tsEslintRules['no-non-null-assertion'],
  S2970,
  S2990,
  S2999,
  S3001,
  S3003,
  S3257: tsEslintRules['no-inferrable-types'],
  S3317,
  S3330,
  S3353: eslintRules['prefer-const'],
  S3358,
  S3402,
  S3403,
  S3415,
  S3498,
  S3499,
  S3500,
  S3504,
  S3512,
  S3513,
  S3514,
  S3516,
  S3523: eslintRules['no-new-func'],
  S3524,
  S3525,
  S3531,
  S3533,
  S3579,
  S3616,
  S3626,
  S3686,
  S3696,
  S3699,
  S3758,
  S3723,
  S3735,
  S3757,
  S3760,
  S3776,
  S3782,
  S3785,
  S3786: eslintRules['no-template-curly-in-string'],
  S3796,
  S3798,
  S3799: eslintRules['no-empty-pattern'],
  S3800,
  S3801,
  S3812: eslintRules['no-unsafe-negation'],
  S3827,
  S3834: eslintRules['no-new-native-nonconstructor'],
  S3854,
  S3863: importPluginRules['no-duplicates'],
  S3923,
  S3972,
  S3973,
  S3981,
  S3984,
  S4023,
  S4030,
  S4036,
  S4043,
  S4084,
  S4123,
  S4124: tsEslintRules['no-misused-new'],
  S4125: eslintRules['valid-typeof'],
  S4136: tsEslintRules['adjacent-overload-signatures'],
  S4137: tsEslintRules['consistent-type-assertions'],
  S4138,
  S4139,
  S4140: eslintRules['no-sparse-arrays'],
  S4143,
  S4144,
  S4156,
  S4157: tsEslintRules['no-unnecessary-type-arguments'],
  S4158,
  S4165,
  S4204: tsEslintRules['no-explicit-any'],
  S4275,
  S4322,
  S4323,
  S4324,
  S4325: tsEslintRules['no-unnecessary-type-assertion'],
  S4326: eslintRules['no-return-await'],
  S4327,
  S4328,
  S4335,
  S4423,
  S4426,
  S4502,
  S4507,
  S4524,
  S4619,
  S4621,
  S4622,
  S4623,
  S4624,
  S4634,
  S4721,
  S4782,
  S4784,
  S4787,
  S4790,
  S4798,
  S4817,
  S4818,
  S4822,
  S4823,
  S4829,
  S4830,
  S5042,
  S5122,
  S5148,
  S5247,
  S5254,
  S5256,
  S5257,
  S5260,
  S5264,
  S5332,
  S5443,
  S5527,
  S5542,
  S5547,
  S5604,
  S5659,
  S5689,
  S5691,
  S5693,
  S5725,
  S5728,
  S5730,
  S5732,
  S5734,
  S5736,
  S5739,
  S5742,
  S5743,
  S5757,
  S5759,
  S5842,
  S5843,
  S5850,
  S5852,
  S5856,
  S5860,
  S5863,
  S5867,
  S5868,
  S5869,
  S5876,
  S5958,
  S5973,
  S6019,
  S6035,
  S6079,
  S6080,
  S6092,
  S6245,
  S6249,
  S6252,
  S6265,
  S6268,
  S6270,
  S6275,
  S6281,
  S6299,
  S6302,
  S6303,
  S6304,
  S6308,
  S6317,
  S6319,
  S6321,
  S6323,
  S6324,
  S6325: eslintRules['prefer-regex-literals'],
  S6326,
  S6327,
  S6328,
  S6329,
  S6330,
  S6331,
  S6332,
  S6333,
  S6351,
  S6353,
  S6397,
  S6426,
  S6435: reactPluginRules['require-render-return'],
  S6438: reactPluginRules['jsx-no-comment-textnodes'],
  S6439,
  S6440,
  S6441,
  S6442,
  S6443,
  S6477,
  S6478,
  S6479,
  S6480: reactPluginRules['jsx-no-bind'],
  S6481,
  S6486,
  S6509: eslintRules['no-extra-boolean-cast'],
  S6522: eslintRules['no-import-assign'],
  S6523: eslintRules['no-unsafe-optional-chaining'],
  S6534: eslintRules['no-loss-of-precision'],
  S6535,
  S6544,
  S6550: tsEslintRules['prefer-literal-enum-member'],
  S6551,
  S6557,
  S6564,
  S6565: tsEslintRules['prefer-return-this-type'],
  S6568: tsEslintRules['no-confusing-non-null-assertion'],
  S6569: tsEslintRules['no-unnecessary-type-constraint'],
  S6571,
  S6572,
  S6578: tsEslintRules['no-duplicate-enum-values'],
  S6582,
  S6583: tsEslintRules['no-mixed-enums'],
  S6590: tsEslintRules['prefer-as-const'],
  S6594,
  S6598,
  S6606,
  S6635: eslintRules['no-constructor-return'],
  S6637: eslintRules['no-extra-bind'],
  S6638: eslintRules['no-constant-binary-expression'],
  S6643,
  S6644: eslintRules['no-unneeded-ternary'],
  S6645: eslintRules['no-undef-init'],
  S6647,
  S6650: eslintRules['no-useless-rename'],
  S6653: eslintRules['prefer-object-has-own'],
  S6654: eslintRules['no-proto'],
  S6657: eslintRules['no-octal-escape'],
  S6660,
  S6661,
  S6666,
  S6671: tsEslintRules['prefer-promise-reject-errors'],
  S6676,
  S6679,
  S6746: reactPluginRules['no-direct-mutation-state'],
  S6747,
  S6748: reactPluginRules['no-children-prop'],
  S6749,
  S6750: reactPluginRules['no-render-return-value'],
  S6754,
  S6756: reactPluginRules['no-access-state-in-setstate'],
  S6757: reactPluginRules['no-this-in-sfc'],
  S6759,
  S6761: reactPluginRules['no-danger-with-children'],
  S6763: reactPluginRules['no-redundant-should-component-update'],
  S6766: reactPluginRules['no-unescaped-entities'],
  S6767: reactPluginRules['no-unused-prop-types'],
  S6770: reactPluginRules['jsx-pascal-case'],
  S6772: reactPluginRules['jsx-child-element-spacing'],
  S6774: reactPluginRules['prop-types'],
  S6775: reactPluginRules['default-props-match-prop-types'],
  S6788,
  S6789: reactPluginRules['no-is-mounted'],
  S6790: reactPluginRules['no-string-refs'],
  S6791,
  S6793: a11yPluginRules['aria-proptypes'],
  S6807: a11yPluginRules['role-has-required-aria-props'],
  S6811: a11yPluginRules['role-supports-aria-props'],
  S6819: a11yPluginRules['prefer-tag-over-role'],
  S6821: a11yPluginRules['aria-role'],
  S6822: a11yPluginRules['no-redundant-roles'],
  S6823: a11yPluginRules['aria-activedescendant-has-tabindex'],
  S6824: a11yPluginRules['aria-unsupported-elements'],
  S6825: a11yPluginRules['no-aria-hidden-on-focusable'],
  S6827,
  S6836: eslintRules['no-case-declarations'],
  S6840: a11yPluginRules['autocomplete-valid'],
  S6841: a11yPluginRules['tabindex-no-positive'],
  S6842: a11yPluginRules['no-noninteractive-element-to-interactive-role'],
  S6843: a11yPluginRules['no-interactive-element-to-noninteractive-role'],
  S6844,
  S6845: a11yPluginRules['no-noninteractive-tabindex'],
  S6846: a11yPluginRules['no-access-key'],
  S6847: a11yPluginRules['no-noninteractive-element-interactions'],
  S6848: a11yPluginRules['no-static-element-interactions'],
  S6850: a11yPluginRules['heading-has-content'],
  S6851: a11yPluginRules['img-redundant-alt'],
  S6852: a11yPluginRules['interactive-supports-focus'],
  S6853,
  S6859: importPluginRules['no-absolute-path'],
  S6861: importPluginRules['no-mutable-exports'],
  S6957,
  S6958,
  S6959,
  S878: eslintRules['no-sequences'],
  S881,
  S888,
  S905,
  S909: eslintRules['no-continue'],
  S930,
};

export const pluginRules: Record<string, Rule.RuleModule> = {};

/**
 * Maps ESLint rule keys to rule implementations in order to preserve the contract of the ESLint plugin
 */
pluginRules['accessor-pairs'] = S2376;
pluginRules['alt-text'] = S1077;
pluginRules['anchor-has-content'] = S6827;
pluginRules['anchor-is-valid'] = S6844;
pluginRules['anchor-precedence'] = S5850;
pluginRules['argument-type'] = S3782;
pluginRules['arguments-order'] = S2234;
pluginRules['arguments-usage'] = S3513;
pluginRules['array-callback-without-return'] = S3796;
pluginRules['array-constructor'] = S1528;
pluginRules['arrow-function-convention'] = S3524;
pluginRules['assertions-in-tests'] = S2699;
pluginRules['aws-apigateway-public-api'] = S6333;
pluginRules['aws-ec2-rds-dms-public'] = S6329;
pluginRules['aws-ec2-unencrypted-ebs-volume'] = S6275;
pluginRules['aws-efs-unencrypted'] = S6332;
pluginRules['aws-iam-all-privileges'] = S6302;
pluginRules['aws-iam-all-resources-accessible'] = S6304;
pluginRules['aws-iam-privilege-escalation'] = S6317;
pluginRules['aws-iam-public-access'] = S6270;
pluginRules['aws-opensearchservice-domain'] = S6308;
pluginRules['aws-rds-unencrypted-databases'] = S6303;
pluginRules['aws-restricted-ip-admin-access'] = S6321;
pluginRules['aws-s3-bucket-granted-access'] = S6265;
pluginRules['aws-s3-bucket-insecure-http'] = S6249;
pluginRules['aws-s3-bucket-public-access'] = S6281;
pluginRules['aws-s3-bucket-server-encryption'] = S6245;
pluginRules['aws-s3-bucket-versioning'] = S6252;
pluginRules['aws-sagemaker-unencrypted-notebook'] = S6319;
pluginRules['aws-sns-unencrypted-topics'] = S6327;
pluginRules['aws-sqs-unencrypted-queue'] = S6330;
pluginRules['bitwise-operators'] = S1529;
pluginRules['bool-param-default'] = S4798;
pluginRules['brace-style'] = S1105;
pluginRules['call-argument-line'] = S1472;
pluginRules['certificate-transparency'] = S5742;
pluginRules['chai-determinate-assertion'] = S6092;
pluginRules['class-name'] = S101;
pluginRules['class-prototype'] = S3525;
pluginRules['code-eval'] = S1523;
pluginRules['cognitive-complexity'] = S3776;
pluginRules['comma-or-logical-or-case'] = S3616;
pluginRules['comment-regex'] = S124;
pluginRules['concise-regex'] = S6353;
pluginRules['conditional-indentation'] = S3973;
pluginRules['confidential-information-logging'] = S5757;
pluginRules['constructor-for-side-effects'] = S1848;
pluginRules['content-length'] = S5693;
pluginRules['content-security-policy'] = S5728;
pluginRules['cookie-no-httponly'] = S3330;
pluginRules['cookies'] = S2255;
pluginRules['cors'] = S5122;
pluginRules['csrf'] = S4502;
pluginRules['cyclomatic-complexity'] = S1541;
pluginRules['declarations-in-global-scope'] = S3798;
pluginRules['default-param-last'] = S1788;
pluginRules['deprecation'] = S1874;
pluginRules['destructuring-assignment-syntax'] = S3514;
pluginRules['different-types-comparison'] = S3403;
pluginRules['disabled-auto-escaping'] = S5247;
pluginRules['disabled-resource-integrity'] = S5725;
pluginRules['disabled-timeout'] = S6080;
pluginRules['dns-prefetching'] = S5743;
pluginRules['duplicates-in-character-class'] = S5869;
pluginRules['elseif-without-else'] = S126;
pluginRules['empty-string-repetition'] = S5842;
pluginRules['encryption'] = S4787;
pluginRules['encryption-secure-mode'] = S5542;
pluginRules['enforce-trailing-comma'] = S3723;
pluginRules['existing-groups'] = S6328;
pluginRules['expression-complexity'] = S1067;
pluginRules['file-header'] = S1451;
pluginRules['file-name-differ-from-class'] = S3317;
pluginRules['file-permissions'] = S2612;
pluginRules['file-uploads'] = S2598;
pluginRules['fixme-tag'] = S1134;
pluginRules['for-in'] = S1535;
pluginRules['for-loop-increment-sign'] = S2251;
pluginRules['frame-ancestors'] = S5732;
pluginRules['function-inside-loop'] = S1515;
pluginRules['function-name'] = S100;
pluginRules['function-return-type'] = S3800;
pluginRules['future-reserved-words'] = S1527;
pluginRules['generator-without-yield'] = S3531;
pluginRules['hashing'] = S4790;
pluginRules['hidden-files'] = S5691;
pluginRules['hook-use-state'] = S6754;
pluginRules['html-has-lang'] = S5254;
pluginRules['in-operator-type-error'] = S3785;
pluginRules['inconsistent-function-call'] = S3686;
pluginRules['index-of-compare-to-positive-number'] = S2692;
pluginRules['insecure-cookie'] = S2092;
pluginRules['insecure-jwt-token'] = S5659;
pluginRules['inverted-assertion-arguments'] = S3415;
pluginRules['jsx-key'] = S6477;
pluginRules['jsx-no-constructed-context-values'] = S6481;
pluginRules['jsx-no-useless-fragment'] = S6749;
pluginRules['label-has-associated-control'] = S6853;
pluginRules['label-position'] = S1439;
pluginRules['link-with-target-blank'] = S5148;
pluginRules['max-switch-cases'] = S1479;
pluginRules['max-union-size'] = S4622;
pluginRules['media-has-caption'] = S4084;
pluginRules['misplaced-loop-counter'] = S1994;
pluginRules['mouse-events-a11y'] = S1082;
pluginRules['nested-control-flow'] = S134;
pluginRules['new-cap'] = S2430;
pluginRules['new-operator-misuse'] = S2999;
pluginRules['no-accessor-field-mismatch'] = S4275;
pluginRules['no-all-duplicated-branches'] = S3923;
pluginRules['no-alphabetical-sort'] = S2871;
pluginRules['no-angular-bypass-sanitization'] = S6268;
pluginRules['no-array-delete'] = S2870;
pluginRules['no-array-index-key'] = S6479;
pluginRules['no-associative-arrays'] = S3579;
pluginRules['no-base-to-string'] = S6551;
pluginRules['no-built-in-override'] = S2424;
pluginRules['no-case-label-in-switch'] = S1219;
pluginRules['no-clear-text-protocols'] = S5332;
pluginRules['no-code-after-done'] = S6079;
pluginRules['no-collapsible-if'] = S1066;
pluginRules['no-collection-size-mischeck'] = S3981;
pluginRules['no-commented-code'] = S125;
pluginRules['no-dead-store'] = S1854;
pluginRules['no-delete-var'] = S3001;
pluginRules['no-deprecated-react'] = S6957;
pluginRules['no-duplicate-in-composite'] = S4621;
pluginRules['no-duplicate-string'] = S1192;
pluginRules['no-duplicated-branches'] = S1871;
pluginRules['no-element-overwrite'] = S4143;
pluginRules['no-empty-after-reluctant'] = S6019;
pluginRules['no-empty-alternatives'] = S6323;
pluginRules['no-empty-collection'] = S4158;
pluginRules['no-empty-function'] = S1186;
pluginRules['no-empty-group'] = S6331;
pluginRules['no-empty-interface'] = S4023;
pluginRules['no-empty-test-file'] = S2187;
pluginRules['no-equals-in-for-termination'] = S888;
pluginRules['no-exclusive-tests'] = S6426;
pluginRules['no-extend-native'] = S6643;
pluginRules['no-extra-arguments'] = S930;
pluginRules['no-extra-semi'] = S1116;
pluginRules['no-find-dom-node'] = S6788;
pluginRules['no-for-in-iterable'] = S4139;
pluginRules['no-function-declaration-in-block'] = S1530;
pluginRules['no-global-this'] = S2990;
pluginRules['no-globals-shadowing'] = S2137;
pluginRules['no-gratuitous-expressions'] = S2589;
pluginRules['no-hardcoded-credentials'] = S2068;
pluginRules['no-hardcoded-ip'] = S1313;
pluginRules['no-hook-setter-in-body'] = S6442;
pluginRules['no-identical-conditions'] = S1862;
pluginRules['no-identical-expressions'] = S1764;
pluginRules['no-identical-functions'] = S4144;
pluginRules['no-ignored-exceptions'] = S2486;
pluginRules['no-ignored-return'] = S2201;
pluginRules['no-implicit-dependencies'] = S4328;
pluginRules['no-implicit-global'] = S2703;
pluginRules['no-in-misuse'] = S4619;
pluginRules['no-incomplete-assertions'] = S2970;
pluginRules['no-inconsistent-returns'] = S3801;
pluginRules['no-incorrect-string-concat'] = S3402;
pluginRules['no-infinite-loop'] = S2189;
pluginRules['no-intrusive-permissions'] = S5604;
pluginRules['no-invalid-await'] = S4123;
pluginRules['no-invariant-returns'] = S3516;
pluginRules['no-inverted-boolean-check'] = S1940;
pluginRules['no-ip-forward'] = S5759;
pluginRules['no-labels'] = S1119;
pluginRules['no-literal-call'] = S6958;
pluginRules['no-lonely-if'] = S6660;
pluginRules['no-mime-sniff'] = S5734;
pluginRules['no-misleading-array-reverse'] = S4043;
pluginRules['no-misused-promises'] = S6544;
pluginRules['no-mixed-content'] = S5730;
pluginRules['no-nested-assignment'] = S1121;
pluginRules['no-nested-conditional'] = S3358;
pluginRules['no-nested-functions'] = S2004;
pluginRules['no-nested-incdec'] = S881;
pluginRules['no-nested-switch'] = S1821;
pluginRules['no-nested-template-literals'] = S4624;
pluginRules['no-one-iteration-loop'] = S1751;
pluginRules['no-os-command-from-path'] = S4036;
pluginRules['no-parameter-reassignment'] = S1226;
pluginRules['no-primitive-wrappers'] = S1533;
pluginRules['no-redeclare'] = S2814;
pluginRules['no-redundant-assignments'] = S4165;
pluginRules['no-redundant-boolean'] = S1125;
pluginRules['no-redundant-jump'] = S3626;
pluginRules['no-redundant-optional'] = S4782;
pluginRules['no-redundant-parentheses'] = S1110;
pluginRules['no-redundant-type-constituents'] = S6571;
pluginRules['no-reference-error'] = S3827;
pluginRules['no-referrer-policy'] = S5736;
pluginRules['no-require-or-define'] = S3533;
pluginRules['no-return-type-any'] = S4324;
pluginRules['no-same-argument-assert'] = S5863;
pluginRules['no-same-line-conditional'] = S3972;
pluginRules['no-self-compare'] = S6679;
pluginRules['no-small-switch'] = S1301;
pluginRules['no-tab'] = S105;
pluginRules['no-table-as-layout'] = S5257;
pluginRules['no-this-alias'] = S4327;
pluginRules['no-throw-literal'] = S3696;
pluginRules['no-try-promise'] = S4822;
pluginRules['no-undefined-argument'] = S4623;
pluginRules['no-undefined-assignment'] = S2138;
pluginRules['no-unenclosed-multiline-block'] = S2681;
pluginRules['no-uniq-key'] = S6486;
pluginRules['no-unknown-property'] = S6747;
pluginRules['no-unreachable'] = S1763;
pluginRules['no-unsafe'] = S6791;
pluginRules['no-unsafe-unzip'] = S5042;
pluginRules['no-unstable-nested-components'] = S6478;
pluginRules['no-unthrown-error'] = S3984;
pluginRules['no-unused-collection'] = S4030;
pluginRules['no-unused-expressions'] = S905;
pluginRules['no-unused-function-argument'] = S1172;
pluginRules['no-unused-private-class-members'] = S1068;
pluginRules['no-use-of-empty-return-value'] = S3699;
pluginRules['no-useless-call'] = S6676;
pluginRules['no-useless-catch'] = S2737;
pluginRules['no-useless-constructor'] = S6647;
pluginRules['no-useless-increment'] = S2123;
pluginRules['no-useless-intersection'] = S4335;
pluginRules['no-useless-react-setstate'] = S6443;
pluginRules['no-var'] = S3504;
pluginRules['no-variable-usage-before-declaration'] = S1526;
pluginRules['no-vue-bypass-sanitization'] = S6299;
pluginRules['no-weak-cipher'] = S5547;
pluginRules['no-weak-keys'] = S4426;
pluginRules['no-wildcard-import'] = S2208;
pluginRules['non-existent-operator'] = S2757;
pluginRules['non-number-in-arithmetic-expression'] = S3760;
pluginRules['null-dereference'] = S2259;
pluginRules['object-alt-content'] = S5264;
pluginRules['object-shorthand'] = S3498;
pluginRules['operation-returning-nan'] = S3757;
pluginRules['os-command'] = S4721;
pluginRules['post-message'] = S2819;
pluginRules['prefer-default-last'] = S4524;
pluginRules['prefer-enum-initializers'] = S6572;
pluginRules['prefer-for-of'] = S4138;
pluginRules['prefer-function-type'] = S6598;
pluginRules['prefer-immediate-return'] = S1488;
pluginRules['prefer-namespace-keyword'] = S4156;
pluginRules['prefer-nullish-coalescing'] = S6606;
pluginRules['prefer-object-literal'] = S2428;
pluginRules['prefer-object-spread'] = S6661;
pluginRules['prefer-promise-shorthand'] = S4634;
pluginRules['prefer-single-boolean-return'] = S1126;
pluginRules['prefer-spread'] = S6666;
pluginRules['prefer-string-starts-ends-with'] = S6557;
pluginRules['prefer-template'] = S3512;
pluginRules['prefer-type-guard'] = S4322;
pluginRules['prefer-while'] = S1264;
pluginRules['process-argv'] = S4823;
pluginRules['production-debug'] = S4507;
pluginRules['pseudo-random'] = S2245;
pluginRules['public-static-readonly'] = S1444;
pluginRules['publicly-writable-directories'] = S5443;
pluginRules['reduce-initial-value'] = S6959;
pluginRules['redundant-type-aliases'] = S6564;
pluginRules['regex-complexity'] = S5843;
pluginRules['regular-expr'] = S4784;
pluginRules['pluginRules-of-hooks'] = S6440;
pluginRules['semi'] = S1438;
pluginRules['session-regeneration'] = S5876;
pluginRules['shorthand-property-grouping'] = S3499;
pluginRules['single-char-in-character-classes'] = S6397;
pluginRules['single-character-alternation'] = S6035;
pluginRules['slow-regex'] = S5852;
pluginRules['sockets'] = S4818;
pluginRules['sonar-block-scoped-var'] = S2392;
pluginRules['sonar-jsx-no-leaked-render'] = S6439;
pluginRules['sonar-max-lines'] = S104;
pluginRules['sonar-max-lines-per-function'] = S138;
pluginRules['sonar-max-params'] = S107;
pluginRules['sonar-no-control-regex'] = S6324;
pluginRules['sonar-no-dupe-keys'] = S1534;
pluginRules['sonar-no-empty-character-class'] = S2639;
pluginRules['sonar-no-fallthrough'] = S128;
pluginRules['sonar-no-invalid-regexp'] = S5856;
pluginRules['sonar-no-magic-numbers'] = S109;
pluginRules['sonar-no-misleading-character-class'] = S5868;
pluginRules['sonar-no-regex-spaces'] = S6326;
pluginRules['sonar-no-unused-class-component-methods'] = S6441;
pluginRules['sonar-no-unused-vars'] = S1481;
pluginRules['sonar-prefer-optional-chain'] = S6582;
pluginRules['sonar-prefer-read-only-props'] = S6759;
pluginRules['sonar-prefer-regexp-exec'] = S6594;
pluginRules['sql-queries'] = S2077;
pluginRules['stable-tests'] = S5973;
pluginRules['standard-input'] = S4829;
pluginRules['stateful-regex'] = S6351;
pluginRules['strict-transport-security'] = S5739;
pluginRules['strings-comparison'] = S3003;
pluginRules['super-invocation'] = S3854;
pluginRules['switch-without-default'] = S131;
pluginRules['table-header'] = S5256;
pluginRules['table-header-reference'] = S5260;
pluginRules['test-check-exception'] = S5958;
pluginRules['todo-tag'] = S1135;
pluginRules['too-many-break-or-continue-in-loop'] = S135;
pluginRules['unicode-aware-regex'] = S5867;
pluginRules['unnecessary-character-escapes'] = S6535;
pluginRules['unused-import'] = S1128;
pluginRules['unused-named-groups'] = S5860;
pluginRules['unverified-certificate'] = S4830;
pluginRules['unverified-hostname'] = S5527;
pluginRules['updated-const-var'] = S3500;
pluginRules['updated-loop-counter'] = S2310;
pluginRules['use-isnan'] = S2688;
pluginRules['use-type-alias'] = S4323;
pluginRules['useless-string-operation'] = S1154;
pluginRules['values-not-convertible-to-numbers'] = S3758;
pluginRules['variable-name'] = S117;
pluginRules['void-use'] = S3735;
pluginRules['weak-ssl'] = S4423;
pluginRules['web-sql-database'] = S2817;
pluginRules['x-powered-by'] = S5689;
pluginRules['xml-parser-xxe'] = S2755;
pluginRules['xpath'] = S4817;

const rules: Record<string, Rule.RuleModule> = {
  ...bridgeRules,
  ...pluginRules,
};

const recommendedLegacyConfig: TSESLint.Linter.ConfigType = { plugins: ['sonarjs'], rules: {} };
const recommendedConfig: FlatConfig.Config = {
  name: 'sonarjs/recommended',
  plugins: {
    sonarjs: {
      rules,
    },
  },
  rules: {},
  settings: {
    react: {
      version: '999.999.999',
    },
  },
};

for (const [key, rule] of Object.entries(pluginRules)) {
  const recommended = !!rule.meta!.docs?.recommended;

  recommendedConfig.rules![`sonarjs/${key}`] = recommended ? 'error' : 'off';
}

recommendedLegacyConfig.rules = recommendedConfig.rules;
recommendedLegacyConfig.settings = recommendedConfig.settings;

export const configs = {
  recommended: recommendedConfig,
  'recommended-legacy': recommendedLegacyConfig,
};

/*
 package.json may be in current or parent dir depending on running with ts-jest or built js files
 we need to find it in both cases
 */
const packageJsonPath = findParent(__dirname, 'package.json');
const { name, version } = (
  packageJsonPath ? JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) : {}
) as PackageJson;
export const meta = {
  name,
  version,
};

export { rules };

export default { rules, configs, meta };

export * from './helpers';
