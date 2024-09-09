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
 * This is the entry point of the ESLint Plugin.
 * Said differently, this is the public API of the ESLint Plugin.
 */
import fs from 'fs';
import { findParent } from './helpers';
import { PackageJson } from 'type-fest';
import { rule as S2376 } from './S2376';
import { rule as S1077 } from './S1077';
import { rule as S6827 } from './S6827';
import { rule as S6844 } from './S6844';
import { rule as S5850 } from './S5850';
import { rule as S3782 } from './S3782';
import { rule as S2234 } from './S2234';
import { rule as S3513 } from './S3513';
import { rule as S3796 } from './S3796';
import { rule as S1528 } from './S1528';
import { rule as S3524 } from './S3524';
import { rule as S2699 } from './S2699';
import { rule as S6333 } from './S6333';
import { rule as S6329 } from './S6329';
import { rule as S6275 } from './S6275';
import { rule as S6332 } from './S6332';
import { rule as S6302 } from './S6302';
import { rule as S6304 } from './S6304';
import { rule as S6317 } from './S6317';
import { rule as S6270 } from './S6270';
import { rule as S6308 } from './S6308';
import { rule as S6303 } from './S6303';
import { rule as S6321 } from './S6321';
import { rule as S6265 } from './S6265';
import { rule as S6249 } from './S6249';
import { rule as S6281 } from './S6281';
import { rule as S6245 } from './S6245';
import { rule as S6252 } from './S6252';
import { rule as S6319 } from './S6319';
import { rule as S6327 } from './S6327';
import { rule as S6330 } from './S6330';
import { rule as S1529 } from './S1529';
import { rule as S4798 } from './S4798';
import { rule as S1105 } from './S1105';
import { rule as S1472 } from './S1472';
import { rule as S5742 } from './S5742';
import { rule as S6092 } from './S6092';
import { rule as S101 } from './S101';
import { rule as S3525 } from './S3525';
import { rule as S1523 } from './S1523';
import { rule as S3776 } from './S3776';
import { rule as S3616 } from './S3616';
import { rule as S124 } from './S124';
import { rule as S6353 } from './S6353';
import { rule as S3973 } from './S3973';
import { rule as S5757 } from './S5757';
import { rule as S1848 } from './S1848';
import { rule as S5693 } from './S5693';
import { rule as S5728 } from './S5728';
import { rule as S3330 } from './S3330';
import { rule as S2255 } from './S2255';
import { rule as S5122 } from './S5122';
import { rule as S4502 } from './S4502';
import { rule as S1541 } from './S1541';
import { rule as S3798 } from './S3798';
import { rule as S1788 } from './S1788';
import { rule as S1874 } from './S1874';
import { rule as S3514 } from './S3514';
import { rule as S3403 } from './S3403';
import { rule as S5247 } from './S5247';
import { rule as S5725 } from './S5725';
import { rule as S6080 } from './S6080';
import { rule as S5743 } from './S5743';
import { rule as S5869 } from './S5869';
import { rule as S126 } from './S126';
import { rule as S5842 } from './S5842';
import { rule as S4787 } from './S4787';
import { rule as S5542 } from './S5542';
import { rule as S3723 } from './S3723';
import { rule as S6328 } from './S6328';
import { rule as S1067 } from './S1067';
import { rule as S1451 } from './S1451';
import { rule as S3317 } from './S3317';
import { rule as S2612 } from './S2612';
import { rule as S2598 } from './S2598';
import { rule as S1134 } from './S1134';
import { rule as S1535 } from './S1535';
import { rule as S2251 } from './S2251';
import { rule as S5732 } from './S5732';
import { rule as S1515 } from './S1515';
import { rule as S100 } from './S100';
import { rule as S3800 } from './S3800';
import { rule as S1527 } from './S1527';
import { rule as S3531 } from './S3531';
import { rule as S4790 } from './S4790';
import { rule as S5691 } from './S5691';
import { rule as S6754 } from './S6754';
import { rule as S5254 } from './S5254';
import { rule as S3785 } from './S3785';
import { rule as S3686 } from './S3686';
import { rule as S2692 } from './S2692';
import { rule as S2092 } from './S2092';
import { rule as S5659 } from './S5659';
import { rule as S3415 } from './S3415';
import { rule as S6477 } from './S6477';
import { rule as S6481 } from './S6481';
import { rule as S6749 } from './S6749';
import { rule as S6853 } from './S6853';
import { rule as S1439 } from './S1439';
import { rule as S5148 } from './S5148';
import { rule as S1479 } from './S1479';
import { rule as S4622 } from './S4622';
import { rule as S4084 } from './S4084';
import { rule as S1994 } from './S1994';
import { rule as S1082 } from './S1082';
import { rule as S134 } from './S134';
import { rule as S2430 } from './S2430';
import { rule as S2999 } from './S2999';
import { rule as S4275 } from './S4275';
import { rule as S3923 } from './S3923';
import { rule as S2871 } from './S2871';
import { rule as S6268 } from './S6268';
import { rule as S2870 } from './S2870';
import { rule as S6479 } from './S6479';
import { rule as S3579 } from './S3579';
import { rule as S6551 } from './S6551';
import { rule as S2424 } from './S2424';
import { rule as S1219 } from './S1219';
import { rule as S5332 } from './S5332';
import { rule as S6079 } from './S6079';
import { rule as S1066 } from './S1066';
import { rule as S3981 } from './S3981';
import { rule as S125 } from './S125';
import { rule as S1854 } from './S1854';
import { rule as S3001 } from './S3001';
import { rule as S6957 } from './S6957';
import { rule as S4621 } from './S4621';
import { rule as S1192 } from './S1192';
import { rule as S1871 } from './S1871';
import { rule as S4143 } from './S4143';
import { rule as S6019 } from './S6019';
import { rule as S6323 } from './S6323';
import { rule as S4158 } from './S4158';
import { rule as S1186 } from './S1186';
import { rule as S6331 } from './S6331';
import { rule as S4023 } from './S4023';
import { rule as S2187 } from './S2187';
import { rule as S888 } from './S888';
import { rule as S6426 } from './S6426';
import { rule as S6643 } from './S6643';
import { rule as S930 } from './S930';
import { rule as S1116 } from './S1116';
import { rule as S6788 } from './S6788';
import { rule as S4139 } from './S4139';
import { rule as S1530 } from './S1530';
import { rule as S2990 } from './S2990';
import { rule as S2137 } from './S2137';
import { rule as S2589 } from './S2589';
import { rule as S2068 } from './S2068';
import { rule as S1313 } from './S1313';
import { rule as S6442 } from './S6442';
import { rule as S1862 } from './S1862';
import { rule as S1764 } from './S1764';
import { rule as S4144 } from './S4144';
import { rule as S2486 } from './S2486';
import { rule as S2201 } from './S2201';
import { rule as S4328 } from './S4328';
import { rule as S2703 } from './S2703';
import { rule as S4619 } from './S4619';
import { rule as S2970 } from './S2970';
import { rule as S3801 } from './S3801';
import { rule as S3402 } from './S3402';
import { rule as S2189 } from './S2189';
import { rule as S5604 } from './S5604';
import { rule as S4123 } from './S4123';
import { rule as S3516 } from './S3516';
import { rule as S1940 } from './S1940';
import { rule as S5759 } from './S5759';
import { rule as S1119 } from './S1119';
import { rule as S6958 } from './S6958';
import { rule as S6660 } from './S6660';
import { rule as S5734 } from './S5734';
import { rule as S4043 } from './S4043';
import { rule as S6544 } from './S6544';
import { rule as S5730 } from './S5730';
import { rule as S1121 } from './S1121';
import { rule as S3358 } from './S3358';
import { rule as S2004 } from './S2004';
import { rule as S881 } from './S881';
import { rule as S1821 } from './S1821';
import { rule as S4624 } from './S4624';
import { rule as S1751 } from './S1751';
import { rule as S4036 } from './S4036';
import { rule as S1226 } from './S1226';
import { rule as S1533 } from './S1533';
import { rule as S2814 } from './S2814';
import { rule as S4165 } from './S4165';
import { rule as S1125 } from './S1125';
import { rule as S3626 } from './S3626';
import { rule as S4782 } from './S4782';
import { rule as S1110 } from './S1110';
import { rule as S6571 } from './S6571';
import { rule as S3827 } from './S3827';
import { rule as S5736 } from './S5736';
import { rule as S3533 } from './S3533';
import { rule as S4324 } from './S4324';
import { rule as S5863 } from './S5863';
import { rule as S3972 } from './S3972';
import { rule as S6679 } from './S6679';
import { rule as S1301 } from './S1301';
import { rule as S105 } from './S105';
import { rule as S5257 } from './S5257';
import { rule as S4327 } from './S4327';
import { rule as S3696 } from './S3696';
import { rule as S4822 } from './S4822';
import { rule as S4623 } from './S4623';
import { rule as S2138 } from './S2138';
import { rule as S2681 } from './S2681';
import { rule as S6486 } from './S6486';
import { rule as S6747 } from './S6747';
import { rule as S1763 } from './S1763';
import { rule as S6791 } from './S6791';
import { rule as S5042 } from './S5042';
import { rule as S6478 } from './S6478';
import { rule as S3984 } from './S3984';
import { rule as S4030 } from './S4030';
import { rule as S905 } from './S905';
import { rule as S1172 } from './S1172';
import { rule as S1068 } from './S1068';
import { rule as S3699 } from './S3699';
import { rule as S6676 } from './S6676';
import { rule as S2737 } from './S2737';
import { rule as S6647 } from './S6647';
import { rule as S2123 } from './S2123';
import { rule as S4335 } from './S4335';
import { rule as S6443 } from './S6443';
import { rule as S3504 } from './S3504';
import { rule as S1526 } from './S1526';
import { rule as S6299 } from './S6299';
import { rule as S5547 } from './S5547';
import { rule as S4426 } from './S4426';
import { rule as S2208 } from './S2208';
import { rule as S2757 } from './S2757';
import { rule as S3760 } from './S3760';
import { rule as S2259 } from './S2259';
import { rule as S5264 } from './S5264';
import { rule as S3498 } from './S3498';
import { rule as S3757 } from './S3757';
import { rule as S4721 } from './S4721';
import { rule as S2819 } from './S2819';
import { rule as S4524 } from './S4524';
import { rule as S6572 } from './S6572';
import { rule as S4138 } from './S4138';
import { rule as S6598 } from './S6598';
import { rule as S1488 } from './S1488';
import { rule as S4156 } from './S4156';
import { rule as S6606 } from './S6606';
import { rule as S2428 } from './S2428';
import { rule as S6661 } from './S6661';
import { rule as S4634 } from './S4634';
import { rule as S1126 } from './S1126';
import { rule as S6666 } from './S6666';
import { rule as S6557 } from './S6557';
import { rule as S3512 } from './S3512';
import { rule as S4322 } from './S4322';
import { rule as S1264 } from './S1264';
import { rule as S4823 } from './S4823';
import { rule as S4507 } from './S4507';
import { rule as S2245 } from './S2245';
import { rule as S1444 } from './S1444';
import { rule as S5443 } from './S5443';
import { rule as S6959 } from './S6959';
import { rule as S6564 } from './S6564';
import { rule as S5843 } from './S5843';
import { rule as S4784 } from './S4784';
import { rule as S6440 } from './S6440';
import { rule as S1438 } from './S1438';
import { rule as S5876 } from './S5876';
import { rule as S3499 } from './S3499';
import { rule as S6397 } from './S6397';
import { rule as S6035 } from './S6035';
import { rule as S5852 } from './S5852';
import { rule as S4818 } from './S4818';
import { rule as S2392 } from './S2392';
import { rule as S6439 } from './S6439';
import { rule as S104 } from './S104';
import { rule as S138 } from './S138';
import { rule as S107 } from './S107';
import { rule as S6324 } from './S6324';
import { rule as S1534 } from './S1534';
import { rule as S2639 } from './S2639';
import { rule as S128 } from './S128';
import { rule as S5856 } from './S5856';
import { rule as S109 } from './S109';
import { rule as S5868 } from './S5868';
import { rule as S6326 } from './S6326';
import { rule as S6441 } from './S6441';
import { rule as S1481 } from './S1481';
import { rule as S6582 } from './S6582';
import { rule as S6759 } from './S6759';
import { rule as S6594 } from './S6594';
import { rule as S2077 } from './S2077';
import { rule as S5973 } from './S5973';
import { rule as S4829 } from './S4829';
import { rule as S6351 } from './S6351';
import { rule as S5739 } from './S5739';
import { rule as S3003 } from './S3003';
import { rule as S3854 } from './S3854';
import { rule as S131 } from './S131';
import { rule as S5256 } from './S5256';
import { rule as S5260 } from './S5260';
import { rule as S5958 } from './S5958';
import { rule as S1135 } from './S1135';
import { rule as S135 } from './S135';
import { rule as S5867 } from './S5867';
import { rule as S6535 } from './S6535';
import { rule as S1128 } from './S1128';
import { rule as S5860 } from './S5860';
import { rule as S4830 } from './S4830';
import { rule as S5527 } from './S5527';
import { rule as S3500 } from './S3500';
import { rule as S2310 } from './S2310';
import { rule as S2688 } from './S2688';
import { rule as S4323 } from './S4323';
import { rule as S1154 } from './S1154';
import { rule as S3758 } from './S3758';
import { rule as S117 } from './S117';
import { rule as S3735 } from './S3735';
import { rule as S4423 } from './S4423';
import { rule as S2817 } from './S2817';
import { rule as S5689 } from './S5689';
import { rule as S2755 } from './S2755';
import { rule as S4817 } from './S4817';
import { rule as S6627 } from './S6627';
import { rule as S1607 } from './S1607';
import type { Rule, Linter } from 'eslint';
import { rule as S7059 } from './S7059';

export const rules: Record<string, Rule.RuleModule> = {
  'accessor-pairs': S2376,
  'alt-text': S1077,
  'anchor-has-content': S6827,
  'anchor-is-valid': S6844,
  'anchor-precedence': S5850,
  'argument-type': S3782,
  'arguments-order': S2234,
  'arguments-usage': S3513,
  'array-callback-without-return': S3796,
  'array-constructor': S1528,
  'arrow-function-convention': S3524,
  'assertions-in-tests': S2699,
  'aws-apigateway-public-api': S6333,
  'aws-ec2-rds-dms-public': S6329,
  'aws-ec2-unencrypted-ebs-volume': S6275,
  'aws-efs-unencrypted': S6332,
  'aws-iam-all-privileges': S6302,
  'aws-iam-all-resources-accessible': S6304,
  'aws-iam-privilege-escalation': S6317,
  'aws-iam-public-access': S6270,
  'aws-opensearchservice-domain': S6308,
  'aws-rds-unencrypted-databases': S6303,
  'aws-restricted-ip-admin-access': S6321,
  'aws-s3-bucket-granted-access': S6265,
  'aws-s3-bucket-insecure-http': S6249,
  'aws-s3-bucket-public-access': S6281,
  'aws-s3-bucket-server-encryption': S6245,
  'aws-s3-bucket-versioning': S6252,
  'aws-sagemaker-unencrypted-notebook': S6319,
  'aws-sns-unencrypted-topics': S6327,
  'aws-sqs-unencrypted-queue': S6330,
  'bitwise-operators': S1529,
  'bool-param-default': S4798,
  'brace-style': S1105,
  'call-argument-line': S1472,
  'certificate-transparency': S5742,
  'chai-determinate-assertion': S6092,
  'class-name': S101,
  'class-prototype': S3525,
  'code-eval': S1523,
  'cognitive-complexity': S3776,
  'comma-or-logical-or-case': S3616,
  'comment-regex': S124,
  'concise-regex': S6353,
  'conditional-indentation': S3973,
  'confidential-information-logging': S5757,
  'constructor-for-side-effects': S1848,
  'content-length': S5693,
  'content-security-policy': S5728,
  'cookie-no-httponly': S3330,
  cookies: S2255,
  cors: S5122,
  csrf: S4502,
  'cyclomatic-complexity': S1541,
  'declarations-in-global-scope': S3798,
  'default-param-last': S1788,
  deprecation: S1874,
  'destructuring-assignment-syntax': S3514,
  'different-types-comparison': S3403,
  'disabled-auto-escaping': S5247,
  'disabled-resource-integrity': S5725,
  'disabled-timeout': S6080,
  'dns-prefetching': S5743,
  'duplicates-in-character-class': S5869,
  'elseif-without-else': S126,
  'empty-string-repetition': S5842,
  encryption: S4787,
  'encryption-secure-mode': S5542,
  'enforce-trailing-comma': S3723,
  'existing-groups': S6328,
  'expression-complexity': S1067,
  'file-header': S1451,
  'file-name-differ-from-class': S3317,
  'file-permissions': S2612,
  'file-uploads': S2598,
  'fixme-tag': S1134,
  'for-in': S1535,
  'for-loop-increment-sign': S2251,
  'frame-ancestors': S5732,
  'function-inside-loop': S1515,
  'function-name': S100,
  'function-return-type': S3800,
  'future-reserved-words': S1527,
  'generator-without-yield': S3531,
  hashing: S4790,
  'hidden-files': S5691,
  'hook-use-state': S6754,
  'html-has-lang': S5254,
  'in-operator-type-error': S3785,
  'inconsistent-function-call': S3686,
  'index-of-compare-to-positive-number': S2692,
  'insecure-cookie': S2092,
  'insecure-jwt-token': S5659,
  'inverted-assertion-arguments': S3415,
  'jsx-key': S6477,
  'jsx-no-constructed-context-values': S6481,
  'jsx-no-useless-fragment': S6749,
  'label-has-associated-control': S6853,
  'label-position': S1439,
  'link-with-target-blank': S5148,
  'max-switch-cases': S1479,
  'max-union-size': S4622,
  'media-has-caption': S4084,
  'misplaced-loop-counter': S1994,
  'mouse-events-a11y': S1082,
  'nested-control-flow': S134,
  'new-cap': S2430,
  'new-operator-misuse': S2999,
  'no-accessor-field-mismatch': S4275,
  'no-all-duplicated-branches': S3923,
  'no-alphabetical-sort': S2871,
  'no-angular-bypass-sanitization': S6268,
  'no-array-delete': S2870,
  'no-array-index-key': S6479,
  'no-associative-arrays': S3579,
  'no-async-constructor': S7059,
  'no-base-to-string': S6551,
  'no-built-in-override': S2424,
  'no-case-label-in-switch': S1219,
  'no-clear-text-protocols': S5332,
  'no-code-after-done': S6079,
  'no-collapsible-if': S1066,
  'no-collection-size-mischeck': S3981,
  'no-commented-code': S125,
  'no-dead-store': S1854,
  'no-delete-var': S3001,
  'no-deprecated-react': S6957,
  'no-duplicate-in-composite': S4621,
  'no-duplicate-string': S1192,
  'no-duplicated-branches': S1871,
  'no-element-overwrite': S4143,
  'no-empty-after-reluctant': S6019,
  'no-empty-alternatives': S6323,
  'no-empty-collection': S4158,
  'no-empty-function': S1186,
  'no-empty-group': S6331,
  'no-empty-interface': S4023,
  'no-empty-test-file': S2187,
  'no-equals-in-for-termination': S888,
  'no-exclusive-tests': S6426,
  'no-extend-native': S6643,
  'no-extra-arguments': S930,
  'no-extra-semi': S1116,
  'no-find-dom-node': S6788,
  'no-for-in-iterable': S4139,
  'no-function-declaration-in-block': S1530,
  'no-global-this': S2990,
  'no-globals-shadowing': S2137,
  'no-gratuitous-expressions': S2589,
  'no-hardcoded-credentials': S2068,
  'no-hardcoded-ip': S1313,
  'no-hook-setter-in-body': S6442,
  'no-identical-conditions': S1862,
  'no-identical-expressions': S1764,
  'no-identical-functions': S4144,
  'no-ignored-exceptions': S2486,
  'no-ignored-return': S2201,
  'no-implicit-dependencies': S4328,
  'no-implicit-global': S2703,
  'no-in-misuse': S4619,
  'no-incomplete-assertions': S2970,
  'no-inconsistent-returns': S3801,
  'no-incorrect-string-concat': S3402,
  'no-infinite-loop': S2189,
  'no-internal-api-use': S6627,
  'no-intrusive-permissions': S5604,
  'no-invalid-await': S4123,
  'no-invariant-returns': S3516,
  'no-inverted-boolean-check': S1940,
  'no-ip-forward': S5759,
  'no-labels': S1119,
  'no-literal-call': S6958,
  'no-lonely-if': S6660,
  'no-mime-sniff': S5734,
  'no-misleading-array-reverse': S4043,
  'no-misused-promises': S6544,
  'no-mixed-content': S5730,
  'no-nested-assignment': S1121,
  'no-nested-conditional': S3358,
  'no-nested-functions': S2004,
  'no-nested-incdec': S881,
  'no-nested-switch': S1821,
  'no-nested-template-literals': S4624,
  'no-one-iteration-loop': S1751,
  'no-os-command-from-path': S4036,
  'no-parameter-reassignment': S1226,
  'no-primitive-wrappers': S1533,
  'no-redeclare': S2814,
  'no-redundant-assignments': S4165,
  'no-redundant-boolean': S1125,
  'no-redundant-jump': S3626,
  'no-redundant-optional': S4782,
  'no-redundant-parentheses': S1110,
  'no-redundant-type-constituents': S6571,
  'no-reference-error': S3827,
  'no-referrer-policy': S5736,
  'no-require-or-define': S3533,
  'no-return-type-any': S4324,
  'no-same-argument-assert': S5863,
  'no-same-line-conditional': S3972,
  'no-self-compare': S6679,
  'no-skipped-test': S1607,
  'no-small-switch': S1301,
  'no-tab': S105,
  'no-table-as-layout': S5257,
  'no-this-alias': S4327,
  'no-throw-literal': S3696,
  'no-try-promise': S4822,
  'no-undefined-argument': S4623,
  'no-undefined-assignment': S2138,
  'no-unenclosed-multiline-block': S2681,
  'no-uniq-key': S6486,
  'no-unknown-property': S6747,
  'no-unreachable': S1763,
  'no-unsafe': S6791,
  'no-unsafe-unzip': S5042,
  'no-unstable-nested-components': S6478,
  'no-unthrown-error': S3984,
  'no-unused-collection': S4030,
  'no-unused-expressions': S905,
  'no-unused-function-argument': S1172,
  'no-unused-private-class-members': S1068,
  'no-use-of-empty-return-value': S3699,
  'no-useless-call': S6676,
  'no-useless-catch': S2737,
  'no-useless-constructor': S6647,
  'no-useless-increment': S2123,
  'no-useless-intersection': S4335,
  'no-useless-react-setstate': S6443,
  'no-var': S3504,
  'no-variable-usage-before-declaration': S1526,
  'no-vue-bypass-sanitization': S6299,
  'no-weak-cipher': S5547,
  'no-weak-keys': S4426,
  'no-wildcard-import': S2208,
  'non-existent-operator': S2757,
  'non-number-in-arithmetic-expression': S3760,
  'null-dereference': S2259,
  'object-alt-content': S5264,
  'object-shorthand': S3498,
  'operation-returning-nan': S3757,
  'os-command': S4721,
  'post-message': S2819,
  'prefer-default-last': S4524,
  'prefer-enum-initializers': S6572,
  'prefer-for-of': S4138,
  'prefer-function-type': S6598,
  'prefer-immediate-return': S1488,
  'prefer-namespace-keyword': S4156,
  'prefer-nullish-coalescing': S6606,
  'prefer-object-literal': S2428,
  'prefer-object-spread': S6661,
  'prefer-promise-shorthand': S4634,
  'prefer-single-boolean-return': S1126,
  'prefer-spread': S6666,
  'prefer-string-starts-ends-with': S6557,
  'prefer-template': S3512,
  'prefer-type-guard': S4322,
  'prefer-while': S1264,
  'process-argv': S4823,
  'production-debug': S4507,
  'pseudo-random': S2245,
  'public-static-readonly': S1444,
  'publicly-writable-directories': S5443,
  'reduce-initial-value': S6959,
  'redundant-type-aliases': S6564,
  'regex-complexity': S5843,
  'regular-expr': S4784,
  'pluginRules-of-hooks': S6440,
  semi: S1438,
  'session-regeneration': S5876,
  'shorthand-property-grouping': S3499,
  'single-char-in-character-classes': S6397,
  'single-character-alternation': S6035,
  'slow-regex': S5852,
  sockets: S4818,
  'sonar-block-scoped-var': S2392,
  'sonar-jsx-no-leaked-render': S6439,
  'sonar-max-lines': S104,
  'sonar-max-lines-per-function': S138,
  'sonar-max-params': S107,
  'sonar-no-control-regex': S6324,
  'sonar-no-dupe-keys': S1534,
  'sonar-no-empty-character-class': S2639,
  'sonar-no-fallthrough': S128,
  'sonar-no-invalid-regexp': S5856,
  'sonar-no-magic-numbers': S109,
  'sonar-no-misleading-character-class': S5868,
  'sonar-no-regex-spaces': S6326,
  'sonar-no-unused-class-component-methods': S6441,
  'sonar-no-unused-vars': S1481,
  'sonar-prefer-optional-chain': S6582,
  'sonar-prefer-read-only-props': S6759,
  'sonar-prefer-regexp-exec': S6594,
  'sql-queries': S2077,
  'stable-tests': S5973,
  'standard-input': S4829,
  'stateful-regex': S6351,
  'strict-transport-security': S5739,
  'strings-comparison': S3003,
  'super-invocation': S3854,
  'switch-without-default': S131,
  'table-header': S5256,
  'table-header-reference': S5260,
  'test-check-exception': S5958,
  'todo-tag': S1135,
  'too-many-break-or-continue-in-loop': S135,
  'unicode-aware-regex': S5867,
  'unnecessary-character-escapes': S6535,
  'unused-import': S1128,
  'unused-named-groups': S5860,
  'unverified-certificate': S4830,
  'unverified-hostname': S5527,
  'updated-const-var': S3500,
  'updated-loop-counter': S2310,
  'use-isnan': S2688,
  'use-type-alias': S4323,
  'useless-string-operation': S1154,
  'values-not-convertible-to-numbers': S3758,
  'variable-name': S117,
  'void-use': S3735,
  'weak-ssl': S4423,
  'web-sql-database': S2817,
  'x-powered-by': S5689,
  'xml-parser-xxe': S2755,
  xpath: S4817,
};

const recommendedLegacyConfig: Linter.Config = { plugins: ['sonarjs'], rules: {} };
const recommendedConfig: Linter.FlatConfig & {
  rules: Linter.RulesRecord;
} = {
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

for (const [key, rule] of Object.entries(rules)) {
  const recommended = rule.meta?.docs?.recommended || false;

  recommendedConfig.rules[`sonarjs/${key}`] = recommended ? 'error' : 'off';
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

export default { rules, configs, meta };
