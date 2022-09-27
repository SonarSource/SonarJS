/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
package org.sonar.plugins.javascript.eslint;

import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.sonar.api.utils.log.LogTesterJUnit5;
import org.sonar.api.utils.log.LoggerLevel;
import org.sonar.plugins.javascript.api.RulesBundle;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RulesBundlesTest {

  @TempDir
  Path tempDir;

  @RegisterExtension
  public LogTesterJUnit5 logTester = new LogTesterJUnit5();

  @Test
  void test() throws Exception {
    TestRulesBundle rulesBundle = new TestRulesBundle("/test-bundle.tgz");
    RulesBundles rulesBundles = new RulesBundles(new TestRulesBundle[]{rulesBundle});
    List<Path> paths = rulesBundles.deploy(tempDir);
    assertThat(paths).hasSize(1);
    assertThat(paths.get(0)).exists();
    assertThat(paths.get(0).resolve("bin/server")).hasContent("#!/usr/bin/env node\n\n");
  }

  @Test
  void test_not_exists() {
    RulesBundle[] missingBundle = {new TestRulesBundle("missing.tgz")};
    assertThatThrownBy(() -> new RulesBundles(missingBundle))
      .isInstanceOf(IllegalStateException.class);
  }

  @Test
  void test_empty() {
    RulesBundles rulesBundles = new RulesBundles();
    assertThat(rulesBundles.deploy(tempDir)).isEmpty();
  }

  @Test
  void test_deploy_should_not_log_security() {
    var filename = "/sonar-securityjsfrontend-plugin.jar!/js-vulnerabilities-rules-1.0.0.tgz";
    TestRulesBundle rulesBundle = new TestRulesBundle(filename);
    RulesBundles rulesBundles = new RulesBundles(new TestRulesBundle[]{rulesBundle});
    rulesBundles.deploy(tempDir);
    boolean isSeen = false;
    for (String logLine: logTester.logs(LoggerLevel.INFO)) {
      System.out.println(logLine);
      if (logLine.contains(filename)) {
        isSeen = true;
      }
    }
    assertThat(isSeen).isFalse();
  }

  static class TestRulesBundle implements RulesBundle {

    final String bundle;

    TestRulesBundle(String bundle) {
      this.bundle = bundle;
    }

    @Override
    public String bundlePath() {
      return bundle;
    }
  }
}
