/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
import org.sonar.plugins.javascript.api.Language;
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

    RuleMetadataLoader ruleMetadataLoader = new RuleMetadataLoader(METADATA_LOCATION, sonarRuntime);
    ruleMetadataLoader.addRulesByAnnotatedClass(
      repository,
      Collections.unmodifiableList(CheckList.getJavaScriptChecks())
    );

    for (String ruleKey : CheckList.getDefaultQualityProfileRuleKeys(
      JavaScriptProfilesDefinition.SONAR_WAY,
      Language.JAVASCRIPT
    )) {
      NewRule rule = repository.rule(ruleKey);
      if (rule == null) {
        throw new IllegalStateException(
          "Rule " +
            ruleKey +
            " is declared in the Sonar way profile for JavaScript but is not registered"
        );
      }
      rule.setActivatedByDefault(true);
    }

    NewRule commentRegularExpression = repository.rule("S124");
    commentRegularExpression.setTemplate(true);

    repository.done();
  }
}
