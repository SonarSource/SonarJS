/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis
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
import org.sonar.api.rules.Rule;
import org.sonar.api.rules.RuleParam;
import org.sonar.api.rules.RuleRepository;
import org.sonar.plugins.javascript.core.JavaScript;

public class JavaScriptRuleRepository extends RuleRepository implements BatchExtension {

  private JsLintRuleManager jsLintRuleManager;

  public JavaScriptRuleRepository(JavaScript javascript, JsLintRuleManager jsLintRuleManager) {
    super(REPOSITORY_KEY, javascript.getKey());
    setName(REPOSITORY_NAME);

    this.jsLintRuleManager = jsLintRuleManager;
  }

  public static final String REPOSITORY_NAME = "JavaScript";
  public static final String REPOSITORY_KEY = "JavaScript";

  @Override
  public List<Rule> createRules() {

    List<Rule> rulesList = new ArrayList<Rule>();

    for (JsLintRule jsLintRule : jsLintRuleManager.getJsLintRules()) {
      Rule rule = Rule.create(REPOSITORY_KEY, jsLintRule.getKey(), jsLintRule.getName());

      rule.setDescription(jsLintRule.getDescription());
      rule.setSeverity(jsLintRule.getPriority());

      for (RuleParam ruleParam : jsLintRule.getParams()) {
        RuleParam param = rule.createParameter();
        param.setKey(ruleParam.getKey());
        param.setDefaultValue(ruleParam.getDefaultValue());
        param.setDescription(ruleParam.getDescription());
        param.setType(ruleParam.getType());
      }

      rulesList.add(rule);
    }

    return rulesList;
  }
}
