/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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
package org.sonar.plugins.javascript.external;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.Iterator;
import org.junit.Rule;
import org.junit.Test;
import org.sonar.api.SonarQubeSide;
import org.sonar.api.SonarRuntime;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.sensor.internal.DefaultSensorDescriptor;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.batch.sensor.issue.ExternalIssue;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.rules.RuleType;
import org.sonar.api.utils.Version;
import org.sonar.api.utils.log.LogTester;
import org.sonar.api.utils.log.LoggerLevel;
import org.sonar.plugins.javascript.JavaScriptPlugin;

import static org.assertj.core.api.Assertions.assertThat;

public class EslintReportSensorTest {

  @Rule
  public final LogTester logTester = new LogTester();

  private static final File BASE_DIR = new File("src/test/resources/externalIssues/").getAbsoluteFile();
  private static final String CONTENT = "function addOne(i) {\n" +
    "    if (i != NaN) {\n" +
    "        return i ++\n" +
    "    } else {\n" +
    "      return\n" +
    "    }\n" +
    "};";

  private SensorContextTester context = SensorContextTester.create(BASE_DIR);

  private EslintReportSensor eslintReportSensor = new EslintReportSensor();
  private DefaultInputFile jsInputFile = createInputFile(context, CONTENT, "file.js");
  private DefaultInputFile tsInputFile = createInputFile(context, CONTENT, "file-ts.ts");
  private DefaultInputFile parseErrorInputFile = createInputFile(context, CONTENT, "parseError.js");

  @Test
  public void should_add_issues_from_report() throws Exception {
    setEslintReport("eslint-report.json");
    eslintReportSensor.execute(context);

    Collection<ExternalIssue> externalIssues = context.allExternalIssues();
    assertThat(externalIssues).hasSize(3);
    Iterator<ExternalIssue> iterator = externalIssues.iterator();
    ExternalIssue first = iterator.next();
    ExternalIssue second = iterator.next();
    ExternalIssue third = iterator.next();

    assertThat(first.type()).isEqualTo(RuleType.BUG);
    assertThat(second.type()).isEqualTo(RuleType.CODE_SMELL);

    assertThat(first.primaryLocation().message()).isEqualTo("Use the isNaN function to compare with NaN.");
    assertThat(first.primaryLocation().textRange().start().line()).isEqualTo(2);
    assertThat(first.primaryLocation().inputComponent()).isEqualTo(jsInputFile);
    assertThat(jsInputFile.language()).isEqualTo("js");

    assertThat(third.primaryLocation().inputComponent()).isEqualTo(tsInputFile);
    assertThat(tsInputFile.language()).isEqualTo("ts");

    assertThat(logTester.logs(LoggerLevel.WARN)).contains("No input file found for notExist.js. No ESLint issues will be imported on this file.");
    assertThat(logTester.logs(LoggerLevel.WARN)).contains("Parse error issue from ESLint will not be imported, file " + parseErrorInputFile.uri());
  }

  @Test
  public void should_log_invalid_report() throws Exception {
    setEslintReport("invalid-eslint-report.json");
    eslintReportSensor.execute(context);

    Collection<ExternalIssue> externalIssues = context.allExternalIssues();
    assertThat(externalIssues).hasSize(0);

    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("No issues information will be saved as the report file can't be read.");
  }

  @Test
  public void should_log_deprecated_property_used() throws Exception {
    context.settings().setProperty(EslintReportSensor.DEPRECATED_SONARTS_PROPERTY, "eslint-report.json");
    eslintReportSensor.execute(context);

    Collection<ExternalIssue> externalIssues = context.allExternalIssues();
    assertThat(externalIssues).hasSize(0);

    assertThat(logTester.logs(LoggerLevel.WARN)).contains("Property 'sonar.typescript.eslint.reportPaths' is deprecated, use 'sonar.eslint.reportPaths'.");
  }

  @Test
  public void should_log_not_existing_report() throws Exception {
    setEslintReport("not-existing-eslint-report.json");
    eslintReportSensor.execute(context);

    Collection<ExternalIssue> externalIssues = context.allExternalIssues();
    assertThat(externalIssues).hasSize(0);

    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("No issues information will be saved as the report file can't be read.");
  }

  @Test
  public void test_descriptor() throws Exception {
    DefaultSensorDescriptor sensorDescriptor = new DefaultSensorDescriptor();
    eslintReportSensor.describe(sensorDescriptor);
    assertThat(sensorDescriptor.name()).isEqualTo("Import of ESLint issues");
    assertThat(sensorDescriptor.languages()).isEmpty();
  }

  private void setEslintReport(String reportFileName) {
    context.settings().setProperty(JavaScriptPlugin.ESLINT_REPORT_PATHS, reportFileName);
  }

  private SonarRuntime getRuntime(int major, int minor) {
    return SonarRuntimeImpl.forSonarQube(Version.create(major, minor), SonarQubeSide.SERVER);
  }

  private static DefaultInputFile createInputFile(SensorContextTester sensorContext, String content, String relativePath) {
    DefaultInputFile testInputFile = new TestInputFileBuilder("moduleKey", relativePath)
      .setModuleBaseDir(sensorContext.fileSystem().baseDirPath())
      .setType(Type.MAIN)
      .setLanguage(relativePath.split("\\.")[1])
      .setCharset(StandardCharsets.UTF_8)
      .setContents(content)
      .build();

    sensorContext.fileSystem().add(testInputFile);
    return testInputFile;
  }

}
