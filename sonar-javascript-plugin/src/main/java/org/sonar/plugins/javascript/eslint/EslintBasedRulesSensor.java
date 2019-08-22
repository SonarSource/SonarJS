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
import javax.annotation.Nullable;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.notifications.AnalysisWarnings;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.JavaScriptChecks;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.AnalysisRequest;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.AnalysisResponse;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.AnalysisResponseIssue;

public class EslintBasedRulesSensor extends AbstractEslintSensor {

  private static final Logger LOG = Loggers.get(EslintBasedRulesSensor.class);

  /**
   * Required for SonarLint
   */
  public EslintBasedRulesSensor(CheckFactory checkFactory, EslintBridgeServer eslintBridgeServer) {
    this(checkFactory, eslintBridgeServer, null);
  }

  public EslintBasedRulesSensor(CheckFactory checkFactory, EslintBridgeServer eslintBridgeServer, @Nullable AnalysisWarnings analysisWarnings) {
    super(checks(checkFactory), eslintBridgeServer, analysisWarnings);
  }

  private static JavaScriptChecks checks(CheckFactory checkFactory) {
    return JavaScriptChecks.createJavaScriptCheck(checkFactory).addChecks(CheckList.REPOSITORY_KEY, CheckList.getChecks());
  }

  @Override
  protected void analyze(InputFile file, SensorContext context) {
    if (file.filename().endsWith(".vue")) {
      LOG.debug("Skipping analysis of Vue.js file {}", file.uri());
      return;
    }
    AnalysisRequest analysisRequest = new AnalysisRequest(file, rules);
    try {
      AnalysisResponse response = eslintBridgeServer.call(analysisRequest);
      for (AnalysisResponseIssue issue : response.issues) {
        new EslintIssue(issue).saveIssue(context, file, checks);
      }
    } catch (IOException e) {
      LOG.error("Failed to get response while analyzing " + file.uri(), e);
    }
  }

  @Override
  protected Iterable<InputFile> getInputFiles(SensorContext sensorContext) {
    FileSystem fileSystem = sensorContext.fileSystem();
    FilePredicate mainFilePredicate = sensorContext.fileSystem().predicates().and(
      fileSystem.predicates().hasType(InputFile.Type.MAIN),
      fileSystem.predicates().hasLanguage(JavaScriptLanguage.KEY));
    return fileSystem.inputFiles(mainFilePredicate);
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor
      .onlyOnLanguage(JavaScriptLanguage.KEY)
      .name("ESLint-based SonarJS")
      .onlyOnFileType(Type.MAIN);
  }

}
