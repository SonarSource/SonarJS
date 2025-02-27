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

// https://sonarsource.github.io/rspec/#/rspec/S3524/javascript
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
@Rule(key = "S3524")
public class S3524 extends Check {

  @RuleProperty(
    key = "parameter_parens",
    description = "True to require parentheses around parameters. False to forbid them for single parameter.",
    defaultValue = "" + false
  )
  public boolean requireParameterParentheses = false;

  @RuleProperty(
    key = "body_braces",
    description = "True to require curly braces around function body. False to forbid them for single-return bodies.",
    defaultValue = "" + false
  )
  public boolean requireBodyBraces = false;

  @Override
  public List<Object> configurations() {
    return List.of(
      Map.of(
        "requireParameterParentheses",
        requireParameterParentheses,
        "requireBodyBraces",
        requireBodyBraces
      )
    );
  }
}
