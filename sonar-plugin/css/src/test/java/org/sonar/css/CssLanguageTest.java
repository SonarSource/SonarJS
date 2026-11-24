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

import static java.util.Objects.requireNonNull;
import static org.assertj.core.api.Assertions.assertThat;

import com.google.gson.Gson;
import com.google.gson.JsonParser;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.sonar.scanner.plugin.api.impl.config.MapSettings;

class CssLanguageTest {

  @Test
  void defaultsMatchNodeConfiguration() throws IOException {
    try (
      var reader = new InputStreamReader(
        requireNonNull(getClass().getResourceAsStream("/default-stylesheet-suffixes.json")),
        StandardCharsets.UTF_8
      )
    ) {
      var config = new MapSettings().asConfig();
      var defaults = Map.of(
        "cssSuffixes",
        List.of(new CssLanguage(config).getFileSuffixes()),
        "scssSuffixes",
        CssLanguage.getDialectSuffixes(config, CssLanguage.SCSS_FILE_SUFFIXES_KEY),
        "sassSuffixes",
        CssLanguage.getDialectSuffixes(config, CssLanguage.SASS_FILE_SUFFIXES_KEY),
        "lessSuffixes",
        CssLanguage.getDialectSuffixes(config, CssLanguage.LESS_FILE_SUFFIXES_KEY)
      );
      assertThat(new Gson().toJsonTree(defaults)).isEqualTo(JsonParser.parseReader(reader));
    }
  }

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
  void onlyUsesGeneralSuffixesForLanguageDetection() {
    var settings = new MapSettings()
      .setProperty(CssLanguage.FILE_SUFFIXES_KEY, " CSS, custom-scss, .CUSTOM-SCSS ")
      .setProperty(CssLanguage.SCSS_FILE_SUFFIXES_KEY, " custom-scss, .CUSTOM-SCSS ")
      .setProperty(CssLanguage.SASS_FILE_SUFFIXES_KEY, ".custom-sass")
      .setProperty(CssLanguage.LESS_FILE_SUFFIXES_KEY, ".custom-less");
    assertThat(new CssLanguage(settings.asConfig()).getFileSuffixes()).containsExactly(
      ".css",
      ".custom-scss"
    );
  }

  @Test
  void doesNotAddDialectSuffixesWhenDiscoveryIsDisabled() {
    var settings = new MapSettings().setProperty(CssLanguage.FILE_SUFFIXES_KEY, " ");
    assertThat(new CssLanguage(settings.asConfig()).getFileSuffixes()).isEmpty();
  }
}
