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
package org.sonar.plugins.javascript;

import com.google.common.annotations.VisibleForTesting;
import com.google.common.base.Preconditions;
import com.google.common.base.Throwables;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.Lists;
import com.sonar.sslr.api.RecognitionException;
import com.sonar.sslr.api.typed.ActionParser;
import java.io.InterruptedIOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import javax.annotation.Nullable;
import org.sonar.api.SonarProduct;
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
import org.sonar.javascript.metrics.NoSonarVisitor;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.javascript.se.SeChecksDispatcher;
import org.sonar.javascript.visitors.JavaScriptVisitorContext;
import org.sonar.plugins.javascript.api.CustomJavaScriptRulesDefinition;
import org.sonar.plugins.javascript.api.CustomRuleRepository;
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
import org.sonar.plugins.javascript.minify.MinificationAssessor;
import org.sonarsource.analyzer.commons.ProgressReport;

import static org.sonar.plugins.javascript.JavaScriptPlugin.DEPRECATED_ESLINT_PROPERTY;
import static org.sonar.plugins.javascript.JavaScriptPlugin.ESLINT_REPORT_PATHS;

public class JavaScriptSensor implements Sensor {

  private static final Logger LOG = Loggers.get(JavaScriptSensor.class);

  private final JavaScriptChecks checks;
  private final FileLinesContextFactory fileLinesContextFactory;
  private final FileSystem fileSystem;
  private final NoSonarFilter noSonarFilter;
  private final FilePredicate mainFilePredicate;
  private final ActionParser<Tree> parser;
  private final ActionParser<Tree> vueParser;
  // parsingErrorRuleKey equals null if ParsingErrorCheck is not activated
  private RuleKey parsingErrorRuleKey = null;

  public JavaScriptSensor(
    CheckFactory checkFactory, FileLinesContextFactory fileLinesContextFactory, FileSystem fileSystem, NoSonarFilter noSonarFilter) {
    this(checkFactory, fileLinesContextFactory, fileSystem, noSonarFilter, null, null);
  }

  /**
   *  This constructor is necessary for Pico container to correctly instantiate sensor with custom rules loaded via {@link CustomJavaScriptRulesDefinition}
   *  See plugin integration tests
   */
  public JavaScriptSensor(
    CheckFactory checkFactory, FileLinesContextFactory fileLinesContextFactory, FileSystem fileSystem, NoSonarFilter noSonarFilter,
    @Nullable CustomJavaScriptRulesDefinition[] customRulesDefinition) {
    this(checkFactory, fileLinesContextFactory, fileSystem, noSonarFilter, customRulesDefinition, null);
  }

  /**
   *  This constructor is necessary for Pico container to correctly instantiate sensor with custom rules loaded via {@link CustomRuleRepository}
   *  See plugin integration tests
   */
  public JavaScriptSensor(
    CheckFactory checkFactory, FileLinesContextFactory fileLinesContextFactory, FileSystem fileSystem, NoSonarFilter noSonarFilter,
    @Nullable CustomRuleRepository[] customRuleRepositories) {
    this(checkFactory, fileLinesContextFactory, fileSystem, noSonarFilter, null, customRuleRepositories);
  }

  public JavaScriptSensor(
    CheckFactory checkFactory, FileLinesContextFactory fileLinesContextFactory, FileSystem fileSystem, NoSonarFilter noSonarFilter,
    @Nullable CustomJavaScriptRulesDefinition[] customRulesDefinition,
    @Nullable CustomRuleRepository[] customRuleRepositories) {
    this.checks = JavaScriptChecks.createJavaScriptCheck(checkFactory)
      .addChecks(CheckList.REPOSITORY_KEY, CheckList.getChecks())
      .addCustomChecks(customRulesDefinition, customRuleRepositories);
    this.fileLinesContextFactory = fileLinesContextFactory;
    this.fileSystem = fileSystem;
    this.noSonarFilter = noSonarFilter;
    this.mainFilePredicate = fileSystem.predicates().and(
      fileSystem.predicates().hasType(InputFile.Type.MAIN),
      fileSystem.predicates().hasLanguage(JavaScriptLanguage.KEY));
    this.parser = JavaScriptParserBuilder.createParser();
    this.vueParser = JavaScriptParserBuilder.createVueParser();
  }

  @VisibleForTesting
  protected void analyseFiles(
    SensorContext context, List<TreeVisitor> treeVisitors, Iterable<InputFile> inputFiles,
    ProductDependentExecutor executor, ProgressReport progressReport
  ) {
    boolean success = false;
    try {
      for (InputFile inputFile : inputFiles) {
        if (context.isCancelled()) {
          throw new CancellationException("Analysis interrupted because the SensorContext is in cancelled state");
        }
        if (!isExcluded(inputFile)) {
          analyse(context, inputFile, executor, treeVisitors);
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

  private static void stopProgressReport(ProgressReport progressReport, boolean success) {
    if (success) {
      progressReport.stop();
    } else {
      progressReport.cancel();
    }
  }

  private void analyse(SensorContext sensorContext, InputFile inputFile, ProductDependentExecutor executor, List<TreeVisitor> visitors) {
    ActionParser<Tree> currentParser = this.parser;
    if (inputFile.filename().endsWith(".vue")) {
      currentParser = this.vueParser;
    }

    ScriptTree scriptTree;

    try {
      scriptTree = (ScriptTree) currentParser.parse(inputFile.contents());
      scanFile(sensorContext, inputFile, executor, visitors, scriptTree);
    } catch (RecognitionException e) {
      checkInterrupted(e);
      LOG.error("Unable to parse file: " + inputFile.uri());
      LOG.error(e.getMessage());
      processRecognitionException(e, sensorContext, inputFile);
    } catch (Exception e) {
      checkInterrupted(e);
      processException(e, sensorContext, inputFile);
      LOG.error("Unable to analyse file: " + inputFile.uri(), e);
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
        .message(ParsingErrorCheck.MESSAGE)
        .on(inputFile)
        .at(inputFile.selectLine(e.getLine()));

      newIssue
        .forRule(parsingErrorRuleKey)
        .at(primaryLocation)
        .save();
    }

    sensorContext.newAnalysisError()
      .onFile(inputFile)
      .at(inputFile.newPointer(e.getLine(), 0))
      .message(e.getMessage())
      .save();

  }

  private static void processException(Exception e, SensorContext sensorContext, InputFile inputFile) {
    sensorContext.newAnalysisError()
      .onFile(inputFile)
      .message(e.getMessage())
      .save();
  }

  private void scanFile(SensorContext sensorContext, InputFile inputFile, ProductDependentExecutor executor, List<TreeVisitor> visitors, ScriptTree scriptTree) {
    JavaScriptVisitorContext context = new JavaScriptVisitorContext(scriptTree, inputFile, sensorContext.config());

    List<Issue> fileIssues = new ArrayList<>();

    for (TreeVisitor visitor : visitors) {
      if (visitor instanceof JavaScriptCheck) {
        fileIssues.addAll(((JavaScriptCheck) visitor).scanFile(context));
      } else {
        visitor.scanTree(context);
      }
    }

    saveFileIssues(sensorContext, fileIssues, inputFile);
    executor.highlightSymbols(inputFile, context);
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

  public boolean isExcluded(InputFile file) {
    boolean isMinified = new MinificationAssessor().isMinified(file);
    if (isMinified) {
      LOG.debug("File [" + file.uri() + "] looks like a minified file and will not be analyzed");
    }
    return isMinified;
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor
      .onlyOnLanguage(JavaScriptLanguage.KEY)
      .name("SonarJS")
      .onlyOnFileType(Type.MAIN);
  }

  @Override
  public void execute(SensorContext context) {
    checkDeprecatedEslintProperty(context);

    ProductDependentExecutor executor = createProductDependentExecutor(context);

    List<TreeVisitor> treeVisitors = Lists.newArrayList();

    // it's important to have an order here:
    // NoSonarVisitor (part of executor.getProductDependentTreeVisitors()) should go before all checks
    treeVisitors.addAll(executor.getProductDependentTreeVisitors());
    treeVisitors.add(new SeChecksDispatcher(checks.seChecks()));
    treeVisitors.addAll(checks.visitorChecks());

    for (TreeVisitor check : treeVisitors) {
      if (check instanceof ParsingErrorCheck) {
        parsingErrorRuleKey = checks.ruleKeyFor((JavaScriptCheck) check);
        break;
      }
    }

    Iterable<InputFile> inputFiles = fileSystem.inputFiles(mainFilePredicate);
    Collection<String> files = StreamSupport.stream(inputFiles.spliterator(), false)
      .map(InputFile::toString)
      .collect(Collectors.toList());

    ProgressReport progressReport = new ProgressReport("Report about progress of Javascript analyzer", TimeUnit.SECONDS.toMillis(10));
    progressReport.start(files);

    analyseFiles(context, treeVisitors, inputFiles, executor, progressReport);
  }

  /**
   * Check if property consumed by SonarTS to import ESLint issues is set
   */
  private static void checkDeprecatedEslintProperty(SensorContext context) {
    if (context.config().get(DEPRECATED_ESLINT_PROPERTY).isPresent()) {
      LOG.warn("Property '{}' is deprecated, use '{}'.", DEPRECATED_ESLINT_PROPERTY, ESLINT_REPORT_PATHS);
    }
  }

  private ProductDependentExecutor createProductDependentExecutor(SensorContext context) {
    if (isSonarLint(context)) {
      return new SonarLintProductExecutor(noSonarFilter, context);
    }
    return new SonarQubeProductExecutor(context, noSonarFilter, fileLinesContextFactory);
  }

  @VisibleForTesting
  protected interface ProductDependentExecutor {
    List<TreeVisitor> getProductDependentTreeVisitors();

    void highlightSymbols(InputFile inputFile, TreeVisitorContext treeVisitorContext);
  }

  private static class SonarQubeProductExecutor implements ProductDependentExecutor {
    private final SensorContext context;
    private final NoSonarFilter noSonarFilter;
    private final FileLinesContextFactory fileLinesContextFactory;

    SonarQubeProductExecutor(SensorContext context, NoSonarFilter noSonarFilter, FileLinesContextFactory fileLinesContextFactory) {
      this.context = context;
      this.noSonarFilter = noSonarFilter;
      this.fileLinesContextFactory = fileLinesContextFactory;
    }

    @Override
    public List<TreeVisitor> getProductDependentTreeVisitors() {
      boolean ignoreHeaderComments = ignoreHeaderComments(context);

      MetricsVisitor metricsVisitor = new MetricsVisitor(
        context,
        ignoreHeaderComments,
        fileLinesContextFactory);

      return Arrays.asList(
        metricsVisitor,
        new NoSonarVisitor(noSonarFilter, ignoreHeaderComments),
        new HighlighterVisitor(context),
        new CpdVisitor(context));
    }

    @Override
    public void highlightSymbols(InputFile inputFile, TreeVisitorContext treeVisitorContext) {
      NewSymbolTable newSymbolTable = context.newSymbolTable().onFile(inputFile);
      HighlightSymbolTableBuilder.build(newSymbolTable, treeVisitorContext);
    }
  }

  @VisibleForTesting
  protected static class SonarLintProductExecutor implements ProductDependentExecutor {
    private final NoSonarFilter noSonarFilter;
    private final SensorContext context;

    SonarLintProductExecutor(NoSonarFilter noSonarFilter, SensorContext context) {
      this.noSonarFilter = noSonarFilter;
      this.context = context;
    }

    @Override
    public List<TreeVisitor> getProductDependentTreeVisitors() {
      return ImmutableList.of(new NoSonarVisitor(noSonarFilter, ignoreHeaderComments(context)));
    }

    @Override
    public void highlightSymbols(InputFile inputFile, TreeVisitorContext treeVisitorContext) {
      // unnecessary in SonarLint context
    }
  }

  private static boolean ignoreHeaderComments(SensorContext context) {
    return context.config().getBoolean(JavaScriptPlugin.IGNORE_HEADER_COMMENTS).orElse(JavaScriptPlugin.IGNORE_HEADER_COMMENTS_DEFAULT_VALUE);
  }

  private static boolean isSonarLint(SensorContext context) {
    return context.runtime().getProduct() == SonarProduct.SONARLINT;
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

  static class AnalysisException extends RuntimeException {
    AnalysisException(String message, Throwable cause) {
      super(message, cause);
    }
  }

}
