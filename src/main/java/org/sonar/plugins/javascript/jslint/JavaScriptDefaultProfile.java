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

import org.sonar.api.profiles.ProfileDefinition;
import org.sonar.api.profiles.RulesProfile;
import org.sonar.api.rules.ActiveRule;
import org.sonar.api.rules.Rule;
import org.sonar.api.rules.RuleParam;
import org.sonar.api.utils.ValidationMessages;

public class JavaScriptDefaultProfile extends ProfileDefinition {

  // disabled rules as per "The Good Parts" setting in http://jslint.com
  private String[] disabledRules = new String[] { "ADSAFE", "STRICT" };
  private JavaScriptRuleRepository repository;

  public JavaScriptDefaultProfile(JavaScriptRuleRepository repository) {
    this.repository = repository;

  }

  @Override
  public RulesProfile createProfile(ValidationMessages validation) {
    RulesProfile rulesProfile = RulesProfile.create("Default JavaScript Profile", "js");

    for (Rule rule : repository.createRules()) {
      if ( !isDisabled(rule)) {
        ActiveRule activeRule = rulesProfile.activateRule(rule, null);
        for (RuleParam param : rule.getParams()) {
          activeRule.setParameter(param.getKey(), param.getDefaultValue());
        }
      }
    }

    return rulesProfile;

  }

  private boolean isDisabled(Rule rule) {
    for (String ruleKey : disabledRules) {
      if (ruleKey.equals(rule.getKey())) {
        return true;
      }
    }
    return false;

  }
}