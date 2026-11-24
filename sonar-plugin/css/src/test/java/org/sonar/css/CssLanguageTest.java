/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.css;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.sonar.scanner.plugin.api.impl.config.MapSettings;

class CssLanguageTest {

  @Test
  void test() {
    MapSettings settings = new MapSettings();
    settings.setProperty(CssLanguage.FILE_SUFFIXES_KEY, CssLanguage.DEFAULT_FILE_SUFFIXES);
    CssLanguage language = new CssLanguage(settings.asConfig());
    assertThat(language.getKey()).isEqualTo("css");
    assertThat(language.getName()).isEqualTo("CSS");
    assertThat(language.getFileSuffixes()).containsOnly(".css", ".less", ".scss", ".sass");
  }

  @Test
  void includesCustomDialectSuffixesInLanguageDetection() {
    var settings = new MapSettings()
      .setProperty(CssLanguage.SCSS_FILE_SUFFIXES_KEY, " custom-scss, .CUSTOM-SCSS ")
      .setProperty(CssLanguage.SASS_FILE_SUFFIXES_KEY, ".custom-sass")
      .setProperty(CssLanguage.LESS_FILE_SUFFIXES_KEY, ".custom-less");
    assertThat(new CssLanguage(settings.asConfig()).getFileSuffixes()).containsExactly(
      ".css",
      ".custom-scss",
      ".custom-sass",
      ".custom-less"
    );
  }

  @Test
  void doesNotRestoreDefaultsForExplicitlyEmptySuffixLists() {
    var keys = List.of(
      CssLanguage.FILE_SUFFIXES_KEY,
      CssLanguage.SCSS_FILE_SUFFIXES_KEY,
      CssLanguage.SASS_FILE_SUFFIXES_KEY,
      CssLanguage.LESS_FILE_SUFFIXES_KEY
    );
    for (var key : keys) {
      var settings = new MapSettings().setProperty(key, " ");
      var expected = new ArrayList<>(List.of(".css", ".scss", ".sass", ".less"));
      expected.remove(
        key.equals(CssLanguage.FILE_SUFFIXES_KEY)
          ? ".css"
          : CssLanguage.DEFAULT_DIALECT_FILE_SUFFIXES.get(key)
      );
      assertThat(
        new CssLanguage(settings.asConfig()).getFileSuffixes()
      ).containsExactlyInAnyOrderElementsOf(expected);
    }
    var settings = new MapSettings();
    keys.forEach(key -> settings.setProperty(key, " "));
    assertThat(new CssLanguage(settings.asConfig()).getFileSuffixes()).isEmpty();
  }
}
