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
package org.sonar.plugins.javascript.external;

import static org.assertj.core.api.Assertions.assertThat;
import static org.sonar.plugins.javascript.TestUtils.createInputFile;

import java.io.File;
import java.util.Collection;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.slf4j.event.Level;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.DefaultTextPointer;
import org.sonar.api.batch.fs.internal.DefaultTextRange;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.batch.sensor.issue.ExternalIssue;
import org.sonar.api.rules.RuleType;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.analysis.JsTsContext;

class EslintReportImporterTest {

  @RegisterExtension
  public final LogTesterJUnit5 logTester = new LogTesterJUnit5();

  private static final File BASE_DIR = new File(
    "src/test/resources/externalIssues/"
  ).getAbsoluteFile();
  private static final String CONTENT =
    "function addOne(i) {\n" +
    "    if (i != NaN) {\n" +
    "        return i ++\n" +
    "    } else {\n" +
    "      return\n" +
    "    }\n" +
    "};";

  private SensorContextTester context = SensorContextTester.create(BASE_DIR);

  private EslintReportImporter eslintReportImporter = new EslintReportImporter();
  private DefaultInputFile jsInputFile = createInputFile(context, CONTENT, "file.js");
  private DefaultInputFile tsInputFile = createInputFile(context, CONTENT, "file-ts.ts");
  private DefaultInputFile parseErrorInputFile = createInputFile(context, CONTENT, "parseError.js");

  @Test
  void should_create_issues_from_report() throws Exception {
    logTester.setLevel(Level.DEBUG);
    setEslintReport("eslint-report.json");
    var issues = eslintReportImporter.execute(new JsTsContext<SensorContext>(context));

    assertThat(issues).hasSize(4);
    var iterator = issues.iterator();
    var first = iterator.next();
    var second = iterator.next();
    var third = iterator.next();
    var fourth = iterator.next();

    assertThat(first.type()).isEqualTo(RuleType.BUG);
    assertThat(second.type()).isEqualTo(RuleType.CODE_SMELL);

    assertThat(first.message()).isEqualTo("Use the isNaN function to compare with NaN.");
    assertThat(first.location().start().line()).isEqualTo(2);
    assertThat(first.file()).isEqualTo(jsInputFile);
    assertThat(jsInputFile.language()).isEqualTo("js");

    assertThat(third.location()).isEqualTo(
      new DefaultTextRange(new DefaultTextPointer(2, 0), new DefaultTextPointer(2, 19))
    );

    assertThat(fourth.file()).isEqualTo(tsInputFile);
    assertThat(tsInputFile.language()).isEqualTo("ts");

    assertThat(logTester.logs(Level.WARN)).contains(
      "No input file found for notExist.js. No ESLint issues will be imported on this file."
    );
    assertThat(logTester.logs(Level.WARN)).contains(
      "Parse error issue from ESLint will not be imported, file " + parseErrorInputFile.uri()
    );
  }

  @Test
  void should_log_invalid_report() throws Exception {
    setEslintReport("invalid-eslint-report.json");
    eslintReportImporter.execute(new JsTsContext<SensorContext>(context));

    Collection<ExternalIssue> externalIssues = context.allExternalIssues();
    assertThat(externalIssues).hasSize(0);

    assertThat(logTester.logs(Level.WARN)).contains(
      "No issues information will be saved as the report file can't be read."
    );
  }

  @Test
  void should_log_not_existing_report() throws Exception {
    setEslintReport("not-existing-eslint-report.json");
    eslintReportImporter.execute(new JsTsContext<SensorContext>(context));

    Collection<ExternalIssue> externalIssues = context.allExternalIssues();
    assertThat(externalIssues).hasSize(0);

    assertThat(logTester.logs(Level.WARN)).contains(
      "No issues information will be saved as the report file can't be read."
    );
  }

  private void setEslintReport(String reportFileName) {
    context.settings().setProperty(JavaScriptPlugin.ESLINT_REPORT_PATHS, reportFileName);
  }
}
