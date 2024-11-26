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
package org.sonar.javascript.checks;

import java.util.Collections;
import java.util.List;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.plugins.javascript.api.Check;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.plugins.javascript.api.TypeScriptRule;

@TypeScriptRule
@JavaScriptRule
@Rule(key = "S6418")
public class HardcodedSecretsCheck extends Check {

  private static final String DEFAULT_SECRET_WORDS = "api[_.-]?key,auth,credential,secret,token";
  private static final String DEFAULT_RANDOMNESS_SENSIBILITY = "3.0";

  @RuleProperty(
    key = "secretWords",
    description = "Comma separated list of words identifying potential secrets",
    defaultValue = DEFAULT_SECRET_WORDS
  )
  public String secretWords = DEFAULT_SECRET_WORDS;
  @RuleProperty(
    key = "randomnessSensibility",
    description = "Minimum shannon entropy threshold of the secret",
    defaultValue = DEFAULT_RANDOMNESS_SENSIBILITY
  )
  public String randomnessSensibility = DEFAULT_RANDOMNESS_SENSIBILITY;

  @Override
  public List<Object> configurations() {
    return Collections.singletonList(
      new Config(secretWords, randomnessSensibility)
    );
  }

  private static class Config {

    String secretWords;
    String randomnessSensibility;

    Config(String secretWords, String randomnessSensibility) {
      this.secretWords = secretWords;
      this.randomnessSensibility = randomnessSensibility;
    }
  }
}
