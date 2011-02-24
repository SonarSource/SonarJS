/**
 * Sonar JavaScript Plugin
 * Extension for Sonar, open source software quality management tool.
 * Copyright (C) 2011 Eriks Nukis
 * mailto: eriks.nukis@gmail.com
 *
 * Sonar JavaScript Plugin is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * Sonar JavaScript Plugin is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with Sonar JavaScript Plugin; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */

package org.sonar.plugins.javascript.jslint;

import java.util.ArrayList;
import java.util.List;

import org.sonar.api.BatchExtension;
import org.sonar.api.ServerExtension;
import org.sonar.api.rules.Iso9126RulesCategories;
import org.sonar.api.rules.RulePriority;
import org.sonar.api.rules.RulesCategory;

import com.googlecode.jslint4java.Option;

public class JsLintRuleManager implements ServerExtension, BatchExtension {

  private List<JsLintRule> rules = new ArrayList<JsLintRule>();

  public static final String OTHER_RULES_KEY = "OTHER_RULES";
  public static final String UNUSED_NAMES_KEY = "UNUSED_NAMES";
  public static final String CYCLOMATIC_COMPLEXITY = "CYCLOMATIC_COMPLEXITY";

  public JsLintRuleManager() {

    rules = new JsLintXmlRuleParser().parse(JsLintRuleManager.class
        .getResourceAsStream("/com/googlecode/sonar/plugins/javascript/jslint/rules.xml"));

    // Rule where all unrecognized messages will be mapped
    add(OTHER_RULES_KEY, "Other Rules");

  }

  public List<JsLintRule> getJsLintRules() {
    return rules;
  }

  private void add(String key, String name, boolean inverse, RulesCategory category, RulePriority priority, String... messages) {
    rules.add(new JsLintRule(key, name, inverse, category, priority, messages));
  }

  private void add(String key, String name, String... messages) {
    add(key, name, false, Iso9126RulesCategories.MAINTAINABILITY, RulePriority.MINOR, messages);
  }

  public String getRuleIdByMessage(String message) {
    for (JsLintRule rule : rules) {
      if (rule.hasMessage(message)) {
        return rule.getKey();
      }
    }
    return OTHER_RULES_KEY;
  }

  public boolean isRuleInverse(String ruleKey) {
    for (JsLintRule rule : rules) {
      if (ruleKey.equals(rule.getKey())) {
        return rule.isInverse();
      }
    }
    return false;
  }

  public Option getOptionByName(String name) {
    for (Option o : Option.values()) {
      if (o.name().equals(name)) {
        return o;
      }
    }
    return null;
  }

}
