/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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
package org.sonar.plugins.javascript.rules;

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.SonarWayProfile;
import org.sonarsource.analyzer.commons.RuleMetadataLoader;

public class JavaScriptRulesDefinition implements RulesDefinition {

  private static final String METADATA_LOCATION = "org/sonar/l10n/javascript/rules/javascript";

  @Override
  public void define(Context context) {
    NewRepository repository = context
      .createRepository(CheckList.REPOSITORY_KEY, JavaScriptLanguage.KEY)
      .setName(CheckList.REPOSITORY_NAME);

    RuleMetadataLoader ruleMetadataLoader = new RuleMetadataLoader(METADATA_LOCATION, SonarWayProfile.PATH_TO_JSON);
    ruleMetadataLoader.addRulesByAnnotatedClass(repository, CheckList.getChecks());

    NewRule commentRegularExpression = repository.rule("CommentRegularExpression");
    commentRegularExpression.setTemplate(true);

    repository.done();
  }


}
