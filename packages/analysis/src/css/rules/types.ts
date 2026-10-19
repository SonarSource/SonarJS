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
import type stylelint from 'stylelint';

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
  listParam?: StylelintListParam[];
  booleanParam?: StylelintBooleanParam;
};

/** Integration settings for one Stylelint binding. */
export type CssRuleBinding = Omit<CssRuleMeta, 'sqKey'> & {
  /** Restrict checks to plain CSS, including CSS blocks in HTML and Vue. */
  cssOnly?: boolean;
};

export type CssExternalPlugin = 'stylelint' | '@stylistic/stylelint-plugin';

/** Local plugins have one binding; an external rule can enable several upstream rules. */
export type CssRuleDefinition =
  | { implementation: 'original'; bindings: [CssRuleBinding] }
  | {
      implementation: 'decorated';
      bindings: [CssRuleBinding & { upstreamRule: keyof typeof stylelint.rules }];
    }
  | {
      implementation: 'external';
      externalPlugin: CssExternalPlugin;
      bindings: [CssRuleBinding, ...CssRuleBinding[]];
    };
