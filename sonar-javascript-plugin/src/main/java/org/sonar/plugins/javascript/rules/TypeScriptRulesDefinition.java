/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

import java.util.Collections;
import org.sonar.api.SonarRuntime;
import org.sonar.api.rule.RuleStatus;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.JavaScriptProfilesDefinition;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonarsource.analyzer.commons.RuleMetadataLoader;

import static org.sonar.plugins.javascript.rules.JavaScriptRulesDefinition.METADATA_LOCATION;

public class TypeScriptRulesDefinition implements RulesDefinition {

  private final SonarRuntime sonarRuntime;

  public TypeScriptRulesDefinition(SonarRuntime sonarRuntime) {
    this.sonarRuntime = sonarRuntime;
  }

  @Override
  public void define(Context context) {
    NewRepository repository = context
      .createRepository(CheckList.TS_REPOSITORY_KEY, TypeScriptLanguage.KEY)
      .setName(CheckList.REPOSITORY_NAME);

    RuleMetadataLoader ruleMetadataLoader = new RuleMetadataLoader(METADATA_LOCATION, JavaScriptProfilesDefinition.SONAR_WAY_JSON, sonarRuntime);
    ruleMetadataLoader.addRulesByAnnotatedClass(repository, Collections.unmodifiableList(CheckList.getTypeScriptChecks()));

    NewRule commentRegularExpression = repository.rule("S124");
    commentRegularExpression.setTemplate(true);

    // deprecated for Typescript: https://github.com/SonarSource/SonarJS/issues/3580
    NewRule redeclaredSymbol = repository.rule("S2814");
    redeclaredSymbol.setStatus(RuleStatus.DEPRECATED);

    repository.done();
  }
}
