/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
package org.sonar.plugins.javascript.bridge;

import static org.sonarsource.api.sonarlint.SonarLintSide.INSTANCE;

import java.io.IOException;
import java.io.InputStreamReader;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.annotation.Nullable;
import org.sonar.api.Startable;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.TextRange;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.api.utils.Version;
import org.sonar.plugins.javascript.api.AnalysisMode;
import org.sonar.plugins.javascript.bridge.protobuf.Node;
import org.sonarsource.api.sonarlint.SonarLintSide;

@ScannerSide
@SonarLintSide(lifespan = INSTANCE)
public interface BridgeServer extends Startable {
  void startServerLazily(BridgeServerConfig context) throws IOException;

  void initLinter(
    List<EslintRule> rules,
    List<String> environments,
    List<String> globals,
    String baseDir,
    boolean sonarlint
  ) throws IOException;

  AnalysisResponse analyzeJsTs(JsAnalysisRequest request) throws IOException;

  void clean() throws InterruptedException;

  String getCommandInfo();

  boolean isAlive();

  TelemetryData getTelemetry();

  record InitLinterRequest(
    List<EslintRule> rules,
    List<String> environments,
    List<String> globals,
    String baseDir,
    boolean sonarlint,
    List<String> bundles,
    String rulesWorkdir
  ) {}

  void analyzeProject(WebSocketMessageHandler<ProjectAnalysisRequest> handler);

  record ProjectAnalysisOutputDTO(
    Map<String, AnalysisResponseDTO> files,
    ProjectAnalysisMetaResponse meta
  ) {}

  record JsAnalysisRequest(
    String filePath,
    String fileType,
    @Nullable String fileContent,
    boolean ignoreHeaderComments,
    @Nullable List<String> tsConfigs,
    @Nullable String programId,
    InputFile.Status fileStatus,
    AnalysisMode analysisMode,
    boolean skipAst,
    boolean shouldClearDependenciesCache,
    boolean sonarlint,
    boolean allowTsParserJsFiles,
    @Nullable ProjectAnalysisConfiguration configuration
  ) {
    public JsAnalysisRequest(
      String filePath,
      String fileType,
      @Nullable String fileContent,
      boolean ignoreHeaderComments,
      @Nullable List<String> tsConfigs,
      @Nullable String programId,
      InputFile.Status fileStatus,
      AnalysisMode analysisMode,
      boolean skipAst,
      boolean shouldClearDependenciesCache,
      boolean sonarlint,
      boolean allowTsParserJsFiles
    ) {
      this(
        filePath,
        fileType,
        fileContent,
        ignoreHeaderComments,
        tsConfigs,
        programId,
        fileStatus,
        analysisMode,
        skipAst,
        shouldClearDependenciesCache,
        sonarlint,
        allowTsParserJsFiles,
        null
      );
    }
  }

  record JsTsFile(
    String filePath,
    String fileType,
    InputFile.Status fileStatus,
    @Nullable String fileContent
  ) {}

  class ProjectAnalysisRequest {

    private Map<String, JsTsFile> files;
    private List<EslintRule> rules;
    public ProjectAnalysisConfiguration configuration;
    private List<String> bundles;
    private String rulesWorkdir;
    private List<StylelintRule> cssRules;

    public ProjectAnalysisRequest(
      Map<String, JsTsFile> files,
      List<EslintRule> rules,
      ProjectAnalysisConfiguration configuration
    ) {
      this.files = files;
      this.rules = rules;
      this.configuration = configuration;
    }

    public Map<String, JsTsFile> getFiles() {
      return files;
    }

    public ProjectAnalysisConfiguration getConfiguration() {
      return configuration;
    }

    public void setBundles(List<String> bundles) {
      this.bundles = bundles;
    }

    public void setRulesWorkdir(String rulesWorkdir) {
      this.rulesWorkdir = rulesWorkdir;
    }

    public List<StylelintRule> getCssRules() {
      return cssRules;
    }

    public void setCssRules(List<StylelintRule> cssRules) {
      this.cssRules = cssRules;
    }
  }

  class ProjectAnalysisConfiguration {

    String baseDir;
    boolean sonarlint;
    Map<String, String> fsEvents;
    boolean allowTsParserJsFiles;
    AnalysisMode analysisMode;
    Boolean skipAst;
    boolean ignoreHeaderComments;
    long maxFileSize;
    List<String> environments;
    List<String> globals;
    List<String> tsSuffixes;
    List<String> jsSuffixes;
    List<String> cssSuffixes;
    Set<String> tsConfigPaths;
    List<String> jsTsExclusions;
    List<String> sources;
    List<String> inclusions;
    List<String> exclusions;
    List<String> tests;
    List<String> testInclusions;
    List<String> testExclusions;
    boolean detectBundles;
    boolean canAccessFileSystem;
    boolean createTSProgramForOrphanFiles;
    boolean disableTypeChecking;

    /*
    We do not set sources, inclusions, exclusions, tests, testInclusions nor testExclusions as Sonar Engine
    already implements the filtering logic, and we use the Sonar FS API to pass the list of files to analyze to Node.js.
    This logic is also implemented in Node and used by ruling tests. If we were to use the logic in Node, (by not
    sending the list of files and only send the baseDir), we would need to pass those properties to Node using:
      this.sources = analysisConfiguration.getSources();
      this.inclusions = analysisConfiguration.getInclusions();
      this.exclusions = analysisConfiguration.getExclusions();
      this.tests = analysisConfiguration.getTests();
      this.testInclusions = analysisConfiguration.getTestInclusions();
      this.testExclusions = analysisConfiguration.getTestExclusions();
     */
    public ProjectAnalysisConfiguration(
      String baseDir,
      AnalysisConfiguration analysisConfiguration
    ) {
      this.baseDir = baseDir;
      this.sonarlint = analysisConfiguration.isSonarLint();
      this.fsEvents = Map.of();
      this.allowTsParserJsFiles = analysisConfiguration.allowTsParserJsFiles();
      this.analysisMode = analysisConfiguration.getAnalysisMode();
      this.skipAst = true;
      this.ignoreHeaderComments = analysisConfiguration.ignoreHeaderComments();
      this.maxFileSize = analysisConfiguration.getMaxFileSizeProperty();
      this.environments = analysisConfiguration.getEnvironments();
      this.globals = analysisConfiguration.getGlobals();
      this.tsSuffixes = analysisConfiguration.getTsExtensions();
      this.jsSuffixes = analysisConfiguration.getJsExtensions();
      this.cssSuffixes = analysisConfiguration.getCssExtensions();
      this.tsConfigPaths = analysisConfiguration.getTsConfigPaths();
      this.jsTsExclusions = analysisConfiguration.getJsTsExcludedPaths();
      this.detectBundles = analysisConfiguration.shouldDetectBundles();
      this.canAccessFileSystem = analysisConfiguration.canAccessFileSystem();
      this.createTSProgramForOrphanFiles =
        analysisConfiguration.shouldCreateTSProgramForOrphanFiles();
      this.disableTypeChecking = analysisConfiguration.shouldDisableTypeChecking();
    }

    public boolean skipAst() {
      return skipAst;
    }

    public boolean createTSProgramForOrphanFiles() {
      return createTSProgramForOrphanFiles;
    }

    public boolean disableTypeChecking() {
      return disableTypeChecking;
    }

    public void setSkipAst(boolean skipAst) {
      this.skipAst = skipAst;
    }

    public void setFsEvents(Map<String, String> fsEvents) {
      this.fsEvents = fsEvents;
    }
  }

  record ProjectAnalysisMetaResponse(List<String> warnings) {
    public ProjectAnalysisMetaResponse() {
      this(List.of());
    }
  }

  record BridgeResponse(InputStreamReader reader) {}

  record AnalysisResponseDTO(
    @Nullable ParsingError parsingError,
    List<Issue> issues,
    List<Highlight> highlights,
    List<HighlightedSymbol> highlightedSymbols,
    Metrics metrics,
    List<CpdToken> cpdTokens,
    @Nullable String ast
  ) {}

  record AnalysisResponse(
    @Nullable ParsingError parsingError,
    List<Issue> issues,
    List<Highlight> highlights,
    List<HighlightedSymbol> highlightedSymbols,
    Metrics metrics,
    List<CpdToken> cpdTokens,
    @Nullable Node ast
  ) {
    public AnalysisResponse() {
      this(null, List.of(), List.of(), List.of(), new Metrics(), List.of(), null);
    }

    public AnalysisResponse(
      @Nullable ParsingError parsingError,
      @Nullable List<Issue> issues,
      @Nullable List<Highlight> highlights,
      @Nullable List<HighlightedSymbol> highlightedSymbols,
      @Nullable Metrics metrics,
      @Nullable List<CpdToken> cpdTokens,
      @Nullable Node ast
    ) {
      this.parsingError = parsingError;
      this.issues = issues != null ? issues : List.of();
      this.highlights = highlights != null ? highlights : List.of();
      this.highlightedSymbols = highlightedSymbols != null ? highlightedSymbols : List.of();
      this.metrics = metrics != null ? metrics : new Metrics();
      this.cpdTokens = cpdTokens != null ? cpdTokens : List.of();
      this.ast = ast;
    }

    public static AnalysisResponse fromDTO(AnalysisResponseDTO analysisResponseDTO) {
      Node ast = null;
      if (analysisResponseDTO.ast != null) {
        try {
          ast = AstProtoUtils.parseProtobuf(analysisResponseDTO.ast);
        } catch (IOException e) {
          throw new IllegalStateException("Failed to parse protobuf", e);
        }
      }
      return new AnalysisResponse(
        analysisResponseDTO.parsingError,
        analysisResponseDTO.issues,
        analysisResponseDTO.highlights,
        analysisResponseDTO.highlightedSymbols,
        analysisResponseDTO.metrics,
        analysisResponseDTO.cpdTokens,
        ast
      );
    }
  }

  record ParsingError(String message, Integer line, ParsingErrorCode code) {}

  enum ParsingErrorCode {
    PARSING,
    FAILING_TYPESCRIPT,
    GENERAL_ERROR,
  }

  record Issue(
    Integer line,
    Integer column,
    Integer endLine,
    Integer endColumn,
    String message,
    String ruleId,
    String language,
    List<IssueLocation> secondaryLocations,
    Double cost,
    List<QuickFix> quickFixes,
    List<String> ruleESLintKeys,
    String filePath
  ) {}

  record QuickFix(String message, List<QuickFixEdit> edits) {}

  record QuickFixEdit(String text, IssueLocation loc) {}

  record IssueLocation(
    Integer line,
    Integer column,
    Integer endLine,
    Integer endColumn,
    String message
  ) {}

  record Highlight(Location location, String textType) {}

  record HighlightedSymbol(Location declaration, List<Location> references) {}

  record Location(int startLine, int startCol, int endLine, int endCol) {
    public TextRange toTextRange(InputFile inputFile) {
      return inputFile.newRange(this.startLine, this.startCol, this.endLine, this.endCol);
    }

    @Override
    public String toString() {
      return String.format("%d:%d-%d:%d", startLine, startCol, endLine, endCol);
    }
  }

  record Metrics(
    List<Integer> ncloc,
    List<Integer> commentLines,
    List<Integer> nosonarLines,
    List<Integer> executableLines,
    int functions,
    int statements,
    int classes,
    int complexity,
    int cognitiveComplexity
  ) {
    // Defensive null-guarding: if the bridge JSON has a metrics object but
    // omits some list fields, Gson passes null to the canonical constructor.
    public Metrics {
      ncloc = ncloc != null ? ncloc : List.of();
      commentLines = commentLines != null ? commentLines : List.of();
      nosonarLines = nosonarLines != null ? nosonarLines : List.of();
      executableLines = executableLines != null ? executableLines : List.of();
    }

    public Metrics() {
      this(List.of(), List.of(), List.of(), List.of(), 0, 0, 0, 0, 0);
    }
  }

  record CpdToken(Location location, String image) {}

  record TelemetryData(@Nullable RuntimeTelemetry runtimeTelemetry) {}

  record RuntimeTelemetry(Version version, String nodeExecutableOrigin) {}
}
