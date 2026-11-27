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
package com.sonar.javascript.it.plugin;

import static com.sonarsource.scanner.integrationtester.utility.QualityProfileLoader.loadActiveRulesFromXmlProfile;

import com.sonar.orchestrator.locator.FileLocation;
import com.sonar.orchestrator.locator.Location;
import com.sonar.orchestrator.locator.MavenLocation;
import com.sonarsource.scanner.integrationtester.dsl.ActiveRule;
import com.sonarsource.scanner.integrationtester.dsl.EngineVersion;
import com.sonarsource.scanner.integrationtester.dsl.SonarProjectContext;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.dsl.StaticResource;
import java.io.File;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.css.CssLanguage;
import org.sonar.css.CssRules;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptLanguage;

public final class SonarScannerIntegrationHelper {

  private static final String JAVASCRIPT_PLUGIN_KEY = "javascript";

  static final String LITS_VERSION = "0.12.0.5861";

  /**
   * Get the engine version based on the sonar.runtimeVersion system property.
   * Defaults to LATEST_RELEASE if not specified.
   */
  public static EngineVersion.Version getEngineVersion() {
    String runtimeVersion = System.getProperty("sonar.runtimeVersion", "LATEST_RELEASE");
    if ("DEV".equals(runtimeVersion)) {
      return EngineVersion.latestMasterBuild();
    }
    return EngineVersion.latestRelease();
  }

  public static SonarServerContext getContext(
    List<String> languages,
    List<Location> pluginLocations,
    List<Path> profiles
  ) {
    return getContext(languages, pluginLocations, profiles, List.of());
  }

  public static SonarServerContext getContext(
    List<String> languages,
    List<Location> pluginLocations,
    List<Path> profiles,
    List<StaticResource> staticResources
  ) {
    var builder = SonarServerContext.builder()
      .withProduct(SonarServerContext.Product.SERVER)
      .withEngineVersion(getEngineVersion())
      .withStaticResources(staticResources);
    for (var pluginLocation : pluginLocations) {
      builder.withPlugin(pluginLocation);
    }
    for (var language : languages) {
      switch (language) {
        case TypeScriptLanguage.KEY:
          builder.withLanguage(
            TypeScriptLanguage.KEY,
            "TYPESCRIPT",
            TypeScriptLanguage.FILE_SUFFIXES_KEY,
            TypeScriptLanguage.DEFAULT_FILE_SUFFIXES
          );
          break;
        case JavaScriptLanguage.KEY:
          builder.withLanguage(
            JavaScriptLanguage.KEY,
            "JAVASCRIPT",
            JavaScriptLanguage.FILE_SUFFIXES_KEY,
            JavaScriptLanguage.DEFAULT_FILE_SUFFIXES
          );
          break;
        case CssLanguage.KEY:
          builder.withLanguage(
            CssLanguage.KEY,
            "CSS",
            CssLanguage.FILE_SUFFIXES_KEY,
            CssLanguage.DEFAULT_FILE_SUFFIXES
          );
          break;
        case "web":
          builder.withLanguage("web", "WEB", "sonar.html.file.suffixes", ".html");
          break;
        case "yaml":
          builder.withLanguage("yaml", "YAML", ".yaml");
          break;
        default:
          throw new IllegalArgumentException("Unknown language: " + language);
      }
    }
    var projectContext = SonarProjectContext.builder();
    for (var profilePath : profiles) {
      projectContext.withActiveRules(loadActiveRulesFromXmlProfile(profilePath));
    }
    return builder.withProjectContext(projectContext.build()).build();
  }

  public static FileLocation getJavascriptPlugin() {
    return FileLocation.byWildcardMavenFilename(
      new File("../../../sonar-plugin/sonar-javascript-plugin/target"),
      "sonar-javascript-plugin-*.jar"
    );
  }

  /**
   * The Node.js runtimes shipped in the on-demand resources ZIP, served the way SonarQube Server serves the static
   * resources of a plugin ({@code GET /static/javascript/<platform>/...}), so that the scanner can fetch them through
   * {@code ResourceFetcher}. They are looked up in the unpacked ZIP of the QA profile first, then in the output of a
   * local build of the ZIP module.
   */
  public static List<StaticResource> getEmbeddedNodeRuntimeResources() {
    var runtimesDirectory = List.of(
      Path.of("target", "sonar-javascript-plugin", "resources"),
      Path.of("../../../sonar-plugin/sonar-javascript-plugin-zip/target/downloads/runtimes")
    )
      .stream()
      .filter(Files::isDirectory)
      .findFirst()
      .orElseThrow(() ->
        new IllegalStateException(
          "Node.js runtimes not found: build the sonar-javascript-plugin-zip module first."
        )
      );
    try (var files = Files.walk(runtimesDirectory)) {
      return files
        .filter(Files::isRegularFile)
        .map(file ->
          StaticResource.ofPlugin(
            JAVASCRIPT_PLUGIN_KEY,
            runtimesDirectory.relativize(file).toString().replace(File.separatorChar, '/'),
            file
          )
        )
        .toList();
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  public static MavenLocation getYamlPlugin() {
    return MavenLocation.of("org.sonarsource.config", "sonar-config-plugin", "LATEST_RELEASE");
  }

  public static MavenLocation getHtmlPlugin() {
    return MavenLocation.of("org.sonarsource.html", "sonar-html-plugin", "LATEST_RELEASE");
  }

  public static MavenLocation getLitsPlugin() {
    return MavenLocation.of("org.sonarsource.sonar-lits-plugin", "sonar-lits-plugin", LITS_VERSION);
  }

  public static List<ActiveRule> getAllCSSRules() {
    return CssRules.getRuleClasses()
      .stream()
      .map(cssClass -> {
        var key = cssClass.getAnnotation(Rule.class).key();
        var params = Arrays.stream(cssClass.getDeclaredFields())
          .flatMap(field ->
            Arrays.stream(field.getAnnotationsByType(RuleProperty.class)).map(ruleProperty ->
              new ActiveRule.Param(ruleProperty.key(), ruleProperty.defaultValue())
            )
          )
          .toList();
        if (key.equals("S4660")) {
          params = List.of(new ActiveRule.Param("ignorePseudoElements", "ng-deep, /^custom-/"));
        }

        return new ActiveRule.Builder()
          .withLanguageKey(CssLanguage.KEY)
          .withName(key)
          .withKey(CssLanguage.KEY, key)
          .withSeverity(ActiveRule.Severity.INFO)
          .withParameters(params)
          .build();
      })
      .toList();
  }
}
