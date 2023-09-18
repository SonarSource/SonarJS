/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import { Rule } from 'eslint';

import { rule as S2376 } from './S2376'; // accessor-pairs
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
import { rule as S3785 } from './S3785'; // in-operator-type-error
import { rule as S3686 } from './S3686'; // inconsistent-function-call
import { rule as S2692 } from './S2692'; // index-of-compare-to-positive-number
import { rule as S2092 } from './S2092'; // insecure-cookie
import { rule as S5659 } from './S5659'; // insecure-jwt-token
import { rule as S3415 } from './S3415'; // inverted-assertion-arguments
import { rule as S6477 } from './S6477'; // jsx-key
import { rule as S6481 } from './S6481'; // jsx-no-constructed-context-values
import { rule as S1439 } from './S1439'; // label-position
import { rule as S5148 } from './S5148'; // link-with-target-blank
import { rule as S4622 } from './S4622'; // max-union-size
import { rule as S1994 } from './S1994'; // misplaced-loop-counter
import { rule as S134 } from './S134'; // nested-control-flow
import { rule as S2430 } from './S2430'; // new-cap
import { rule as S2999 } from './S2999'; // new-operator-misuse
import { rule as S4275 } from './S4275'; // no-accessor-field-mismatch
import { rule as S2871 } from './S2871'; // no-alphabetical-sort
import { rule as S6268 } from './S6268'; // no-angular-bypass-sanitization
import { rule as S2870 } from './S2870'; // no-array-delete
import { rule as S3579 } from './S3579'; // no-associative-arrays
import { rule as S6551 } from './S6551'; // no-base-to-string
import { rule as S2424 } from './S2424'; // no-built-in-override
import { rule as S1219 } from './S1219'; // no-case-label-in-switch
import { rule as S5332 } from './S5332'; // no-clear-text-protocols
import { rule as S6079 } from './S6079'; // no-code-after-done
import { rule as S125 } from './S125'; // no-commented-code
import { rule as S1854 } from './S1854'; // no-dead-store
import { rule as S3001 } from './S3001'; // no-delete-var
import { rule as S3863 } from './S3863'; // no-duplicate-imports
import { rule as S4621 } from './S4621'; // no-duplicate-in-composite
import { rule as S108 } from './S108'; // no-empty
import { rule as S6019 } from './S6019'; // no-empty-after-reluctant
import { rule as S6323 } from './S6323'; // no-empty-alternatives
import { rule as S1186 } from './S1186'; // no-empty-function
import { rule as S6331 } from './S6331'; // no-empty-group
import { rule as S4023 } from './S4023'; // no-empty-interface
import { rule as S888 } from './S888'; // no-equals-in-for-termination
import { rule as S6426 } from './S6426'; // no-exclusive-tests
import { rule as S6643 } from './S6643'; // no-extend-native
import { rule as S1116 } from './S1116'; // no-extra-semi
import { rule as S4139 } from './S4139'; // no-for-in-iterable
import { rule as S1530 } from './S1530'; // no-function-declaration-in-block
import { rule as S2990 } from './S2990'; // no-global-this
import { rule as S2137 } from './S2137'; // no-globals-shadowing
import { rule as S2068 } from './S2068'; // no-hardcoded-credentials
import { rule as S1313 } from './S1313'; // no-hardcoded-ip
import { rule as S6442 } from './S6442'; // no-hook-setter-in-body
import { rule as S2486 } from './S2486'; // no-ignored-exceptions
import { rule as S4328 } from './S4328'; // no-implicit-dependencies
import { rule as S2703 } from './S2703'; // no-implicit-global
import { rule as S4619 } from './S4619'; // no-in-misuse
import { rule as S2970 } from './S2970'; // no-incomplete-assertions
import { rule as S3801 } from './S3801'; // no-inconsistent-returns
import { rule as S3402 } from './S3402'; // no-incorrect-string-concat
import { rule as S2189 } from './S2189'; // no-infinite-loop
import { rule as S5604 } from './S5604'; // no-intrusive-permissions
import { rule as S4123 } from './S4123'; // no-invalid-await
import { rule as S3516 } from './S3516'; // no-invariant-returns
import { rule as S5759 } from './S5759'; // no-ip-forward
import { rule as S1119 } from './S1119'; // no-labels
import { rule as S6660 } from './S6660'; // no-lonely-if
import { rule as S5734 } from './S5734'; // no-mime-sniff
import { rule as S4043 } from './S4043'; // no-misleading-array-reverse
import { rule as S6544 } from './S6544'; // no-misused-promises
import { rule as S5730 } from './S5730'; // no-mixed-content
import { rule as S1121 } from './S1121'; // no-nested-assignment
import { rule as S3358 } from './S3358'; // no-nested-conditional
import { rule as S881 } from './S881'; // no-nested-incdec
import { rule as S4036 } from './S4036'; // no-os-command-from-path
import { rule as S1226 } from './S1226'; // no-parameter-reassignment
import { rule as S1533 } from './S1533'; // no-primitive-wrappers
import { rule as S2814 } from './S2814'; // no-redeclare
import { rule as S4165 } from './S4165'; // no-redundant-assignments
import { rule as S4782 } from './S4782'; // no-redundant-optional
import { rule as S1110 } from './S1110'; // no-redundant-parentheses
import { rule as S6571 } from './S6571'; // no-redundant-type-constituents
import { rule as S3827 } from './S3827'; // no-reference-error
import { rule as S5736 } from './S5736'; // no-referrer-policy
import { rule as S3533 } from './S3533'; // no-require-or-define
import { rule as S4324 } from './S4324'; // no-return-type-any
import { rule as S5863 } from './S5863'; // no-same-argument-assert
import { rule as S6679 } from './S6679'; // no-self-compare
import { rule as S105 } from './S105'; // no-tab
import { rule as S4327 } from './S4327'; // no-this-alias
import { rule as S3696 } from './S3696'; // no-throw-literal
import { rule as S4822 } from './S4822'; // no-try-promise
import { rule as S4623 } from './S4623'; // no-undefined-argument
import { rule as S2138 } from './S2138'; // no-undefined-assignment
import { rule as S2681 } from './S2681'; // no-unenclosed-multiline-block
import { rule as S6486 } from './S6486'; // no-uniq-key
import { rule as S6747 } from './S6747'; // no-unknown-property
import { rule as S1763 } from './S1763'; // no-unreachable
import { rule as S5042 } from './S5042'; // no-unsafe-unzip
import { rule as S6478 } from './S6478'; // no-unstable-nested-components
import { rule as S3984 } from './S3984'; // no-unthrown-error
import { rule as S905 } from './S905'; // no-unused-expressions
import { rule as S1172 } from './S1172'; // no-unused-function-argument
import { rule as S1068 } from './S1068'; // no-unused-private-class-members
import { rule as S6676 } from './S6676'; // no-useless-call
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
import { rule as S3760 } from './S3760'; // non-number-in-arithmetic-expression
import { rule as S2259 } from './S2259'; // null-dereference
import { rule as S3498 } from './S3498'; // object-shorthand
import { rule as S3757 } from './S3757'; // operation-returning-nan
import { rule as S4721 } from './S4721'; // os-command
import { rule as S2819 } from './S2819'; // post-message
import { rule as S4524 } from './S4524'; // prefer-default-last
import { rule as S6572 } from './S6572'; // prefer-enum-initializers
import { rule as S4138 } from './S4138'; // prefer-for-of
import { rule as S6598 } from './S6598'; // prefer-function-type
import { rule as S6661 } from './S6661'; // prefer-object-spread
import { rule as S4634 } from './S4634'; // prefer-promise-shorthand
import { rule as S6666 } from './S6666'; // prefer-spread
import { rule as S6557 } from './S6557'; // prefer-string-starts-ends-with
import { rule as S3512 } from './S3512'; // prefer-template
import { rule as S4322 } from './S4322'; // prefer-type-guard
import { rule as S4823 } from './S4823'; // process-argv
import { rule as S4507 } from './S4507'; // production-debug
import { rule as S2245 } from './S2245'; // pseudo-random
import { rule as S5443 } from './S5443'; // publicly-writable-directories
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
import { rule as S5868 } from './S5868'; // sonar-no-misleading-character-class
import { rule as S6326 } from './S6326'; // sonar-no-regex-spaces
import { rule as S6441 } from './S6441'; // sonar-no-unused-class-component-methods
import { rule as S1481 } from './S1481'; // sonar-no-unused-vars
import { rule as S6582 } from './S6582'; // sonar-prefer-optional-chain
import { rule as S6759 } from './S6759'; // sonar-prefer-read-only-props
import { rule as S6594 } from './S6594'; // sonar-prefer-regexp-exec
import { rule as S2077 } from './S2077'; // sql-queries
import { rule as S4829 } from './S4829'; // standard-input
import { rule as S6351 } from './S6351'; // stateful-regex
import { rule as S5739 } from './S5739'; // strict-transport-security
import { rule as S3003 } from './S3003'; // strings-comparison
import { rule as S3854 } from './S3854'; // super-invocation
import { rule as S131 } from './S131'; // switch-without-default
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
import { rule as S4817 } from './S4817'; // xpath

/**
 * Maps ESLint rule keys declared in the JavaScript checks to rule implementations
 */
const rules: { [key: string]: Rule.RuleModule } = {};

rules['accessor-pairs'] = S2376;
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
rules['in-operator-type-error'] = S3785;
rules['inconsistent-function-call'] = S3686;
rules['index-of-compare-to-positive-number'] = S2692;
rules['insecure-cookie'] = S2092;
rules['insecure-jwt-token'] = S5659;
rules['inverted-assertion-arguments'] = S3415;
rules['jsx-key'] = S6477;
rules['jsx-no-constructed-context-values'] = S6481;
rules['label-position'] = S1439;
rules['link-with-target-blank'] = S5148;
rules['max-union-size'] = S4622;
rules['misplaced-loop-counter'] = S1994;
rules['nested-control-flow'] = S134;
rules['new-cap'] = S2430;
rules['new-operator-misuse'] = S2999;
rules['no-accessor-field-mismatch'] = S4275;
rules['no-alphabetical-sort'] = S2871;
rules['no-angular-bypass-sanitization'] = S6268;
rules['no-array-delete'] = S2870;
rules['no-associative-arrays'] = S3579;
rules['no-base-to-string'] = S6551;
rules['no-built-in-override'] = S2424;
rules['no-case-label-in-switch'] = S1219;
rules['no-clear-text-protocols'] = S5332;
rules['no-code-after-done'] = S6079;
rules['no-commented-code'] = S125;
rules['no-dead-store'] = S1854;
rules['no-delete-var'] = S3001;
rules['no-duplicate-imports'] = S3863;
rules['no-duplicate-in-composite'] = S4621;
rules['no-empty'] = S108;
rules['no-empty-after-reluctant'] = S6019;
rules['no-empty-alternatives'] = S6323;
rules['no-empty-function'] = S1186;
rules['no-empty-group'] = S6331;
rules['no-empty-interface'] = S4023;
rules['no-equals-in-for-termination'] = S888;
rules['no-exclusive-tests'] = S6426;
rules['no-extend-native'] = S6643;
rules['no-extra-semi'] = S1116;
rules['no-for-in-iterable'] = S4139;
rules['no-function-declaration-in-block'] = S1530;
rules['no-global-this'] = S2990;
rules['no-globals-shadowing'] = S2137;
rules['no-hardcoded-credentials'] = S2068;
rules['no-hardcoded-ip'] = S1313;
rules['no-hook-setter-in-body'] = S6442;
rules['no-ignored-exceptions'] = S2486;
rules['no-implicit-dependencies'] = S4328;
rules['no-implicit-global'] = S2703;
rules['no-in-misuse'] = S4619;
rules['no-incomplete-assertions'] = S2970;
rules['no-inconsistent-returns'] = S3801;
rules['no-incorrect-string-concat'] = S3402;
rules['no-infinite-loop'] = S2189;
rules['no-intrusive-permissions'] = S5604;
rules['no-invalid-await'] = S4123;
rules['no-invariant-returns'] = S3516;
rules['no-ip-forward'] = S5759;
rules['no-labels'] = S1119;
rules['no-lonely-if'] = S6660;
rules['no-mime-sniff'] = S5734;
rules['no-misleading-array-reverse'] = S4043;
rules['no-misused-promises'] = S6544;
rules['no-mixed-content'] = S5730;
rules['no-nested-assignment'] = S1121;
rules['no-nested-conditional'] = S3358;
rules['no-nested-incdec'] = S881;
rules['no-os-command-from-path'] = S4036;
rules['no-parameter-reassignment'] = S1226;
rules['no-primitive-wrappers'] = S1533;
rules['no-redeclare'] = S2814;
rules['no-redundant-assignments'] = S4165;
rules['no-redundant-optional'] = S4782;
rules['no-redundant-parentheses'] = S1110;
rules['no-redundant-type-constituents'] = S6571;
rules['no-reference-error'] = S3827;
rules['no-referrer-policy'] = S5736;
rules['no-require-or-define'] = S3533;
rules['no-return-type-any'] = S4324;
rules['no-same-argument-assert'] = S5863;
rules['no-self-compare'] = S6679;
rules['no-tab'] = S105;
rules['no-this-alias'] = S4327;
rules['no-throw-literal'] = S3696;
rules['no-try-promise'] = S4822;
rules['no-undefined-argument'] = S4623;
rules['no-undefined-assignment'] = S2138;
rules['no-unenclosed-multiline-block'] = S2681;
rules['no-uniq-key'] = S6486;
rules['no-unknown-property'] = S6747;
rules['no-unreachable'] = S1763;
rules['no-unsafe-unzip'] = S5042;
rules['no-unstable-nested-components'] = S6478;
rules['no-unthrown-error'] = S3984;
rules['no-unused-expressions'] = S905;
rules['no-unused-function-argument'] = S1172;
rules['no-unused-private-class-members'] = S1068;
rules['no-useless-call'] = S6676;
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
rules['non-number-in-arithmetic-expression'] = S3760;
rules['null-dereference'] = S2259;
rules['object-shorthand'] = S3498;
rules['operation-returning-nan'] = S3757;
rules['os-command'] = S4721;
rules['post-message'] = S2819;
rules['prefer-default-last'] = S4524;
rules['prefer-enum-initializers'] = S6572;
rules['prefer-for-of'] = S4138;
rules['prefer-function-type'] = S6598;
rules['prefer-object-spread'] = S6661;
rules['prefer-promise-shorthand'] = S4634;
rules['prefer-spread'] = S6666;
rules['prefer-string-starts-ends-with'] = S6557;
rules['prefer-template'] = S3512;
rules['prefer-type-guard'] = S4322;
rules['process-argv'] = S4823;
rules['production-debug'] = S4507;
rules['pseudo-random'] = S2245;
rules['publicly-writable-directories'] = S5443;
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
rules['sonar-no-misleading-character-class'] = S5868;
rules['sonar-no-regex-spaces'] = S6326;
rules['sonar-no-unused-class-component-methods'] = S6441;
rules['sonar-no-unused-vars'] = S1481;
rules['sonar-prefer-optional-chain'] = S6582;
rules['sonar-prefer-read-only-props'] = S6759;
rules['sonar-prefer-regexp-exec'] = S6594;
rules['sql-queries'] = S2077;
rules['standard-input'] = S4829;
rules['stateful-regex'] = S6351;
rules['strict-transport-security'] = S5739;
rules['strings-comparison'] = S3003;
rules['super-invocation'] = S3854;
rules['switch-without-default'] = S131;
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

export { rules };
