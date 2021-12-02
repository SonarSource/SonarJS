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
package org.sonar.plugins.javascript.eslint;

import java.io.IOException;
import java.io.Serializable;
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.batch.sensor.cpd.NewCpdTokens;
import org.sonar.api.batch.sensor.highlighting.NewHighlighting;
import org.sonar.api.batch.sensor.highlighting.TypeOfText;
import org.sonar.api.batch.sensor.issue.NewIssue;
import org.sonar.api.batch.sensor.issue.NewIssueLocation;
import org.sonar.api.batch.sensor.symbol.NewSymbol;
import org.sonar.api.batch.sensor.symbol.NewSymbolTable;
import org.sonar.api.issue.NoSonarFilter;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.FileLinesContext;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.measures.Metric;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.api.utils.log.Profiler;
import org.sonar.javascript.checks.ParsingErrorCheck;
import org.sonar.plugins.javascript.AbstractChecks;
import org.sonar.plugins.javascript.CancellationException;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.TypeScriptChecks;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.AnalysisResponse;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.JsAnalysisRequest;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.TsProgram;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.TsProgramRequest;

import static java.util.Collections.emptyList;

public class TypeScriptSensor extends AbstractEslintSensor {

  private static final Logger LOG = Loggers.get(TypeScriptSensor.class);
  private static final Profiler PROFILER = Profiler.create(LOG);

  private final NoSonarFilter noSonarFilter;
  private final FileLinesContextFactory fileLinesContextFactory;
  private final AbstractChecks checks;

  // Visible for testing
  final List<EslintBridgeServer.Rule> rules;

  // parsingErrorRuleKey equals null if ParsingErrorCheck is not activated
  private RuleKey parsingErrorRuleKey;

  public TypeScriptSensor(TypeScriptChecks typeScriptChecks, NoSonarFilter noSonarFilter,
                          FileLinesContextFactory fileLinesContextFactory,
                          EslintBridgeServer eslintBridgeServer,
                          AnalysisWarningsWrapper analysisWarnings,
                          Monitoring monitoring) {
    super(eslintBridgeServer,
      analysisWarnings,
      monitoring
    );
    this.checks = typeScriptChecks;
    this.rules = checks.eslintBasedChecks()
      .map(check -> new EslintBridgeServer.Rule(check.eslintKey(), check.configurations(), check.targets()))
      .collect(Collectors.toList());
    this.noSonarFilter = noSonarFilter;
    this.fileLinesContextFactory = fileLinesContextFactory;
    this.parsingErrorRuleKey = checks.all()
      .filter(ParsingErrorCheck.class::isInstance)
      .findFirst()
      .flatMap(checks::ruleKeyFor).orElse(null);
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor
      // JavaScriptLanguage.KEY is required for Vue single file components, bc .vue is considered as JS language
      .onlyOnLanguages(JavaScriptLanguage.KEY, TypeScriptLanguage.KEY)
      .name("JavaScript/TypeScript analysis");
  }

  @Override
  protected List<InputFile> getInputFiles() {
    FileSystem fs = context.fileSystem();
    var predicate = fs.predicates().hasLanguages(JavaScriptLanguage.KEY, TypeScriptLanguage.KEY);
    return StreamSupport.stream(fs.inputFiles(predicate).spliterator(), false)
      .collect(Collectors.toList());
  }

  @Override
  protected void analyzeFiles(List<InputFile> inputFiles) throws IOException {
    eslintBridgeServer.initLinter(rules, environments, globals);
    var tsConfigs = new TsConfigProvider().tsconfigs(context);
    if (tsConfigs.isEmpty()) {
      analyzeWithDefaultProgram(inputFiles);
      return;
    }
    Deque<String> workList = new ArrayDeque<>(tsConfigs);
    Set<String> analyzedProjects = new HashSet<>();
    Set<InputFile> analyzedFiles = new HashSet<>();
    while (!workList.isEmpty()) {
      var tsConfig = workList.pop();
      if (!analyzedProjects.add(tsConfig)) {
        continue;
      }
      PROFILER.startInfo("Creating program from tsconfig " + tsConfig);
      var program = eslintBridgeServer.createProgram(new TsProgramRequest(tsConfig));
      PROFILER.stopInfo();
      analyzeProgram(program, analyzedFiles);
      workList.addAll(program.projectReferences);
    }
    Set<InputFile> skippedFiles = new HashSet<>(inputFiles);
    skippedFiles.removeAll(analyzedFiles);
    LOG.debug("Skipped {} files because they were not part of any tsconfig", skippedFiles.size());
    skippedFiles.forEach(f -> LOG.debug("File not part of any tsconfig: {}", f));
  }

  private void analyzeWithDefaultProgram(List<InputFile> inputFiles) throws IOException {
    LOG.debug("No tsconfig file found, will create default program with {} files", inputFiles.size());
    var files = inputFiles.stream().map(InputFile::absolutePath).collect(Collectors.toList());
    PROFILER.startInfo("Creating default program");
    var defaultProgram = eslintBridgeServer.createProgram(new TsProgramRequest(files));
    PROFILER.stopInfo();
    analyzeProgram(defaultProgram, new HashSet<>());
  }

  private void analyzeProgram(TsProgram program, Set<InputFile> analyzedFiles) throws IOException {
    var fs = context.fileSystem();
    for (var file : program.files) {
      var inputFile = fs.inputFile(fs.predicates().hasAbsolutePath(file));
      if (inputFile == null) {
        LOG.debug("File not part of the project: '{}'", file);
        continue;
      }
      if (analyzedFiles.add(inputFile)) {
        analyze(inputFile, program);
      } else {
        LOG.debug("File already analyzed: '{}'", file);
      }
    }
  }

  private void analyze(InputFile file, TsProgram tsProgram) throws IOException {
    if (context.isCancelled()) {
      throw new CancellationException("Analysis interrupted because the SensorContext is in cancelled state");
    }
    try {
      LOG.debug("Analyzing {}", file);
      monitoring.startFile(file);
      String fileContent = shouldSendFileContent(file) ? file.contents() : null;
      JsAnalysisRequest request = new JsAnalysisRequest(file.absolutePath(), file.type().toString(), fileContent,
        ignoreHeaderComments(), emptyList(), tsProgram.id);
      AnalysisResponse response = eslintBridgeServer.analyzeTypeScript(request);
      processResponse(file, response);
    } catch (IOException e) {
      LOG.error("Failed to get response while analyzing " + file, e);
      throw e;
    }
  }


  private void processResponse(InputFile file, AnalysisResponse response) {
    if (response.parsingError != null) {
      processParsingError(context, file, response.parsingError);
      return;
    }

    // it's important to have an order here:
    // saving metrics should be done before saving issues so that NO SONAR lines with issues are indeed ignored
    saveMetrics(file, response.metrics);
    saveIssues(file, response.issues);
    saveHighlights(file, response.highlights);
    saveHighlightedSymbols(file, response.highlightedSymbols);
    saveCpd(file, response.cpdTokens);
    monitoring.stopFile(file, response.metrics.ncloc.length, response.perf);
  }

  private void saveIssues(InputFile file, EslintBridgeServer.Issue[] issues) {
    for (EslintBridgeServer.Issue issue : issues) {
      LOG.debug("Saving issue for rule {} on line {}", issue.ruleId, issue.line);
      new EslintBasedIssue(issue).saveIssue(context, file, checks);
    }
  }

  private void saveHighlights(InputFile file, EslintBridgeServer.Highlight[] highlights) {
    NewHighlighting highlighting = context.newHighlighting().onFile(file);
    for (EslintBridgeServer.Highlight highlight : highlights) {
      highlighting.highlight(highlight.location.toTextRange(file), TypeOfText.valueOf(highlight.textType));
    }
    highlighting.save();
  }

  private void saveHighlightedSymbols(InputFile file, EslintBridgeServer.HighlightedSymbol[] highlightedSymbols) {
    NewSymbolTable symbolTable = context.newSymbolTable().onFile(file);
    for (EslintBridgeServer.HighlightedSymbol highlightedSymbol : highlightedSymbols) {
      EslintBridgeServer.Location declaration = highlightedSymbol.declaration;
      NewSymbol newSymbol = symbolTable.newSymbol(declaration.startLine, declaration.startCol, declaration.endLine, declaration.endCol);
      for (EslintBridgeServer.Location reference : highlightedSymbol.references) {
        newSymbol.newReference(reference.startLine, reference.startCol, reference.endLine, reference.endCol);
      }
    }
    symbolTable.save();
  }

  private void saveMetrics(InputFile file, EslintBridgeServer.Metrics metrics) {
    if (file.type() == InputFile.Type.TEST || isSonarLint()) {
      noSonarFilter.noSonarInFile(file, Arrays.stream(metrics.nosonarLines).boxed().collect(Collectors.toSet()));
      return;
    }

    saveMetric(file, CoreMetrics.FUNCTIONS, metrics.functions);
    saveMetric(file, CoreMetrics.STATEMENTS, metrics.statements);
    saveMetric(file, CoreMetrics.CLASSES, metrics.classes);
    saveMetric(file, CoreMetrics.NCLOC, metrics.ncloc.length);
    saveMetric(file, CoreMetrics.COMMENT_LINES, metrics.commentLines.length);
    saveMetric(file, CoreMetrics.COMPLEXITY, metrics.complexity);
    saveMetric(file, CoreMetrics.COGNITIVE_COMPLEXITY, metrics.cognitiveComplexity);

    noSonarFilter.noSonarInFile(file, Arrays.stream(metrics.nosonarLines).boxed().collect(Collectors.toSet()));

    FileLinesContext fileLinesContext = fileLinesContextFactory.createFor(file);
    for (int line : metrics.ncloc) {
      fileLinesContext.setIntValue(CoreMetrics.NCLOC_DATA_KEY, line, 1);
    }

    for (int line : metrics.executableLines) {
      fileLinesContext.setIntValue(CoreMetrics.EXECUTABLE_LINES_DATA_KEY, line, 1);
    }

    fileLinesContext.save();
  }


  private <T extends Serializable> void saveMetric(InputFile file, Metric<T> metric, T value) {
    context.<T>newMeasure()
      .withValue(value)
      .forMetric(metric)
      .on(file)
      .save();
  }

  private void saveCpd(InputFile file, EslintBridgeServer.CpdToken[] cpdTokens) {
    if (file.type().equals(InputFile.Type.TEST) || isSonarLint()) {
      // even providing empty 'NewCpdTokens' will trigger duplication computation so skipping
      return;
    }
    NewCpdTokens newCpdTokens = context.newCpdTokens().onFile(file);
    for (EslintBridgeServer.CpdToken cpdToken : cpdTokens) {
      newCpdTokens.addToken(cpdToken.location.toTextRange(file), cpdToken.image);
    }
    newCpdTokens.save();
  }

  private boolean ignoreHeaderComments() {
    return context.config().getBoolean(JavaScriptPlugin.IGNORE_HEADER_COMMENTS).orElse(JavaScriptPlugin.IGNORE_HEADER_COMMENTS_DEFAULT_VALUE);
  }

  private void processParsingError(SensorContext sensorContext, InputFile inputFile, EslintBridgeServer.ParsingError parsingError) {
    Integer line = parsingError.line;
    String message = parsingError.message;

    if (line != null) {
      LOG.error("Failed to parse file [{}] at line {}: {}", inputFile.toString(), line, message);
    } else if (parsingError.code == EslintBridgeServer.ParsingErrorCode.FAILING_TYPESCRIPT) {
      LOG.error("Failed to analyze file [{}] from TypeScript: {}", inputFile.toString(), message);
    } else {
      if (parsingError.code == EslintBridgeServer.ParsingErrorCode.MISSING_TYPESCRIPT) {
        // effectively this is dead code, because missing typescript should be detected at the time we load tsconfig file
        LOG.error(message);
        logMissingTypescript();
        throw new MissingTypeScriptException();
      } else if (parsingError.code == EslintBridgeServer.ParsingErrorCode.UNSUPPORTED_TYPESCRIPT) {
        LOG.error(message);
        LOG.error("If it's not possible to upgrade version of TypeScript used by the project, " +
          "consider installing supported TypeScript version just for the time of analysis");
        throw new IllegalStateException("Unsupported TypeScript version");
      }
      LOG.error("Failed to analyze file [{}]: {}", inputFile.toString(), message);
      if (failFast) {
        throw new IllegalStateException("Failed to analyze file " + inputFile);
      }
    }

    if (parsingErrorRuleKey != null) {
      NewIssue newIssue = sensorContext.newIssue();

      NewIssueLocation primaryLocation = newIssue.newLocation()
        .message(message)
        .on(inputFile);

      if (line != null) {
        primaryLocation.at(inputFile.selectLine(line));
      }

      newIssue
        .forRule(parsingErrorRuleKey)
        .at(primaryLocation)
        .save();
    }

    sensorContext.newAnalysisError()
      .onFile(inputFile)
      .at(inputFile.newPointer(line != null ? line : 1, 0))
      .message(message)
      .save();
  }
}
