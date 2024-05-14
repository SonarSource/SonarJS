/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.bridge;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.plugins.javascript.CancellationException;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.api.JsFile;
import org.sonar.plugins.javascript.api.JsFileConsumer;
import org.sonar.plugins.javascript.bridge.BridgeServer.TsProgram;
import org.sonar.plugins.javascript.bridge.BridgeServer.TsProgramRequest;
import org.sonar.plugins.javascript.bridge.cache.CacheAnalysis;
import org.sonar.plugins.javascript.bridge.cache.CacheStrategies;
import org.sonar.plugins.javascript.utils.ProgressReport;
import org.sonarsource.api.sonarlint.SonarLintSide;

@ScannerSide
@SonarLintSide
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
  void analyzeFiles(List<InputFile> inputFiles, List<String> tsConfigs, JsFileConsumers consumers) throws IOException {
    progressReport = new ProgressReport(PROGRESS_REPORT_TITLE, PROGRESS_REPORT_PERIOD);
    progressReport.start(inputFiles.size(), inputFiles.iterator().next().toString());
    boolean success = false;
    try {
      Deque<String> workList = new ArrayDeque<>(tsConfigs);
      Set<String> analyzedProjects = new HashSet<>();
      Set<InputFile> analyzedFiles = new HashSet<>();
      while (!workList.isEmpty()) {
        var tsConfig = Path.of(workList.pop()).toString();
        // Use of path.of as it normalizes Unix and Windows paths. Otherwise, project references returned by typescript may not match system slash
        if (!analyzedProjects.add(tsConfig)) {
          LOG.debug("tsconfig.json already analyzed: '{}'. Skipping it.", tsConfig);
          continue;
        }
        LOG.info("Creating TypeScript program");
        LOG.info("TypeScript configuration file {}", tsConfig);
        var program = bridgeServer.createProgram(new TsProgramRequest(tsConfig));
        if (program.error != null) {
          LOG.error("Failed to create program: {}", program.error);
          this.analysisWarnings.addUnique(
              String.format(
                "Failed to create TypeScript program with TSConfig file %s. Highest TypeScript supported version is %s.",
                tsConfig,
                JavaScriptPlugin.TYPESCRIPT_VERSION
              )
            );
          continue;
        }
        if (program.missingTsConfig) {
          String msg =
            "At least one tsconfig.json was not found in the project. Please run 'npm install' for a more complete analysis. Check analysis logs for more details.";
          LOG.warn(msg);
          this.analysisWarnings.addUnique(msg);
        }
        analyzeProgram(program, analyzedFiles, consumers);
        workList.addAll(program.projectReferences);
        bridgeServer.deleteProgram(program);
      }
      Set<InputFile> skippedFiles = new HashSet<>(inputFiles);
      skippedFiles.removeAll(analyzedFiles);
      if (!skippedFiles.isEmpty()) {
        // Temporarily we will analyze skipped programs without program,
        // when this logic moves to Node we will have full analysis also for skipped files
        LOG.info(
          "Found {} file(s) not part of any tsconfig.json: they will be analyzed without type information",
          skippedFiles.size()
        );
        for (var f : skippedFiles) {
          LOG.debug("File not part of any tsconfig.json: {}", f);
          analyze(f, null, consumers);
        }
      }
      consumers.done();
      success = true;
      if (analysisProcessor.parsingErrorFilesCount() > 0) {
        this.analysisWarnings.addUnique(
            String.format(
              "There were parsing errors in %d files while analyzing the project. Check the logs for further details.",
              analysisProcessor.parsingErrorFilesCount()
            )
          );
      }
    } finally {
      if (success) {
        progressReport.stop();
      } else {
        progressReport.cancel();
      }
    }
  }

  private void analyzeProgram(TsProgram program, Set<InputFile> analyzedFiles, JsFileConsumers consumers) throws IOException {
    LOG.info("Starting analysis with current program");
    var fs = context.fileSystem();
    var counter = 0;
    for (var file : program.files) {
      var inputFile = fs.inputFile(fs.predicates().hasAbsolutePath(file));
      if (inputFile == null) {
        LOG.debug("File not part of the project: '{}'", file);
        continue;
      }
      if (analyzedFiles.add(inputFile)) {
        analyze(inputFile, program, consumers);
        counter++;
      } else {
        LOG.debug(
          "File already analyzed: '{}'. Check your project configuration to avoid files being part of multiple projects.",
          file
        );
      }
    }

    LOG.info("Analyzed {} file(s) with current program", counter);
  }

  private void analyze(InputFile file, @Nullable TsProgram tsProgram, JsFileConsumers consumers) throws IOException {
    if (context.isCancelled()) {
      throw new CancellationException(
        "Analysis interrupted because the SensorContext is in cancelled state"
      );
    }
    var cacheStrategy = CacheStrategies.getStrategyFor(context, file);
    if (cacheStrategy.isAnalysisRequired()) {
      try {
        LOG.debug("Analyzing file: {}", file.uri());
        progressReport.nextFile(file.toString());
        var fileContent = contextUtils.shouldSendFileContent(file) ? file.contents() : null;
        var request = getJsAnalysisRequest(file, tsProgram, fileContent);

        var response = isJavaScript(file)
          ? bridgeServer.analyzeJavaScript(request)
          : bridgeServer.analyzeTypeScript(request);

        analysisProcessor.processResponse(context, checks, file, response);
        consumers.consume(new JsFile(file, null, response.ast));
        cacheStrategy.writeAnalysisToCache(
          CacheAnalysis.fromResponse(response.ucfgPaths, response.cpdTokens),
          file
        );
      } catch (IOException e) {
        LOG.error("Failed to get response while analyzing " + file.uri(), e);
        throw e;
      }
    } else {
      LOG.debug("Processing cache analysis of file: {}", file.uri());
      var cacheAnalysis = cacheStrategy.readAnalysisFromCache();
      analysisProcessor.processCacheAnalysis(context, file, cacheAnalysis);
    }
  }

  private BridgeServer.JsAnalysisRequest getJsAnalysisRequest(
    InputFile file,
    @Nullable TsProgram tsProgram,
    @Nullable String fileContent
  ) {
    return new BridgeServer.JsAnalysisRequest(
      file.absolutePath(),
      file.type().toString(),
      inputFileLanguage(file),
      fileContent,
      contextUtils.ignoreHeaderComments(),
      null,
      tsProgram != null ? tsProgram.programId : null,
      analysisMode.getLinterIdFor(file)
    );
  }
}
