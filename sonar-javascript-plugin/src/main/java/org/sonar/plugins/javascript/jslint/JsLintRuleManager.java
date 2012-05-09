/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis and SonarSource
 * dev@sonar.codehaus.org
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.plugins.javascript.jslint;

import java.util.ArrayList;
import java.util.List;

import org.sonar.api.BatchExtension;
import org.sonar.api.ServerExtension;

import com.googlecode.jslint4java.Option;

public class JsLintRuleManager implements ServerExtension, BatchExtension {

  private List<JsLintRule> rules = new ArrayList<JsLintRule>();

  public static final String OTHER_RULES_KEY = "OTHER_RULES";
  public static final String UNUSED_NAMES_KEY = "UNUSED_NAMES";
  public static final String CYCLOMATIC_COMPLEXITY_KEY = "CYCLOMATIC_COMPLEXITY";
  private static final String RULES_FILE_LOCATION = "/org/sonar/plugins/javascript/jslint/rules.xml";

  public JsLintRuleManager() {
    this(RULES_FILE_LOCATION);
  }

  public JsLintRuleManager(String rulesPath) {
    rules = new JsLintXmlRuleParser().parse(JsLintRuleManager.class.getResourceAsStream(rulesPath));
  }

  public List<JsLintRule> getJsLintRules() {
    return rules;
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
      if (o.name().equalsIgnoreCase(name)) {
        return o;
      }
    }
    return null;
  }

}
