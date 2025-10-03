/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
package org.sonar.css;

import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.annotation.Nullable;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.rule.Checks;
import org.sonar.api.rule.RuleKey;
import org.sonar.css.rules.AtRuleNoUnknown;
import org.sonar.css.rules.BlockNoEmpty;
import org.sonar.css.rules.ColorNoInvalidHex;
import org.sonar.css.rules.CommentNoEmpty;
import org.sonar.css.rules.CssRule;
import org.sonar.css.rules.DeclarationBlockNoDuplicateProperties;
import org.sonar.css.rules.DeclarationBlockNoShorthandPropertyOverrides;
import org.sonar.css.rules.FontFamilyNoDuplicateNames;
import org.sonar.css.rules.FontFamilyNoMissingGenericFamilyKeyword;
import org.sonar.css.rules.FunctionCalcNoInvalid;
import org.sonar.css.rules.FunctionCalcNoUnspacedOperator;
import org.sonar.css.rules.FunctionLinearGradientNoNonstandardDirection;
import org.sonar.css.rules.KeyframeDeclarationNoImportant;
import org.sonar.css.rules.MediaFeatureNameNoUnknown;
import org.sonar.css.rules.NoCommentedCode;
import org.sonar.css.rules.NoDescendingSpecificity;
import org.sonar.css.rules.NoDuplicateAtImportRules;
import org.sonar.css.rules.NoDuplicateSelectors;
import org.sonar.css.rules.NoEmptySource;
import org.sonar.css.rules.NoExtraSemicolons;
import org.sonar.css.rules.NoInvalidDoubleSlashComments;
import org.sonar.css.rules.NoRestrictOrientation;
import org.sonar.css.rules.PropertyNoUnknown;
import org.sonar.css.rules.SelectorPseudoClassNoUnknown;
import org.sonar.css.rules.SelectorPseudoElementNoUnknown;
import org.sonar.css.rules.SelectorTypeNoUnknown;
import org.sonar.css.rules.StringNoNewline;
import org.sonar.css.rules.UnitNoUnknown;
import org.sonar.plugins.javascript.bridge.StylelintRule;

public class CssRules {

  private final Map<String, RuleKey> stylelintKeyToRuleKey;
  private final Collection<CssRule> rules;

  public CssRules(CheckFactory checkFactory) {
    Checks<CssRule> checks = checkFactory
      .<CssRule>create(CssRulesDefinition.REPOSITORY_KEY)
      .addAnnotatedChecks(getRuleClasses());
    this.rules = checks.all();
    stylelintKeyToRuleKey = new HashMap<>();
    for (CssRule rule : rules) {
      stylelintKeyToRuleKey.put(rule.stylelintKey(), checks.ruleKey(rule));
    }
  }

  public static List<Class<?>> getRuleClasses() {
    return Collections.unmodifiableList(
      Arrays.asList(
        AtRuleNoUnknown.class,
        BlockNoEmpty.class,
        ColorNoInvalidHex.class,
        CommentNoEmpty.class,
        DeclarationBlockNoDuplicateProperties.class,
        DeclarationBlockNoShorthandPropertyOverrides.class,
        FontFamilyNoDuplicateNames.class,
        FontFamilyNoMissingGenericFamilyKeyword.class,
        FunctionCalcNoUnspacedOperator.class,
        FunctionCalcNoInvalid.class,
        FunctionLinearGradientNoNonstandardDirection.class,
        KeyframeDeclarationNoImportant.class,
        MediaFeatureNameNoUnknown.class,
        NoCommentedCode.class,
        NoDescendingSpecificity.class,
        NoDuplicateAtImportRules.class,
        NoDuplicateSelectors.class,
        NoEmptySource.class,
        NoExtraSemicolons.class,
        NoInvalidDoubleSlashComments.class,
        NoRestrictOrientation.class,
        PropertyNoUnknown.class,
        SelectorPseudoClassNoUnknown.class,
        SelectorPseudoElementNoUnknown.class,
        SelectorTypeNoUnknown.class,
        StringNoNewline.class,
        UnitNoUnknown.class
      )
    );
  }

  @Nullable
  public RuleKey getActiveSonarKey(String stylelintKey) {
    return stylelintKeyToRuleKey.get(stylelintKey);
  }

  public List<StylelintRule> getStylelintRules() {
    return this.rules.stream()
      .map(rule -> new StylelintRule(rule.stylelintKey(), rule.stylelintOptions()))
      .toList();
  }
}
