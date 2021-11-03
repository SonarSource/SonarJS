/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
package org.sonar.plugins.javascript.css;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CancellationException;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import javax.annotation.Nullable;
import org.sonar.api.SonarProduct;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.sensor.Sensor;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.batch.sensor.issue.NewIssue;
import org.sonar.api.batch.sensor.issue.NewIssueLocation;
import org.sonar.api.notifications.AnalysisWarnings;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.css.CssRules.StylelintConfig;
import org.sonar.plugins.javascript.css.server.CssAnalyzerBridgeServer;
import org.sonar.plugins.javascript.css.server.CssAnalyzerBridgeServer.Issue;
import org.sonar.plugins.javascript.css.server.CssAnalyzerBridgeServer.Request;
import org.sonarsource.analyzer.commons.ProgressReport;

public class CssRuleSensor implements Sensor {

  private static final Logger LOG = Loggers.get(CssRuleSensor.class);
  private static final String CONFIG_PATH = "css-bundle/stylelintconfig.json";

  private final CssRules cssRules;
  private final CssAnalyzerBridgeServer cssAnalyzerBridgeServer;
  private final AnalysisWarnings analysisWarnings;


  public CssRuleSensor(
    CheckFactory checkFactory,
    CssAnalyzerBridgeServer cssAnalyzerBridgeServer,
    @Nullable AnalysisWarnings analysisWarnings
  ) {
    this.cssRules = new CssRules(checkFactory);
    this.cssAnalyzerBridgeServer = cssAnalyzerBridgeServer;
    this.analysisWarnings = analysisWarnings;
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor
      .createIssuesForRuleRepository("css")
      .name("CSS Rules");
  }

  @Override
  public void execute(SensorContext context) {
    reportOldNodeProperty(context);

    List<InputFile> inputFiles = getInputFiles(context);
    if (inputFiles.isEmpty()) {
      LOG.info("No CSS, PHP, HTML or VueJS files are found in the project. CSS analysis is skipped.");
      return;
    }

    File configFile = null;
    boolean serverRunning = false;

    try {
      serverRunning = cssAnalyzerBridgeServer.startServerLazily(context);
      configFile = createLinterConfig(context);
    } catch (Exception e) {
      // we can end up here in the following cases: problem during bundle unpacking, or config file creation, or socket creation
      String msg = "Failure during CSS analysis preparation, " + cssAnalyzerBridgeServer.getCommandInfo();
      logErrorOrWarn(context, msg, e);
      throwFailFast(context, e);
    }

    if (serverRunning && configFile != null) {
      analyzeFiles(context, inputFiles, configFile);
    }
  }

  public static void throwFailFast(SensorContext context, Exception e) {
    boolean failFast = context.config().getBoolean("sonar.internal.analysis.failFast").orElse(false);
    if (failFast) {
      throw new IllegalStateException("Analysis failed (\"sonar.internal.analysis.failFast\"=true)", e);
    }
  }

  private void reportOldNodeProperty(SensorContext context) {
    if (context.config().hasKey(CssPlugin.FORMER_NODE_EXECUTABLE)) {
      String msg = "Property '" + CssPlugin.FORMER_NODE_EXECUTABLE + "' is ignored, 'sonar.nodejs.executable' should be used instead";
      LOG.warn(msg);
      reportAnalysisWarning(msg);
    }
  }

  private void analyzeFiles(SensorContext context, List<InputFile> inputFiles, File configFile) {
    ProgressReport progressReport = new ProgressReport("Analysis progress", TimeUnit.SECONDS.toMillis(10));
    boolean success = false;

    try {
      progressReport.start(inputFiles.stream().map(InputFile::toString).collect(Collectors.toList()));
      for (InputFile inputFile : inputFiles) {
        analyzeFileWithContextCheck(inputFile, context, configFile);
        progressReport.nextFile();
      }
      success = true;

    } catch (CancellationException e) {
      // do not propagate the exception
      LOG.info(e.toString());

    } catch (Exception e) {
      // we can end up here in the following cases: fail to send file analysis request, fail to parse the response, server is not answering
      // or some other unpredicted state
      String msg = "Failure during CSS analysis, " + cssAnalyzerBridgeServer.getCommandInfo();
      logErrorOrWarn(context, msg, e);
      throwFailFast(context, e);
    } finally {
      finishProgressReport(progressReport, success);
    }
  }

  private static void finishProgressReport(ProgressReport progressReport, boolean success) {
    if (success) {
      progressReport.stop();
    } else {
      progressReport.cancel();
    }
  }

  void analyzeFileWithContextCheck(InputFile inputFile, SensorContext context, File configFile) {
    if (context.isCancelled()) {
      throw new CancellationException("Analysis interrupted because the SensorContext is in cancelled state");
    }
    if (!cssAnalyzerBridgeServer.isAlive()) {
      throw new IllegalStateException("css-bundle server is not answering");
    }
    try {
      analyzeFile(context, inputFile, configFile);
    } catch (IOException | RuntimeException e) {
      throw new IllegalStateException("Failure during analysis of " + inputFile.uri(), e);
    }
  }

  void analyzeFile(SensorContext context, InputFile inputFile, File configFile) throws IOException {
    URI uri = inputFile.uri();
    if (!"file".equalsIgnoreCase(uri.getScheme())) {
      LOG.debug("Skipping {} as it has not 'file' scheme", uri);
      return;
    }
    String fileContent = shouldSendFileContent(context, inputFile) ? inputFile.contents() : null;
    Request request = new Request(new File(uri).getAbsolutePath(), fileContent, configFile.toString());
    LOG.debug("Analyzing " + request.filePath);
    Issue[] issues = cssAnalyzerBridgeServer.analyze(request);
    LOG.debug("Found {} issue(s)", issues.length);
    saveIssues(context, inputFile, issues);
  }

  private static boolean shouldSendFileContent(SensorContext context, InputFile file) {
    return context.runtime().getProduct() == SonarProduct.SONARLINT
      || !StandardCharsets.UTF_8.equals(file.charset());
  }

  private void saveIssues(SensorContext context, InputFile inputFile, Issue[] issues) {
    for (Issue issue : issues) {
      NewIssue sonarIssue = context.newIssue();

      RuleKey ruleKey = cssRules.getActiveSonarKey(issue.rule);

      if (ruleKey == null) {
        if ("CssSyntaxError".equals(issue.rule)) {
          String errorMessage = issue.text.replace("(CssSyntaxError)", "").trim();
          logErrorOrDebug(inputFile, "Failed to parse {}, line {}, {}", inputFile.uri(), issue.line, errorMessage);
        } else {
          logErrorOrDebug(inputFile,"Unknown stylelint rule or rule not enabled: '" + issue.rule + "'");
        }

      } else {
        NewIssueLocation location = sonarIssue.newLocation()
          .on(inputFile)
          .at(inputFile.selectLine(issue.line))
          .message(normalizeMessage(issue.text));

        sonarIssue
          .at(location)
          .forRule(ruleKey)
          .save();
      }
    }
  }

  private static void logErrorOrDebug(InputFile file, String msg, Object ... arguments) {
    if (CssLanguage.KEY.equals(file.language())) {
      LOG.error(msg, arguments);
    } else {
      LOG.debug(msg, arguments);
    }
  }

  private static void logErrorOrWarn(SensorContext context, String msg, Throwable e) {
    if (hasCssFiles(context)) {
      LOG.error(msg, e);
    } else {
      LOG.warn(msg);
    }
  }

  private static List<InputFile> getInputFiles(SensorContext context) {
    FileSystem fileSystem = context.fileSystem();

    FilePredicate mainFilePredicate = fileSystem.predicates().and(
      fileSystem.predicates().hasType(InputFile.Type.MAIN),
      fileSystem.predicates().hasLanguages(CssLanguage.KEY, "php", "web"));

    FilePredicate vueFilePredicate = fileSystem.predicates().and(
      fileSystem.predicates().hasType(InputFile.Type.MAIN),
      fileSystem.predicates().hasExtension("vue"),
      // by default 'vue' extension is defined for JS language, but 'vue' files can contain TS code and thus language can be changed
      fileSystem.predicates().hasLanguages("js", "ts"));

    return StreamSupport.stream(fileSystem.inputFiles(fileSystem.predicates().or(mainFilePredicate, vueFilePredicate)).spliterator(), false)
      .collect(Collectors.toList());
  }

  public static boolean hasCssFiles(SensorContext context) {
    FileSystem fileSystem = context.fileSystem();
    FilePredicate mainFilePredicate = fileSystem.predicates().and(
      fileSystem.predicates().hasType(InputFile.Type.MAIN),
      fileSystem.predicates().hasLanguages(CssLanguage.KEY));
    return fileSystem.inputFiles(mainFilePredicate).iterator().hasNext();
  }

  private File createLinterConfig(SensorContext context) throws IOException {
    StylelintConfig config = cssRules.getConfig();
    final GsonBuilder gsonBuilder = new GsonBuilder();
    gsonBuilder.registerTypeAdapter(StylelintConfig.class, config);
    final Gson gson = gsonBuilder.create();
    String configAsJson = gson.toJson(config);
    File configFile = new File(context.fileSystem().workDir(), CONFIG_PATH).getAbsoluteFile();
    Files.createDirectories(configFile.toPath().getParent());
    Files.write(configFile.toPath(), Collections.singletonList(configAsJson), StandardCharsets.UTF_8);
    return configFile;
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

  private void reportAnalysisWarning(String message) {
    if (analysisWarnings != null) {
      analysisWarnings.addUnique(message);
    }
  }
}
