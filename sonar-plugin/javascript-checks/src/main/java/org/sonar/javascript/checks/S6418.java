/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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

// https://sonarsource.github.io/rspec/#/rspec/S6418/javascript
package org.sonar.javascript.checks;

import java.util.List;
import java.util.Map;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.plugins.javascript.api.Check;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.plugins.javascript.api.TypeScriptRule;

@JavaScriptRule
@TypeScriptRule
@Rule(key = "S6418")
public class S6418 extends Check {

  @RuleProperty(
    key = "secretWords",
    description = "Comma separated list of words identifying potential secrets",
    defaultValue = "api[_.-]?key,auth,credential,secret,token"
  )
  public String secretWords = "api[_.-]?key,auth,credential,secret,token";

  @RuleProperty(
    key = "randomnessSensibility",
    description = "Minimum shannon entropy threshold of the secret",
    defaultValue = "" + 5
  )
  public double randomnessSensibility = 5;

  @Override
  public List<Object> configurations() {
    return List.of(
      Map.of("secretWords", secretWords, "randomnessSensibility", randomnessSensibility)
    );
  }
}
