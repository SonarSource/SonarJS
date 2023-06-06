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

import static org.sonar.plugins.javascript.JavaScriptFilePredicate.isTypeScriptFile;
import static org.sonar.plugins.javascript.api.CustomRuleRepository.Language.JAVASCRIPT;
import static org.sonar.plugins.javascript.api.CustomRuleRepository.Language.TYPESCRIPT;
import static org.sonar.plugins.javascript.eslint.EslintBridgeServer.Issue;
import static org.sonar.plugins.javascript.eslint.EslintBridgeServer.IssueLocation;
import static org.sonar.plugins.javascript.eslint.QuickFixSupport.addQuickFixes;
import static org.sonar.plugins.javascript.utils.UnicodeEscape.unicodeEscape;

import java.io.Serializable;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import org.sonar.api.batch.fs.InputFile;
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
import org.sonar.api.rule.RuleKey;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.api.utils.Version;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.AnalysisResponse;
import org.sonar.plugins.javascript.eslint.cache.CacheAnalysis;
import org.sonarsource.api.sonarlint.SonarLintSide;
import org.sonarsource.sonarlint.plugin.api.SonarLintRuntime;
import org.sonarsource.sonarlint.plugin.api.issue.NewSonarLintIssue;

@ScannerSide
@SonarLintSide
public class AnalysisProcessor {

  private static final Logger LOG = Loggers.get(AnalysisProcessor.class);
  private static final Version SONARLINT_6_3 = Version.create(6, 3);

  private final Monitoring monitoring;
  private final NoSonarFilter noSonarFilter;
  private final FileLinesContextFactory fileLinesContextFactory;
  private SensorContext context;
  private ContextUtils contextUtils;
  private InputFile file;
  private JsTsChecks checks;

  public AnalysisProcessor(
    NoSonarFilter noSonarFilter,
    FileLinesContextFactory fileLinesContextFactory,
    Monitoring monitoring
  ) {
    this.noSonarFilter = noSonarFilter;
    this.fileLinesContextFactory = fileLinesContextFactory;
    this.monitoring = monitoring;
  }

  void processResponse(
    SensorContext context,
    JsTsChecks checks,
    InputFile file,
    AnalysisResponse response
  ) {
    this.context = context;
    contextUtils = new ContextUtils(context);
    this.checks = checks;
    this.file = file;
    if (response.parsingError != null) {
      processParsingError(response.parsingError);
      return;
    }

    if (
      YamlSensor.LANGUAGE.equals(file.language()) || HtmlSensor.LANGUAGE.equals(file.language())
    ) {
      // SonarQube expects that there is a single analyzer that saves analysis data like metrics, highlighting,
      // and symbols. There is an exception for issues, though. Since sonar-iac saves such data for YAML files
      // from Cloudformation configurations, we can only save issues for these files. Same applies for HTML and
      // sonar-html plugin.
      saveIssues(response.issues);
    } else {
      // it's important to have an order here:
      // saving metrics should be done before saving issues so that NO SONAR lines with issues are indeed ignored
      saveMetrics(response.metrics);
      saveIssues(response.issues);
      saveHighlights(response.highlights);
      saveHighlightedSymbols(response.highlightedSymbols);
      saveCpd(response.cpdTokens);
      monitoring.stopFile(file, response.metrics.ncloc.length, response.perf);
    }
  }

  void processCacheAnalysis(SensorContext context, InputFile file, CacheAnalysis cacheAnalysis) {
    this.context = context;
    contextUtils = new ContextUtils(context);
    this.file = file;

    if (
      YamlSensor.LANGUAGE.equals(file.language()) || HtmlSensor.LANGUAGE.equals(file.language())
    ) {
      // SonarQube expects that there is a single analyzer that saves analysis data like metrics, highlighting,
      // and symbols. There is an exception for issues, though. Since sonar-iac saves such data for YAML files
      // from Cloudformation configurations, we can only save issues for these files. Same applies for HTML and
      // sonar-html plugin.
      LOG.debug(
        "Skipping processing of the analysis extracted from cache because the javascript plugin doesn't save analysis data of YAML files"
      );
    } else {
      saveCpd(cacheAnalysis.getCpdTokens());
    }
  }

  private void processParsingError(EslintBridgeServer.ParsingError parsingError) {
    Integer line = parsingError.line;
    String message = parsingError.message;

    if (line != null) {
      LOG.error("Failed to parse file [{}] at line {}: {}", file, line, message);
    } else if (parsingError.code == EslintBridgeServer.ParsingErrorCode.FAILING_TYPESCRIPT) {
      LOG.error("Failed to analyze file [{}] from TypeScript: {}", file, message);
    } else {
      LOG.error("Failed to analyze file [{}]: {}", file, message);
      if (contextUtils.failFast()) {
        throw new IllegalStateException("Failed to analyze file " + file);
      }
    }

    var parsingErrorRuleKey = checks.parsingErrorRuleKey();
    if (parsingErrorRuleKey != null) {
      NewIssue newIssue = context.newIssue();

      NewIssueLocation primaryLocation = newIssue.newLocation().message(message).on(file);

      if (line != null) {
        primaryLocation.at(file.selectLine(line));
      }

      newIssue.forRule(parsingErrorRuleKey).at(primaryLocation).save();
    }

    context
      .newAnalysisError()
      .onFile(file)
      .at(file.newPointer(line != null ? line : 1, 0))
      .message(message)
      .save();
  }

  private void saveIssues(List<Issue> issues) {
    for (Issue issue : issues) {
      LOG.debug("Saving issue for rule {} on line {}", issue.ruleId, issue.line);
      saveIssue(issue);
    }
  }

  private void saveHighlights(EslintBridgeServer.Highlight[] highlights) {
    NewHighlighting highlighting = context.newHighlighting().onFile(file);
    for (EslintBridgeServer.Highlight highlight : highlights) {
      highlighting.highlight(
        highlight.location.toTextRange(file),
        TypeOfText.valueOf(highlight.textType)
      );
    }
    highlighting.save();
  }

  private void saveHighlightedSymbols(EslintBridgeServer.HighlightedSymbol[] highlightedSymbols) {
    NewSymbolTable symbolTable = context.newSymbolTable().onFile(file);
    for (EslintBridgeServer.HighlightedSymbol highlightedSymbol : highlightedSymbols) {
      EslintBridgeServer.Location declaration = highlightedSymbol.declaration;
      NewSymbol newSymbol = symbolTable.newSymbol(
        declaration.startLine,
        declaration.startCol,
        declaration.endLine,
        declaration.endCol
      );
      for (EslintBridgeServer.Location reference : highlightedSymbol.references) {
        newSymbol.newReference(
          reference.startLine,
          reference.startCol,
          reference.endLine,
          reference.endCol
        );
      }
    }
    symbolTable.save();
  }

  private void saveMetrics(EslintBridgeServer.Metrics metrics) {
    if (file.type() == InputFile.Type.TEST || contextUtils.isSonarLint()) {
      noSonarFilter.noSonarInFile(
        file,
        Arrays.stream(metrics.nosonarLines).boxed().collect(Collectors.toSet())
      );
      return;
    }

    saveMetric(file, CoreMetrics.FUNCTIONS, metrics.functions);
    saveMetric(file, CoreMetrics.STATEMENTS, metrics.statements);
    saveMetric(file, CoreMetrics.CLASSES, metrics.classes);
    saveMetric(file, CoreMetrics.NCLOC, metrics.ncloc.length);
    saveMetric(file, CoreMetrics.COMMENT_LINES, metrics.commentLines.length);
    saveMetric(file, CoreMetrics.COMPLEXITY, metrics.complexity);
    saveMetric(file, CoreMetrics.COGNITIVE_COMPLEXITY, metrics.cognitiveComplexity);

    noSonarFilter.noSonarInFile(
      file,
      Arrays.stream(metrics.nosonarLines).boxed().collect(Collectors.toSet())
    );

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
    context.<T>newMeasure().withValue(value).forMetric(metric).on(file).save();
  }

  private void saveCpd(EslintBridgeServer.CpdToken[] cpdTokens) {
    if (file.type().equals(InputFile.Type.TEST) || contextUtils.isSonarLint()) {
      // even providing empty 'NewCpdTokens' will trigger duplication computation so skipping
      return;
    }
    NewCpdTokens newCpdTokens = context.newCpdTokens().onFile(file);
    for (EslintBridgeServer.CpdToken cpdToken : cpdTokens) {
      newCpdTokens.addToken(cpdToken.location.toTextRange(file), cpdToken.image);
    }
    newCpdTokens.save();
  }

  void saveIssue(EslintBridgeServer.Issue issue) {
    var newIssue = context.newIssue();
    var location = newIssue.newLocation().on(file);
    if (issue.message != null) {
      var escapedMsg = unicodeEscape(issue.message);
      location.message(escapedMsg);
    }

    if (issue.endLine != null) {
      location.at(file.newRange(issue.line, issue.column, issue.endLine, issue.endColumn));
    } else {
      if (issue.line != 0) {
        location.at(file.selectLine(issue.line));
      }
    }

    issue.secondaryLocations.forEach(secondary -> {
      NewIssueLocation newIssueLocation = newSecondaryLocation(file, newIssue, secondary);
      if (newIssueLocation != null) {
        newIssue.addLocation(newIssueLocation);
      }
    });

    if (issue.cost != null) {
      newIssue.gap(issue.cost);
    }

    if (issue.quickFixes != null && !issue.quickFixes.isEmpty()) {
      if (isSqQuickFixCompatible()) {
        newIssue.setQuickFixAvailable(true);
      }
      if (isQuickFixCompatible()) {
        addQuickFixes(issue, (NewSonarLintIssue) newIssue, file);
      }
    }

    var ruleKey = findRuleKey(issue);
    if (ruleKey != null) {
      newIssue.at(location).forRule(ruleKey).save();
    }
  }

  private RuleKey findRuleKey(Issue issue) {
    return checks.ruleKeyByEslintKey(
      issue.ruleId,
      isTypeScriptFile(file) ? TYPESCRIPT : JAVASCRIPT
    );
  }

  private boolean isSqQuickFixCompatible() {
    return (
      contextUtils.isSonarQube() &&
      context.runtime().getApiVersion().isGreaterThanOrEqual(Version.create(9, 2))
    );
  }

  private boolean isQuickFixCompatible() {
    return (
      contextUtils.isSonarLint() &&
      ((SonarLintRuntime) context.runtime()).getSonarLintPluginApiVersion()
        .isGreaterThanOrEqual(SONARLINT_6_3)
    );
  }

  private static NewIssueLocation newSecondaryLocation(
    InputFile inputFile,
    NewIssue issue,
    IssueLocation location
  ) {
    NewIssueLocation newIssueLocation = issue.newLocation().on(inputFile);

    if (
      location.line != null &&
      location.endLine != null &&
      location.column != null &&
      location.endColumn != null
    ) {
      newIssueLocation.at(
        inputFile.newRange(location.line, location.column, location.endLine, location.endColumn)
      );
      if (location.message != null) {
        newIssueLocation.message(unicodeEscape(location.message));
      }
      return newIssueLocation;
    }
    return null;
  }
}
