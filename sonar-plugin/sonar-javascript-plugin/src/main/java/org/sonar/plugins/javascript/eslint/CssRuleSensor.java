/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import org.sonar.api.SonarProduct;
import org.sonar.api.SonarRuntime;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.batch.sensor.issue.NewIssue;
import org.sonar.api.batch.sensor.issue.NewIssueLocation;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.utils.Version;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.css.CssLanguage;
import org.sonar.css.CssRules;
import org.sonar.css.StylelintRule;

public class CssRuleSensor extends AbstractEslintSensor {

  private static final Logger LOG = Loggers.get(CssRuleSensor.class);
  private final SonarRuntime sonarRuntime;
  private final CssRules cssRules;
  private final List<StylelintRule> rules;

  public CssRuleSensor(
    SonarRuntime sonarRuntime,
    EslintBridgeServer eslintBridgeServer,
    AnalysisWarningsWrapper analysisWarnings,
    Monitoring monitoring,
    CheckFactory checkFactory
  ) {
    super(eslintBridgeServer, analysisWarnings, monitoring);
    this.sonarRuntime = sonarRuntime;
    this.cssRules = new CssRules(checkFactory);
    this.rules = cssRules.getStylelintRules();
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor.createIssuesForRuleRepository("css").name("CSS Rules");

    processesFilesIndependently(descriptor);
  }

  private void processesFilesIndependently(SensorDescriptor descriptor) {
    if (
      sonarRuntime.getProduct() == SonarProduct.SONARQUBE &&
      sonarRuntime.getApiVersion().isGreaterThanOrEqual(Version.create(9, 3))
    ) {
      descriptor.processesFilesIndependently();
    }
  }

  @Override
  public void execute(SensorContext context) {
    this.context = context;
    List<InputFile> inputFiles = getInputFiles();
    if (inputFiles.isEmpty()) {
      LOG.info(
        "No CSS, PHP, HTML or VueJS files are found in the project. CSS analysis is skipped."
      );
      return;
    }
    super.execute(context);
  }

  protected void analyze(InputFile inputFile) {
    try {
      URI uri = inputFile.uri();
      if (!"file".equalsIgnoreCase(uri.getScheme())) {
        LOG.debug("Skipping {} as it has not 'file' scheme", uri);
        return;
      }
      LOG.debug("Analyzing file: {}", uri);
      String fileContent = contextUtils.shouldSendFileContent(inputFile)
        ? inputFile.contents()
        : null;
      EslintBridgeServer.CssAnalysisRequest request = new EslintBridgeServer.CssAnalysisRequest(
        new File(uri).getAbsolutePath(),
        fileContent,
        rules
      );
      EslintBridgeServer.AnalysisResponse analysisResponse = eslintBridgeServer.analyzeCss(request);
      LOG.debug("Found {} issue(s)", analysisResponse.issues.size());
      saveIssues(context, inputFile, analysisResponse.issues);
    } catch (IOException | RuntimeException e) {
      throw new IllegalStateException("Failure during analysis of " + inputFile.uri(), e);
    }
  }

  private void saveIssues(
    SensorContext context,
    InputFile inputFile,
    List<EslintBridgeServer.Issue> issues
  ) {
    for (EslintBridgeServer.Issue issue : issues) {
      RuleKey ruleKey = cssRules.getActiveSonarKey(issue.ruleId);
      if (ruleKey == null) {
        if ("CssSyntaxError".equals(issue.ruleId)) {
          String errorMessage = issue.message.replace("(CssSyntaxError)", "").trim();
          logErrorOrDebug(
            inputFile,
            "Failed to parse {}, line {}, {}",
            inputFile.uri(),
            issue.line,
            errorMessage
          );
        } else {
          logErrorOrDebug(
            inputFile,
            "Unknown stylelint rule or rule not enabled: '" + issue.ruleId + "'"
          );
        }
      } else {
        NewIssue sonarIssue = context.newIssue();
        NewIssueLocation location = sonarIssue
          .newLocation()
          .on(inputFile)
          .at(inputFile.selectLine(issue.line))
          .message(normalizeMessage(issue.message));

        sonarIssue.at(location).forRule(ruleKey).save();
      }
    }
  }

  private static void logErrorOrDebug(InputFile file, String msg, Object... arguments) {
    if (CssLanguage.KEY.equals(file.language())) {
      LOG.error(msg, arguments);
    } else {
      LOG.debug(msg, arguments);
    }
  }

  @Override
  protected void logErrorOrWarn(String msg, Throwable e) {
    if (hasCssFiles(context)) {
      LOG.error(msg, e);
    } else {
      LOG.warn(msg);
    }
  }

  @Override
  protected String getProgressReportTitle() {
    return "Progress of CSS analysis";
  }

  @Override
  protected void initLinter() throws IOException {
    // No need to init linter for CSS
  }

  @Override
  protected List<InputFile> getInputFiles() {
    FileSystem fileSystem = this.context.fileSystem();

    FilePredicate mainFilePredicate = fileSystem
      .predicates()
      .and(
        fileSystem.predicates().hasType(InputFile.Type.MAIN),
        fileSystem.predicates().hasLanguages(CssLanguage.KEY, "php", "web")
      );

    FilePredicate vueFilePredicate = fileSystem
      .predicates()
      .and(
        fileSystem.predicates().hasType(InputFile.Type.MAIN),
        fileSystem.predicates().hasExtension("vue"),
        // by default 'vue' extension is defined for JS language, but 'vue' files can contain TS code and thus language can be changed
        fileSystem.predicates().hasLanguages("js", "ts")
      );

    return StreamSupport
      .stream(
        fileSystem
          .inputFiles(fileSystem.predicates().or(mainFilePredicate, vueFilePredicate))
          .spliterator(),
        false
      )
      .collect(Collectors.toList());
  }

  public static boolean hasCssFiles(SensorContext context) {
    FileSystem fileSystem = context.fileSystem();
    FilePredicate mainFilePredicate = fileSystem
      .predicates()
      .and(
        fileSystem.predicates().hasType(InputFile.Type.MAIN),
        fileSystem.predicates().hasLanguages(CssLanguage.KEY)
      );
    return fileSystem.inputFiles(mainFilePredicate).iterator().hasNext();
  }

  private static String normalizeMessage(String message) {
    // stylelint messages have format "message (rulekey)"
    Pattern pattern = Pattern.compile("(.+)\\([a-z\\-]+\\)");
    Matcher matcher = pattern.matcher(message);
    if (matcher.matches()) {
      return matcher.group(1);
    } else {
      return message;
    }
  }
}
