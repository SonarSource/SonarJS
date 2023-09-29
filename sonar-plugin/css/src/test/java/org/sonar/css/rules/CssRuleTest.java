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
package org.sonar.css.rules;

import static org.assertj.core.api.Assertions.assertThat;

import com.google.gson.Gson;
import java.lang.reflect.InvocationTargetException;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.mockito.internal.util.collections.Sets;
import org.sonar.check.RuleProperty;
import org.sonar.css.CssRules;

class CssRuleTest {

  private static final int RULES_PROPERTIES_COUNT = 9;

  @Test
  void class_name_should_match_stylelint_key()
    throws NoSuchMethodException, IllegalAccessException, InvocationTargetException, InstantiationException {
    for (Class ruleClass : CssRules.getRuleClasses()) {
      CssRule rule = (CssRule) ruleClass.getConstructor().newInstance();
      String stylelintRuleKeyWithoutUnderscore = rule.stylelintKey().replace("-", "");
      assertThat(ruleClass.getSimpleName())
        .isEqualToIgnoringCase(stylelintRuleKeyWithoutUnderscore);
    }
  }

  @Test
  void rules_default_is_empty()
    throws NoSuchMethodException, IllegalAccessException, InvocationTargetException, InstantiationException {
    Set<Class> rulesWithStylelintOptions = Sets.newSet(
      AtRuleNoUnknown.class,
      DeclarationBlockNoDuplicateProperties.class,
      FontFamilyNoMissingGenericFamilyKeyword.class,
      PropertyNoUnknown.class,
      SelectorPseudoClassNoUnknown.class,
      SelectorPseudoElementNoUnknown.class,
      SelectorTypeNoUnknown.class
    );

    for (Class ruleClass : CssRules.getRuleClasses()) {
      CssRule rule = (CssRule) ruleClass.getConstructor().newInstance();
      if (rulesWithStylelintOptions.contains(rule.getClass())) {
        assertThat(rule.stylelintOptions()).isNotEmpty();
      } else {
        assertThat(rule.stylelintOptions()).isEmpty();
      }
    }
  }

  /*
   * This test raises awareness of the consequence of a rule adding or removing a rule property.
   * If a new rule property is added to an existing rule, we should inform the SonarCloud team
   * about it on release. Rule properties of newly added rules are not concerned by that.
   */
  @Test
  void rules_properties_count() {
    var count = 0;
    for (var clazz : CssRules.getRuleClasses()) {
      for (var field : clazz.getDeclaredFields()) {
        if (field.isAnnotationPresent(RuleProperty.class)) {
          count++;
        }
      }
    }
    assertThat(count).isEqualTo(RULES_PROPERTIES_COUNT);
  }

  @Test
  void selector_pseudo_class_options() {
    SelectorPseudoClassNoUnknown selectorPseudoClassNoUnknown = new SelectorPseudoClassNoUnknown();
    String optionsAsJson = new Gson().toJson(selectorPseudoClassNoUnknown.stylelintOptions());
    assertThat(optionsAsJson)
      .isEqualTo(
        "[true,{\"ignorePseudoClasses\":[\"local\",\"global\",\"export\",\"import\",\"deep\"]}]"
      );
    selectorPseudoClassNoUnknown.ignoredPseudoClasses = "foo,/^bar/";
    optionsAsJson = new Gson().toJson(selectorPseudoClassNoUnknown.stylelintOptions());
    assertThat(optionsAsJson).isEqualTo("[true,{\"ignorePseudoClasses\":[\"foo\",\"/^bar/\"]}]");
  }

  @Test
  void property_no_unknown_options() {
    String optionsAsJson = new Gson().toJson(new PropertyNoUnknown().stylelintOptions());
    assertThat(optionsAsJson)
      .isEqualTo(
        "[true,{\"ignoreProperties\":[\"composes\",\"/^mso-/\"],\"ignoreSelectors\":[\"/^:export.*/\",\"/^:import.*/\"]}]"
      );
  }

  @Test
  void selector_type_no_unknown_default() {
    String optionsAsJson = new Gson().toJson(new SelectorTypeNoUnknown().stylelintOptions());
    assertThat(optionsAsJson)
      .isEqualTo("[true,{\"ignoreTypes\":[\"/^(mat|md|fa)-/\"],\"ignore\":[\"custom-elements\"]}]");
  }

  @Test
  void selector_type_no_unknown_custom() {
    SelectorTypeNoUnknown selectorTypeNoUnknown = new SelectorTypeNoUnknown();
    selectorTypeNoUnknown.ignoreTypes = "/^(mat|md|fa)-/";
    selectorTypeNoUnknown.ignore = "custom-elements, default-namespace";
    String optionsAsJson = new Gson().toJson(selectorTypeNoUnknown.stylelintOptions());
    assertThat(optionsAsJson)
      .isEqualTo(
        "[true,{\"ignoreTypes\":[\"/^(mat|md|fa)-/\"],\"ignore\":[\"custom-elements\",\"default-namespace\"]}]"
      );
  }

  @Test
  void selector_pseudo_element_no_unknown_default() {
    String optionsAsJson = new Gson()
      .toJson(new SelectorPseudoElementNoUnknown().stylelintOptions());
    assertThat(optionsAsJson)
      .isEqualTo("[true,{\"ignorePseudoElements\":[\"ng-deep\",\"v-deep\",\"deep\"]}]");
  }

  @Test
  void selector_pseudo_element_no_unknown_custom() {
    SelectorPseudoElementNoUnknown selectorPseudoElementNoUnknown =
      new SelectorPseudoElementNoUnknown();
    selectorPseudoElementNoUnknown.ignorePseudoElements = "ng-deep, /^custom-/";
    String optionsAsJson = new Gson().toJson(selectorPseudoElementNoUnknown.stylelintOptions());
    assertThat(optionsAsJson)
      .isEqualTo("[true,{\"ignorePseudoElements\":[\"ng-deep\",\"/^custom-/\"]}]");
  }

  @Test
  void at_rule_unknown_default() {
    String optionsAsJson = new Gson().toJson(new AtRuleNoUnknown().stylelintOptions());
    assertThat(optionsAsJson)
      .isEqualTo(
        "[true,{\"ignoreAtRules\":[\"value\",\"at-root\",\"content\",\"debug\",\"each\",\"else\",\"error\",\"for\",\"function\",\"if\",\"include\",\"mixin\",\"return\",\"warn\",\"while\",\"extend\",\"use\",\"forward\",\"tailwind\",\"apply\",\"layer\",\"/^@.*/\"]}]"
      );
  }

  @Test
  void at_rule_unknown_custom() {
    AtRuleNoUnknown instance = new AtRuleNoUnknown();
    instance.ignoredAtRules = "foo, bar";
    String optionsAsJson = new Gson().toJson(instance.stylelintOptions());
    assertThat(optionsAsJson).isEqualTo("[true,{\"ignoreAtRules\":[\"foo\",\"bar\"]}]");
  }

  @Test
  void declaration_block_no_duplicate_properties_default() {
    String optionsAsJson = new Gson()
      .toJson(new DeclarationBlockNoDuplicateProperties().stylelintOptions());
    assertThat(optionsAsJson)
      .isEqualTo("[true,{\"ignore\":[\"consecutive-duplicates-with-different-values\"]}]");
  }

  @Test
  void declaration_block_no_duplicate_properties_custom() {
    DeclarationBlockNoDuplicateProperties instance = new DeclarationBlockNoDuplicateProperties();
    instance.ignoreFallbacks = false;
    assertThat(instance.stylelintOptions()).isEmpty();
  }

  @Test
  void font_family_no_missing_generic_family_keyword_default() {
    String optionsAsJson = new Gson()
      .toJson(new FontFamilyNoMissingGenericFamilyKeyword().stylelintOptions());
    assertThat(optionsAsJson).isEqualTo("[true,{\"ignoreFontFamilies\":[]}]");
  }

  @Test
  void font_family_no_missing_generic_family_keyword_custom() {
    FontFamilyNoMissingGenericFamilyKeyword instance =
      new FontFamilyNoMissingGenericFamilyKeyword();
    instance.ignoreFontFamilies = "Icon Font, /icon$/";
    String optionsAsJson = new Gson().toJson(instance.stylelintOptions());
    assertThat(optionsAsJson)
      .isEqualTo("[true,{\"ignoreFontFamilies\":[\"Icon Font\",\"/icon$/\"]}]");
  }
}
