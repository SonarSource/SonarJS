/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import javax.annotation.Nullable;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.batch.sensor.highlighting.NewHighlighting;
import org.sonar.api.batch.sensor.highlighting.TypeOfText;
import org.sonar.api.notifications.AnalysisWarnings;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.JavaScriptChecks;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.AnalysisResponse;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.AnalysisResponseHighlight;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.AnalysisResponseIssue;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.TypeScriptAnalysisRequest;

public class TypeScriptSensor extends AbstractEslintSensor {

  private static final Logger LOG = Loggers.get(TypeScriptSensor.class);
  private List<String> tsconfigs;

  /**
   * Required for SonarLint
   */
  public TypeScriptSensor(CheckFactory checkFactory, EslintBridgeServer eslintBridgeServer) {
    this(checkFactory, eslintBridgeServer, null);
  }

  public TypeScriptSensor(CheckFactory checkFactory, EslintBridgeServer eslintBridgeServer, @Nullable AnalysisWarnings analysisWarnings) {
    super(checks(checkFactory), eslintBridgeServer, analysisWarnings);
  }

  private static JavaScriptChecks checks(CheckFactory checkFactory) {
    return JavaScriptChecks.createJavaScriptChecks(checkFactory)
      .addChecks(CheckList.TS_REPOSITORY_KEY, CheckList.getTypeScriptChecks());
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor
      .onlyOnLanguage(TypeScriptLanguage.KEY)
      .name("ESLint-based TypeScript analysis")
      .onlyOnFileType(Type.MAIN);
  }

  @Override
  protected Iterable<InputFile> getInputFiles(SensorContext sensorContext) {
    FileSystem fileSystem = sensorContext.fileSystem();
    FilePredicate mainFilePredicate = sensorContext.fileSystem().predicates().and(
      fileSystem.predicates().hasType(InputFile.Type.MAIN),
      fileSystem.predicates().hasLanguage(TypeScriptLanguage.KEY));
    return fileSystem.inputFiles(mainFilePredicate);
  }

  @Override
  protected void analyze(InputFile file, SensorContext context) {
    try {
      TypeScriptAnalysisRequest request = new TypeScriptAnalysisRequest(file, rules, tsConfigs(context));
      AnalysisResponse response = eslintBridgeServer.analyzeTypeScript(request);
      saveIssues(file, context, response.issues);
      saveHighlights(file, context, response.highlights);
    } catch (IOException e) {
      LOG.error("Failed to get response while analyzing " + file, e);
    }
  }

  private void saveIssues(InputFile file, SensorContext context, AnalysisResponseIssue[] issues) {
    for (AnalysisResponseIssue issue : issues) {
      new EslintBasedIssue(issue).saveIssue(context, file, checks);
    }
  }

  private static void saveHighlights(InputFile file, SensorContext context, AnalysisResponseHighlight[] highlights) {
    NewHighlighting highlighting = context.newHighlighting().onFile(file);
    for (AnalysisResponseHighlight highlight : highlights) {
      highlighting.highlight(highlight.startLine, highlight.startCol, highlight.endLine, highlight.endCol,
        TypeOfText.valueOf(highlight.textType.toUpperCase(Locale.ENGLISH)));
    }
    highlighting.save();
  }

  private List<String> tsConfigs(SensorContext context) {
    if (tsconfigs == null) {
      FileSystem fs = context.fileSystem();
      tsconfigs = new ArrayList<>();
      fs.inputFiles(fs.predicates().hasRelativePath("tsconfig.json")).forEach(file -> tsconfigs.add(file.absolutePath()));
    }
    return tsconfigs;
  }
}
