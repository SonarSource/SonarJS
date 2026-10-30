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
package org.sonar.plugins.javascript.analysis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.sonar.api.SonarProduct;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.css.CssLanguage;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.scanner.plugin.api.impl.config.MapSettings;

class JsTsContextTest {

  @Test
  void shouldExcludeTheActualScannerWorkDirEvenWhenUserExclusionsAreEmpty() {
    var context = mock(SensorContext.class, RETURNS_DEEP_STUBS);
    when(context.config()).thenReturn(
      new MapSettings().setProperty(JavaScriptPlugin.JS_EXCLUSIONS_KEY, "").asConfig()
    );
    for (var entry : Map.of(
      "C:\\pa\\.sonarqube\\out\\.sonar",
      "directory:C:/pa/.sonarqube/out/.sonar",
      "/ci/.build/[scanner]{one}(x)",
      "directory:/ci/.build/[scanner]{one}(x)"
    ).entrySet()) {
      when(context.fileSystem().workDir().getAbsolutePath()).thenReturn(entry.getKey());
      assertThat(new JsTsContext<>(context).getJsTsExcludedPaths()).containsExactly(
        entry.getValue()
      );
    }
  }

  @Test
  void shouldKeepSonarLintExclusionsWithoutRequestingAScannerWorkDir() {
    var context = mock(SensorContext.class, RETURNS_DEEP_STUBS);
    when(context.runtime().getProduct()).thenReturn(SonarProduct.SONARLINT);
    when(context.config()).thenReturn(
      new MapSettings()
        .setProperty(JavaScriptPlugin.JS_EXCLUSIONS_KEY, "vendor/**")
        .setProperty(JavaScriptPlugin.TS_EXCLUSIONS_KEY, "**/generated/**")
        .asConfig()
    );
    assertThat(new JsTsContext<>(context).getJsTsExcludedPaths()).containsExactly(
      "vendor/**",
      "**/generated/**"
    );
    verify(context, never()).fileSystem();
  }

  @Test
  void shouldNormalizeConfiguredFileSuffixes() {
    var config = new MapSettings()
      .setProperty(JavaScriptLanguage.FILE_SUFFIXES_KEY, " JS , .Jsx, .VUE ")
      .setProperty(TypeScriptLanguage.FILE_SUFFIXES_KEY, " TS, .TSX ")
      .setProperty(CssLanguage.FILE_SUFFIXES_KEY, " CSS, .ScSs ")
      .setProperty(JavaScriptPlugin.HTML_FILE_SUFFIXES_KEY, " HTML, .XHTML ")
      .setProperty(JavaScriptPlugin.YAML_FILE_SUFFIXES_KEY, " YML, .YAML ")
      .setProperty(JavaScriptPlugin.CSS_ADDITIONAL_FILE_SUFFIXES_KEY, " VUE, .HTML ")
      .asConfig();

    assertThat(JsTsContext.getJsExtensions(config)).containsExactly(".js", ".jsx", ".vue");
    assertThat(JsTsContext.getTsExtensions(config)).containsExactly(".ts", ".tsx");
    assertThat(JsTsContext.getCssExtensions(config)).containsExactly(".css", ".scss");
    assertThat(JsTsContext.getHtmlExtensions(config)).containsExactly(".html", ".xhtml");
    assertThat(JsTsContext.getYamlExtensions(config)).containsExactly(".yml", ".yaml");
    assertThat(JsTsContext.getCssAdditionalExtensions(config)).containsExactly(".vue", ".html");
  }

  @Test
  void shouldKeepExplicitlyEmptySuffixPropertiesAsEmptyLists() {
    var config = new MapSettings()
      .setProperty(JavaScriptLanguage.FILE_SUFFIXES_KEY, " , ")
      .setProperty(TypeScriptLanguage.FILE_SUFFIXES_KEY, "")
      .setProperty(CssLanguage.FILE_SUFFIXES_KEY, " ")
      .setProperty(JavaScriptPlugin.HTML_FILE_SUFFIXES_KEY, " ")
      .setProperty(JavaScriptPlugin.YAML_FILE_SUFFIXES_KEY, " ")
      .setProperty(JavaScriptPlugin.CSS_ADDITIONAL_FILE_SUFFIXES_KEY, " ")
      .asConfig();

    assertThat(JsTsContext.getJsExtensions(config)).isEmpty();
    assertThat(JsTsContext.getTsExtensions(config)).isEmpty();
    assertThat(JsTsContext.getCssExtensions(config)).isEmpty();
    assertThat(JsTsContext.getHtmlExtensions(config)).isEmpty();
    assertThat(JsTsContext.getYamlExtensions(config)).isEmpty();
    assertThat(JsTsContext.getCssAdditionalExtensions(config)).isEmpty();
  }
}
