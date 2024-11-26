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
package org.sonar.css;

import static org.sonar.css.CssProfileDefinition.PROFILE_PATH;

import org.sonar.api.SonarRuntime;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonarsource.analyzer.commons.RuleMetadataLoader;

public class CssRulesDefinition implements RulesDefinition {

  public static final String REPOSITORY_KEY = "css";
  public static final String RULE_REPOSITORY_NAME = "SonarQube";

  public static final String RESOURCE_FOLDER = "org/sonar/l10n/css/rules/";

  private final SonarRuntime sonarRuntime;

  public CssRulesDefinition(SonarRuntime sonarRuntime) {
    this.sonarRuntime = sonarRuntime;
  }

  @Override
  public void define(Context context) {
    NewRepository repository = context
      .createRepository(REPOSITORY_KEY, CssLanguage.KEY)
      .setName(RULE_REPOSITORY_NAME);

    RuleMetadataLoader ruleMetadataLoader = new RuleMetadataLoader(
      RESOURCE_FOLDER + REPOSITORY_KEY,
      PROFILE_PATH,
      sonarRuntime
    );
    ruleMetadataLoader.addRulesByAnnotatedClass(repository, CssRules.getRuleClasses());
    repository.done();

    StylelintReportSensor.getStylelintRuleLoader().createExternalRuleRepository(context);
  }
}
