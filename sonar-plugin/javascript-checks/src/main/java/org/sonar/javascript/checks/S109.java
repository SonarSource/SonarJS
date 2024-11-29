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
import org.sonar.plugins.javascript.api.Check;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.plugins.javascript.api.TypeScriptRule;

@TypeScriptRule
@JavaScriptRule
@Rule(key = "S109")
public class S109 extends Check {

  @Override
  public List<Object> configurations() {
    return Collections.singletonList(new Config());
  }



  private static class Config {

    int[] ignore = { 0, 1, -1, 24, 60 };
    boolean ignoreEnums = true;
    boolean ignoreReadonlyClassProperties = true;
    boolean ignoreNumericLiteralTypes = true;
    boolean ignoreDefaultValues = true;
    boolean ignoreClassFieldInitialValues = true;
  }
}
