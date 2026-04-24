/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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

import static org.sonar.plugins.javascript.analysis.QuickFixSupport.addQuickFixes;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.TextRange;
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
import org.sonar.css.CssLanguage;
import org.sonar.css.CssRules;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.analysis.cache.CacheAnalysis;
import org.sonar.plugins.javascript.analyzeproject.grpc.AnalysisLanguage;
import org.sonar.plugins.javascript.analyzeproject.grpc.CpdToken;
import org.sonar.plugins.javascript.analyzeproject.grpc.Highlight;
import org.sonar.plugins.javascript.analyzeproject.grpc.HighlightedSymbol;
import org.sonar.plugins.javascript.analyzeproject.grpc.Issue;
import org.sonar.plugins.javascript.analyzeproject.grpc.IssueLocation;
import org.sonar.plugins.javascript.analyzeproject.grpc.Location;
import org.sonar.plugins.javascript.analyzeproject.grpc.Metrics;
import org.sonar.plugins.javascript.analyzeproject.grpc.ParsingError;
import org.sonar.plugins.javascript.analyzeproject.grpc.ParsingErrorCode;
import org.sonar.plugins.javascript.analyzeproject.grpc.ProjectAnalysisFileResult;
import org.sonar.plugins.javascript.analyzeproject.grpc.TextType;
import org.sonar.plugins.javascript.api.Language;
import org.sonarsource.api.sonarlint.SonarLintSide;
import org.sonarsource.sonarlint.plugin.api.SonarLintRuntime;

@ScannerSide
@SonarLintSide
public class AnalysisProcessor {

  private static final Logger LOG = LoggerFactory.getLogger(AnalysisProcessor.class);

  private final NoSonarFilter noSonarFilter;
  private final FileLinesContextFactory fileLinesContextFactory;
  private final CssRules cssRules;
  private InputFile file;
  private JsTsChecks checks;

  public AnalysisProcessor(
    NoSonarFilter noSonarFilter,
    FileLinesContextFactory fileLinesContextFactory,
    CssRules cssRules
  ) {
    this.noSonarFilter = noSonarFilter;
    this.fileLinesContextFactory = fileLinesContextFactory;
    this.cssRules = cssRules;
  }

  List<Issue> processResponse(
    JsTsContext<?> context,
    JsTsChecks checks,
    InputFile file,
    ProjectAnalysisFileResult response
  ) {
    List<Issue> issues;

    this.checks = checks;
    this.file = file;
    if (!response.getParsingErrorsList().isEmpty()) {
      response
        .getParsingErrorsList()
        .forEach(parsingError -> processParsingError(context, parsingError));
      return new ArrayList<>();
    }

    issues = response.getIssuesList();

    if (isJsTsOrCss(file.language())) {
      // it's important to have an order here:
      // saving metrics should be done before saving issues so that NO SONAR lines with issues are indeed ignored
      saveMetrics(context, response.getMetrics());
      saveIssues(context, issues);
      saveHighlights(context, response.getHighlightsList());
      saveHighlightedSymbols(context, response.getHighlightedSymbolsList());
      saveCpd(context, response.getCpdTokensList());
    } else {
      // SonarQube expects that there is a single analyzer that saves analysis data like metrics, highlighting,
      // and symbols. There is an exception for issues, though. Since sonar-iac saves such data for YAML files
      // from Cloudformation configurations, we can only save issues for these files. Same applies for HTML and
      // sonar-html plugin.
      saveIssues(context, issues);
    }

    return issues;
  }

  void processFileError(JsTsContext<?> context, InputFile file, String message) {
    this.file = file;

    LOG.error("Failed to analyze file [{}]: {}", file, message);
    failFastOnNonCssAnalysisError(context, CssLanguage.KEY.equals(file.language()));

    context.getSensorContext().newAnalysisError().onFile(file).message(message).save();
  }

  void processCacheAnalysis(JsTsContext<?> context, InputFile file, CacheAnalysis cacheAnalysis) {
    this.file = file;

    saveCpd(context, cacheAnalysis.getCpdTokens());
  }

  private void processParsingError(JsTsContext<?> context, ParsingError parsingError) {
    Integer line = parsingError.hasLine() ? parsingError.getLine() : null;
    Integer column = parsingError.hasColumn() ? parsingError.getColumn() : null;
    String message = parsingError.getMessage();

    if (line != null) {
      LOG.warn("Failed to parse file [{}] at line {}: {}", file, line, message);
    } else if (parsingError.getCode() == ParsingErrorCode.PARSING_ERROR_CODE_FAILING_TYPESCRIPT) {
      LOG.error("Failed to analyze file [{}] from TypeScript: {}", file, message);
    } else {
      LOG.error("Failed to analyze file [{}]: {}", file, message);
      failFastOnNonCssAnalysisError(
        context,
        parsingError.getLanguage() == AnalysisLanguage.ANALYSIS_LANGUAGE_CSS
      );
    }

    var parsingErrorRuleKey = parsingErrorRuleKey(parsingError);
    if (parsingErrorRuleKey != null) {
      NewIssue newIssue = context.getSensorContext().newIssue();

      NewIssueLocation primaryLocation = newIssue.newLocation().message(message).on(file);

      if (line != null) {
        try {
          if (column != null && column >= 0) {
            // SonarQube does not allow zero-length ranges; highlight one character.
            primaryLocation.at(file.newRange(line, column, line, column + 1));
          } else {
            primaryLocation.at(file.selectLine(line));
          }
        } catch (RuntimeException e) {
          LOG.warn(
            "Failed to create parsing error location in {} at line {}, column {}. Falling back to line.",
            file.uri(),
            line,
            column
          );
          primaryLocation.at(file.selectLine(line));
        }
      }

      newIssue.forRule(parsingErrorRuleKey).at(primaryLocation).save();
    }

    var newAnalysisError = context.getSensorContext().newAnalysisError().onFile(file);
    try {
      newAnalysisError.at(
        file.newPointer(line != null ? line : 1, toParsingErrorColumn(line, column))
      );
    } catch (RuntimeException e) {
      LOG.warn(
        "Failed to create parsing error pointer in {} at line {}, column {}. Falling back to file start.",
        file.uri(),
        line,
        column
      );
      newAnalysisError.at(file.newPointer(1, 0));
    }
    newAnalysisError.message(message).save();
  }

  private void failFastOnNonCssAnalysisError(JsTsContext<?> context, boolean isCss) {
    if (context.failFast() && !isCss) {
      throw new IllegalStateException("Failed to analyze file " + file);
    }
  }

  @Nullable
  private RuleKey parsingErrorRuleKey(ParsingError parsingError) {
    if (parsingError.getLanguage() == AnalysisLanguage.ANALYSIS_LANGUAGE_CSS) {
      return cssRules.getActiveSonarKey(CssRules.CSS_PARSING_ERROR_STYLELINT_KEY);
    }

    var language = toLanguageKey(parsingError.getLanguage());
    return language == null ? null : checks.parsingErrorRuleKey(Language.of(language));
  }

  private void saveIssues(JsTsContext<?> context, List<Issue> issues) {
    for (Issue issue : issues) {
      LOG.debug(
        "Saving issue for rule {} on file {} at line {}",
        issue.getRuleId(),
        file,
        issue.getLine()
      );
      try {
        saveIssue(context, issue);
      } catch (RuntimeException e) {
        LOG.warn("Failed to save issue in {} at line {}", file.uri(), issue.getLine());
        LOG.warn("Exception cause", e);
      }
    }
  }

  private void saveHighlights(JsTsContext<?> context, List<Highlight> highlights) {
    NewHighlighting highlighting = context.getSensorContext().newHighlighting().onFile(file);
    for (Highlight highlight : highlights) {
      try {
        var typeOfText = toTypeOfText(highlight.getTextType());
        if (typeOfText == null) {
          continue;
        }
        highlighting.highlight(toTextRange(highlight.getLocation(), file), typeOfText);
      } catch (RuntimeException e) {
        LOG.warn(
          "Failed to create highlight in {} at {}",
          file.uri(),
          formatLocation(highlight.getLocation())
        );
        LOG.warn("Exception cause", e);
        // continue processing other highlights
      }
    }
    try {
      highlighting.save();
    } catch (RuntimeException e) {
      LOG.warn("Failed to save highlights in {}.", file.uri());
      LOG.warn("Exception cause", e);
    }
  }

  private void saveHighlightedSymbols(
    JsTsContext<?> context,
    List<HighlightedSymbol> highlightedSymbols
  ) {
    NewSymbolTable symbolTable = context.getSensorContext().newSymbolTable().onFile(file);
    for (HighlightedSymbol highlightedSymbol : highlightedSymbols) {
      Location declaration = highlightedSymbol.getDeclaration();
      NewSymbol newSymbol;
      try {
        newSymbol = symbolTable.newSymbol(
          declaration.getStartLine(),
          declaration.getStartCol(),
          declaration.getEndLine(),
          declaration.getEndCol()
        );
      } catch (RuntimeException e) {
        LOG.warn(
          "Failed to create symbol declaration in {} at {}",
          file.uri(),
          formatLocation(declaration)
        );
        continue;
      }
      for (Location reference : highlightedSymbol.getReferencesList()) {
        try {
          newSymbol.newReference(
            reference.getStartLine(),
            reference.getStartCol(),
            reference.getEndLine(),
            reference.getEndCol()
          );
        } catch (RuntimeException e) {
          LOG.warn(
            "Failed to create symbol reference in {} at {}",
            file.uri(),
            formatLocation(reference)
          );
        }
      }
    }
    symbolTable.save();
  }

  private static String formatLocation(Location location) {
    return "%d:%d-%d:%d".formatted(
      location.getStartLine(),
      location.getStartCol(),
      location.getEndLine(),
      location.getEndCol()
    );
  }

  private void saveMetrics(JsTsContext<?> context, Metrics metrics) {
    if (file.type() == InputFile.Type.TEST || context.isSonarLint()) {
      noSonarFilter.noSonarInFile(file, Set.copyOf(metrics.getNosonarLinesList()));
      return;
    }

    // CSS files only have NCLOC and COMMENT_LINES - the old CssMetricSensor
    // never saved FUNCTIONS, STATEMENTS, CLASSES, COMPLEXITY, or COGNITIVE_COMPLEXITY.
    if (!CssLanguage.KEY.equals(file.language())) {
      saveMetric(context, file, CoreMetrics.FUNCTIONS, metrics.getFunctions());
      saveMetric(context, file, CoreMetrics.STATEMENTS, metrics.getStatements());
      saveMetric(context, file, CoreMetrics.CLASSES, metrics.getClasses());
      saveMetric(context, file, CoreMetrics.COMPLEXITY, metrics.getComplexity());
      saveMetric(context, file, CoreMetrics.COGNITIVE_COMPLEXITY, metrics.getCognitiveComplexity());
    }

    saveMetric(context, file, CoreMetrics.NCLOC, metrics.getNclocCount());
    saveMetric(context, file, CoreMetrics.COMMENT_LINES, metrics.getCommentLinesCount());

    noSonarFilter.noSonarInFile(file, Set.copyOf(metrics.getNosonarLinesList()));

    FileLinesContext fileLinesContext = fileLinesContextFactory.createFor(file);
    for (int line : metrics.getNclocList()) {
      fileLinesContext.setIntValue(CoreMetrics.NCLOC_DATA_KEY, line, 1);
    }

    if (!CssLanguage.KEY.equals(file.language())) {
      for (int line : metrics.getExecutableLinesList()) {
        fileLinesContext.setIntValue(CoreMetrics.EXECUTABLE_LINES_DATA_KEY, line, 1);
      }
    }

    fileLinesContext.save();
  }

  private static <T extends Serializable> void saveMetric(
    JsTsContext<?> context,
    InputFile file,
    Metric<T> metric,
    T value
  ) {
    context.getSensorContext().<T>newMeasure().withValue(value).forMetric(metric).on(file).save();
  }

  private void saveCpd(JsTsContext<?> context, List<CpdToken> cpdTokens) {
    if (file.type().equals(InputFile.Type.TEST) || context.isSonarLint()) {
      // even providing empty 'NewCpdTokens' will trigger duplication computation so skipping
      return;
    }
    try {
      NewCpdTokens newCpdTokens = context.getSensorContext().newCpdTokens().onFile(file);
      for (CpdToken cpdToken : cpdTokens) {
        newCpdTokens.addToken(toTextRange(cpdToken.getLocation(), file), cpdToken.getImage());
      }
      newCpdTokens.save();
    } catch (RuntimeException e) {
      LOG.warn(
        "Failed to save CPD token in {}. File will not be analyzed for duplications.",
        file.uri()
      );
      LOG.warn("Exception cause", e);
    }
  }

  void saveIssue(JsTsContext<?> context, Issue issue) {
    var newIssue = context.getSensorContext().newIssue();
    var location = newIssue.newLocation().on(file);
    if (!issue.getMessage().isEmpty()) {
      location.message(issue.getMessage());
    }

    if (issue.hasEndLine() && issue.hasEndColumn()) {
      location.at(
        file.newRange(issue.getLine(), issue.getColumn(), issue.getEndLine(), issue.getEndColumn())
      );
    } else if (issue.getLine() != 0) {
      location.at(file.selectLine(issue.getLine()));
    }

    issue
      .getSecondaryLocationsList()
      .forEach(secondary -> {
        NewIssueLocation newIssueLocation = newSecondaryLocation(file, newIssue, secondary);
        if (newIssueLocation != null) {
          newIssue.addLocation(newIssueLocation);
        }
      });

    if (issue.hasCost()) {
      newIssue.gap(issue.getCost());
    }

    if (!issue.getQuickFixesList().isEmpty()) {
      if (isSqQuickFixCompatible(context)) {
        newIssue.setQuickFixAvailable(true);
      }
      if (isQuickFixCompatible(context)) {
        addQuickFixes(issue, newIssue, file);
      }
    }

    var ruleKey = findRuleKey(issue);
    if (ruleKey != null) {
      newIssue.at(location).forRule(ruleKey).save();
    } else if (CssRules.CSS_PARSING_ERROR_STYLELINT_KEY.equals(issue.getRuleId())) {
      LOG.warn(
        "Failed to parse file {}, line {}, {}",
        file.uri(),
        issue.getLine(),
        issue.getMessage()
      );
    }
  }

  @Nullable
  private RuleKey findRuleKey(Issue issue) {
    if (issue.getLanguage() == AnalysisLanguage.ANALYSIS_LANGUAGE_CSS) {
      return cssRules != null ? cssRules.getActiveSonarKey(issue.getRuleId()) : null;
    }
    var language = toLanguageKey(issue.getLanguage());
    return language == null
      ? null
      : checks.ruleKeyByEslintKey(issue.getRuleId(), Language.of(language));
  }

  private static boolean isSqQuickFixCompatible(JsTsContext<?> context) {
    return (
      context.isSonarQube() &&
      context
        .getSensorContext()
        .runtime()
        .getApiVersion()
        .isGreaterThanOrEqual(Version.create(9, 2))
    );
  }

  private static boolean isQuickFixCompatible(JsTsContext<?> context) {
    return (
      context.isSonarLint() &&
      (
        (SonarLintRuntime) context.getSensorContext().runtime()
      ).getSonarLintPluginApiVersion().isGreaterThanOrEqual(Version.create(6, 3))
    );
  }

  private static boolean isJsTsOrCss(@Nullable String language) {
    return (
      JavaScriptLanguage.KEY.equals(language) ||
      TypeScriptLanguage.KEY.equals(language) ||
      CssLanguage.KEY.equals(language)
    );
  }

  private static int toParsingErrorColumn(@Nullable Integer line, @Nullable Integer column) {
    return line != null && column != null && column >= 0 ? column : 0;
  }

  @Nullable
  private static NewIssueLocation newSecondaryLocation(
    InputFile inputFile,
    NewIssue issue,
    IssueLocation location
  ) {
    NewIssueLocation newIssueLocation = issue.newLocation().on(inputFile);

    if (
      location.hasLine() && location.hasEndLine() && location.hasColumn() && location.hasEndColumn()
    ) {
      newIssueLocation.at(
        inputFile.newRange(
          location.getLine(),
          location.getColumn(),
          location.getEndLine(),
          location.getEndColumn()
        )
      );
      if (location.hasMessage()) {
        newIssueLocation.message(location.getMessage());
      }
      return newIssueLocation;
    }
    return null;
  }

  private static TextRange toTextRange(Location location, InputFile inputFile) {
    return inputFile.newRange(
      location.getStartLine(),
      location.getStartCol(),
      location.getEndLine(),
      location.getEndCol()
    );
  }

  @Nullable
  private static TypeOfText toTypeOfText(TextType textType) {
    return switch (textType) {
      case TEXT_TYPE_CONSTANT -> TypeOfText.CONSTANT;
      case TEXT_TYPE_COMMENT -> TypeOfText.COMMENT;
      case TEXT_TYPE_STRUCTURED_COMMENT -> TypeOfText.STRUCTURED_COMMENT;
      case TEXT_TYPE_KEYWORD -> TypeOfText.KEYWORD;
      case TEXT_TYPE_STRING -> TypeOfText.STRING;
      case TEXT_TYPE_UNSPECIFIED, UNRECOGNIZED -> {
        LOG.debug("Skipping highlight with unsupported text type: {}", textType);
        yield null;
      }
    };
  }

  @Nullable
  private static String toLanguageKey(AnalysisLanguage language) {
    return switch (language) {
      case ANALYSIS_LANGUAGE_JS -> JavaScriptLanguage.KEY;
      case ANALYSIS_LANGUAGE_TS -> TypeScriptLanguage.KEY;
      case ANALYSIS_LANGUAGE_CSS -> CssLanguage.KEY;
      case ANALYSIS_LANGUAGE_UNSPECIFIED, UNRECOGNIZED -> null;
    };
  }
}
