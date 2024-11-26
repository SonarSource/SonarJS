/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.rules;

import java.util.Collections;
import org.sonar.api.SonarRuntime;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.JavaScriptProfilesDefinition;
import org.sonarsource.analyzer.commons.RuleMetadataLoader;

public class JavaScriptRulesDefinition implements RulesDefinition {

  public static final String METADATA_LOCATION = "org/sonar/l10n/javascript/rules/javascript";

  private final SonarRuntime sonarRuntime;

  public JavaScriptRulesDefinition(SonarRuntime sonarRuntime) {
    this.sonarRuntime = sonarRuntime;
  }

  @Override
  public void define(Context context) {
    NewRepository repository = context
      .createRepository(CheckList.JS_REPOSITORY_KEY, JavaScriptLanguage.KEY)
      .setName(CheckList.REPOSITORY_NAME);

    RuleMetadataLoader ruleMetadataLoader = new RuleMetadataLoader(
      METADATA_LOCATION,
      JavaScriptProfilesDefinition.SONAR_WAY_JSON,
      sonarRuntime
    );
    ruleMetadataLoader.addRulesByAnnotatedClass(
      repository,
      Collections.unmodifiableList(CheckList.getJavaScriptChecks())
    );

    NewRule commentRegularExpression = repository.rule("S124");
    commentRegularExpression.setTemplate(true);

    repository.done();
  }
}
