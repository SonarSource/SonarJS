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

import java.io.File;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.function.Predicate;
import java.util.regex.Pattern;
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
import org.sonar.plugins.javascript.external.EslintReportImporter;
import org.sonar.plugins.javascript.external.ExternalIssueRepository;
import org.sonar.plugins.javascript.nodejs.NodeCommandException;
import org.sonar.plugins.javascript.utils.Exclusions;

public abstract class AbstractBridgeSensor implements Sensor {

  private static final Logger LOG = LoggerFactory.getLogger(AbstractBridgeSensor.class);

  protected final String lang;
  protected final BridgeServer bridgeServer;
  protected List<String> exclusions;
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
    this.exclusions = Arrays.asList(Exclusions.getExcludedPaths(context.config()));
    this.contextUtils = new ContextUtils(context);
    environments = Arrays.asList(context.config().getStringArray(JavaScriptPlugin.ENVIRONMENTS));
    globals = Arrays.asList(context.config().getStringArray(JavaScriptPlugin.GLOBALS));

    var eslintReportImporter = new EslintReportImporter();
    var esLintIssues = eslintReportImporter.execute(context);

    try {
      List<InputFile> inputFiles = getInputFiles();
      if (inputFiles.isEmpty()) {
        LOG.info("No input files found for analysis");
        return;
      }
      bridgeServer.startServerLazily(BridgeServerConfig.fromSensorContext(context));
      var issues = analyzeFiles(inputFiles);

      // at that point, we have the list of issues that were persisted
      // we can now persist the ESLint issues that match none of the persisted issues
      for (var externalIssue : esLintIssues) {
        Predicate<BridgeServer.Issue> predicate = issue ->
          (issue.ruleESLintKeys().contains(externalIssue.name()) &&
            issue
              .filePath()
              .replaceAll(Pattern.quote(File.separator), "/")
              .equals(
                externalIssue.file().absolutePath().replaceAll(Pattern.quote(File.separator), "/")
              ) &&
            issue.line() == externalIssue.location().start().line() &&
            issue.column() == externalIssue.location().start().lineOffset() &&
            issue.endLine() == externalIssue.location().end().line() &&
            issue.endColumn() == externalIssue.location().end().lineOffset());

        var persistedIssue = issues.stream().filter(predicate).findFirst();

        if (persistedIssue.isEmpty()) {
          ExternalIssueRepository.save(externalIssue, context);
        }
      }
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
}
