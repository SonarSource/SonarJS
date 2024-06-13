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
package org.sonar.plugins.javascript.analysis;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.Sensor;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.plugins.javascript.CancellationException;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.analysis.cache.CacheStrategies;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.bridge.BridgeServerConfig;
import org.sonar.plugins.javascript.bridge.ServerAlreadyFailedException;
import org.sonar.plugins.javascript.nodejs.NodeCommandException;
import org.sonar.plugins.javascript.utils.Exclusions;

import static org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl.NODE_EXECUTABLE_PROPERTY;

public abstract class AbstractBridgeSensor implements Sensor {

  private static final Logger LOG = LoggerFactory.getLogger(AbstractBridgeSensor.class);

  protected final String lang;
  protected final BridgeServer bridgeServer;
  protected List<String> exclusions;
  List<String> environments;
  List<String> globals;

  protected SensorContext context;
  protected ContextUtils contextUtils;

  protected AbstractBridgeSensor(
    BridgeServer bridgeServer,
    String lang
  ) {
    this.bridgeServer = bridgeServer;
    this.lang = lang;
  }

  @Override
  public void execute(SensorContext context) {
    CacheStrategies.reset();
    this.context = context;
    this.exclusions = Arrays.asList(Exclusions.getExcludedPaths(context.config()));
    this.contextUtils = new ContextUtils(context);
    environments = Arrays.asList(context.config().getStringArray(JavaScriptPlugin.ENVIRONMENTS));
    globals = Arrays.asList(context.config().getStringArray(JavaScriptPlugin.GLOBALS));
    try {
      List<InputFile> inputFiles = getInputFiles();
      if (inputFiles.isEmpty()) {
        LOG.info("No input files found for analysis");
        return;
      }
      bridgeServer.startServerLazily(BridgeServerConfig.fromSensorContext(context));
      analyzeFiles(inputFiles);
    } catch (CancellationException e) {
      // do not propagate the exception
      LOG.info(e.toString());
    } catch (ServerAlreadyFailedException e) {
      LOG.debug(
        "Skipping the start of the bridge server " +
        "as it failed to start during the first analysis or it's not answering anymore"
      );
      LOG.debug("No rules will be executed");
    } catch (NodeCommandException e) {
      logErrorOrWarn(e.getMessage(), e);
      throw new IllegalStateException(
        "Error while running Node.js. A supported version of Node.js is required for running the analysis of " +
        this.lang +
        " files. Please make sure a supported version of Node.js is available in the PATH or an executable path is provided via '" +
        NODE_EXECUTABLE_PROPERTY +
        "' property. Alternatively, you can exclude " +
        this.lang +
        " files from your analysis using the 'sonar.exclusions' configuration property. " +
        "See the docs for configuring the analysis environment: https://docs.sonarsource.com/sonarqube/latest/analyzing-source-code/languages/javascript-typescript-css/",
        e
      );
    } catch (Exception e) {
      LOG.error("Failure during analysis", e);
      throw new IllegalStateException("Analysis of " + this.lang + " files failed", e);
    } finally {
      CacheStrategies.logReport();
    }
  }

  protected void logErrorOrWarn(String msg, Throwable e) {
    LOG.error(msg, e);
  }

  protected abstract void analyzeFiles(List<InputFile> inputFiles) throws IOException;

  protected abstract List<InputFile> getInputFiles();

  protected boolean shouldAnalyzeWithProgram() {
    if (contextUtils.isSonarLint()) {
      LOG.debug("Will use AnalysisWithWatchProgram because we are in SonarLint context");
      return false;
    }
    LOG.debug("Will use AnalysisWithProgram");
    return true;
  }
}
