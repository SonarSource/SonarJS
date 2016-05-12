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
import com.google.common.collect.ImmutableList;
import com.google.common.collect.Lists;
import com.sonar.sslr.api.RecognitionException;
import com.sonar.sslr.api.typed.ActionParser;
import java.io.File;
import java.io.InterruptedIOException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.concurrent.TimeUnit;
import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.DependedUpon;
import org.sonar.api.batch.Sensor;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.component.Perspective;
import org.sonar.api.component.ResourcePerspectives;
import org.sonar.api.config.Settings;
import org.sonar.api.issue.Issuable;
import org.sonar.api.issue.Issuable.IssueBuilder;
import org.sonar.api.issue.NoSonarFilter;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.measures.Metric;
import org.sonar.api.resources.Project;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.source.Symbolizable;
import org.sonar.javascript.checks.CheckList;
import org.sonar.javascript.checks.ParsingErrorCheck;
import org.sonar.javascript.highlighter.HighlightSymbolTableBuilder;
import org.sonar.javascript.highlighter.HighlighterVisitor;
import org.sonar.javascript.issues.PreciseIssueCompat;
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
import org.sonar.plugins.javascript.api.visitors.LineIssue;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;
import org.sonar.squidbridge.ProgressReport;
import org.sonar.squidbridge.api.AnalysisException;

public class JavaScriptSquidSensor implements Sensor {

  private static final boolean IS_SONARQUBE_52_OR_LATER = isSonarQube52OrLater();

  @DependedUpon
  public Collection<Metric> generatesNCLOCMetric() {
    return ImmutableList.<Metric>of(CoreMetrics.NCLOC, CoreMetrics.NCLOC_DATA);
  }

  private static final Logger LOG = LoggerFactory.getLogger(JavaScriptSquidSensor.class);

  private final JavaScriptChecks checks;
  private final FileLinesContextFactory fileLinesContextFactory;
  private final ResourcePerspectives resourcePerspectives;
  private final FileSystem fileSystem;
  private final NoSonarFilter noSonarFilter;
  private final FilePredicate mainFilePredicate;
  private final Settings settings;
  private final ActionParser<Tree> parser;
  // parsingErrorRuleKey equals null if ParsingErrorCheck is not activated
  private RuleKey parsingErrorRuleKey = null;

  public JavaScriptSquidSensor(
    CheckFactory checkFactory, FileLinesContextFactory fileLinesContextFactory,
    ResourcePerspectives resourcePerspectives, FileSystem fileSystem, NoSonarFilter noSonarFilter, Settings settings
  ) {
    this(checkFactory, fileLinesContextFactory, resourcePerspectives, fileSystem, noSonarFilter, settings, null);
  }

  public JavaScriptSquidSensor(
    CheckFactory checkFactory, FileLinesContextFactory fileLinesContextFactory,
    ResourcePerspectives resourcePerspectives, FileSystem fileSystem, NoSonarFilter noSonarFilter,
    Settings settings, @Nullable CustomJavaScriptRulesDefinition[] customRulesDefinition
  ) {

    this.checks = JavaScriptChecks.createJavaScriptCheck(checkFactory)
      .addChecks(CheckList.REPOSITORY_KEY, CheckList.getChecks())
      .addCustomChecks(customRulesDefinition);
    this.fileLinesContextFactory = fileLinesContextFactory;
    this.resourcePerspectives = resourcePerspectives;
    this.fileSystem = fileSystem;
    this.noSonarFilter = noSonarFilter;
    this.mainFilePredicate = fileSystem.predicates().and(
      fileSystem.predicates().hasType(InputFile.Type.MAIN),
      fileSystem.predicates().hasLanguage(JavaScriptLanguage.KEY));
    this.settings = settings;
    this.parser = JavaScriptParserBuilder.createParser(fileSystem.encoding());
  }

  @Override
  public boolean shouldExecuteOnProject(Project project) {
    return fileSystem.hasFiles(mainFilePredicate);
  }

  @Override
  public void analyse(Project project, SensorContext context) {
    List<TreeVisitor> treeVisitors = Lists.newArrayList();

    treeVisitors.add(new MetricsVisitor(fileSystem, context, noSonarFilter, settings.getBoolean(JavaScriptPlugin.IGNORE_HEADER_COMMENTS), fileLinesContextFactory));
    treeVisitors.add(new HighlighterVisitor(resourcePerspectives, fileSystem));
    treeVisitors.add(new SeChecksDispatcher(checks.seChecks()));
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

  private static void stopProgressReport(ProgressReport progressReport, boolean success) {
    if (success) {
      progressReport.stop();
    } else {
      progressReport.cancel();
    }
  }

  private void analyse(SensorContext sensorContext, InputFile inputFile, List<TreeVisitor> visitors) {
    Issuable issuable = perspective(Issuable.class, inputFile);
    ScriptTree scriptTree;

    try {
      scriptTree = (ScriptTree) parser.parse(new java.io.File(inputFile.absolutePath()));
      scanFile(sensorContext, inputFile, visitors, issuable, scriptTree);

    } catch (RecognitionException e) {
      checkInterrupted(e);
      LOG.error("Unable to parse file: " + inputFile.absolutePath());
      LOG.error(e.getMessage());
      processRecognitionException(e, issuable);

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

  private void processRecognitionException(RecognitionException e, Issuable issuable) {
    if (parsingErrorRuleKey != null) {
      issuable.addIssue(issuable.newIssueBuilder()
        .ruleKey(parsingErrorRuleKey)
        .line(e.getLine())
        .message(e.getMessage())
        .build()
      );
    }
  }

  private void scanFile(SensorContext sensorContext, InputFile inputFile, List<TreeVisitor> visitors, Issuable issuable, ScriptTree scriptTree) {
    JavaScriptVisitorContext context = new JavaScriptVisitorContext(scriptTree, inputFile.file(), settings);

    Symbolizable symbolizable = perspective(Symbolizable.class, inputFile);
    highlightSymbols(symbolizable, context);

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

    saveFileIssues(sensorContext, fileIssues, inputFile, issuable);
  }

  private static void highlightSymbols(@Nullable Symbolizable symbolizable, JavaScriptVisitorContext context) {
    if (symbolizable != null) {
      symbolizable.setSymbolTable(HighlightSymbolTableBuilder.build(symbolizable, context));
    } else {
      LOG.warn("Symbol in source view will not be highlighted.");
    }
  }

  private void saveFileIssues(SensorContext sensorContext, List<Issue> fileIssues, InputFile inputFile, Issuable issuable) {
    for (Issue issue : fileIssues) {
      if (issue instanceof FileIssue) {
        saveIssue(issuable, issue.check(), null, ((FileIssue) issue).message(), issue.cost());

      } else if (issue instanceof LineIssue) {
        saveIssue(issuable, issue.check(), ((LineIssue)issue).line(), ((LineIssue) issue).message(), issue.cost());

      } else {
        PreciseIssue preciseIssue = (PreciseIssue)issue;
        if (IS_SONARQUBE_52_OR_LATER) {
          RuleKey ruleKey = ruleKey(issue.check());
          PreciseIssueCompat.save(sensorContext, inputFile, ruleKey, preciseIssue);
        } else {
          saveIssue(issuable, issue.check(), preciseIssue.primaryLocation().startLine(), preciseIssue.primaryLocation().message(), issue.cost());
        }
      }
    }
  }

  private void saveIssue(Issuable issuable, JavaScriptCheck check, @Nullable Integer line, String message, @Nullable Double cost) {
    RuleKey ruleKey = ruleKey(check);

    IssueBuilder issueBuilder = issuable
      .newIssueBuilder()
      .ruleKey(ruleKey)
      .message(message);

    if (line != null) {
      issueBuilder.line(line);
    }

    if (cost != null) {
      issueBuilder.effortToFix(cost);
    }

    issuable.addIssue(issueBuilder.build());
  }


  private RuleKey ruleKey(JavaScriptCheck check) {
    Preconditions.checkNotNull(check);
    RuleKey ruleKey = checks.ruleKeyFor(check);
    if (ruleKey == null) {
      throw new IllegalStateException("No rule key found for a rule");
    }
    return ruleKey;
  }

  private static boolean isSonarQube52OrLater() {
    for (Method method : Issuable.IssueBuilder.class.getMethods()) {
      if ("newLocation".equals(method.getName())) {
        return true;
      }
    }
    return false;
  }

  <P extends Perspective<?>> P perspective(Class<P> clazz, @Nullable InputFile file) {
    if (file == null) {
      throw new IllegalArgumentException("Cannot get " + clazz.getCanonicalName() + "for a null file");
    }
    P result = resourcePerspectives.as(clazz, file);
    if (result == null) {
      throw new IllegalStateException("Could not get " + clazz.getCanonicalName() + " for " + file);
    }
    return result;
  }

  @Override
  public String toString() {
    return getClass().getSimpleName();
  }

  public boolean isExcluded(File file) {
    return isMinifiedFile(file.getName());
  }

  public static boolean isMinifiedFile(String filename) {
    return filename.endsWith("-min.js") || filename.endsWith(".min.js");
  }

}
