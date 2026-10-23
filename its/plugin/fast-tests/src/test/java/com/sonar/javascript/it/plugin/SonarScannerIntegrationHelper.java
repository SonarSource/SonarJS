/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2025 SonarSource Sàrl
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
package com.sonar.javascript.it.plugin;

import static com.sonarsource.scanner.integrationtester.utility.QualityProfileLoader.loadActiveRulesFromXmlProfile;

import com.sonar.orchestrator.config.Configuration;
import com.sonar.orchestrator.container.Edition;
import com.sonar.orchestrator.container.SonarDistribution;
import com.sonar.orchestrator.locator.FileLocation;
import com.sonar.orchestrator.locator.Location;
import com.sonar.orchestrator.locator.Locators;
import com.sonar.orchestrator.locator.MavenLocation;
import com.sonar.orchestrator.server.PackagingResolver;
import com.sonarsource.scanner.integrationtester.dsl.ActiveRule;
import com.sonarsource.scanner.integrationtester.dsl.EngineVersion;
import com.sonarsource.scanner.integrationtester.dsl.SonarProjectContext;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.List;
import java.util.zip.ZipFile;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.css.CssLanguage;
import org.sonar.css.CssRules;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.analysis.YamlSensor;

public final class SonarScannerIntegrationHelper {

  static final String LITS_VERSION = "0.11.0.2659";

  /**
   * Get the engine version based on the sonar.runtimeVersion system property.
   * Defaults to LATEST_RELEASE if not specified.
   */
  public static synchronized EngineVersion.Version getEngineVersion() {
    String runtimeVersion = System.getProperty("sonar.runtimeVersion", "LATEST_RELEASE");
    if ("DEV".equals(runtimeVersion)) {
      return EngineVersion.latestMasterBuild();
    }
    if ("LATEST_RELEASE".equals(runtimeVersion)) {
      return EngineVersion.latestRelease();
    }
    // The LTA engine is shipped inside the server ZIP, not published as a standalone artifact.
    var configuration = Configuration.createEnv();
    var packaging = new PackagingResolver(new Locators(configuration)).resolve(
      new SonarDistribution().setEdition(Edition.ENTERPRISE_LW).setVersion(runtimeVersion)
    );
    var engineName = "scanner-enterprise-" + packaging.getVersion() + "-all.jar";
    var engine = configuration
      .fileSystem()
      .getCacheDir()
      .resolve("sonarjs-scanner-engines")
      .resolve(engineName);
    if (!Files.exists(engine)) {
      try (var zip = new ZipFile(packaging.getZip())) {
        var entry = zip.getEntry(
          "sonarqube-" + packaging.getVersion() + "/lib/scanner/" + engineName
        );
        if (entry == null) {
          throw new IllegalStateException("Missing scanner engine in " + packaging.getZip());
        }
        Files.createDirectories(engine.getParent());
        var temporaryEngine = Files.createTempFile(engine.getParent(), engineName, ".tmp");
        try {
          try (var input = zip.getInputStream(entry)) {
            Files.copy(input, temporaryEngine, StandardCopyOption.REPLACE_EXISTING);
          }
          Files.move(temporaryEngine, engine, StandardCopyOption.REPLACE_EXISTING);
        } finally {
          Files.deleteIfExists(temporaryEngine);
        }
      } catch (IOException e) {
        throw new IllegalStateException("Unable to extract the enterprise scanner engine", e);
      }
    }
    return EngineVersion.localBuild(engine);
  }

  public static SonarServerContext getContext(
    List<String> languages,
    List<Location> pluginLocations,
    List<Path> profiles
  ) {
    var builder = SonarServerContext.builder()
      .withProduct(SonarServerContext.Product.SERVER)
      .withServerEdition(SonarServerContext.ServerEdition.ENTERPRISE)
      .withEngineVersion(getEngineVersion());
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
        case YamlSensor.LANGUAGE:
          builder.withLanguage(YamlSensor.LANGUAGE, "YAML", ".yaml");
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
      "sonar-javascript-plugin-*-multi.jar"
    );
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
