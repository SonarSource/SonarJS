/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import org.sonar.api.SonarProduct;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.Sensor;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.CancellationException;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonarsource.nodejs.NodeCommandException;

public abstract class AbstractEslintSensor implements Sensor {

  private static final Logger LOG = Loggers.get(AbstractEslintSensor.class);

  protected final EslintBridgeServer eslintBridgeServer;
  private final AnalysisWarningsWrapper analysisWarnings;

  final Monitoring monitoring;
  List<String> environments;
  List<String> globals;

  protected SensorContext context;
  protected boolean failFast;

  protected AbstractEslintSensor(EslintBridgeServer eslintBridgeServer,
                                 AnalysisWarningsWrapper analysisWarnings, Monitoring monitoring) {
    this.eslintBridgeServer = eslintBridgeServer;
    this.analysisWarnings = analysisWarnings;
    this.monitoring = monitoring;
  }

  @Override
  public void execute(SensorContext context) {
    monitoring.startSensor(context, this);
    this.context = context;
    failFast = context.config().getBoolean("sonar.internal.analysis.failFast").orElse(false);
    environments = Arrays.asList(context.config().getStringArray(JavaScriptPlugin.ENVIRONMENTS));
    globals = Arrays.asList(context.config().getStringArray(JavaScriptPlugin.GLOBALS));
    try {
      List<InputFile> inputFiles = getInputFiles();
      if (inputFiles.isEmpty()) {
        LOG.info("No input files found for analysis");
        return;
      }
      eslintBridgeServer.startServerLazily(context);
      analyzeFiles(inputFiles);
    } catch (CancellationException e) {
      // do not propagate the exception
      LOG.info(e.toString());
    } catch (ServerAlreadyFailedException e) {
      LOG.debug("Skipping the start of eslint-bridge server " +
        "as it failed to start during the first analysis or it's not answering anymore");
      LOG.debug("No rules will be executed");

    } catch (NodeCommandException | MissingTypeScriptException e) {
      logErrorOrWarn(e.getMessage(), e);
      analysisWarnings.addUnique("JavaScript/TypeScript/CSS rules were not executed. " + e.getMessage());
      if (failFast) {
        throw new IllegalStateException("Analysis failed (\"sonar.internal.analysis.failFast\"=true)", e);
      }
    } catch (Exception e) {
      LOG.error("Failure during analysis, " + eslintBridgeServer.getCommandInfo(), e);
      if (failFast) {
        throw new IllegalStateException("Analysis failed (\"sonar.internal.analysis.failFast\"=true)", e);
      }
    } finally {
      monitoring.stopSensor();
    }
  }

  protected void logErrorOrWarn(String msg, Throwable e) {
    LOG.error(msg, e);
  }

  protected abstract void analyzeFiles(List<InputFile> inputFiles) throws IOException;

  protected abstract List<InputFile> getInputFiles();

  boolean shouldSendFileContent(InputFile file) {
    return isSonarLint() || !StandardCharsets.UTF_8.equals(file.charset());
  }

  boolean isSonarLint() {
    return context.runtime().getProduct() == SonarProduct.SONARLINT;
  }

  static void logMissingTypescript() {
    LOG.error("TypeScript dependency was not found and it is required for analysis.");
    LOG.error("Install TypeScript in the project directory or use NODE_PATH env. variable to set TypeScript " +
      "location, if it's located outside of project directory.");
  }
}

