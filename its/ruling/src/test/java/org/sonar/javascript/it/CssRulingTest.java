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
package org.sonar.javascript.it;

import static org.assertj.core.api.Assertions.assertThat;

import com.sonarsource.scanner.integrationtester.dsl.EngineVersion;
import com.sonarsource.scanner.integrationtester.dsl.ScannerInput;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.sonar.check.Rule;
import org.sonar.css.CssLanguage;
import org.sonar.css.CssRules;
import shadow.com.sonar.orchestrator.locator.FileLocation;
import shadow.com.sonar.orchestrator.locator.MavenLocation;

class CssRulingTest {

  private static final String PROJECT_KEY = "project";

  private static final SonarServerContext SERVER_CONTEXT = SonarServerContext.builder()
    .withProduct(SonarServerContext.Product.SERVER)
    .withEngineVersion(EngineVersion.latestRelease())
    .withLanguage("css", "CSS", CssLanguage.FILE_SUFFIXES_KEY, CssLanguage.DEFAULT_FILE_SUFFIXES)
    .withPlugin(
      MavenLocation.of(
        "org.sonarsource.sonar-lits-plugin",
        "sonar-lits-plugin",
        JsTsRulingTest.LITS_VERSION
      )
    )
    .withPlugin(MavenLocation.of("org.sonarsource.php", "sonar-php-plugin", "LATEST_RELEASE"))
    .withPlugin(MavenLocation.of("org.sonarsource.html", "sonar-html-plugin", "LATEST_RELEASE"))
    .withPlugin(
      FileLocation.byWildcardMavenFilename(
        new File("../../sonar-plugin/sonar-javascript-plugin/target"),
        "sonar-javascript-plugin-*-multi.jar"
      )
    )
    .withActiveRules(getActiveRules())
    .build();

  private static List<SonarServerContext.ActiveRule> getActiveRules() {
    return CssRules.getRuleClasses()
      .stream()
      .map(cssClass -> {
        var key = cssClass.getAnnotation(Rule.class).key();
        return new SonarServerContext.ActiveRule(
          new SonarServerContext.ActiveRule.RuleKey("css", key),
          key,
          SonarServerContext.ActiveRule.Severity.INFO,
          "css",
          null
        );
      })
      .toList();
  }

  @Test
  void test() throws Exception {
    File litsDifferencesFile = FileLocation.of("target/differences").getFile();
    ScannerInput build = ScannerInput.create(PROJECT_KEY, Path.of("..", "sources", "css"))
      .withSourceDirs(".")
      .withSourceEncoding("UTF-8")
      .withCpdExclusionForAllFiles()
      .skipJreProvisioning()
      .withFailFast()
      .withScannerProperties(
        Map.of(
          "sonar.lits.dump.old",
          FileLocation.of("src/test/expected/css").getFile().getAbsolutePath(),
          "sonar.lits.dump.new",
          FileLocation.of("target/actual/css").getFile().getAbsolutePath(),
          "sonar.lits.differences",
          litsDifferencesFile.getAbsolutePath()
        )
      )
      .build();

    ScannerRunner.run(SERVER_CONTEXT, build);
    String litsDifferences = Files.readString(litsDifferencesFile.toPath());
    assertThat(litsDifferences).isEmpty();
  }
}
