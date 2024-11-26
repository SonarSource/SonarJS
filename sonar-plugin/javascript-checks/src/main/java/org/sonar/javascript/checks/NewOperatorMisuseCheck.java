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
@Rule(key = "S2999")
public class NewOperatorMisuseCheck extends Check {

  public static final boolean CONSIDER_JSDOC = false;

  @RuleProperty(
    key = "considerJSDoc",
    description = "Consider only functions with @constructor tag as constructor functions",
    defaultValue = "" + CONSIDER_JSDOC
  )
  public boolean considerJSDoc = CONSIDER_JSDOC;



  @Override
  public List<Object> configurations() {
    return Collections.singletonList(new Config(considerJSDoc));
  }

  private static class Config {

    public boolean considerJSDoc;

    Config(boolean considerJSDoc) {
      this.considerJSDoc = considerJSDoc;
    }
  }
}
