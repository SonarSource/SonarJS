/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2025 SonarSource SA
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

import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import java.io.File;
import java.util.Arrays;
import java.util.List;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.css.CssLanguage;
import org.sonar.css.CssRules;
import shadow.com.sonar.orchestrator.locator.FileLocation;
import shadow.com.sonar.orchestrator.locator.MavenLocation;

public final class SonarScannerIntegrationHelper {

  static final String LITS_VERSION = "0.11.0.2659";

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

  public static MavenLocation getSecurityPlugin() {
    return MavenLocation.of("com.sonarsource.security", "sonar-security-plugin", "LATEST_RELEASE");
  }

  public static MavenLocation getSecurityJsFrontendPlugin() {
    return MavenLocation.of(
      "com.sonarsource.security",
      "sonar-security-js-frontend-plugin",
      "LATEST_RELEASE"
    );
  }

  public static MavenLocation getLitsPlugin() {
    return MavenLocation.of("org.sonarsource.sonar-lits-plugin", "sonar-lits-plugin", LITS_VERSION);
  }

  public static List<SonarServerContext.ActiveRule> getAllCSSRules() {
    return CssRules.getRuleClasses()
      .stream()
      .map(cssClass -> {
        var key = cssClass.getAnnotation(Rule.class).key();
        var params = Arrays.stream(cssClass.getDeclaredFields())
          .flatMap(field ->
            Arrays.stream(field.getAnnotationsByType(RuleProperty.class)).map(ruleProperty ->
              new SonarServerContext.ActiveRule.Param(
                ruleProperty.key(),
                ruleProperty.defaultValue()
              )
            )
          )
          .toList();
        if (key.equals("S4660")) {
          params = List.of(
            new SonarServerContext.ActiveRule.Param("ignorePseudoElements", "ng-deep, /^custom-/")
          );
        }

        return new SonarServerContext.ActiveRule(
          new SonarServerContext.ActiveRule.RuleKey(CssLanguage.KEY, key),
          key,
          SonarServerContext.ActiveRule.Severity.INFO,
          CssLanguage.KEY,
          null,
          params
        );
      })
      .toList();
  }
}
