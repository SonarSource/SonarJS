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

import static org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl.NODE_EXECUTABLE_PROPERTY;

import java.io.IOException;
import java.util.ArrayList;
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
import org.sonar.plugins.javascript.api.AnalysisMode;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.bridge.BridgeServerConfig;
import org.sonar.plugins.javascript.bridge.ServerAlreadyFailedException;
import org.sonar.plugins.javascript.external.ExternalIssue;
import org.sonar.plugins.javascript.external.ExternalIssueRepository;
import org.sonar.plugins.javascript.nodejs.NodeCommandException;

public abstract class AbstractBridgeSensor implements Sensor {

  private static final Logger LOG = LoggerFactory.getLogger(AbstractBridgeSensor.class);

  protected final String lang;
  protected final BridgeServer bridgeServer;
  List<String> environments;
  List<String> globals;

  protected SensorContext context;
  protected ContextUtils contextUtils;

  protected AbstractBridgeSensor(BridgeServer bridgeServer, String lang) {
    this.bridgeServer = bridgeServer;
    this.lang = lang;
  }

  @Override
  public void execute(SensorContext context) {
    CacheStrategies.reset();
    this.context = context;
    this.contextUtils = new ContextUtils(context);
    environments = Arrays.asList(context.config().getStringArray(JavaScriptPlugin.ENVIRONMENTS));
    globals = Arrays.asList(context.config().getStringArray(JavaScriptPlugin.GLOBALS));

    var externalIssues = this.getESLintIssues(context);

    try {
      List<InputFile> inputFiles = getInputFiles();
      if (inputFiles.isEmpty()) {
        LOG.info("No input files found for analysis");
        return;
      }
      var msg = contextUtils.getAnalysisMode() == AnalysisMode.SKIP_UNCHANGED
        ? "Files which didn't change will only be analyzed for taint and architecture rules, other rules will not be executed"
        : "Analysis of unchanged files will not be skipped (current analysis requires all files to be analyzed)";
      LOG.debug(msg);
      bridgeServer.startServerLazily(BridgeServerConfig.fromSensorContext(context));
      var issues = analyzeFiles(inputFiles);
      ExternalIssueRepository.saveESLintIssues(context, externalIssues, issues);
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

  /**
   * Analyze the passed input files, and return the list of persisted issues.
   */
  protected abstract List<BridgeServer.Issue> analyzeFiles(List<InputFile> inputFiles)
    throws IOException;

  protected abstract List<InputFile> getInputFiles();

  protected List<ExternalIssue> getESLintIssues(SensorContext context) {
    return new ArrayList<>();
  }
}
