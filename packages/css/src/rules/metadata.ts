/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */

/**
 * A configurable string-list ignore parameter.
 * Generates a @RuleProperty String field and contributes to
 * [true, { stylelintOptionKey: splitAndTrim(javaField) }]
 */
export type StylelintIgnoreParam = {
  sqKey: string;
  javaField: string;
  description: string;
  default: string;
  stylelintOptionKey: string;
};

/**
 * A boolean parameter with conditional fixed options.
 * When javaField is true, emits [true, { onTrue[i].stylelintOptionKey: onTrue[i].values }]
 * When false, emits []
 */
export type StylelintBooleanParam = {
  sqKey: string;
  javaField: string;
  description: string;
  default: boolean;
  onTrue: Array<{ stylelintOptionKey: string; values: string[] }>;
};

export type CssRuleMeta = {
  sqKey: string;
  stylelintKey: string;
  ignoreParams?: StylelintIgnoreParam[];
  booleanParam?: StylelintBooleanParam;
};

export const cssRulesMeta: CssRuleMeta[] = [
  {
    sqKey: 'S125',
    stylelintKey: 'sonar/no-commented-code',
  },
  {
    sqKey: 'S1116',
    stylelintKey: '@stylistic/no-extra-semicolons',
  },
  {
    sqKey: 'S1128',
    stylelintKey: 'no-duplicate-at-import-rules',
  },
  {
    sqKey: 'S4647',
    stylelintKey: 'color-no-invalid-hex',
  },
  {
    sqKey: 'S4648',
    stylelintKey: 'font-family-no-duplicate-names',
  },
  {
    sqKey: 'S4649',
    stylelintKey: 'font-family-no-missing-generic-family-keyword',
    ignoreParams: [
      {
        sqKey: 'ignoreFontFamilies',
        javaField: 'ignoreFontFamilies',
        description:
          'Comma-separated list of font families to ignore. Each value can be a string or a regular expression with the syntax /pattern/.',
        default: '',
        stylelintOptionKey: 'ignoreFontFamilies',
      },
    ],
  },
  {
    sqKey: 'S4650',
    stylelintKey: 'function-calc-no-unspaced-operator',
  },
  {
    sqKey: 'S4651',
    stylelintKey: 'function-linear-gradient-no-nonstandard-direction',
  },
  {
    sqKey: 'S4652',
    stylelintKey: 'string-no-newline',
  },
  {
    sqKey: 'S4653',
    stylelintKey: 'unit-no-unknown',
    ignoreParams: [
      {
        sqKey: 'ignoreFunctions',
        javaField: 'ignoreFunctions',
        description:
          'Comma-separated list of function names and/or regular expressions for functions whose arguments should be ignored.',
        default: 'image-set, spacer, spacing, size, rem, em, fluid',
        stylelintOptionKey: 'ignoreFunctions',
      },
    ],
  },
  {
    sqKey: 'S4654',
    stylelintKey: 'property-no-unknown',
    ignoreParams: [
      {
        sqKey: 'ignoreTypes',
        javaField: 'ignoreProperties',
        description:
          'Comma-separated list of strings and/or regular expressions for properties to consider as valid.',
        default: 'composes, /^mso-/',
        stylelintOptionKey: 'ignoreProperties',
      },
      {
        sqKey: 'ignoreSelectors',
        javaField: 'ignoreSelectors',
        description:
          'Comma-separated list of strings and/or regular expressions for selectors to consider as valid.',
        default: '/^:export.*/, /^:import.*/',
        stylelintOptionKey: 'ignoreSelectors',
      },
    ],
  },
  {
    sqKey: 'S4655',
    stylelintKey: 'keyframe-declaration-no-important',
  },
  {
    sqKey: 'S4656',
    stylelintKey: 'declaration-block-no-duplicate-properties',
    booleanParam: {
      sqKey: 'ignoreFallbacks',
      javaField: 'ignoreFallbacks',
      description: 'Ignore consecutive duplicated properties with different values.',
      default: true,
      onTrue: [
        {
          stylelintOptionKey: 'ignore',
          values: ['consecutive-duplicates-with-different-values'],
        },
      ],
    },
  },
  {
    sqKey: 'S4657',
    stylelintKey: 'declaration-block-no-shorthand-property-overrides',
  },
  {
    sqKey: 'S4658',
    stylelintKey: 'block-no-empty',
  },
  {
    sqKey: 'S4659',
    stylelintKey: 'selector-pseudo-class-no-unknown',
    ignoreParams: [
      {
        sqKey: 'ignorePseudoClasses',
        javaField: 'ignoredPseudoClasses',
        description:
          'Comma-separated list of strings and/or regular expressions for pseudo classes to consider as valid.',
        default: 'local,global,export,import,deep',
        stylelintOptionKey: 'ignorePseudoClasses',
      },
    ],
  },
  {
    sqKey: 'S4660',
    stylelintKey: 'selector-pseudo-element-no-unknown',
    ignoreParams: [
      {
        sqKey: 'ignorePseudoElements',
        javaField: 'ignorePseudoElements',
        description:
          'Comma-separated list of regular expressions or strings to ignore (e.g. /^custom-/).',
        default: 'ng-deep,v-deep,deep',
        stylelintOptionKey: 'ignorePseudoElements',
      },
    ],
  },
  {
    sqKey: 'S4661',
    stylelintKey: 'media-feature-name-no-unknown',
  },
  {
    sqKey: 'S4662',
    stylelintKey: 'at-rule-no-unknown',
    ignoreParams: [
      {
        sqKey: 'ignoreAtRules',
        javaField: 'ignoredAtRules',
        description: 'Comma-separated list of "at-rules" to consider as valid.',
        default:
          'value,at-root,content,debug,each,else,error,for,function,if,include,mixin,return,warn,while,extend,use,forward,tailwind,apply,layer,container,theme,utility,custom-variant,source,plugin,config,reference,variant,/^@.*/',
        stylelintOptionKey: 'ignoreAtRules',
      },
    ],
  },
  {
    sqKey: 'S4663',
    stylelintKey: 'comment-no-empty',
  },
  {
    sqKey: 'S4664',
    stylelintKey: 'no-descending-specificity',
  },
  {
    sqKey: 'S4666',
    stylelintKey: 'no-duplicate-selectors',
  },
  {
    sqKey: 'S4667',
    stylelintKey: 'no-empty-source',
  },
  {
    sqKey: 'S4668',
    stylelintKey: 'no-invalid-double-slash-comments',
  },
  {
    sqKey: 'S4670',
    stylelintKey: 'selector-type-no-unknown',
    ignoreParams: [
      {
        sqKey: 'ignoreTypes',
        javaField: 'ignoreTypes',
        description:
          'Comma-separated list of regular expressions for selector types to consider as valid.',
        default: '/^(mat|md|fa)-/',
        stylelintOptionKey: 'ignoreTypes',
      },
      {
        sqKey: 'ignore',
        javaField: 'ignore',
        description:
          'Comma-separated list of ignored elements. The possible values are: "custom-elements": Allow custom elements (e.g "x-foo"). "default-namespace": Allow unknown type selectors if they belong to the default namespace.',
        default: 'custom-elements',
        stylelintOptionKey: 'ignore',
      },
    ],
  },
  {
    sqKey: 'S5362',
    stylelintKey: 'sonar/function-calc-no-invalid',
  },
  {
    sqKey: 'S7923',
    stylelintKey: 'sonar/no-restrict-orientation',
  },
  {
    sqKey: 'S7924',
    stylelintKey: 'sonar/minimum-contrast',
  },
  {
    sqKey: 'S7925',
    stylelintKey: 'sonar/text-spacing',
  },
];

/** Forward map: SonarQube rule key -> Stylelint rule key */
export const cssRuleKeyMap = new Map(cssRulesMeta.map(r => [r.sqKey, r.stylelintKey]));

/** Reverse map: Stylelint rule key -> SonarQube rule key */
export const reverseCssRuleKeyMap = new Map(cssRulesMeta.map(r => [r.stylelintKey, r.sqKey]));
