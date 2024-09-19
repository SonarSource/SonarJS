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
import { eslintRules } from './core';
import { tsEslintRules } from './typescript-eslint';
import { rules as a11yPluginRules } from 'eslint-plugin-jsx-a11y';
import { rules as importPluginRules } from 'eslint-plugin-import';

export const rules = {
  S103: eslintRules['max-len'],
  S106: eslintRules['no-console'],
  S108: eslintRules['no-empty'],
  S1090: a11yPluginRules['iframe-has-title'],
  S1117: tsEslintRules['no-shadow'],
  S113: eslintRules['eol-last'],
  S1131: eslintRules['no-trailing-spaces'],
  S1143: eslintRules['no-unsafe-finally'],
  S1199: eslintRules['no-lone-blocks'],
  S121: eslintRules['curly'],
  S122: eslintRules['max-statements-per-line'],
  S1314: eslintRules['no-octal'],
  S1321: eslintRules['no-with'],
  S139: eslintRules['line-comment-position'],
  S1440: eslintRules['eqeqeq'],
  S1441: eslintRules['quotes'],
  S1442: eslintRules['no-alert'],
  S1516: eslintRules['no-multi-str'],
  S1525: eslintRules['no-debugger'],
  S1536: eslintRules['no-dupe-args'],
  S1537: tsEslintRules['comma-dangle'],
  S1539: eslintRules['strict'],
  S1656: eslintRules['no-self-assign'],
  S1774: eslintRules['no-ternary'],
  S2094: tsEslintRules['no-extraneous-class'],
  S2427: eslintRules['radix'],
  S2432: eslintRules['no-setter-return'],
  S2685: eslintRules['no-caller'],
  S2933: tsEslintRules['prefer-readonly'],
  S2966: tsEslintRules['no-non-null-assertion'],
  S3257: tsEslintRules['no-inferrable-types'],
  S3353: eslintRules['prefer-const'],
  S3523: eslintRules['no-new-func'],
  S3786: eslintRules['no-template-curly-in-string'],
  S3799: eslintRules['no-empty-pattern'],
  S3812: eslintRules['no-unsafe-negation'],
  S3834: eslintRules['no-new-native-nonconstructor'],
  S3863: importPluginRules['no-duplicates'],
  S4124: tsEslintRules['no-misused-new'],
  S4125: eslintRules['valid-typeof'],
  S4136: tsEslintRules['adjacent-overload-signatures'],
  S4137: tsEslintRules['consistent-type-assertions'],
  S4140: eslintRules['no-sparse-arrays'],
  S4157: tsEslintRules['no-unnecessary-type-arguments'],
  S4204: tsEslintRules['no-explicit-any'],
  S4325: tsEslintRules['no-unnecessary-type-assertion'],
  S4326: eslintRules['no-return-await'],
  S6325: eslintRules['prefer-regex-literals'],
  ...await (async () => {
    try {
      require.resolve('eslint-plugin-react');
      const { rules: reactPluginRules } = await import('eslint-plugin-react');
      return {
        S6435: reactPluginRules['require-render-return'],
        S6438: reactPluginRules['jsx-no-comment-textnodes'],
        S6480: reactPluginRules['jsx-no-bind'],
        S6746: reactPluginRules['no-direct-mutation-state'],
        S6748: reactPluginRules['no-children-prop'],
        S6750: reactPluginRules['no-render-return-value'],
        S6756: reactPluginRules['no-access-state-in-setstate'],
        S6757: reactPluginRules['no-this-in-sfc'],
        S6761: reactPluginRules['no-danger-with-children'],
        S6763: reactPluginRules['no-redundant-should-component-update'],
        S6766: reactPluginRules['no-unescaped-entities'],
        S6767: reactPluginRules['no-unused-prop-types'],
        S6770: reactPluginRules['jsx-pascal-case'],
        S6772: reactPluginRules['jsx-child-element-spacing'],
        S6774: reactPluginRules['prop-types'],
        S6775: reactPluginRules['default-props-match-prop-types'],
        S6789: reactPluginRules['no-is-mounted'],
        S6790: reactPluginRules['no-string-refs'],
      };
    } catch {
      return {};
    }
  })(),
  S6509: eslintRules['no-extra-boolean-cast'],
  S6522: eslintRules['no-import-assign'],
  S6523: eslintRules['no-unsafe-optional-chaining'],
  S6534: eslintRules['no-loss-of-precision'],
  S6550: tsEslintRules['prefer-literal-enum-member'],
  S6565: tsEslintRules['prefer-return-this-type'],
  S6568: tsEslintRules['no-confusing-non-null-assertion'],
  S6569: tsEslintRules['no-unnecessary-type-constraint'],
  S6578: tsEslintRules['no-duplicate-enum-values'],
  S6583: tsEslintRules['no-mixed-enums'],
  S6590: tsEslintRules['prefer-as-const'],
  S6635: eslintRules['no-constructor-return'],
  S6637: eslintRules['no-extra-bind'],
  S6638: eslintRules['no-constant-binary-expression'],
  S6644: eslintRules['no-unneeded-ternary'],
  S6645: eslintRules['no-undef-init'],
  S6650: eslintRules['no-useless-rename'],
  S6653: eslintRules['prefer-object-has-own'],
  S6654: eslintRules['no-proto'],
  S6657: eslintRules['no-octal-escape'],
  S6671: tsEslintRules['prefer-promise-reject-errors'],
  S6793: a11yPluginRules['aria-proptypes'],
  S6807: a11yPluginRules['role-has-required-aria-props'],
  S6811: a11yPluginRules['role-supports-aria-props'],
  S6819: a11yPluginRules['prefer-tag-over-role'],
  S6821: a11yPluginRules['aria-role'],
  S6822: a11yPluginRules['no-redundant-roles'],
  S6823: a11yPluginRules['aria-activedescendant-has-tabindex'],
  S6824: a11yPluginRules['aria-unsupported-elements'],
  S6825: a11yPluginRules['no-aria-hidden-on-focusable'],
  S6836: eslintRules['no-case-declarations'],
  S6840: a11yPluginRules['autocomplete-valid'],
  S6841: a11yPluginRules['tabindex-no-positive'],
  S6842: a11yPluginRules['no-noninteractive-element-to-interactive-role'],
  S6843: a11yPluginRules['no-interactive-element-to-noninteractive-role'],
  S6845: a11yPluginRules['no-noninteractive-tabindex'],
  S6846: a11yPluginRules['no-access-key'],
  S6847: a11yPluginRules['no-noninteractive-element-interactions'],
  S6848: a11yPluginRules['no-static-element-interactions'],
  S6850: a11yPluginRules['heading-has-content'],
  S6851: a11yPluginRules['img-redundant-alt'],
  S6852: a11yPluginRules['interactive-supports-focus'],
  S6859: importPluginRules['no-absolute-path'],
  S6861: importPluginRules['no-mutable-exports'],
  S878: eslintRules['no-sequences'],
  S909: eslintRules['no-continue'],
};
