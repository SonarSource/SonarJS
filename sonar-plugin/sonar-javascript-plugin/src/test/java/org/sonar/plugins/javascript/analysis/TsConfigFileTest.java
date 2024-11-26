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
package org.sonar.plugins.javascript.analysis;

import org.junit.jupiter.api.Test;
import org.sonar.plugins.javascript.bridge.TsConfigFile;

import static java.util.Collections.emptyList;
import static java.util.Collections.singletonList;
import static org.assertj.core.api.Assertions.assertThat;

class TsConfigFileTest {
  @Test
  void getters() {
    var file = new TsConfigFile("dir1/tsconfig.json", singletonList("foo/dir1/file1.ts"), emptyList());
    assertThat(file.getFilename()).isEqualTo("dir1/tsconfig.json");
    assertThat(file.getProjectReferences()).isEmpty();
    assertThat(file).hasToString("dir1/tsconfig.json");
  }
}
