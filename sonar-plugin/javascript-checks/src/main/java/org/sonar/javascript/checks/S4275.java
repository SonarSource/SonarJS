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
@Rule(key = "S4275")
public class S4275 extends Check {

  private static final boolean DEFAULT_ALLOW_IMPLICIT = false;

  @RuleProperty(
    key = "allowImplicit",
    description = "Allow implicitly returning undefined with a return statement.",
    defaultValue = "" + DEFAULT_ALLOW_IMPLICIT
  )
  boolean allowImplicit = DEFAULT_ALLOW_IMPLICIT;

  @Override
  public List<Object> configurations() {
    return Collections.singletonList(new Config(allowImplicit));
  }

  private static class Config {

    boolean allowImplicit;

    Config(boolean allowImplicit) {
      this.allowImplicit = allowImplicit;
    }
  }
}
