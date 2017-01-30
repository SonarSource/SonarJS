/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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
package org.sonar.plugins.javascript;

import com.google.common.annotations.VisibleForTesting;
import com.google.common.base.Preconditions;
import com.google.common.base.Throwables;
import com.google.common.collect.Lists;
import com.sonar.sslr.api.RecognitionException;
import com.sonar.sslr.api.typed.ActionParser;

import java.io.File;
import java.io.InterruptedIOException;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

import javax.annotation.Nullable;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.fs.TextRange;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.sensor.Sensor;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.batch.sensor.issue.NewIssue;
import org.sonar.api.batch.sensor.issue.NewIssueLocation;
import org.sonar.api.batch.sensor.symbol.NewSymbolTable;
import org.sonar.api.config.Settings;
import org.sonar.api.issue.NoSonarFilter;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.utils.Version;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.javascript.checks.CheckList;
import org.sonar.javascript.checks.ParsingErrorCheck;
import org.sonar.javascript.compat.CompatibleInputFile;
import org.sonar.javascript.cpd.CpdVisitor;
import org.sonar.javascript.highlighter.HighlightSymbolTableBuilder;
import org.sonar.javascript.highlighter.HighlighterVisitor;
import org.sonar.javascript.metrics.MetricsVisitor;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.javascript.se.SeChecksDispatcher;
import org.sonar.javascript.tree.visitors.CharsetAwareVisitor;
import org.sonar.javascript.visitors.JavaScriptVisitorContext;
import org.sonar.plugins.javascript.api.CustomJavaScriptRulesDefinition;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.visitors.FileIssue;
import org.sonar.plugins.javascript.api.visitors.Issue;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.LineIssue;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;
import org.sonar.plugins.javascript.lcov.ITCoverageSensor;
import org.sonar.plugins.javascript.lcov.LCOVCoverageSensor;
import org.sonar.plugins.javascript.lcov.OverallCoverageSensor;
import org.sonar.plugins.javascript.lcov.UTCoverageSensor;
import org.sonar.plugins.javascript.minify.MinificationAssessor;
import org.sonar.squidbridge.ProgressReport;
import org.sonar.squidbridge.api.AnalysisException;

import static org.sonar.javascript.compat.CompatibilityHelper.wrap;

public class JavaScriptSquidSensor implements Sensor {

  private static final Logger LOG = Loggers.get(JavaScriptSquidSensor.class);

  public static final Version V6_0 = Version.create(6, 0);
  public static final Version V6_2 = Version.create(6, 2);

  private final JavaScriptChecks checks;
  private final FileLinesContextFactory fileLinesContextFactory;
  private final FileSystem fileSystem;
  private final NoSonarFilter noSonarFilter;
  private final FilePredicate mainFilePredicate;
  private final ActionParser<Tree> parser;
  // parsingErrorRuleKey equals null if ParsingErrorCheck is not activated
  private RuleKey parsingErrorRuleKey = null;

  public JavaScriptSquidSensor(
    CheckFactory checkFactory, FileLinesContextFactory fileLinesContextFactory, FileSystem fileSystem, NoSonarFilter noSonarFilter) {
    this(checkFactory, fileLinesContextFactory, fileSystem, noSonarFilter, null);
  }

  public JavaScriptSquidSensor(
    CheckFactory checkFactory, FileLinesContextFactory fileLinesContextFactory, FileSystem fileSystem, NoSonarFilter noSonarFilter,
    @Nullable CustomJavaScriptRulesDefinition[] customRulesDefinition
  ) {

    this.checks = JavaScriptChecks.createJavaScriptCheck(checkFactory)
      .addChecks(CheckList.REPOSITORY_KEY, CheckList.getChecks())
      .addCustomChecks(customRulesDefinition);
    this.fileLinesContextFactory = fileLinesContextFactory;
    this.fileSystem = fileSystem;
    this.noSonarFilter = noSonarFilter;
    this.mainFilePredicate = fileSystem.predicates().and(
      fileSystem.predicates().hasType(InputFile.Type.MAIN),
      fileSystem.predicates().hasLanguage(JavaScriptLanguage.KEY));
    this.parser = JavaScriptParserBuilder.createParser(getEncoding());
  }

  @VisibleForTesting
  protected void analyseFiles(SensorContext context, List<TreeVisitor> treeVisitors, Iterable<CompatibleInputFile> inputFiles, ProgressReport progressReport) {
    boolean success = false;
    try {
      for (CompatibleInputFile inputFile : inputFiles) {
        // check for cancellation of the analysis (by SonarQube or SonarLint). See SONARJS-761.
        if (context.getSonarQubeVersion().isGreaterThanOrEqual(V6_0) && context.isCancelled()) {
          throw new CancellationException("Analysis interrupted because the SensorContext is in cancelled state");
        }
        if (!isExcluded(inputFile)) {
          analyse(context, inputFile, treeVisitors);
        }
        progressReport.nextFile();
      }
      success = true;
    } catch (CancellationException e) {
      // do not propagate the exception
      LOG.debug(e.toString());
    } finally {
      stopProgressReport(progressReport, success);
    }
  }

  private Charset getEncoding() {
    return fileSystem.encoding();
  }

  private static void stopProgressReport(ProgressReport progressReport, boolean success) {
    if (success) {
      progressReport.stop();
    } else {
      progressReport.cancel();
    }
  }

  private void analyse(SensorContext sensorContext, CompatibleInputFile inputFile, List<TreeVisitor> visitors) {
    ScriptTree scriptTree;

    try {
      scriptTree = (ScriptTree) parser.parse(inputFile.contents());
      scanFile(sensorContext, inputFile, visitors, scriptTree);

    } catch (RecognitionException e) {
      checkInterrupted(e);
      LOG.error("Unable to parse file: " + inputFile.absolutePath());
      LOG.error(e.getMessage());
      processRecognitionException(e, sensorContext, inputFile);

    } catch (Exception e) {
      checkInterrupted(e);
      processException(e, sensorContext, inputFile);
      throw new AnalysisException("Unable to analyse file: " + inputFile.absolutePath(), e);
    }

  }

  private static void checkInterrupted(Exception e) {
    Throwable cause = Throwables.getRootCause(e);
    if (cause instanceof InterruptedException || cause instanceof InterruptedIOException) {
      throw new AnalysisException("Analysis cancelled", e);
    }
  }

  private void processRecognitionException(RecognitionException e, SensorContext sensorContext, CompatibleInputFile inputFile) {
    if (parsingErrorRuleKey != null) {
      NewIssue newIssue = sensorContext.newIssue();

      NewIssueLocation primaryLocation = newIssue.newLocation()
        .message(e.getMessage())
        .on(inputFile.orig())
        .at(inputFile.selectLine(e.getLine()));

      newIssue
        .forRule(parsingErrorRuleKey)
        .at(primaryLocation)
        .save();
    }

    if (sensorContext.getSonarQubeVersion().isGreaterThanOrEqual(V6_0)) {
      sensorContext.newAnalysisError()
        .onFile(inputFile)
        .at(inputFile.newPointer(e.getLine(), 0))
        .message(e.getMessage())
        .save();
    }
  }

  private static void processException(Exception e, SensorContext sensorContext, InputFile inputFile) {
    if (sensorContext.getSonarQubeVersion().isGreaterThanOrEqual(V6_0)) {
      sensorContext.newAnalysisError()
        .onFile(inputFile)
        .message(e.getMessage())
        .save();
    }
  }

  private void scanFile(SensorContext sensorContext, CompatibleInputFile inputFile, List<TreeVisitor> visitors, ScriptTree scriptTree) {
    JavaScriptVisitorContext context = new JavaScriptVisitorContext(scriptTree, inputFile, sensorContext.settings());

    highlightSymbols(sensorContext.newSymbolTable().onFile(inputFile.orig()), context);

    List<Issue> fileIssues = new ArrayList<>();

    for (TreeVisitor visitor : visitors) {
      if (visitor instanceof CharsetAwareVisitor) {
        ((CharsetAwareVisitor) visitor).setCharset(fileSystem.encoding());
      }

      if (visitor instanceof JavaScriptCheck) {
        fileIssues.addAll(((JavaScriptCheck) visitor).scanFile(context));
      } else {
        visitor.scanTree(context);
      }
    }

    saveFileIssues(sensorContext, fileIssues, inputFile.orig());
  }

  private static void highlightSymbols(NewSymbolTable newSymbolTable, TreeVisitorContext context) {
    HighlightSymbolTableBuilder.build(newSymbolTable, context);
  }

  private void saveFileIssues(SensorContext sensorContext, List<Issue> fileIssues, InputFile inputFile) {
    for (Issue issue : fileIssues) {
      RuleKey ruleKey = ruleKey(issue.check());
      if (issue instanceof FileIssue) {
        saveFileIssue(sensorContext, inputFile, ruleKey, (FileIssue) issue);

      } else if (issue instanceof LineIssue) {
        saveLineIssue(sensorContext, inputFile, ruleKey, (LineIssue) issue);

      } else {
        savePreciseIssue(sensorContext, inputFile, ruleKey, (PreciseIssue) issue);
      }
    }
  }

  private static void savePreciseIssue(SensorContext sensorContext, InputFile inputFile, RuleKey ruleKey, PreciseIssue issue) {
    NewIssue newIssue = sensorContext.newIssue();

    newIssue
      .forRule(ruleKey)
      .at(newLocation(inputFile, newIssue, issue.primaryLocation()));

    if (issue.cost() != null) {
      newIssue.gap(issue.cost());
    }

    for (IssueLocation secondary : issue.secondaryLocations()) {
      newIssue.addLocation(newLocation(inputFile, newIssue, secondary));
    }
    newIssue.save();
  }

  private static NewIssueLocation newLocation(InputFile inputFile, NewIssue issue, IssueLocation location) {
    TextRange range = inputFile.newRange(
      location.startLine(), location.startLineOffset(), location.endLine(), location.endLineOffset());

    NewIssueLocation newLocation = issue.newLocation()
      .on(inputFile)
      .at(range);

    if (location.message() != null) {
      newLocation.message(location.message());
    }
    return newLocation;
  }

  private RuleKey ruleKey(JavaScriptCheck check) {
    Preconditions.checkNotNull(check);
    RuleKey ruleKey = checks.ruleKeyFor(check);
    if (ruleKey == null) {
      throw new IllegalStateException("No rule key found for a rule");
    }
    return ruleKey;
  }

  public boolean isExcluded(CompatibleInputFile file) {
    boolean isMinified = new MinificationAssessor().isMinified(file);
    if (isMinified) {
      LOG.debug("File [" + file.absolutePath() + "] looks like a minified file and will not be analyzed");
    }
    return isMinified;
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor
      .onlyOnLanguage(JavaScriptLanguage.KEY)
      .name("JavaScript Squid Sensor")
      .onlyOnFileType(Type.MAIN);
  }

  @Override
  public void execute(SensorContext context) {
    List<TreeVisitor> treeVisitors = Lists.newArrayList();
    boolean isAtLeastSq62 = context.getSonarQubeVersion().isGreaterThanOrEqual(V6_2);

    MetricsVisitor metricsVisitor = new MetricsVisitor(
      context,
      noSonarFilter,
      context.settings().getBoolean(JavaScriptPlugin.IGNORE_HEADER_COMMENTS),
      fileLinesContextFactory,
      isAtLeastSq62);

    treeVisitors.add(metricsVisitor);
    treeVisitors.add(new HighlighterVisitor(context));
    treeVisitors.add(new SeChecksDispatcher(checks.seChecks()));
    treeVisitors.add(new CpdVisitor(context));
    treeVisitors.addAll(checks.visitorChecks());

    for (TreeVisitor check : treeVisitors) {
      if (check instanceof ParsingErrorCheck) {
        parsingErrorRuleKey = checks.ruleKeyFor((JavaScriptCheck) check);
        break;
      }
    }

    Iterable<CompatibleInputFile> inputFiles = wrap(fileSystem.inputFiles(mainFilePredicate), context);
    Collection<File> files = StreamSupport.stream(inputFiles.spliterator(), false)
      .map(InputFile::file)
      .collect(Collectors.toList());

    ProgressReport progressReport = new ProgressReport("Report about progress of Javascript analyzer", TimeUnit.SECONDS.toMillis(10));
    progressReport.start(files);

    analyseFiles(context, treeVisitors, inputFiles, progressReport);

    executeCoverageSensors(context, metricsVisitor.linesOfCode(), isAtLeastSq62);
  }

  private static void executeCoverageSensors(SensorContext context, Map<InputFile, Set<Integer>> linesOfCode, boolean isAtLeastSq62) {
    Settings settings = context.settings();
    if (isAtLeastSq62 && settings.getBoolean(JavaScriptPlugin.FORCE_ZERO_COVERAGE_KEY)) {
      LOG.warn("Since SonarQube 6.2 property 'sonar.javascript.forceZeroCoverage' is removed and its value is not used during analysis");
    }

    if (isAtLeastSq62) {
      logDeprecationForReportProperty(settings, JavaScriptPlugin.LCOV_UT_REPORT_PATH);
      logDeprecationForReportProperty(settings, JavaScriptPlugin.LCOV_IT_REPORT_PATH);

      String lcovReports = settings.getString(JavaScriptPlugin.LCOV_REPORT_PATHS);

      if (lcovReports == null || lcovReports.isEmpty()) {
        executeDeprecatedCoverageSensors(context, linesOfCode, true);

      } else {
        LOG.info("Test Coverage Sensor is started");
        (new LCOVCoverageSensor()).execute(context, linesOfCode, true);
      }

    } else {
      executeDeprecatedCoverageSensors(context, linesOfCode, false);
    }
  }

  private static void logDeprecationForReportProperty(Settings settings, String propertyKey) {
    String value = settings.getString(propertyKey);
    if (value != null && !value.isEmpty()) {
      LOG.warn("Since SonarQube 6.2 property '"+ propertyKey + "' is deprecated. Use 'sonar.javascript.lcov.reportPaths' instead.");
    }
  }

  private static void executeDeprecatedCoverageSensors(SensorContext context, Map<InputFile, Set<Integer>> linesOfCode, boolean isAtLeastSq62) {
    LOG.info("Unit Test Coverage Sensor is started");
    (new UTCoverageSensor()).execute(context, linesOfCode, isAtLeastSq62);
    LOG.info("Integration Test Coverage Sensor is started");
    (new ITCoverageSensor()).execute(context, linesOfCode, isAtLeastSq62);
    LOG.info("Overall Coverage Sensor is started");
    (new OverallCoverageSensor()).execute(context, linesOfCode, isAtLeastSq62);
  }

  private static void saveLineIssue(SensorContext sensorContext, InputFile inputFile, RuleKey ruleKey, LineIssue issue) {
    NewIssue newIssue = sensorContext.newIssue();

    NewIssueLocation primaryLocation = newIssue.newLocation()
      .message(issue.message())
      .on(inputFile)
      .at(inputFile.selectLine(issue.line()));

    saveIssue(newIssue, primaryLocation, ruleKey, issue);
  }

  private static void saveFileIssue(SensorContext sensorContext, InputFile inputFile, RuleKey ruleKey, FileIssue issue) {
    NewIssue newIssue = sensorContext.newIssue();

    NewIssueLocation primaryLocation = newIssue.newLocation()
      .message(issue.message())
      .on(inputFile);

    saveIssue(newIssue, primaryLocation, ruleKey, issue);
  }

  private static void saveIssue(NewIssue newIssue, NewIssueLocation primaryLocation, RuleKey ruleKey, Issue issue) {
    newIssue
      .forRule(ruleKey)
      .at(primaryLocation);

    if (issue.cost() != null) {
      newIssue.gap(issue.cost());
    }

    newIssue.save();
  }

}
