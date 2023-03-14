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

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.utils.TempFolder;
import org.sonar.plugins.javascript.JavaScriptFilePredicate;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptLanguage;

public class TypeScriptSensor extends AbstractEslintSensor {

  private final TempFolder tempFolder;
  private final AnalysisWithProgram analysisWithProgram;
  private final AnalysisWithWatchProgram analysisWithWatchProgram;
  private final TypeScriptChecks checks;

  public TypeScriptSensor(
    TypeScriptChecks typeScriptChecks,
    EslintBridgeServer eslintBridgeServer,
    AnalysisWarningsWrapper analysisWarnings,
    TempFolder tempFolder,
    Monitoring monitoring,
    AnalysisWithProgram analysisWithProgram,
    AnalysisWithWatchProgram analysisWithWatchProgram
  ) {
    super(eslintBridgeServer, analysisWarnings, monitoring);
    this.tempFolder = tempFolder;
    this.analysisWithProgram = analysisWithProgram;
    this.analysisWithWatchProgram = analysisWithWatchProgram;
    checks = typeScriptChecks;
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor
      // JavaScriptLanguage.KEY is required for Vue single file components, bc .vue is considered as JS language
      .onlyOnLanguages(JavaScriptLanguage.KEY, TypeScriptLanguage.KEY)
      .name("TypeScript analysis");
  }

  @Override
  protected List<InputFile> getInputFiles() {
    FileSystem fileSystem = context.fileSystem();
    FilePredicate allFilesPredicate = JavaScriptFilePredicate.getTypeScriptPredicate(fileSystem);
    return StreamSupport
      .stream(fileSystem.inputFiles(allFilesPredicate).spliterator(), false)
      .collect(Collectors.toList());
  }

  @Override
  protected void analyzeFiles(List<InputFile> inputFiles) throws IOException {
    var analysisMode = AnalysisMode.getMode(context, checks.eslintRules());
    eslintBridgeServer.initLinter(checks.eslintRules(), environments, globals, analysisMode);

    var analysis = shouldAnalyzeWithProgram(inputFiles)
      ? analysisWithProgram
      : analysisWithWatchProgram;
    analysis.initialize(context, checks, analysisMode, tempFolder);
    analysis.analyzeFiles(inputFiles);
  }

  private boolean shouldAnalyzeWithProgram(List<InputFile> inputFiles) {
    return (
      inputFiles.stream().noneMatch(f -> f.filename().endsWith(".vue")) &&
      !contextUtils.isSonarLint()
    );
  }
}
