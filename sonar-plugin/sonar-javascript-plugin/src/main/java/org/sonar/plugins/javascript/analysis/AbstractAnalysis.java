/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
package org.sonar.plugins.javascript.analysis;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.plugins.javascript.CancellationException;
import org.sonar.plugins.javascript.analysis.cache.CacheAnalysis;
import org.sonar.plugins.javascript.analysis.cache.CacheStrategies;
import org.sonar.plugins.javascript.api.JsFile;
import org.sonar.plugins.javascript.api.estree.ESTree;
import org.sonar.plugins.javascript.bridge.AnalysisWarningsWrapper;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.bridge.BridgeServer.TsProgram;
import org.sonar.plugins.javascript.bridge.ESTreeFactory;
import org.sonar.plugins.javascript.bridge.protobuf.Node;
import org.sonar.plugins.javascript.utils.ProgressReport;

public abstract class AbstractAnalysis {

  private static final Logger LOG = LoggerFactory.getLogger(AbstractAnalysis.class);
  static final String PROGRESS_REPORT_TITLE = "Progress of JavaScript/TypeScript analysis";
  static final long PROGRESS_REPORT_PERIOD = TimeUnit.SECONDS.toMillis(10);

  final BridgeServer bridgeServer;
  final AnalysisProcessor analysisProcessor;
  JsTsContext<?> context;
  JsTsChecks checks;
  ProgressReport progressReport;
  protected final AnalysisWarningsWrapper analysisWarnings;
  private AnalysisConsumers consumers;

  AbstractAnalysis(
    BridgeServer bridgeServer,
    AnalysisProcessor analysisProcessor,
    AnalysisWarningsWrapper analysisWarnings
  ) {
    this.bridgeServer = bridgeServer;
    this.analysisProcessor = analysisProcessor;
    this.analysisWarnings = analysisWarnings;
  }

  void initialize(JsTsContext<?> context, JsTsChecks checks, AnalysisConsumers consumers) {
    LOG.debug("Initializing {}", getClass().getName());
    this.context = context;
    this.checks = checks;
    this.consumers = consumers;
  }

  abstract List<BridgeServer.Issue> analyzeFiles(List<InputFile> inputFiles) throws IOException;

  protected List<BridgeServer.Issue> analyzeFile(
    InputFile file,
    @Nullable List<String> tsConfigs,
    @Nullable TsProgram tsProgram,
    boolean dirtyPackageJSONCache
  ) throws IOException {
    List<BridgeServer.Issue> issues = new ArrayList<>();

    if (context.getSensorContext().isCancelled()) {
      throw new CancellationException(
        "Analysis interrupted because the SensorContext is in cancelled state"
      );
    }
    var cacheStrategy = CacheStrategies.getStrategyFor(context, file, context.skipAst(consumers));
    if (cacheStrategy.isAnalysisRequired()) {
      try {
        LOG.debug("Analyzing file: {}", file.uri());
        progressReport.nextFile(file.toString());
        var fileContent = context.shouldSendFileContent(file) ? file.contents() : null;
        var request = getJsAnalysisRequest(
          file,
          fileContent,
          tsProgram,
          tsConfigs,
          context.skipAst(consumers),
          dirtyPackageJSONCache
        );

        var response = bridgeServer.analyzeJsTs(request);

        issues = analysisProcessor.processResponse(context, checks, file, response);
        cacheStrategy.writeAnalysisToCache(
          CacheAnalysis.fromResponse(response.ucfgPaths(), response.cpdTokens(), response.ast()),
          file
        );
        acceptAstResponse(response.ast(), file);
      } catch (Exception e) {
        LOG.error("Failed to get response while analyzing " + file.uri(), e);
        throw e;
      }
    } else {
      LOG.debug("Processing cache analysis of file: {}", file.uri());
      var cacheAnalysis = cacheStrategy.readAnalysisFromCache();
      analysisProcessor.processCacheAnalysis(context, file, cacheAnalysis);
      // Also provide AST to consumers when using cached analysis
      acceptAstResponse(cacheAnalysis.getAst(), file);
    }

    return issues;
  }

  private void acceptAstResponse(@Nullable Node responseAst, InputFile file) {
    if (responseAst != null) {
      // When we haven't serialized the AST:
      // either because no consumer is listening
      // or the file extension or AST nodes are unsupported
      try {
        ESTree.Program program = ESTreeFactory.from(responseAst, ESTree.Program.class);
        consumers.accept(new JsFile(file, program));
      } catch (Exception e) {
        LOG.debug("Failed to deserialize AST for file: {}", file.uri(), e);
      }
    }
  }

  private BridgeServer.JsAnalysisRequest getJsAnalysisRequest(
    InputFile file,
    @Nullable String fileContent,
    @Nullable TsProgram tsProgram,
    @Nullable List<String> tsConfigs,
    boolean skipAst,
    boolean shouldClearDependenciesCache
  ) {
    return new BridgeServer.JsAnalysisRequest(
      file.absolutePath(),
      file.type().toString(),
      fileContent,
      context.ignoreHeaderComments(),
      tsConfigs,
      tsProgram != null ? tsProgram.programId() : null,
      file.status(),
      context.getAnalysisMode(),
      skipAst,
      shouldClearDependenciesCache,
      context.isSonarLint(),
      context.allowTsParserJsFiles()
    );
  }

  protected String createTsConfigFile(String content) throws IOException {
    return bridgeServer.createTsConfigFile(content).getFilename();
  }
}
