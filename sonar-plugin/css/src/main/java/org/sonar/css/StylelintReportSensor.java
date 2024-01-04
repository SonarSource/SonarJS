/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.css;

import static org.sonar.css.CssRulesDefinition.RESOURCE_FOLDER;

import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.List;
import javax.annotation.Nullable;
import org.apache.commons.io.ByteOrderMark;
import org.apache.commons.io.input.BOMInputStream;
import org.sonar.api.batch.fs.FilePredicates;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.sensor.Sensor;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.batch.sensor.issue.NewExternalIssue;
import org.sonar.api.batch.sensor.issue.NewIssueLocation;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.css.StylelintReport.Issue;
import org.sonar.css.StylelintReport.IssuesPerFile;
import org.sonarsource.analyzer.commons.ExternalReportProvider;
import org.sonarsource.analyzer.commons.ExternalRuleLoader;

public class StylelintReportSensor implements Sensor {

  public static final String STYLELINT = "stylelint";
  public static final String STYLELINT_REPORT_PATHS = "sonar.css.stylelint.reportPaths";
  public static final String STYLELINT_REPORT_PATHS_DEFAULT_VALUE = "";

  private static final Logger LOG = Loggers.get(StylelintReportSensor.class);
  private static final String FILE_EXCEPTION_MESSAGE =
    "No issues information will be saved as the report file can't be read.";
  private static final ByteOrderMark[] BYTE_ORDER_MARKS = {
    ByteOrderMark.UTF_8,
    ByteOrderMark.UTF_16LE,
    ByteOrderMark.UTF_16BE,
    ByteOrderMark.UTF_32LE,
    ByteOrderMark.UTF_32BE,
  };

  private final CssRules cssRules;
  private ExternalRuleLoader stylelintRuleLoader = getStylelintRuleLoader();

  public StylelintReportSensor(CheckFactory checkFactory) {
    this.cssRules = new CssRules(checkFactory);
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor
      .onlyWhenConfiguration(conf -> conf.hasKey(STYLELINT_REPORT_PATHS))
      .name("Import of stylelint issues");
  }

  @Override
  public void execute(SensorContext context) {
    List<File> reportFiles = ExternalReportProvider.getReportFiles(context, STYLELINT_REPORT_PATHS);
    reportFiles.forEach(report -> importReport(report, context));
  }

  private void importReport(File report, SensorContext context) {
    LOG.info("Importing {}", report.getAbsoluteFile());

    try (
      BOMInputStream bomInputStream = new BOMInputStream(
        Files.newInputStream(report.toPath()),
        BYTE_ORDER_MARKS
      )
    ) {
      String charsetName = bomInputStream.getBOMCharsetName();
      if (charsetName == null) {
        charsetName = StandardCharsets.UTF_8.name();
      }

      IssuesPerFile[] issues = new Gson()
        .fromJson(new InputStreamReader(bomInputStream, charsetName), IssuesPerFile[].class);
      for (IssuesPerFile issuesPerFile : issues) {
        InputFile inputFile = getInputFile(context, issuesPerFile.source);
        if (inputFile != null) {
          for (Issue issue : issuesPerFile.warnings) {
            saveStylelintIssue(context, issue, inputFile);
          }
        }
      }
    } catch (IOException e) {
      LOG.error(FILE_EXCEPTION_MESSAGE, e);
    } catch (JsonSyntaxException e) {
      LOG.error("Failed to parse json stylelint report", e);
    }
  }

  @Nullable
  private static InputFile getInputFile(SensorContext context, String fileName) {
    FilePredicates predicates = context.fileSystem().predicates();
    InputFile inputFile = context
      .fileSystem()
      .inputFile(
        predicates.or(predicates.hasRelativePath(fileName), predicates.hasAbsolutePath(fileName))
      );
    if (inputFile == null) {
      LOG.warn(
        "No input file found for {}. No stylelint issues will be imported on this file.",
        fileName
      );
      return null;
    }
    return inputFile;
  }

  private void saveStylelintIssue(SensorContext context, Issue issue, InputFile inputFile) {
    String stylelintKey = issue.rule;

    NewExternalIssue newExternalIssue = context.newExternalIssue();

    NewIssueLocation primaryLocation = newExternalIssue
      .newLocation()
      .message(issue.text)
      .on(inputFile)
      .at(inputFile.selectLine(issue.line));

    newExternalIssue
      .at(primaryLocation)
      .engineId(STYLELINT)
      .ruleId(stylelintKey)
      .type(stylelintRuleLoader.ruleType(stylelintKey))
      .severity(stylelintRuleLoader.ruleSeverity(stylelintKey))
      .remediationEffortMinutes(stylelintRuleLoader.ruleConstantDebtMinutes(stylelintKey))
      .save();
  }

  public static ExternalRuleLoader getStylelintRuleLoader() {
    return new ExternalRuleLoader(
      StylelintReportSensor.STYLELINT,
      StylelintReportSensor.STYLELINT,
      RESOURCE_FOLDER + StylelintReportSensor.STYLELINT + "/rules.json",
      CssLanguage.KEY
    );
  }
}
