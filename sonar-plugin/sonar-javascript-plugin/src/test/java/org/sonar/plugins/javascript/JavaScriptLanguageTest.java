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
package org.sonar.plugins.javascript;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.sonar.api.config.internal.MapSettings;

class JavaScriptLanguageTest {

  @Test
  void defaultSuffixes() {
    MapSettings mapSettings = new MapSettings();
    mapSettings.setProperty(
      JavaScriptLanguage.FILE_SUFFIXES_KEY,
      JavaScriptLanguage.FILE_SUFFIXES_DEFVALUE
    );
    JavaScriptLanguage javaScriptLanguage = new JavaScriptLanguage(mapSettings.asConfig());
    assertThat(javaScriptLanguage.getFileSuffixes())
      .containsOnly(".js", ".jsx", ".cjs", ".mjs", ".vue");
  }

  @Test
  void customSuffixes() {
    MapSettings mapSettings = new MapSettings();
    mapSettings.setProperty(JavaScriptLanguage.FILE_SUFFIXES_KEY, "javascript");
    JavaScriptLanguage javaScriptLanguage = new JavaScriptLanguage(mapSettings.asConfig());
    assertThat(javaScriptLanguage.getFileSuffixes()).containsOnly("javascript");
  }
}
