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
import java.util.HashMap;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.plugins.javascript.CancellationException;
import org.sonar.plugins.javascript.analysis.cache.CacheAnalysis;
import org.sonar.plugins.javascript.analysis.cache.CacheStrategies;
import org.sonar.plugins.javascript.analysis.cache.CacheStrategy;
import org.sonar.plugins.javascript.bridge.AnalysisWarningsWrapper;
import org.sonar.plugins.javascript.bridge.BridgeServer;

@ScannerSide
public class AnalysisWithProgram extends AbstractAnalysis {

  private static final Logger LOG = LoggerFactory.getLogger(AnalysisWithProgram.class);

  public AnalysisWithProgram(
    BridgeServer bridgeServer,
    AnalysisProcessor analysisProcessor,
    AnalysisWarningsWrapper analysisWarnings
  ) {
    super(bridgeServer, analysisProcessor, analysisWarnings);
  }

  @Override
  public void analyzeFiles(List<InputFile> inputFiles) throws IOException {
    if (context.isCancelled()) {
      throw new CancellationException(
        "Analysis interrupted because the SensorContext is in cancelled state"
      );
    }
    var filesToAnalyze = new ArrayList<InputFile>();
    var fileToInputFile = new HashMap<String, InputFile>();
    var fileToCacheStrategy = new HashMap<String, CacheStrategy>();
    for (InputFile inputFile : inputFiles) {
      var cacheStrategy = CacheStrategies.getStrategyFor(context, inputFile);
      if (cacheStrategy.isAnalysisRequired()) {
        filesToAnalyze.add(inputFile);
        fileToInputFile.put(inputFile.absolutePath(), inputFile);
        fileToCacheStrategy.put(inputFile.absolutePath(), cacheStrategy);
      } else {
        LOG.debug("Processing cache analysis of file: {}", inputFile.uri());
        var cacheAnalysis = cacheStrategy.readAnalysisFromCache();
        analysisProcessor.processCacheAnalysis(context, inputFile, cacheAnalysis);
      }
    }
    var skipAst =
      !consumers.hasConsumers() ||
      !(contextUtils.isSonarArmorEnabled() ||
        contextUtils.isSonarJasminEnabled() ||
        contextUtils.isSonarJaredEnabled());

    var files = new HashMap<String, BridgeServer.JsTsFile>();
    for (InputFile file : filesToAnalyze) {
      files.put(
        file.absolutePath(),
        new BridgeServer.JsTsFile(
          contextUtils.shouldSendFileContent(file) ? file.contents() : null,
          contextUtils.ignoreHeaderComments(),
          file.type().toString(),
          inputFileLanguage(file)
        )
      );
    }
    var request = new BridgeServer.ProjectAnalysisRequest(
      files,
      checks.eslintRules(),
      environments,
      globals,
      context.fileSystem().baseDir().getAbsolutePath(),
      exclusions,
      false,
      null,
      skipAst
    );
    try {
      var projectResponse = bridgeServer.analyzeProject(request);
      for (var entry : projectResponse.files().entrySet()) {
        var filePath = entry.getKey();
        var response = entry.getValue();
        var file = fileToInputFile.get(filePath);
        var cacheStrategy = fileToCacheStrategy.get(filePath);
        analysisProcessor.processResponse(context, checks, file, response);
        cacheStrategy.writeAnalysisToCache(
          CacheAnalysis.fromResponse(response.ucfgPaths(), response.cpdTokens()),
          file
        );
        acceptAstResponse(response, file);
      }
      new PluginTelemetry(context, bridgeServer).reportTelemetry();
    } catch (Exception e) {
      LOG.error("Failed to get response from analysis", e);
      throw e;
    }
  }
}
