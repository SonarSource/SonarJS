/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
 * A configurable string-list parameter.
 * Generates a @RuleProperty String field and contributes to
 * [true, { stylelintOptionKey: splitAndTrim(javaField) }]
 */
export type StylelintListParam = {
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
type StylelintBooleanParam = {
  sqKey: string;
  javaField: string;
  description: string;
  default: boolean;
  onTrue: Array<{ stylelintOptionKey: string; values: string[] }>;
};

export type CssRuleMeta = {
  sqKey: string;
  stylelintKey: string;
  listParam?: StylelintListParam[];
  booleanParam?: StylelintBooleanParam;
};

function simpleRule(sqKey: string, stylelintKey: string): CssRuleMeta {
  return { sqKey, stylelintKey };
}

function buildSimpleRules(rules: Record<string, string>): CssRuleMeta[] {
  return Object.entries(rules).map(([sqKey, stylelintKey]) => simpleRule(sqKey, stylelintKey));
}

function singleListParamRule(
  sqKey: string,
  stylelintKey: string,
  listParam: StylelintListParam,
): CssRuleMeta {
  return { sqKey, stylelintKey, listParam: [listParam] };
}

function multiListParamRule(
  sqKey: string,
  stylelintKey: string,
  ...listParam: StylelintListParam[]
): CssRuleMeta {
  return { sqKey, stylelintKey, listParam };
}

function booleanParamRule(
  sqKey: string,
  stylelintKey: string,
  booleanParam: StylelintBooleanParam,
): CssRuleMeta {
  return { sqKey, stylelintKey, booleanParam };
}

function listParam(
  sqKey: string,
  javaField: string,
  description: string,
  defaultValue: string,
  stylelintOptionKey = sqKey,
): StylelintListParam {
  return {
    sqKey,
    javaField,
    description,
    default: defaultValue,
    stylelintOptionKey,
  };
}

function ignoreAtRulesRule(
  sqKey: string,
  stylelintKey: string,
  javaField: string,
  description: string,
  defaultValue = '',
): CssRuleMeta {
  return singleListParamRule(
    sqKey,
    stylelintKey,
    listParam('ignoreAtRules', javaField, description, defaultValue),
  );
}

export const cssRulesMeta: CssRuleMeta[] = [
  ...buildSimpleRules({
    S125: 'sonar/no-commented-code',
    S1116: '@stylistic/no-extra-semicolons',
    S1128: 'no-duplicate-at-import-rules',
  }),
  singleListParamRule(
    'S1874',
    'selector-no-deprecated',
    listParam(
      'ignoreSelectors',
      'ignoreSelectors',
      'Comma-separated list of selector names and/or regular expressions to ignore.',
      '',
    ),
  ),
  singleListParamRule(
    'S1874',
    'declaration-property-value-keyword-no-deprecated',
    listParam(
      'ignoreKeywords',
      'ignoreKeywords',
      'Comma-separated list of strings and/or regular expressions for deprecated keywords to ignore.',
      '',
    ),
  ),
  ignoreAtRulesRule(
    'S1874',
    'at-rule-no-deprecated',
    'ignoreAtRules',
    'Comma-separated list of deprecated "at-rules" to ignore.',
  ),
  ...buildSimpleRules({
    S4647: 'color-no-invalid-hex',
    S4648: 'font-family-no-duplicate-names',
  }),
  singleListParamRule(
    'S4649',
    'font-family-no-missing-generic-family-keyword',
    listParam(
      'ignoreFontFamilies',
      'ignoreFontFamilies',
      'Comma-separated list of font families to ignore. Each value can be a string or a regular expression with the syntax /pattern/.',
      '',
    ),
  ),
  ...buildSimpleRules({
    S4650: 'function-calc-no-unspaced-operator',
    S4651: 'function-linear-gradient-no-nonstandard-direction',
    S4652: 'string-no-newline',
  }),
  singleListParamRule(
    'S4653',
    'unit-no-unknown',
    listParam(
      'ignoreFunctions',
      'ignoreFunctions',
      'Comma-separated list of function names and/or regular expressions for functions whose arguments should be ignored.',
      'image-set, spacer, spacing, size, rem, em, fluid',
    ),
  ),
  multiListParamRule(
    'S4654',
    'property-no-unknown',
    listParam(
      'ignoreTypes',
      'ignoreProperties',
      'Comma-separated list of strings and/or regular expressions for properties to consider as valid.',
      'composes, /^mso-/',
      'ignoreProperties',
    ),
    listParam(
      'ignoreSelectors',
      'ignoreSelectors',
      'Comma-separated list of strings and/or regular expressions for selectors to consider as valid.',
      '/^:export.*/, /^:import.*/',
    ),
  ),
  simpleRule('S4655', 'keyframe-declaration-no-important'),
  booleanParamRule('S4656', 'declaration-block-no-duplicate-properties', {
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
  }),
  ...buildSimpleRules({
    S4657: 'declaration-block-no-shorthand-property-overrides',
    S4658: 'block-no-empty',
  }),
  singleListParamRule(
    'S4659',
    'selector-pseudo-class-no-unknown',
    listParam(
      'ignorePseudoClasses',
      'ignoredPseudoClasses',
      'Comma-separated list of strings and/or regular expressions for pseudo classes to consider as valid.',
      'local,global,export,import,deep',
    ),
  ),
  singleListParamRule(
    'S4660',
    'selector-pseudo-element-no-unknown',
    listParam(
      'ignorePseudoElements',
      'ignorePseudoElements',
      'Comma-separated list of regular expressions or strings to ignore (e.g. /^custom-/).',
      'ng-deep,v-deep,deep',
    ),
  ),
  simpleRule('S4661', 'media-feature-name-no-unknown'),
  ignoreAtRulesRule(
    'S4662',
    'at-rule-no-unknown',
    'ignoreAtRules',
    'Comma-separated list of "at-rules" to consider as valid.',
    'value,at-root,content,debug,each,else,error,for,function,if,include,mixin,return,warn,while,extend,use,forward,tailwind,apply,layer,container,theme,utility,custom-variant,source,plugin,config,reference,variant,/^@.*/',
  ),
  ...buildSimpleRules({
    S4663: 'comment-no-empty',
    S4664: 'no-descending-specificity',
    S4666: 'no-duplicate-selectors',
    S4667: 'no-empty-source',
    S4668: 'no-invalid-double-slash-comments',
  }),
  multiListParamRule(
    'S4670',
    'selector-type-no-unknown',
    listParam(
      'ignoreTypes',
      'ignoreTypes',
      'Comma-separated list of regular expressions for selector types to consider as valid.',
      '/^(mat|md|fa)-/',
    ),
    listParam(
      'ignore',
      'ignore',
      'Comma-separated list of ignored elements. The possible values are: "custom-elements": Allow custom elements (e.g "x-foo"). "default-namespace": Allow unknown type selectors if they belong to the default namespace.',
      'custom-elements',
    ),
  ),
  ...buildSimpleRules({
    S5362: 'sonar/function-calc-no-invalid',
    S7923: 'sonar/no-restrict-orientation',
    S7924: 'sonar/minimum-contrast',
    S7925: 'sonar/text-spacing',
  }),
  singleListParamRule(
    'S8757',
    'sonar/annotation-no-unknown',
    listParam(
      'ignoreAnnotations',
      'ignoreAnnotations',
      'Comma-separated list of strings and/or regular expressions for annotations to consider as valid.',
      '',
    ),
  ),
  ignoreAtRulesRule(
    'S8759',
    'at-rule-no-vendor-prefix',
    'ignoredAtRules',
    'Comma-separated list of strings and/or regular expressions for at-rules to ignore.',
  ),
  simpleRule('S8765', 'custom-property-no-missing-var-function'),
  ignoreAtRulesRule(
    'S8767',
    'no-invalid-position-declaration',
    'ignoredAtRules',
    'Comma-separated list of at-rule names or regular expressions to treat as valid nesting containers.',
  ),
  ...buildSimpleRules({
    S8769: 'block-no-redundant-nested-style-rules',
    S8770: 'at-rule-descriptor-no-unknown',
    S8773: 'keyframe-block-no-duplicate-selectors',
    S8774: 'selector-anb-no-unmatchable',
    S8775: 'at-rule-descriptor-value-no-unknown',
  }),
  ignoreAtRulesRule(
    'S8776',
    'nesting-selector-no-missing-scoping-root',
    'ignoredAtRules',
    'Comma-separated list of "at-rules" inside which nesting selectors are allowed without a scoping parent.',
  ),
  ignoreAtRulesRule(
    'S8777',
    'at-rule-prelude-no-invalid',
    'ignoredAtRules',
    'Comma-separated list of at-rule names or regular expressions whose preludes should not be validated.',
  ),
  ignoreAtRulesRule(
    'S8778',
    'no-invalid-position-at-import-rule',
    'ignoredAtRules',
    'Comma-separated list of "at-rules" that are allowed to appear before "@import" rules.',
  ),
];

/** Reverse map: Stylelint rule key -> SonarQube rule key */
export const reverseCssRuleKeyMap = new Map(cssRulesMeta.map(r => [r.stylelintKey, r.sqKey]));
