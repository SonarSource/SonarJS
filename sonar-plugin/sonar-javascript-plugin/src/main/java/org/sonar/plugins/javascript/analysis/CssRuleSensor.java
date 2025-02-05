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
package org.sonar.plugins.javascript.analysis;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.StreamSupport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import org.sonar.css.CssLanguage;
import org.sonar.css.CssRules;
import org.sonar.plugins.javascript.CancellationException;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.bridge.BridgeServer.CssAnalysisRequest;
import org.sonar.plugins.javascript.bridge.BridgeServer.Issue;
import org.sonar.plugins.javascript.bridge.StylelintRule;
import org.sonar.plugins.javascript.utils.ProgressReport;

public class CssRuleSensor extends AbstractBridgeSensor {

  private static final Logger LOG = LoggerFactory.getLogger(CssRuleSensor.class);

  private final SonarRuntime sonarRuntime;
  private final CssRules cssRules;

  public CssRuleSensor(
    SonarRuntime sonarRuntime,
    BridgeServer bridgeServer,
    CheckFactory checkFactory
  ) {
    super(bridgeServer, "CSS");
    this.sonarRuntime = sonarRuntime;
    this.cssRules = new CssRules(checkFactory);
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

  @Override
  protected List<Issue> analyzeFiles(List<InputFile> inputFiles) throws IOException {
    var issues = new ArrayList<Issue>();

    ProgressReport progressReport = new ProgressReport(
      "Analysis progress",
      TimeUnit.SECONDS.toMillis(10)
    );
    boolean success = false;
    List<StylelintRule> rules = cssRules.getStylelintRules();

    try {
      progressReport.start(inputFiles.size(), inputFiles.iterator().next().toString());
      for (InputFile inputFile : inputFiles) {
        if (context.isCancelled()) {
          throw new CancellationException(
            "Analysis interrupted because the SensorContext is in cancelled state"
          );
        }
        var fileIssues = analyzeFile(inputFile, context, rules);

        issues.addAll(fileIssues);

        progressReport.nextFile(inputFile.toString());
      }
      success = true;
    } finally {
      if (success) {
        progressReport.stop();
      } else {
        progressReport.cancel();
      }
    }

    return issues;
  }

  List<Issue> analyzeFile(InputFile inputFile, SensorContext context, List<StylelintRule> rules) {
    List<Issue> issues;

    try {
      URI uri = inputFile.uri();
      if (!"file".equalsIgnoreCase(uri.getScheme())) {
        LOG.debug("Skipping {} as it has not 'file' scheme", uri);
        return new ArrayList<>();
      }
      LOG.debug("Analyzing file: {}", uri);
      String fileContent = contextUtils.shouldSendFileContent(inputFile)
        ? inputFile.contents()
        : null;
      CssAnalysisRequest request = new CssAnalysisRequest(
        new File(uri).getAbsolutePath(),
        fileContent,
        rules
      );
      var analysisResponse = bridgeServer.analyzeCss(request);

      issues = analysisResponse.issues();

      LOG.debug("Found {} issue(s)", issues.size());
      saveIssues(context, inputFile, issues);
    } catch (IOException | RuntimeException e) {
      throw new IllegalStateException("Failure during analysis of " + inputFile.uri(), e);
    }

    return issues;
  }

  private void saveIssues(SensorContext context, InputFile inputFile, List<Issue> issues) {
    for (Issue issue : issues) {
      RuleKey ruleKey = cssRules.getActiveSonarKey(issue.ruleId());
      if (ruleKey == null) {
        if ("CssSyntaxError".equals(issue.ruleId())) {
          String errorMessage = issue.message().replace("(CssSyntaxError)", "").trim();
          logWarningOrDebug(
            inputFile,
            "Failed to parse file {}, line {}, {}",
            inputFile.uri(),
            issue.line(),
            errorMessage
          );
        } else {
          logErrorOrDebug(
            inputFile,
            "Unknown stylelint rule or rule not enabled: '" + issue.ruleId() + "'"
          );
        }
      } else {
        NewIssue sonarIssue = context.newIssue();
        NewIssueLocation location = sonarIssue
          .newLocation()
          .on(inputFile)
          .at(inputFile.selectLine(issue.line()))
          .message(normalizeMessage(issue.message()));

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

  private static void logWarningOrDebug(InputFile file, String msg, Object... arguments) {
    if (CssLanguage.KEY.equals(file.language())) {
      LOG.warn(msg, arguments);
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
  protected List<InputFile> getInputFiles() {
    var fileSystem = this.context.fileSystem();
    var p = fileSystem.predicates();

    var cssFilePredicate = p.and(
      p.hasType(InputFile.Type.MAIN),
      p.or(p.hasLanguages(CssLanguage.KEY))
    );

    var webFilePredicate = p.and(
      p.hasType(InputFile.Type.MAIN),
      p.or(p.hasExtension("htm"), p.hasExtension("html"), p.hasExtension("xhtml"))
    );

    var vueFilePredicate = p.and(
      p.hasType(InputFile.Type.MAIN),
      p.hasExtension("vue"),
      // by default 'vue' extension is defined for JS language, but 'vue' files can contain TS code and thus language can be changed
      p.hasLanguages("js", "ts")
    );

    return StreamSupport.stream(
      fileSystem
        .inputFiles(p.or(cssFilePredicate, webFilePredicate, vueFilePredicate))
        .spliterator(),
      false
    ).toList();
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
