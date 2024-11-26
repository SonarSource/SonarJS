/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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

import static org.sonar.plugins.javascript.analysis.TsConfigProvider.getTsConfigs;

import java.io.IOException;
import java.util.List;
import java.util.stream.StreamSupport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.DependedUpon;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.plugins.javascript.JavaScriptFilePredicate;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.bridge.AnalysisMode;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.sonarlint.TsConfigCache;

@DependedUpon("js-analysis")
public class JsTsSensor extends AbstractBridgeSensor {

  private static final Logger LOG = LoggerFactory.getLogger(JsTsSensor.class);
  private final AnalysisWithProgram analysisWithProgram;
  private final AnalysisWithWatchProgram analysisWithWatchProgram;
  private final JsTsChecks checks;
  private final AnalysisConsumers consumers;
  private final TsConfigCache tsConfigCache;

  public JsTsSensor(
    JsTsChecks checks,
    BridgeServer bridgeServer,
    AnalysisWithProgram analysisWithProgram,
    AnalysisWithWatchProgram analysisWithWatchProgram,
    AnalysisConsumers consumers
  ) {
    super(bridgeServer, "JS/TS");
    this.analysisWithProgram = analysisWithProgram;
    this.analysisWithWatchProgram = analysisWithWatchProgram;
    this.checks = checks;
    this.consumers = consumers;
    this.tsConfigCache = analysisWithWatchProgram.tsConfigCache;
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor
      .onlyOnLanguages(JavaScriptLanguage.KEY, TypeScriptLanguage.KEY)
      .name("JavaScript/TypeScript analysis");
  }

  @Override
  protected List<InputFile> getInputFiles() {
    FileSystem fileSystem = context.fileSystem();
    FilePredicate allFilesPredicate = JavaScriptFilePredicate.getJsTsPredicate(fileSystem);
    return StreamSupport
      .stream(fileSystem.inputFiles(allFilesPredicate).spliterator(), false)
      .toList();
  }

  @Override
  protected void analyzeFiles(List<InputFile> inputFiles) throws IOException {
    var analysisMode = AnalysisMode.getMode(context);
    bridgeServer.initLinter(
      checks.eslintRules(),
      environments,
      globals,
      analysisMode,
      context.fileSystem().baseDir().getAbsolutePath(),
      exclusions
    );

    var tsConfigs = getTsConfigs(
      contextUtils,
      this::createTsConfigFile,
      tsConfigCache
    );
    AbstractAnalysis analysis;
    if (shouldAnalyzeWithProgram()) {
      analysis = analysisWithProgram;
    } else {
      analysis = analysisWithWatchProgram;
    }
    if (tsConfigs.isEmpty()) {
      LOG.info("No tsconfig.json file found");
    }
    analysis.initialize(context, checks, analysisMode, consumers);
    analysis.analyzeFiles(inputFiles, tsConfigs);
    consumers.doneAnalysis();
  }

  private String createTsConfigFile(String content) throws IOException {
    return bridgeServer.createTsConfigFile(content).getFilename();
  }
}
