/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;
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
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.javascript.checks.CheckList;
import org.sonar.javascript.checks.ParsingErrorCheck;
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
import org.sonar.plugins.javascript.lcov.OverallCoverageSensor;
import org.sonar.plugins.javascript.lcov.UTCoverageSensor;
import org.sonar.plugins.javascript.minify.MinificationAssessor;
import org.sonar.squidbridge.ProgressReport;
import org.sonar.squidbridge.api.AnalysisException;

public class JavaScriptSquidSensor implements Sensor {

  private static final Logger LOG = Loggers.get(JavaScriptSquidSensor.class);

  private final JavaScriptChecks checks;
  private final FileLinesContextFactory fileLinesContextFactory;
  private final FileSystem fileSystem;
  private final NoSonarFilter noSonarFilter;
  private final FilePredicate mainFilePredicate;
  private final Settings settings;
  private final ActionParser<Tree> parser;
  // parsingErrorRuleKey equals null if ParsingErrorCheck is not activated
  private RuleKey parsingErrorRuleKey = null;

  public JavaScriptSquidSensor(
    CheckFactory checkFactory, FileLinesContextFactory fileLinesContextFactory, FileSystem fileSystem, NoSonarFilter noSonarFilter, Settings settings) {
    this(checkFactory, fileLinesContextFactory, fileSystem, noSonarFilter, settings, null);
  }

  public JavaScriptSquidSensor(
    CheckFactory checkFactory, FileLinesContextFactory fileLinesContextFactory, FileSystem fileSystem, NoSonarFilter noSonarFilter,
    Settings settings, @Nullable CustomJavaScriptRulesDefinition[] customRulesDefinition
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
    this.settings = settings;
    this.parser = JavaScriptParserBuilder.createParser(getEncoding());
  }

  @VisibleForTesting
  protected void analyseFiles(SensorContext context, List<TreeVisitor> treeVisitors, Iterable<InputFile> inputFiles, ProgressReport progressReport) {
    boolean success = false;
    try {
      for (InputFile inputFile : inputFiles) {
        if (!isExcluded(inputFile.file())) {
          analyse(context, inputFile, treeVisitors);
        }
        progressReport.nextFile();
      }
      success = true;
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

  private void analyse(SensorContext sensorContext, InputFile inputFile, List<TreeVisitor> visitors) {
    ScriptTree scriptTree;

    try {
      scriptTree = (ScriptTree) parser.parse(new java.io.File(inputFile.absolutePath()));
      scanFile(sensorContext, inputFile, visitors, scriptTree);

    } catch (RecognitionException e) {
      checkInterrupted(e);
      LOG.error("Unable to parse file: " + inputFile.absolutePath());
      LOG.error(e.getMessage());
      processRecognitionException(e, sensorContext, inputFile);

    } catch (Exception e) {
      checkInterrupted(e);
      throw new AnalysisException("Unable to analyse file: " + inputFile.absolutePath(), e);
    }

  }

  private static void checkInterrupted(Exception e) {
    Throwable cause = Throwables.getRootCause(e);
    if (cause instanceof InterruptedException || cause instanceof InterruptedIOException) {
      throw new AnalysisException("Analysis cancelled", e);
    }
  }

  private void processRecognitionException(RecognitionException e, SensorContext sensorContext, InputFile inputFile) {
    if (parsingErrorRuleKey != null) {
      NewIssue newIssue = sensorContext.newIssue();

      NewIssueLocation primaryLocation = newIssue.newLocation()
        .message(e.getMessage())
        .on(inputFile)
        .at(inputFile.selectLine(e.getLine()));

      newIssue
        .forRule(parsingErrorRuleKey)
        .at(primaryLocation)
        .save();
    }
  }

  private void scanFile(SensorContext sensorContext, InputFile inputFile, List<TreeVisitor> visitors, ScriptTree scriptTree) {
    JavaScriptVisitorContext context = new JavaScriptVisitorContext(scriptTree, inputFile.file(), settings);

    highlightSymbols(sensorContext.newSymbolTable().onFile(inputFile), context);

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

    saveFileIssues(sensorContext, fileIssues, inputFile);
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
        savePreciseIssue(sensorContext, inputFile, ruleKey, (PreciseIssue)issue);
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

  public boolean isExcluded(File file) {
    boolean isMinified = new MinificationAssessor(getEncoding()).isMinified(file);
    if (isMinified) {
      LOG.debug("File [" + file.getAbsolutePath() + "] is minified");
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
    Map<InputFile, Set<Integer>> linesOfCode = new HashMap<>();

    treeVisitors.add(new MetricsVisitor(fileSystem, context, noSonarFilter, settings.getBoolean(JavaScriptPlugin.IGNORE_HEADER_COMMENTS), fileLinesContextFactory, linesOfCode));
    treeVisitors.add(new HighlighterVisitor(context, fileSystem));
    treeVisitors.add(new SeChecksDispatcher(checks.seChecks()));
    treeVisitors.add(new CpdVisitor(fileSystem, context));
    treeVisitors.addAll(checks.visitorChecks());

    for (TreeVisitor check : treeVisitors) {
      if (check instanceof ParsingErrorCheck) {
        parsingErrorRuleKey = checks.ruleKeyFor((JavaScriptCheck) check);
        break;
      }
    }

    ProgressReport progressReport = new ProgressReport("Report about progress of Javascript analyzer", TimeUnit.SECONDS.toMillis(10));
    progressReport.start(Lists.newArrayList(fileSystem.files(mainFilePredicate)));

    analyseFiles(context, treeVisitors, fileSystem.inputFiles(mainFilePredicate), progressReport);

    executeCoverageSensors(context, linesOfCode);
  }

  private static void executeCoverageSensors(SensorContext context, Map<InputFile, Set<Integer>> linesOfCode) {
    LOG.info("Unit Test Coverage Sensor is started");
    (new UTCoverageSensor()).execute(context, linesOfCode);
    LOG.info("Integration Test Coverage Sensor is started");
    (new ITCoverageSensor()).execute(context, linesOfCode);
    LOG.info("Overall Coverage Sensor is started");
    (new OverallCoverageSensor()).execute(context, linesOfCode);
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
