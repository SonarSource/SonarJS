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
package org.sonar.plugins.javascript.css;

import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import javax.annotation.Nullable;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.rule.Checks;
import org.sonar.api.rule.RuleKey;
import org.sonar.plugins.javascript.css.rules.AtRuleNoUnknown;
import org.sonar.plugins.javascript.css.rules.BlockNoEmpty;
import org.sonar.plugins.javascript.css.rules.ColorNoInvalidHex;
import org.sonar.plugins.javascript.css.rules.CommentNoEmpty;
import org.sonar.plugins.javascript.css.rules.CssRule;
import org.sonar.plugins.javascript.css.rules.DeclarationBlockNoDuplicateProperties;
import org.sonar.plugins.javascript.css.rules.DeclarationBlockNoShorthandPropertyOverrides;
import org.sonar.plugins.javascript.css.rules.FontFamilyNoDuplicateNames;
import org.sonar.plugins.javascript.css.rules.FontFamilyNoMissingGenericFamilyKeyword;
import org.sonar.plugins.javascript.css.rules.FunctionCalcNoInvalid;
import org.sonar.plugins.javascript.css.rules.FunctionCalcNoUnspacedOperator;
import org.sonar.plugins.javascript.css.rules.FunctionLinearGradientNoNonstandardDirection;
import org.sonar.plugins.javascript.css.rules.KeyframeDeclarationNoImportant;
import org.sonar.plugins.javascript.css.rules.MediaFeatureNameNoUnknown;
import org.sonar.plugins.javascript.css.rules.NoDescendingSpecificity;
import org.sonar.plugins.javascript.css.rules.NoDuplicateAtImportRules;
import org.sonar.plugins.javascript.css.rules.NoDuplicateSelectors;
import org.sonar.plugins.javascript.css.rules.NoEmptySource;
import org.sonar.plugins.javascript.css.rules.NoExtraSemicolons;
import org.sonar.plugins.javascript.css.rules.NoInvalidDoubleSlashComments;
import org.sonar.plugins.javascript.css.rules.PropertyNoUnknown;
import org.sonar.plugins.javascript.css.rules.SelectorPseudoClassNoUnknown;
import org.sonar.plugins.javascript.css.rules.SelectorPseudoElementNoUnknown;
import org.sonar.plugins.javascript.css.rules.SelectorTypeNoUnknown;
import org.sonar.plugins.javascript.css.rules.StringNoNewline;
import org.sonar.plugins.javascript.css.rules.UnitNoUnknown;
import org.sonar.plugins.javascript.eslint.StylelintRule;

public class CssRules {

  private final Map<String, RuleKey> stylelintKeyToRuleKey;
  private final Collection<CssRule> rules;

  public CssRules(CheckFactory checkFactory) {
    Checks<CssRule> checks = checkFactory.<CssRule>create(CssRulesDefinition.REPOSITORY_KEY)
      .addAnnotatedChecks((Iterable<?>) getRuleClasses());
    this.rules = checks.all();
    stylelintKeyToRuleKey = new HashMap<>();
    for (CssRule rule : rules) {
      stylelintKeyToRuleKey.put(rule.stylelintKey(), checks.ruleKey(rule));
    }
  }

  public static List<Class<?>> getRuleClasses() {
    return Collections.unmodifiableList(Arrays.asList(
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
      NoDescendingSpecificity.class,
      NoDuplicateAtImportRules.class,
      NoDuplicateSelectors.class,
      NoEmptySource.class,
      NoExtraSemicolons.class,
      NoInvalidDoubleSlashComments.class,
      PropertyNoUnknown.class,
      SelectorPseudoClassNoUnknown.class,
      SelectorPseudoElementNoUnknown.class,
      SelectorTypeNoUnknown.class,
      StringNoNewline.class,
      UnitNoUnknown.class
    ));
  }

  @Nullable
  public RuleKey getActiveSonarKey(String stylelintKey) {
    return stylelintKeyToRuleKey.get(stylelintKey);
  }

  public List<StylelintRule> getStylelintRules() {
    return this.rules.stream().map(rule -> new StylelintRule(rule.stylelintKey(), rule.stylelintOptions())).collect(Collectors.toList());
  }
}
