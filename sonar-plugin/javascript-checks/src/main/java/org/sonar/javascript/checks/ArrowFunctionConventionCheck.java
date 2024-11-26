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

@JavaScriptRule
@TypeScriptRule
@Rule(key = "S3524")
public class ArrowFunctionConventionCheck extends Check {

  private static final boolean DEFAULT_PARAMETER_PARENS = false;
  private static final boolean DEFAULT_BODY_BRACES = false;

  @RuleProperty(
    key = "parameter_parens",
    description = "True to require parentheses around parameters. False to forbid them for single parameter.",
    defaultValue = "" + DEFAULT_PARAMETER_PARENS
  )
  boolean parameterParens = DEFAULT_PARAMETER_PARENS;

  @RuleProperty(
    key = "body_braces",
    description = "True to require curly braces around function body. False to forbid them for single-return bodies.",
    defaultValue = "" + DEFAULT_BODY_BRACES
  )
  boolean bodyBraces = DEFAULT_BODY_BRACES;

  

  @Override
  public List<Object> configurations() {
    return Collections.singletonList(new Config(parameterParens, bodyBraces));
  }

  private static class Config {

    boolean requireParameterParentheses;
    boolean requireBodyBraces;

    Config(boolean requireParameterParentheses, boolean requireBodyBraces) {
      this.requireParameterParentheses = requireParameterParentheses;
      this.requireBodyBraces = requireBodyBraces;
    }
  }
}
