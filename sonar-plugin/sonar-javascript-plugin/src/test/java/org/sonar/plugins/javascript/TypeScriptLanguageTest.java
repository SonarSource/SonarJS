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
package org.sonar.plugins.javascript;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.sonar.api.config.internal.MapSettings;

class TypeScriptLanguageTest {

  @Test
  void should_have_correct_file_extensions() {
    MapSettings settings = new MapSettings();
    settings.setProperty(
      TypeScriptLanguage.FILE_SUFFIXES_KEY,
      TypeScriptLanguage.DEFAULT_FILE_SUFFIXES
    );
    TypeScriptLanguage typeScriptLanguage = new TypeScriptLanguage(settings.asConfig());
    assertThat(typeScriptLanguage.getFileSuffixes()).containsExactly(".ts", ".tsx", ".cts", ".mts");
  }
}
