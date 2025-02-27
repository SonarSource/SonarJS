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

// https://sonarsource.github.io/rspec/#/rspec/S5693/javascript
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
@Rule(key = "S5693")
public class S5693 extends Check {

  @RuleProperty(
    key = "fileUploadSizeLimit",
    description = "The maximum size of HTTP requests handling file uploads (in bytes)",
    defaultValue = "" + 8000000
  )
  public int fileUploadSizeLimit = 8000000;

  @RuleProperty(
    key = "standardSizeLimit",
    description = "The maximum size of regular HTTP requests (in bytes)",
    defaultValue = "" + 2000000
  )
  public int standardSizeLimit = 2000000;

  @Override
  public List<Object> configurations() {
    return List.of(
      Map.of("fileUploadSizeLimit", fileUploadSizeLimit, "standardSizeLimit", standardSizeLimit)
    );
  }
}
