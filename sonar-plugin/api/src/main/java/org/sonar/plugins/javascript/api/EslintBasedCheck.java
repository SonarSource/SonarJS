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
package org.sonar.plugins.javascript.api;

import java.util.Collections;
import java.util.List;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFile.Type;

public interface EslintBasedCheck extends JavaScriptCheck {
  String eslintKey();

  default List<Object> configurations() {
    return Collections.emptyList();
  }

  default List<InputFile.Type> targets() {
    return Collections.singletonList(Type.MAIN);
  }

  default List<AnalysisMode> analysisModes() {
    return Collections.singletonList(AnalysisMode.DEFAULT);
  }

  default List<String> blacklistedExtensions() {
    return Collections.emptyList();
  }
}
