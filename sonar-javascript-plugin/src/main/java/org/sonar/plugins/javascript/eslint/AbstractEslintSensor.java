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
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import org.sonar.api.SonarProduct;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.Sensor;
import org.sonar.api.batch.sensor.SensorContext;
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
import org.sonar.api.notifications.AnalysisWarnings;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.javascript.checks.ParsingErrorCheck;
import org.sonar.plugins.javascript.AbstractChecks;
import org.sonar.plugins.javascript.CancellationException;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.AnalysisResponse;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.CpdToken;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.Highlight;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.HighlightedSymbol;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.Issue;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.Location;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.Metrics;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.ParsingError;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.ParsingErrorCode;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.Rule;
import org.sonarsource.nodejs.NodeCommandException;

abstract class AbstractEslintSensor implements Sensor {
  private static final Logger LOG = Loggers.get(AbstractEslintSensor.class);

  private final NoSonarFilter noSonarFilter;
  private final FileLinesContextFactory fileLinesContextFactory;
  final EslintBridgeServer eslintBridgeServer;
  private final AnalysisWarningsWrapper analysisWarnings;
  // Visible for testing
  final List<Rule> rules;
  final AbstractChecks checks;
  final Monitoring monitoring;
  List<String> environments;
  List<String> globals;

  // parsingErrorRuleKey equals null if ParsingErrorCheck is not activated
  private RuleKey parsingErrorRuleKey = null;

  SensorContext context;
  private boolean failFast;

  AbstractEslintSensor(AbstractChecks checks, NoSonarFilter noSonarFilter,
                       FileLinesContextFactory fileLinesContextFactory, EslintBridgeServer eslintBridgeServer,
                       AnalysisWarningsWrapper analysisWarnings, Monitoring monitoring) {
    this.checks = checks;
    this.rules = checks.eslintBasedChecks().stream()
      .map(check -> new EslintBridgeServer.Rule(check.eslintKey(), check.configurations()))
      .collect(Collectors.toList());

    this.noSonarFilter = noSonarFilter;
    this.fileLinesContextFactory = fileLinesContextFactory;
    this.eslintBridgeServer = eslintBridgeServer;
    this.analysisWarnings = analysisWarnings;

    this.parsingErrorRuleKey = checks.all().stream()
      .filter(check -> check instanceof ParsingErrorCheck)
      .findFirst()
      .map(checks::ruleKeyFor).orElse(null);
    this.monitoring = monitoring;
  }

  @Override
  public void execute(SensorContext context) {
    monitoring.startSensor(context, this);
    this.context = context;
    failFast = context.config().getBoolean("sonar.internal.analysis.failFast").orElse(false);
    environments = Arrays.asList(context.config().getStringArray(JavaScriptPlugin.ENVIRONMENTS));
    globals = Arrays.asList(context.config().getStringArray(JavaScriptPlugin.GLOBALS));
    try {
      List<InputFile> inputFiles = getInputFiles();
      if (inputFiles.isEmpty()) {
        LOG.info("No input files found for analysis");
        return;
      }
      eslintBridgeServer.startServerLazily(context);
      analyzeFiles(inputFiles);
    } catch (CancellationException e) {
      // do not propagate the exception
      LOG.info(e.toString());
    } catch (ServerAlreadyFailedException e) {
      LOG.debug("Skipping the start of eslint-bridge server " +
        "as it failed to start during the first analysis or it's not answering anymore");
      LOG.debug("No rules will be executed");

    } catch (NodeCommandException | MissingTypeScriptException e) {
      LOG.error(e.getMessage(), e);
      analysisWarnings.addUnique("JavaScript and/or TypeScript rules were not executed. " + e.getMessage());
      if (failFast) {
        throw new IllegalStateException("Analysis failed (\"sonar.internal.analysis.failFast\"=true)", e);
      }
    } catch (Exception e) {
      LOG.error("Failure during analysis, " + eslintBridgeServer.getCommandInfo(), e);
      if (failFast) {
        throw new IllegalStateException("Analysis failed (\"sonar.internal.analysis.failFast\"=true)", e);
      }
    } finally {
      monitoring.stopSensor();
    }
  }

  abstract void analyzeFiles(List<InputFile> inputFiles) throws IOException;

  protected abstract List<InputFile> getInputFiles();

  private void processParsingError(SensorContext sensorContext, InputFile inputFile, ParsingError parsingError) {
    Integer line = parsingError.line;
    String message = parsingError.message;

    if (line != null) {
      LOG.error("Failed to parse file [{}] at line {}: {}", inputFile.toString(), line, message);
    } else if (parsingError.code == ParsingErrorCode.FAILING_TYPESCRIPT) {
      LOG.error("Failed to analyze file [{}] from TypeScript: {}", inputFile.toString(), message);
    } else {
      if (parsingError.code == ParsingErrorCode.MISSING_TYPESCRIPT) {
        // effectively this is dead code, because missing typescript should be detected at the time we load tsconfig file
        LOG.error(message);
        logMissingTypescript();
        throw new MissingTypeScriptException();
      } else if (parsingError.code == ParsingErrorCode.UNSUPPORTED_TYPESCRIPT) {
        LOG.error(message);
        LOG.error("If it's not possible to upgrade version of TypeScript used by the project, " +
          "consider installing supported TypeScript version just for the time of analysis");
        throw new IllegalStateException("Unsupported TypeScript version");
      }
      LOG.error("Failed to analyze file [{}]: {}", inputFile.toString(), message);
      if (failFast) {
        throw new IllegalStateException("Failed to analyze file " + inputFile.toString());
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

  protected boolean shouldSendFileContent(InputFile file) {
    return context.runtime().getProduct() == SonarProduct.SONARLINT
      || !StandardCharsets.UTF_8.equals(file.charset());
  }

  protected void processResponse(InputFile file, AnalysisResponse response) {
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

  private void saveIssues(InputFile file, Issue[] issues) {
    for (Issue issue : issues) {
      LOG.debug("Saving issue for rule {} on line {}", issue.ruleId, issue.line);
      new EslintBasedIssue(issue).saveIssue(context, file, checks);
    }
  }

  private void saveHighlights(InputFile file, Highlight[] highlights) {
    NewHighlighting highlighting = context.newHighlighting().onFile(file);
    for (Highlight highlight : highlights) {
      highlighting.highlight(highlight.location.toTextRange(file), TypeOfText.valueOf(highlight.textType));
    }
    highlighting.save();
  }

  private void saveHighlightedSymbols(InputFile file, HighlightedSymbol[] highlightedSymbols) {
    NewSymbolTable symbolTable = context.newSymbolTable().onFile(file);
    for (HighlightedSymbol highlightedSymbol : highlightedSymbols) {
      Location declaration = highlightedSymbol.declaration;
      NewSymbol newSymbol = symbolTable.newSymbol(declaration.startLine, declaration.startCol, declaration.endLine, declaration.endCol);
      for (Location reference : highlightedSymbol.references) {
        newSymbol.newReference(reference.startLine, reference.startCol, reference.endLine, reference.endCol);
      }
    }
    symbolTable.save();
  }

  private void saveMetrics(InputFile file, Metrics metrics) {
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

  private void saveCpd(InputFile file, CpdToken[] cpdTokens) {
    NewCpdTokens newCpdTokens = context.newCpdTokens().onFile(file);
    for (CpdToken cpdToken : cpdTokens) {
      newCpdTokens.addToken(cpdToken.location.toTextRange(file), cpdToken.image);
    }
    newCpdTokens.save();
  }

  protected boolean ignoreHeaderComments() {
    return context.config().getBoolean(JavaScriptPlugin.IGNORE_HEADER_COMMENTS).orElse(JavaScriptPlugin.IGNORE_HEADER_COMMENTS_DEFAULT_VALUE);
  }

  static void logMissingTypescript() {
    LOG.error("TypeScript dependency was not found and it is required for analysis.");
    LOG.error("Install TypeScript in the project directory or use NODE_PATH env. variable to set TypeScript " +
      "location, if it's located outside of project directory.");
  }
}

