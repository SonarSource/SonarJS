/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.css;

import static org.assertj.core.api.Assertions.assertThat;
import static org.sonar.css.StylelintReportSensor.STYLELINT_REPORT_PATHS;

import java.io.File;
import java.io.FileWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.Collection;
import java.util.Iterator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.slf4j.event.Level;
import org.sonar.api.SonarEdition;
import org.sonar.api.SonarQubeSide;
import org.sonar.api.SonarRuntime;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.rule.Severity;
import org.sonar.api.batch.sensor.internal.DefaultSensorDescriptor;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.batch.sensor.issue.ExternalIssue;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.rules.RuleType;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;
import org.sonar.api.utils.Version;

class StylelintReportSensorTest {

  @TempDir
  Path tmpDir;

  @RegisterExtension
  public LogTesterJUnit5 logTester = new LogTesterJUnit5().setLevel(Level.DEBUG);

  private static final File BASE_DIR = new File("src/test/resources/stylelint-report/")
    .getAbsoluteFile();
  private static final String CONTENT = ".foo {\n}";

  private SensorContextTester context = SensorContextTester.create(BASE_DIR);
  private static final CheckFactory EMPTY_CHECK_FACTORY = new CheckFactory(new TestActiveRules());
  private static final CheckFactory CHECK_FACTORY_WITH_RULE = new CheckFactory(
    new TestActiveRules("S4647")
  );

  private StylelintReportSensor stylelintReportSensor = new StylelintReportSensor(
    EMPTY_CHECK_FACTORY
  );
  private DefaultInputFile inputFile = createInputFile(context, CONTENT, "file.css");

  @BeforeEach
  public void setUp() throws Exception {
    context.setRuntime(getRuntime(7, 2));
    context.fileSystem().add(inputFile);
  }

  @Test
  void should_add_issues_from_report() {
    setReport("report.json");
    stylelintReportSensor.execute(context);

    Collection<ExternalIssue> externalIssues = context.allExternalIssues();
    assertThat(externalIssues).hasSize(2);
    Iterator<ExternalIssue> iterator = externalIssues.iterator();
    ExternalIssue first = iterator.next();
    ExternalIssue second = iterator.next();

    assertThat(first.type()).isEqualTo(RuleType.BUG);
    assertThat(second.type()).isEqualTo(RuleType.CODE_SMELL);

    assertThat(first.remediationEffort()).isEqualTo(5);
    assertThat(first.severity()).isEqualTo(Severity.MAJOR);
    assertThat(first.primaryLocation().message())
      .isEqualTo("external issue message (color-no-invalid-hex)");
    assertThat(first.primaryLocation().textRange().start().line()).isEqualTo(1);
  }

  @Test
  void should_read_report_utf8_bom() {
    setReport("report-utf8-bom.json");
    stylelintReportSensor.execute(context);

    Collection<ExternalIssue> externalIssues = context.allExternalIssues();
    assertThat(externalIssues).hasSize(2);
  }

  @Test
  void should_read_report_utf16() {
    setReport("report-utf16.json");
    stylelintReportSensor.execute(context);

    Collection<ExternalIssue> externalIssues = context.allExternalIssues();
    assertThat(externalIssues).hasSize(2);
  }

  @Test
  void should_support_absolute_file_paths_in_report() throws Exception {
    String report =
      "[\n" +
      "  {\n" +
      "    \"source\": \"%s\",\n" +
      "    \"warnings\": [\n" +
      "      {\n" +
      "        \"line\": 1,\n" +
      "        \"rule\": \"color-no-invalid-hex\",\n" +
      "        \"text\": \"external issue message\"\n" +
      "      }\n" +
      "    ]\n" +
      "  }\n" +
      "]\n";

    File reportFile = tmpDir.resolve("report.json").toFile();
    FileWriter writer = new FileWriter(reportFile);
    writer.write(String.format(report, inputFile.absolutePath()));
    writer.close();

    setReport(reportFile.getAbsolutePath());
    stylelintReportSensor.execute(context);

    assertThat(context.allExternalIssues()).hasSize(1);
  }

  @Test
  void should_ignore_report_on_older_sonarqube() throws Exception {
    context.setRuntime(getRuntime(7, 1));
    setReport("report.json");
    stylelintReportSensor.execute(context);

    assertThat(context.allExternalIssues()).isEmpty();
    assertThat(logTester.logs(Level.ERROR))
      .contains("Import of external issues requires SonarQube 7.2 or greater.");
  }

  @Test
  void should_do_nothing_when_no_report() throws Exception {
    setReport("");
    stylelintReportSensor.execute(context);

    assertThat(context.allExternalIssues()).isEmpty();
  }

  @Test
  void should_log_when_not_existing_report_file() throws Exception {
    setReport("not-exist.json");
    stylelintReportSensor.execute(context);

    assertThat(context.allExternalIssues()).isEmpty();
    assertThat(logTester.logs(Level.ERROR))
      .contains("No issues information will be saved as the report file can't be read.");
  }

  @Test
  void should_log_when_not_found_input_file() throws Exception {
    setReport("invalid-file.json");
    stylelintReportSensor.execute(context);

    assertThat(context.allExternalIssues()).hasSize(1);
    assertThat(logTester.logs(Level.WARN))
      .contains(
        "No input file found for not-exist.css. No stylelint issues will be imported on this file."
      );
  }

  @Test
  void should_accept_absolute_path_to_report() throws Exception {
    setReport(new File(BASE_DIR, "report.json").getAbsolutePath());
    stylelintReportSensor.execute(context);
    assertThat(context.allExternalIssues()).hasSize(2);
  }

  @Test
  void should_accept_several_reports() throws Exception {
    setReport("report.json, invalid-file.json");
    stylelintReportSensor.execute(context);
    assertThat(context.allExternalIssues()).hasSize(3);
  }

  @Test
  void test_descriptor() throws Exception {
    DefaultSensorDescriptor sensorDescriptor = new DefaultSensorDescriptor();
    stylelintReportSensor.describe(sensorDescriptor);
    assertThat(sensorDescriptor.name()).isEqualTo("Import of stylelint issues");
  }

  private void setReport(String reportFileName) {
    context.settings().setProperty(STYLELINT_REPORT_PATHS, reportFileName);
  }

  private SonarRuntime getRuntime(int major, int minor) {
    return SonarRuntimeImpl.forSonarQube(
      Version.create(major, minor),
      SonarQubeSide.SERVER,
      SonarEdition.COMMUNITY
    );
  }

  private static DefaultInputFile createInputFile(
    SensorContextTester sensorContext,
    String content,
    String relativePath
  ) {
    DefaultInputFile testInputFile = new TestInputFileBuilder("moduleKey", relativePath)
      .setModuleBaseDir(sensorContext.fileSystem().baseDirPath())
      .setType(Type.MAIN)
      .setLanguage(CssLanguage.KEY)
      .setCharset(StandardCharsets.UTF_8)
      .setContents(content)
      .build();

    sensorContext.fileSystem().add(testInputFile);
    return testInputFile;
  }
}
