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

/**
 * This is a copy of packages/jsts/src/rules/index.ts (with a few extra exports at the bottom)
 * with a few rules commented out because they have heavy dependencies.
 *
 * There was an attempt to use dynamic imports, but the produced package was not working.
 * Feel free to investigate it when you have more time!
 */

import { TSESLint } from '@typescript-eslint/utils';
import { FlatConfig } from '@typescript-eslint/utils/ts-eslint';
import { Rule } from 'eslint';

import { rule as S2376 } from '../../jsts/src/rules/S2376'; // accessor-pairs
import { rule as S1077 } from '../../jsts/src/rules/S1077'; // alt-text
import { rule as S6827 } from '../../jsts/src/rules/S6827'; // anchor-has-content
import { rule as S6844 } from '../../jsts/src/rules/S6844'; // anchor-is-valid
import { rule as S5850 } from '../../jsts/src/rules/S5850'; // anchor-precedence
import { rule as S3782 } from '../../jsts/src/rules/S3782'; // argument-type
import { rule as S2234 } from '../../jsts/src/rules/S2234'; // arguments-order
import { rule as S3513 } from '../../jsts/src/rules/S3513'; // arguments-usage
import { rule as S3796 } from '../../jsts/src/rules/S3796'; // array-callback-without-return
import { rule as S1528 } from '../../jsts/src/rules/S1528'; // array-constructor
import { rule as S3524 } from '../../jsts/src/rules/S3524'; // arrow-function-convention
import { rule as S2699 } from '../../jsts/src/rules/S2699'; // assertions-in-tests
import { rule as S6333 } from '../../jsts/src/rules/S6333'; // aws-apigateway-public-api
import { rule as S6329 } from '../../jsts/src/rules/S6329'; // aws-ec2-rds-dms-public
import { rule as S6275 } from '../../jsts/src/rules/S6275'; // aws-ec2-unencrypted-ebs-volume
import { rule as S6332 } from '../../jsts/src/rules/S6332'; // aws-efs-unencrypted
import { rule as S6302 } from '../../jsts/src/rules/S6302'; // aws-iam-all-privileges
import { rule as S6304 } from '../../jsts/src/rules/S6304'; // aws-iam-all-resources-accessible
import { rule as S6317 } from '../../jsts/src/rules/S6317'; // aws-iam-privilege-escalation
import { rule as S6270 } from '../../jsts/src/rules/S6270'; // aws-iam-public-access
import { rule as S6308 } from '../../jsts/src/rules/S6308'; // aws-opensearchservice-domain
import { rule as S6303 } from '../../jsts/src/rules/S6303'; // aws-rds-unencrypted-databases
import { rule as S6321 } from '../../jsts/src/rules/S6321'; // aws-restricted-ip-admin-access
import { rule as S6265 } from '../../jsts/src/rules/S6265'; // aws-s3-bucket-granted-access
import { rule as S6249 } from '../../jsts/src/rules/S6249'; // aws-s3-bucket-insecure-http
import { rule as S6281 } from '../../jsts/src/rules/S6281'; // aws-s3-bucket-public-access
import { rule as S6245 } from '../../jsts/src/rules/S6245'; // aws-s3-bucket-server-encryption
import { rule as S6252 } from '../../jsts/src/rules/S6252'; // aws-s3-bucket-versioning
import { rule as S6319 } from '../../jsts/src/rules/S6319'; // aws-sagemaker-unencrypted-notebook
import { rule as S6327 } from '../../jsts/src/rules/S6327'; // aws-sns-unencrypted-topics
import { rule as S6330 } from '../../jsts/src/rules/S6330'; // aws-sqs-unencrypted-queue
import { rule as S1529 } from '../../jsts/src/rules/S1529'; // bitwise-operators
import { rule as S4798 } from '../../jsts/src/rules/S4798'; // bool-param-default
import { rule as S1105 } from '../../jsts/src/rules/S1105'; // brace-style
import { rule as S1472 } from '../../jsts/src/rules/S1472'; // call-argument-line
import { rule as S5742 } from '../../jsts/src/rules/S5742'; // certificate-transparency
import { rule as S6092 } from '../../jsts/src/rules/S6092'; // chai-determinate-assertion
import { rule as S101 } from '../../jsts/src/rules/S101'; // class-name
import { rule as S3525 } from '../../jsts/src/rules/S3525'; // class-prototype
import { rule as S1523 } from '../../jsts/src/rules/S1523'; // code-eval
import { rule as S3776 } from '../../jsts/src/rules/S3776'; // cognitive-complexity
import { rule as S3616 } from '../../jsts/src/rules/S3616'; // comma-or-logical-or-case
import { rule as S124 } from '../../jsts/src/rules/S124'; // comment-regex
import { rule as S6353 } from '../../jsts/src/rules/S6353'; // concise-regex
import { rule as S3973 } from '../../jsts/src/rules/S3973'; // conditional-indentation
import { rule as S5757 } from '../../jsts/src/rules/S5757'; // confidential-information-logging
import { rule as S1848 } from '../../jsts/src/rules/S1848'; // constructor-for-side-effects
import { rule as S5693 } from '../../jsts/src/rules/S5693'; // content-length
import { rule as S5728 } from '../../jsts/src/rules/S5728'; // content-security-policy
import { rule as S3330 } from '../../jsts/src/rules/S3330'; // cookie-no-httponly
import { rule as S2255 } from '../../jsts/src/rules/S2255'; // cookies
import { rule as S5122 } from '../../jsts/src/rules/S5122'; // cors
import { rule as S4502 } from '../../jsts/src/rules/S4502'; // csrf
import { rule as S1541 } from '../../jsts/src/rules/S1541'; // cyclomatic-complexity
import { rule as S3798 } from '../../jsts/src/rules/S3798'; // declarations-in-global-scope
import { rule as S1788 } from '../../jsts/src/rules/S1788'; // default-param-last
import { rule as S1874 } from '../../jsts/src/rules/S1874'; // deprecation
import { rule as S3514 } from '../../jsts/src/rules/S3514'; // destructuring-assignment-syntax
import { rule as S3403 } from '../../jsts/src/rules/S3403'; // different-types-comparison
import { rule as S5247 } from '../../jsts/src/rules/S5247'; // disabled-auto-escaping
import { rule as S5725 } from '../../jsts/src/rules/S5725'; // disabled-resource-integrity
import { rule as S6080 } from '../../jsts/src/rules/S6080'; // disabled-timeout
import { rule as S5743 } from '../../jsts/src/rules/S5743'; // dns-prefetching
import { rule as S5869 } from '../../jsts/src/rules/S5869'; // duplicates-in-character-class
import { rule as S126 } from '../../jsts/src/rules/S126'; // elseif-without-else
import { rule as S5842 } from '../../jsts/src/rules/S5842'; // empty-string-repetition
import { rule as S4787 } from '../../jsts/src/rules/S4787'; // encryption
import { rule as S5542 } from '../../jsts/src/rules/S5542'; // encryption-secure-mode
import { rule as S3723 } from '../../jsts/src/rules/S3723'; // enforce-trailing-comma
import { rule as S6328 } from '../../jsts/src/rules/S6328'; // existing-groups
import { rule as S1067 } from '../../jsts/src/rules/S1067'; // expression-complexity
import { rule as S1451 } from '../../jsts/src/rules/S1451'; // file-header
import { rule as S3317 } from '../../jsts/src/rules/S3317'; // file-name-differ-from-class
import { rule as S2612 } from '../../jsts/src/rules/S2612'; // file-permissions
import { rule as S2598 } from '../../jsts/src/rules/S2598'; // file-uploads
import { rule as S1134 } from '../../jsts/src/rules/S1134'; // fixme-tag
import { rule as S1535 } from '../../jsts/src/rules/S1535'; // for-in
import { rule as S2251 } from '../../jsts/src/rules/S2251'; // for-loop-increment-sign
import { rule as S5732 } from '../../jsts/src/rules/S5732'; // frame-ancestors
import { rule as S1515 } from '../../jsts/src/rules/S1515'; // function-inside-loop
import { rule as S100 } from '../../jsts/src/rules/S100'; // function-name
import { rule as S3800 } from '../../jsts/src/rules/S3800'; // function-return-type
import { rule as S1527 } from '../../jsts/src/rules/S1527'; // future-reserved-words
import { rule as S3531 } from '../../jsts/src/rules/S3531'; // generator-without-yield
import { rule as S4790 } from '../../jsts/src/rules/S4790'; // hashing
import { rule as S5691 } from '../../jsts/src/rules/S5691'; // hidden-files
//import { rule as S6754 } from '../../jsts/src/rules/S6754'; // hook-use-state
import { rule as S5254 } from '../../jsts/src/rules/S5254'; // html-has-lang
import { rule as S3785 } from '../../jsts/src/rules/S3785'; // in-operator-type-error
import { rule as S3686 } from '../../jsts/src/rules/S3686'; // inconsistent-function-call
import { rule as S2692 } from '../../jsts/src/rules/S2692'; // index-of-compare-to-positive-number
import { rule as S2092 } from '../../jsts/src/rules/S2092'; // insecure-cookie
import { rule as S5659 } from '../../jsts/src/rules/S5659'; // insecure-jwt-token
import { rule as S3415 } from '../../jsts/src/rules/S3415'; // inverted-assertion-arguments
import { rule as S6477 } from '../../jsts/src/rules/S6477'; // jsx-key
//import { rule as S6481 } from '../../jsts/src/rules/S6481'; // jsx-no-constructed-context-values
import { rule as S6749 } from '../../jsts/src/rules/S6749'; // jsx-no-useless-fragment
import { rule as S6853 } from '../../jsts/src/rules/S6853'; // label-has-associated-control
import { rule as S1439 } from '../../jsts/src/rules/S1439'; // label-position
import { rule as S5148 } from '../../jsts/src/rules/S5148'; // link-with-target-blank
import { rule as S1479 } from '../../jsts/src/rules/S1479'; // max-switch-cases
import { rule as S4622 } from '../../jsts/src/rules/S4622'; // max-union-size
import { rule as S4084 } from '../../jsts/src/rules/S4084'; // media-has-caption
import { rule as S1994 } from '../../jsts/src/rules/S1994'; // misplaced-loop-counter
import { rule as S1082 } from '../../jsts/src/rules/S1082'; // mouse-events-a11y
import { rule as S134 } from '../../jsts/src/rules/S134'; // nested-control-flow
import { rule as S2430 } from '../../jsts/src/rules/S2430'; // new-cap
import { rule as S2999 } from '../../jsts/src/rules/S2999'; // new-operator-misuse
import { rule as S4275 } from '../../jsts/src/rules/S4275'; // no-accessor-field-mismatch
import { rule as S3923 } from '../../jsts/src/rules/S3923'; // no-all-duplicated-branches
import { rule as S2871 } from '../../jsts/src/rules/S2871'; // no-alphabetical-sort
import { rule as S6268 } from '../../jsts/src/rules/S6268'; // no-angular-bypass-sanitization
import { rule as S2870 } from '../../jsts/src/rules/S2870'; // no-array-delete
import { rule as S6479 } from '../../jsts/src/rules/S6479'; // no-array-index-key
import { rule as S3579 } from '../../jsts/src/rules/S3579'; // no-associative-arrays
import { rule as S6551 } from '../../jsts/src/rules/S6551'; // no-base-to-string
import { rule as S2424 } from '../../jsts/src/rules/S2424'; // no-built-in-override
import { rule as S1219 } from '../../jsts/src/rules/S1219'; // no-case-label-in-switch
import { rule as S5332 } from '../../jsts/src/rules/S5332'; // no-clear-text-protocols
import { rule as S6079 } from '../../jsts/src/rules/S6079'; // no-code-after-done
import { rule as S1066 } from '../../jsts/src/rules/S1066'; // no-collapsible-if
import { rule as S3981 } from '../../jsts/src/rules/S3981'; // no-collection-size-mischeck
//import { rule as S125 } from '../jsts/src/rules/S125'; // no-commented-code
import { rule as S1854 } from '../../jsts/src/rules/S1854'; // no-dead-store
import { rule as S3001 } from '../../jsts/src/rules/S3001'; // no-delete-var
//import { rule as S6957 } from '../jsts/src/rules/S6957'; // no-deprecated-react
import { rule as S4621 } from '../../jsts/src/rules/S4621'; // no-duplicate-in-composite
import { rule as S1192 } from '../../jsts/src/rules/S1192'; // no-duplicate-string
import { rule as S1871 } from '../../jsts/src/rules/S1871'; // no-duplicated-branches
import { rule as S4143 } from '../../jsts/src/rules/S4143'; // no-element-overwrite
import { rule as S6019 } from '../../jsts/src/rules/S6019'; // no-empty-after-reluctant
import { rule as S6323 } from '../../jsts/src/rules/S6323'; // no-empty-alternatives
import { rule as S4158 } from '../../jsts/src/rules/S4158'; // no-empty-collection
import { rule as S1186 } from '../../jsts/src/rules/S1186'; // no-empty-function
import { rule as S6331 } from '../../jsts/src/rules/S6331'; // no-empty-group
import { rule as S4023 } from '../../jsts/src/rules/S4023'; // no-empty-interface
import { rule as S2187 } from '../../jsts/src/rules/S2187'; // no-empty-test-file
import { rule as S888 } from '../../jsts/src/rules/S888'; // no-equals-in-for-termination
import { rule as S6426 } from '../../jsts/src/rules/S6426'; // no-exclusive-tests
import { rule as S6643 } from '../../jsts/src/rules/S6643'; // no-extend-native
import { rule as S930 } from '../../jsts/src/rules/S930'; // no-extra-arguments
import { rule as S1116 } from '../../jsts/src/rules/S1116'; // no-extra-semi
import { rule as S6788 } from '../../jsts/src/rules/S6788'; // no-find-dom-node
import { rule as S4139 } from '../../jsts/src/rules/S4139'; // no-for-in-iterable
import { rule as S1530 } from '../../jsts/src/rules/S1530'; // no-function-declaration-in-block
import { rule as S2990 } from '../../jsts/src/rules/S2990'; // no-global-this
import { rule as S2137 } from '../../jsts/src/rules/S2137'; // no-globals-shadowing
import { rule as S2589 } from '../../jsts/src/rules/S2589'; // no-gratuitous-expressions
import { rule as S2068 } from '../../jsts/src/rules/S2068'; // no-hardcoded-credentials
import { rule as S1313 } from '../../jsts/src/rules/S1313'; // no-hardcoded-ip
import { rule as S6442 } from '../../jsts/src/rules/S6442'; // no-hook-setter-in-body
import { rule as S1862 } from '../../jsts/src/rules/S1862'; // no-identical-conditions
import { rule as S1764 } from '../../jsts/src/rules/S1764'; // no-identical-expressions
import { rule as S4144 } from '../../jsts/src/rules/S4144'; // no-identical-functions
import { rule as S2486 } from '../../jsts/src/rules/S2486'; // no-ignored-exceptions
import { rule as S2201 } from '../../jsts/src/rules/S2201'; // no-ignored-return
//import { rule as S4328 } from '../jsts/src/rules/S4328'; // no-implicit-dependencies
import { rule as S2703 } from '../../jsts/src/rules/S2703'; // no-implicit-global
import { rule as S4619 } from '../../jsts/src/rules/S4619'; // no-in-misuse
import { rule as S1940 } from '../../jsts/src/rules/S1940'; // no-inverted-boolean-check
import { rule as S2970 } from '../../jsts/src/rules/S2970'; // no-incomplete-assertions
//import { rule as S3801 } from '../../jsts/src/rules/S3801'; // no-inconsistent-returns
import { rule as S3402 } from '../../jsts/src/rules/S3402'; // no-incorrect-string-concat
import { rule as S2189 } from '../../jsts/src/rules/S2189'; // no-infinite-loop
import { rule as S5604 } from '../../jsts/src/rules/S5604'; // no-intrusive-permissions
import { rule as S4123 } from '../../jsts/src/rules/S4123'; // no-invalid-await
import { rule as S3516 } from '../../jsts/src/rules/S3516'; // no-invariant-returns
import { rule as S5759 } from '../../jsts/src/rules/S5759'; // no-ip-forward
import { rule as S1119 } from '../../jsts/src/rules/S1119'; // no-labels
import { rule as S6958 } from '../../jsts/src/rules/S6958'; // no-literal-call
import { rule as S6660 } from '../../jsts/src/rules/S6660'; // no-lonely-if
import { rule as S5734 } from '../../jsts/src/rules/S5734'; // no-mime-sniff
import { rule as S4043 } from '../../jsts/src/rules/S4043'; // no-misleading-array-reverse
import { rule as S6544 } from '../../jsts/src/rules/S6544'; // no-misused-promises
import { rule as S5730 } from '../../jsts/src/rules/S5730'; // no-mixed-content
import { rule as S1121 } from '../../jsts/src/rules/S1121'; // no-nested-assignment
import { rule as S3358 } from '../../jsts/src/rules/S3358'; // no-nested-conditional
import { rule as S2004 } from '../../jsts/src/rules/S2004'; // no-nested-functions
import { rule as S1821 } from '../../jsts/src/rules/S1821'; // no-nested-switch
import { rule as S4624 } from '../../jsts/src/rules/S4624'; // no-nested-template-literals
import { rule as S881 } from '../../jsts/src/rules/S881'; // no-nested-incdec
import { rule as S1751 } from '../../jsts/src/rules/S1751'; // no-one-iteration-loop
import { rule as S4036 } from '../../jsts/src/rules/S4036'; // no-os-command-from-path
import { rule as S1226 } from '../../jsts/src/rules/S1226'; // no-parameter-reassignment
import { rule as S1533 } from '../../jsts/src/rules/S1533'; // no-primitive-wrappers
import { rule as S2814 } from '../../jsts/src/rules/S2814'; // no-redeclare
import { rule as S4165 } from '../../jsts/src/rules/S4165'; // no-redundant-assignments
import { rule as S1125 } from '../../jsts/src/rules/S1125'; // no-redundant-boolean
import { rule as S3626 } from '../../jsts/src/rules/S3626'; // no-redundant-jump
import { rule as S4782 } from '../../jsts/src/rules/S4782'; // no-redundant-optional
import { rule as S1110 } from '../../jsts/src/rules/S1110'; // no-redundant-parentheses
import { rule as S6571 } from '../../jsts/src/rules/S6571'; // no-redundant-type-constituents
import { rule as S3827 } from '../../jsts/src/rules/S3827'; // no-reference-error
import { rule as S5736 } from '../../jsts/src/rules/S5736'; // no-referrer-policy
import { rule as S3533 } from '../../jsts/src/rules/S3533'; // no-require-or-define
import { rule as S4324 } from '../../jsts/src/rules/S4324'; // no-return-type-any
import { rule as S5863 } from '../../jsts/src/rules/S5863'; // no-same-argument-assert
import { rule as S3972 } from '../../jsts/src/rules/S3972'; // no-same-line-conditional
import { rule as S6679 } from '../../jsts/src/rules/S6679'; // no-self-compare
import { rule as S1301 } from '../../jsts/src/rules/S1301'; // no-small-switch
import { rule as S105 } from '../../jsts/src/rules/S105'; // no-tab
import { rule as S5257 } from '../../jsts/src/rules/S5257'; // no-table-as-layout
import { rule as S4327 } from '../../jsts/src/rules/S4327'; // no-this-alias
import { rule as S3696 } from '../../jsts/src/rules/S3696'; // no-throw-literal
import { rule as S4822 } from '../../jsts/src/rules/S4822'; // no-try-promise
import { rule as S4623 } from '../../jsts/src/rules/S4623'; // no-undefined-argument
import { rule as S2138 } from '../../jsts/src/rules/S2138'; // no-undefined-assignment
import { rule as S2681 } from '../../jsts/src/rules/S2681'; // no-unenclosed-multiline-block
import { rule as S6486 } from '../../jsts/src/rules/S6486'; // no-uniq-key
import { rule as S6747 } from '../../jsts/src/rules/S6747'; // no-unknown-property
import { rule as S1763 } from '../../jsts/src/rules/S1763'; // no-unreachable
import { rule as S6791 } from '../../jsts/src/rules/S6791'; // no-unsafe
import { rule as S5042 } from '../../jsts/src/rules/S5042'; // no-unsafe-unzip
//import { rule as S6478 } from '../../jsts/src/rules/S6478'; // no-unstable-nested-components
import { rule as S3984 } from '../../jsts/src/rules/S3984'; // no-unthrown-error
import { rule as S4030 } from '../../jsts/src/rules/S4030'; // no-unused-collection
import { rule as S905 } from '../../jsts/src/rules/S905'; // no-unused-expressions
import { rule as S1172 } from '../../jsts/src/rules/S1172'; // no-unused-function-argument
import { rule as S1068 } from '../../jsts/src/rules/S1068'; // no-unused-private-class-members
import { rule as S3699 } from '../../jsts/src/rules/S3699'; // no-use-of-empty-return-value
import { rule as S6676 } from '../../jsts/src/rules/S6676'; // no-useless-call
import { rule as S2737 } from '../../jsts/src/rules/S2737'; // no-useless-catch
import { rule as S6647 } from '../../jsts/src/rules/S6647'; // no-useless-constructor
import { rule as S2123 } from '../../jsts/src/rules/S2123'; // no-useless-increment
import { rule as S4335 } from '../../jsts/src/rules/S4335'; // no-useless-intersection
import { rule as S6443 } from '../../jsts/src/rules/S6443'; // no-useless-react-setstate
import { rule as S3504 } from '../../jsts/src/rules/S3504'; // no-var
import { rule as S1526 } from '../../jsts/src/rules/S1526'; // no-variable-usage-before-declaration
import { rule as S6299 } from '../../jsts/src/rules/S6299'; // no-vue-bypass-sanitization
import { rule as S5547 } from '../../jsts/src/rules/S5547'; // no-weak-cipher
import { rule as S4426 } from '../../jsts/src/rules/S4426'; // no-weak-keys
import { rule as S2208 } from '../../jsts/src/rules/S2208'; // no-wildcard-import
import { rule as S2757 } from '../../jsts/src/rules/S2757'; // non-existent-operator
import { rule as S3760 } from '../../jsts/src/rules/S3760'; // non-number-in-arithmetic-expression
import { rule as S2259 } from '../../jsts/src/rules/S2259'; // null-dereference
import { rule as S5264 } from '../../jsts/src/rules/S5264'; // object-alt-content
import { rule as S3498 } from '../../jsts/src/rules/S3498'; // object-shorthand
import { rule as S3757 } from '../../jsts/src/rules/S3757'; // operation-returning-nan
import { rule as S4721 } from '../../jsts/src/rules/S4721'; // os-command
import { rule as S2819 } from '../../jsts/src/rules/S2819'; // post-message
import { rule as S4524 } from '../../jsts/src/rules/S4524'; // prefer-default-last
import { rule as S6572 } from '../../jsts/src/rules/S6572'; // prefer-enum-initializers
import { rule as S4138 } from '../../jsts/src/rules/S4138'; // prefer-for-of
import { rule as S6598 } from '../../jsts/src/rules/S6598'; // prefer-function-type
import { rule as S1488 } from '../../jsts/src/rules/S1488'; // prefer-immediate-return
import { rule as S4156 } from '../../jsts/src/rules/S4156'; // prefer-namespace-keyword
import { rule as S6606 } from '../../jsts/src/rules/S6606'; // prefer-nullish-coalescing
import { rule as S2428 } from '../../jsts/src/rules/S2428'; // prefer-object-literal
//import { rule as S6661 } from '../jsts/src/rules/S6661'; // prefer-object-spread
import { rule as S4634 } from '../../jsts/src/rules/S4634'; // prefer-promise-shorthand
import { rule as S1126 } from '../../jsts/src/rules/S1126'; // prefer-single-boolean-return
import { rule as S6666 } from '../../jsts/src/rules/S6666'; // prefer-spread
import { rule as S6557 } from '../../jsts/src/rules/S6557'; // prefer-string-starts-ends-with
import { rule as S3512 } from '../../jsts/src/rules/S3512'; // prefer-template
import { rule as S4322 } from '../../jsts/src/rules/S4322'; // prefer-type-guard
import { rule as S1264 } from '../../jsts/src/rules/S1264'; // prefer-while
import { rule as S4823 } from '../../jsts/src/rules/S4823'; // process-argv
import { rule as S4507 } from '../../jsts/src/rules/S4507'; // production-debug
import { rule as S2245 } from '../../jsts/src/rules/S2245'; // pseudo-random
import { rule as S1444 } from '../../jsts/src/rules/S1444'; // public-static-readonly
import { rule as S5443 } from '../../jsts/src/rules/S5443'; // publicly-writable-directories
import { rule as S6959 } from '../../jsts/src/rules/S6959'; // reduce-initial-value
import { rule as S6564 } from '../../jsts/src/rules/S6564'; // redundant-type-aliases
import { rule as S5843 } from '../../jsts/src/rules/S5843'; // regex-complexity
import { rule as S4784 } from '../../jsts/src/rules/S4784'; // regular-expr
import { rule as S6440 } from '../../jsts/src/rules/S6440'; // rules-of-hooks
import { rule as S1438 } from '../../jsts/src/rules/S1438'; // semi
import { rule as S5876 } from '../../jsts/src/rules/S5876'; // session-regeneration
import { rule as S3499 } from '../../jsts/src/rules/S3499'; // shorthand-property-grouping
import { rule as S6397 } from '../../jsts/src/rules/S6397'; // single-char-in-character-classes
import { rule as S6035 } from '../../jsts/src/rules/S6035'; // single-character-alternation
import { rule as S5852 } from '../../jsts/src/rules/S5852'; // slow-regex
import { rule as S4818 } from '../../jsts/src/rules/S4818'; // sockets
import { rule as S2392 } from '../../jsts/src/rules/S2392'; // sonar-block-scoped-var
import { rule as S6439 } from '../../jsts/src/rules/S6439'; // sonar-jsx-no-leaked-render
import { rule as S104 } from '../../jsts/src/rules/S104'; // sonar-max-lines
import { rule as S138 } from '../../jsts/src/rules/S138'; // sonar-max-lines-per-function
import { rule as S107 } from '../../jsts/src/rules/S107'; // sonar-max-params
import { rule as S6324 } from '../../jsts/src/rules/S6324'; // sonar-no-control-regex
import { rule as S1534 } from '../../jsts/src/rules/S1534'; // sonar-no-dupe-keys
import { rule as S2639 } from '../../jsts/src/rules/S2639'; // sonar-no-empty-character-class
import { rule as S128 } from '../../jsts/src/rules/S128'; // sonar-no-fallthrough
import { rule as S5856 } from '../../jsts/src/rules/S5856'; // sonar-no-invalid-regexp
import { rule as S109 } from '../../jsts/src/rules/S109'; // sonar-no-magic-numbers
import { rule as S5868 } from '../../jsts/src/rules/S5868'; // sonar-no-misleading-character-class
import { rule as S6326 } from '../../jsts/src/rules/S6326'; // sonar-no-regex-spaces
import { rule as S6441 } from '../../jsts/src/rules/S6441'; // sonar-no-unused-class-component-methods
import { rule as S1481 } from '../../jsts/src/rules/S1481'; // sonar-no-unused-vars
import { rule as S6582 } from '../../jsts/src/rules/S6582'; // sonar-prefer-optional-chain
import { rule as S6759 } from '../../jsts/src/rules/S6759'; // sonar-prefer-read-only-props
import { rule as S6594 } from '../../jsts/src/rules/S6594'; // sonar-prefer-regexp-exec
import { rule as S2077 } from '../../jsts/src/rules/S2077'; // sql-queries
//import { rule as S5973 } from '../jsts/src/rules/S5973'; // stable-tests
import { rule as S4829 } from '../../jsts/src/rules/S4829'; // standard-input
import { rule as S6351 } from '../../jsts/src/rules/S6351'; // stateful-regex
import { rule as S5739 } from '../../jsts/src/rules/S5739'; // strict-transport-security
import { rule as S3003 } from '../../jsts/src/rules/S3003'; // strings-comparison
import { rule as S3854 } from '../../jsts/src/rules/S3854'; // super-invocation
import { rule as S131 } from '../../jsts/src/rules/S131'; // switch-without-default
import { rule as S5256 } from '../../jsts/src/rules/S5256'; // table-header
import { rule as S5260 } from '../../jsts/src/rules/S5260'; // table-header-reference
import { rule as S5958 } from '../../jsts/src/rules/S5958'; // test-check-exception
import { rule as S1135 } from '../../jsts/src/rules/S1135'; // todo-tag
import { rule as S135 } from '../../jsts/src/rules/S135'; // too-many-break-or-continue-in-loop
import { rule as S5867 } from '../../jsts/src/rules/S5867'; // unicode-aware-regex
import { rule as S6535 } from '../../jsts/src/rules/S6535'; // unnecessary-character-escapes
import { rule as S1128 } from '../../jsts/src/rules/S1128'; // unused-import
import { rule as S5860 } from '../../jsts/src/rules/S5860'; // unused-named-groups
import { rule as S4830 } from '../../jsts/src/rules/S4830'; // unverified-certificate
import { rule as S5527 } from '../../jsts/src/rules/S5527'; // unverified-hostname
import { rule as S3500 } from '../../jsts/src/rules/S3500'; // updated-const-var
import { rule as S2310 } from '../../jsts/src/rules/S2310'; // updated-loop-counter
import { rule as S2688 } from '../../jsts/src/rules/S2688'; // use-isnan
import { rule as S4323 } from '../../jsts/src/rules/S4323'; // use-type-alias
import { rule as S1154 } from '../../jsts/src/rules/S1154'; // useless-string-operation
import { rule as S3758 } from '../../jsts/src/rules/S3758'; // values-not-convertible-to-numbers
import { rule as S117 } from '../../jsts/src/rules/S117'; // variable-name
import { rule as S3735 } from '../../jsts/src/rules/S3735'; // void-use
import { rule as S4423 } from '../../jsts/src/rules/S4423'; // weak-ssl
import { rule as S2817 } from '../../jsts/src/rules/S2817'; // web-sql-database
import { rule as S5689 } from '../../jsts/src/rules/S5689'; // x-powered-by
import { rule as S2755 } from '../../jsts/src/rules/S2755'; // xml-parser-xxe
import { rule as S4817 } from '../../jsts/src/rules/S4817'; // xpath

/**
 * Maps ESLint rule keys declared in the JavaScript checks to rule implementations
 */
const rules: { [key: string]: Rule.RuleModule } = {};

rules['accessor-pairs'] = S2376;
rules['alt-text'] = S1077;
rules['anchor-has-content'] = S6827;
rules['anchor-is-valid'] = S6844;
rules['anchor-precedence'] = S5850;
rules['argument-type'] = S3782;
rules['arguments-order'] = S2234;
rules['arguments-usage'] = S3513;
rules['array-callback-without-return'] = S3796;
rules['array-constructor'] = S1528;
rules['arrow-function-convention'] = S3524;
rules['assertions-in-tests'] = S2699;
rules['aws-apigateway-public-api'] = S6333;
rules['aws-ec2-rds-dms-public'] = S6329;
rules['aws-ec2-unencrypted-ebs-volume'] = S6275;
rules['aws-efs-unencrypted'] = S6332;
rules['aws-iam-all-privileges'] = S6302;
rules['aws-iam-all-resources-accessible'] = S6304;
rules['aws-iam-privilege-escalation'] = S6317;
rules['aws-iam-public-access'] = S6270;
rules['aws-opensearchservice-domain'] = S6308;
rules['aws-rds-unencrypted-databases'] = S6303;
rules['aws-restricted-ip-admin-access'] = S6321;
rules['aws-s3-bucket-granted-access'] = S6265;
rules['aws-s3-bucket-insecure-http'] = S6249;
rules['aws-s3-bucket-public-access'] = S6281;
rules['aws-s3-bucket-server-encryption'] = S6245;
rules['aws-s3-bucket-versioning'] = S6252;
rules['aws-sagemaker-unencrypted-notebook'] = S6319;
rules['aws-sns-unencrypted-topics'] = S6327;
rules['aws-sqs-unencrypted-queue'] = S6330;
rules['bitwise-operators'] = S1529;
rules['bool-param-default'] = S4798;
rules['brace-style'] = S1105;
rules['call-argument-line'] = S1472;
rules['certificate-transparency'] = S5742;
rules['chai-determinate-assertion'] = S6092;
rules['class-name'] = S101;
rules['class-prototype'] = S3525;
rules['code-eval'] = S1523;
rules['cognitive-complexity'] = S3776;
rules['comma-or-logical-or-case'] = S3616;
rules['comment-regex'] = S124;
rules['concise-regex'] = S6353;
rules['conditional-indentation'] = S3973;
rules['confidential-information-logging'] = S5757;
rules['constructor-for-side-effects'] = S1848;
rules['content-length'] = S5693;
rules['content-security-policy'] = S5728;
rules['cookie-no-httponly'] = S3330;
rules['cookies'] = S2255;
rules['cors'] = S5122;
rules['csrf'] = S4502;
rules['cyclomatic-complexity'] = S1541;
rules['declarations-in-global-scope'] = S3798;
rules['default-param-last'] = S1788;
rules['deprecation'] = S1874;
rules['destructuring-assignment-syntax'] = S3514;
rules['different-types-comparison'] = S3403;
rules['disabled-auto-escaping'] = S5247;
rules['disabled-resource-integrity'] = S5725;
rules['disabled-timeout'] = S6080;
rules['dns-prefetching'] = S5743;
rules['duplicates-in-character-class'] = S5869;
rules['elseif-without-else'] = S126;
rules['empty-string-repetition'] = S5842;
rules['encryption'] = S4787;
rules['encryption-secure-mode'] = S5542;
rules['enforce-trailing-comma'] = S3723;
rules['existing-groups'] = S6328;
rules['expression-complexity'] = S1067;
rules['file-header'] = S1451;
rules['file-name-differ-from-class'] = S3317;
rules['file-permissions'] = S2612;
rules['file-uploads'] = S2598;
rules['fixme-tag'] = S1134;
rules['for-in'] = S1535;
rules['for-loop-increment-sign'] = S2251;
rules['frame-ancestors'] = S5732;
rules['function-inside-loop'] = S1515;
rules['function-name'] = S100;
rules['function-return-type'] = S3800;
rules['future-reserved-words'] = S1527;
rules['generator-without-yield'] = S3531;
rules['hashing'] = S4790;
rules['hidden-files'] = S5691;
//rules['hook-use-state'] = S6754;
rules['html-has-lang'] = S5254;
rules['in-operator-type-error'] = S3785;
rules['inconsistent-function-call'] = S3686;
rules['index-of-compare-to-positive-number'] = S2692;
rules['insecure-cookie'] = S2092;
rules['insecure-jwt-token'] = S5659;
rules['inverted-assertion-arguments'] = S3415;
rules['jsx-key'] = S6477;
//rules['jsx-no-constructed-context-values'] = S6481;
rules['jsx-no-useless-fragment'] = S6749;
rules['label-has-associated-control'] = S6853;
rules['label-position'] = S1439;
rules['link-with-target-blank'] = S5148;
rules['max-switch-cases'] = S1479;
rules['max-union-size'] = S4622;
rules['media-has-caption'] = S4084;
rules['misplaced-loop-counter'] = S1994;
rules['mouse-events-a11y'] = S1082;
rules['nested-control-flow'] = S134;
rules['new-cap'] = S2430;
rules['new-operator-misuse'] = S2999;
rules['no-accessor-field-mismatch'] = S4275;
rules['no-all-duplicated-branches'] = S3923;
rules['no-alphabetical-sort'] = S2871;
rules['no-angular-bypass-sanitization'] = S6268;
rules['no-array-delete'] = S2870;
rules['no-array-index-key'] = S6479;
rules['no-associative-arrays'] = S3579;
rules['no-base-to-string'] = S6551;
rules['no-built-in-override'] = S2424;
rules['no-case-label-in-switch'] = S1219;
rules['no-clear-text-protocols'] = S5332;
rules['no-code-after-done'] = S6079;
rules['no-collapsible-if'] = S1066;
rules['no-collection-size-mischeck'] = S3981;
//rules['no-commented-code'] = S125;
rules['no-dead-store'] = S1854;
rules['no-delete-var'] = S3001;
//rules['no-deprecated-react'] = S6957;
rules['no-duplicate-in-composite'] = S4621;
rules['no-duplicate-string'] = S1192;
rules['no-duplicated-branches'] = S1871;
rules['no-element-overwrite'] = S4143;
rules['no-empty-after-reluctant'] = S6019;
rules['no-empty-alternatives'] = S6323;
rules['no-empty-collection'] = S4158;
rules['no-empty-function'] = S1186;
rules['no-empty-group'] = S6331;
rules['no-empty-interface'] = S4023;
rules['no-empty-test-file'] = S2187;
rules['no-equals-in-for-termination'] = S888;
rules['no-exclusive-tests'] = S6426;
rules['no-extend-native'] = S6643;
rules['no-extra-arguments'] = S930;
rules['no-extra-semi'] = S1116;
rules['no-find-dom-node'] = S6788;
rules['no-for-in-iterable'] = S4139;
rules['no-function-declaration-in-block'] = S1530;
rules['no-global-this'] = S2990;
rules['no-globals-shadowing'] = S2137;
rules['no-gratuitous-expressions'] = S2589;
rules['no-hardcoded-credentials'] = S2068;
rules['no-hardcoded-ip'] = S1313;
rules['no-hook-setter-in-body'] = S6442;
rules['no-identical-conditions'] = S1862;
rules['no-identical-expressions'] = S1764;
rules['no-identical-functions'] = S4144;
rules['no-ignored-exceptions'] = S2486;
rules['no-ignored-return'] = S2201;
//rules['no-implicit-dependencies'] = S4328;
rules['no-implicit-global'] = S2703;
rules['no-in-misuse'] = S4619;
rules['no-incomplete-assertions'] = S2970;
//rules['no-inconsistent-returns'] = S3801;
rules['no-incorrect-string-concat'] = S3402;
rules['no-infinite-loop'] = S2189;
rules['no-intrusive-permissions'] = S5604;
rules['no-invalid-await'] = S4123;
rules['no-invariant-returns'] = S3516;
rules['no-inverted-boolean-check'] = S1940;
rules['no-ip-forward'] = S5759;
rules['no-labels'] = S1119;
rules['no-literal-call'] = S6958;
rules['no-lonely-if'] = S6660;
rules['no-mime-sniff'] = S5734;
rules['no-misleading-array-reverse'] = S4043;
rules['no-misused-promises'] = S6544;
rules['no-mixed-content'] = S5730;
rules['no-nested-assignment'] = S1121;
rules['no-nested-conditional'] = S3358;
rules['no-nested-functions'] = S2004;
rules['no-nested-incdec'] = S881;
rules['no-nested-switch'] = S1821;
rules['no-nested-template-literals'] = S4624;
rules['no-one-iteration-loop'] = S1751;
rules['no-os-command-from-path'] = S4036;
rules['no-parameter-reassignment'] = S1226;
rules['no-primitive-wrappers'] = S1533;
rules['no-redeclare'] = S2814;
rules['no-redundant-assignments'] = S4165;
rules['no-redundant-boolean'] = S1125;
rules['no-redundant-jump'] = S3626;
rules['no-redundant-optional'] = S4782;
rules['no-redundant-parentheses'] = S1110;
rules['no-redundant-type-constituents'] = S6571;
rules['no-reference-error'] = S3827;
rules['no-referrer-policy'] = S5736;
rules['no-require-or-define'] = S3533;
rules['no-return-type-any'] = S4324;
rules['no-same-argument-assert'] = S5863;
rules['no-same-line-conditional'] = S3972;
rules['no-self-compare'] = S6679;
rules['no-small-switch'] = S1301;
rules['no-tab'] = S105;
rules['no-table-as-layout'] = S5257;
rules['no-this-alias'] = S4327;
rules['no-throw-literal'] = S3696;
rules['no-try-promise'] = S4822;
rules['no-undefined-argument'] = S4623;
rules['no-undefined-assignment'] = S2138;
rules['no-unenclosed-multiline-block'] = S2681;
rules['no-uniq-key'] = S6486;
rules['no-unknown-property'] = S6747;
rules['no-unreachable'] = S1763;
rules['no-unsafe'] = S6791;
rules['no-unsafe-unzip'] = S5042;
//rules['no-unstable-nested-components'] = S6478;
rules['no-unthrown-error'] = S3984;
rules['no-unused-collection'] = S4030;
rules['no-unused-expressions'] = S905;
rules['no-unused-function-argument'] = S1172;
rules['no-unused-private-class-members'] = S1068;
rules['no-use-of-empty-return-value'] = S3699;
rules['no-useless-call'] = S6676;
rules['no-useless-catch'] = S2737;
rules['no-useless-constructor'] = S6647;
rules['no-useless-increment'] = S2123;
rules['no-useless-intersection'] = S4335;
rules['no-useless-react-setstate'] = S6443;
rules['no-var'] = S3504;
rules['no-variable-usage-before-declaration'] = S1526;
rules['no-vue-bypass-sanitization'] = S6299;
rules['no-weak-cipher'] = S5547;
rules['no-weak-keys'] = S4426;
rules['no-wildcard-import'] = S2208;
rules['non-existent-operator'] = S2757;
rules['non-number-in-arithmetic-expression'] = S3760;
rules['null-dereference'] = S2259;
rules['object-alt-content'] = S5264;
rules['object-shorthand'] = S3498;
rules['operation-returning-nan'] = S3757;
rules['os-command'] = S4721;
rules['post-message'] = S2819;
rules['prefer-default-last'] = S4524;
rules['prefer-enum-initializers'] = S6572;
rules['prefer-for-of'] = S4138;
rules['prefer-function-type'] = S6598;
rules['prefer-immediate-return'] = S1488;
rules['prefer-namespace-keyword'] = S4156;
rules['prefer-nullish-coalescing'] = S6606;
rules['prefer-object-literal'] = S2428;
//rules['prefer-object-spread'] = S6661;
rules['prefer-promise-shorthand'] = S4634;
rules['prefer-single-boolean-return'] = S1126;
rules['prefer-spread'] = S6666;
rules['prefer-string-starts-ends-with'] = S6557;
rules['prefer-template'] = S3512;
rules['prefer-type-guard'] = S4322;
rules['prefer-while'] = S1264;
rules['process-argv'] = S4823;
rules['production-debug'] = S4507;
rules['pseudo-random'] = S2245;
rules['public-static-readonly'] = S1444;
rules['publicly-writable-directories'] = S5443;
rules['reduce-initial-value'] = S6959;
rules['redundant-type-aliases'] = S6564;
rules['regex-complexity'] = S5843;
rules['regular-expr'] = S4784;
rules['rules-of-hooks'] = S6440;
rules['semi'] = S1438;
rules['session-regeneration'] = S5876;
rules['shorthand-property-grouping'] = S3499;
rules['single-char-in-character-classes'] = S6397;
rules['single-character-alternation'] = S6035;
rules['slow-regex'] = S5852;
rules['sockets'] = S4818;
rules['sonar-block-scoped-var'] = S2392;
rules['sonar-jsx-no-leaked-render'] = S6439;
rules['sonar-max-lines'] = S104;
rules['sonar-max-lines-per-function'] = S138;
rules['sonar-max-params'] = S107;
rules['sonar-no-control-regex'] = S6324;
rules['sonar-no-dupe-keys'] = S1534;
rules['sonar-no-empty-character-class'] = S2639;
rules['sonar-no-fallthrough'] = S128;
rules['sonar-no-invalid-regexp'] = S5856;
rules['sonar-no-magic-numbers'] = S109;
rules['sonar-no-misleading-character-class'] = S5868;
rules['sonar-no-regex-spaces'] = S6326;
rules['sonar-no-unused-class-component-methods'] = S6441;
rules['sonar-no-unused-vars'] = S1481;
rules['sonar-prefer-optional-chain'] = S6582;
rules['sonar-prefer-read-only-props'] = S6759;
rules['sonar-prefer-regexp-exec'] = S6594;
rules['sql-queries'] = S2077;
//rules['stable-tests'] = S5973;
rules['standard-input'] = S4829;
rules['stateful-regex'] = S6351;
rules['strict-transport-security'] = S5739;
rules['strings-comparison'] = S3003;
rules['super-invocation'] = S3854;
rules['switch-without-default'] = S131;
rules['table-header'] = S5256;
rules['table-header-reference'] = S5260;
rules['test-check-exception'] = S5958;
rules['todo-tag'] = S1135;
rules['too-many-break-or-continue-in-loop'] = S135;
rules['unicode-aware-regex'] = S5867;
rules['unnecessary-character-escapes'] = S6535;
rules['unused-import'] = S1128;
rules['unused-named-groups'] = S5860;
rules['unverified-certificate'] = S4830;
rules['unverified-hostname'] = S5527;
rules['updated-const-var'] = S3500;
rules['updated-loop-counter'] = S2310;
rules['use-isnan'] = S2688;
rules['use-type-alias'] = S4323;
rules['useless-string-operation'] = S1154;
rules['values-not-convertible-to-numbers'] = S3758;
rules['variable-name'] = S117;
rules['void-use'] = S3735;
rules['weak-ssl'] = S4423;
rules['web-sql-database'] = S2817;
rules['x-powered-by'] = S5689;
rules['xml-parser-xxe'] = S2755;
rules['xpath'] = S4817;

//import { name, version } from '../package.json';
const recommendedLegacyConfig: TSESLint.Linter.ConfigType = { plugins: ['sonarjs'], rules: {} };
const recommendedConfig: FlatConfig.Config = {
  plugins: {
    sonarjs: {
      rules,
    },
  },
  rules: {},
};

for (const key of Object.keys(rules)) {
  const rule = rules[key as keyof typeof rules];
  const recommended = rule.meta?.docs?.recommended;

  recommendedConfig.rules![`sonarjs/${key}`] = recommended === undefined ? 'off' : 'error';
}

recommendedLegacyConfig.rules = recommendedConfig.rules;

const configs = {
  recommended: recommendedConfig,
  'recommended-legacy': recommendedLegacyConfig,
};

const meta = {
  name: 'eslint-plugin-sonarjs',
  version: '1.0.3',
};

export { rules, configs, meta };