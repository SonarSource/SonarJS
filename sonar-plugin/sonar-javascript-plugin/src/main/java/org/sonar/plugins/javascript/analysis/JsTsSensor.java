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
import java.util.List;
import java.util.stream.StreamSupport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.DependedUpon;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.plugins.javascript.JavaScriptFilePredicate;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.api.AnalysisMode;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.external.EslintReportImporter;
import org.sonar.plugins.javascript.external.Issue;

@DependedUpon("js-analysis")
public class JsTsSensor extends AbstractBridgeSensor {

  private final AbstractAnalysis analysis;
  private final JsTsChecks checks;
  private final AnalysisConsumers consumers;
  private static final Logger LOG = LoggerFactory.getLogger(JsTsSensor.class);

  public JsTsSensor(
    JsTsChecks checks,
    BridgeServer bridgeServer,
    AbstractAnalysis analysis,
    AnalysisConsumers consumers
  ) {
    super(bridgeServer, "JS/TS");
    this.checks = checks;
    this.consumers = consumers;
    this.analysis = analysis;
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
    return StreamSupport.stream(
      fileSystem.inputFiles(allFilesPredicate).spliterator(),
      false
    ).toList();
  }

  @Override
  protected List<BridgeServer.Issue> analyzeFiles(List<InputFile> inputFiles) throws IOException {
    bridgeServer.initLinter(
      checks.eslintRules(),
      environments,
      globals,
      context.fileSystem().baseDir().getAbsolutePath(),
      exclusions
    );

    analysis.initialize(context, checks, consumers);
    var msg = contextUtils.getAnalysisMode() == AnalysisMode.SKIP_UNCHANGED
      ? "Files which didn't change will be part of UCFG generation only, other rules will not be executed"
      : "Analysis of unchanged files will not be skipped (current analysis requires all files to be analyzed)";
    LOG.debug(msg);
    var issues = analysis.analyzeFiles(inputFiles);
    consumers.doneAnalysis();

    return issues;
  }

  @Override
  protected List<Issue> getESLintIssues(SensorContext context) {
    var importer = new EslintReportImporter();

    return importer.execute(context);
  }
}
