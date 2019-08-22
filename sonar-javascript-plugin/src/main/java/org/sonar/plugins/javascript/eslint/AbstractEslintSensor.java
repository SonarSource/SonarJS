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

import com.google.common.annotations.VisibleForTesting;
import java.util.Collection;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import javax.annotation.Nullable;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.Sensor;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.notifications.AnalysisWarnings;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.JavaScriptChecks;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.Rule;
import org.sonarsource.analyzer.commons.ProgressReport;
import org.sonarsource.nodejs.NodeCommandException;

abstract class AbstractEslintSensor implements Sensor {
  private static final Logger LOG = Loggers.get(AbstractEslintSensor.class);

  final EslintBridgeServer eslintBridgeServer;
  private final AnalysisWarnings analysisWarnings;
  @VisibleForTesting
  final Rule[] rules;
  final JavaScriptChecks checks;

  private ProgressReport progressReport =
    new ProgressReport("Report about progress of ESLint-based rules", TimeUnit.SECONDS.toMillis(10));

  AbstractEslintSensor(JavaScriptChecks checks, EslintBridgeServer eslintBridgeServer, @Nullable AnalysisWarnings analysisWarnings) {
    this.checks = checks;
    this.rules = checks.eslintBasedChecks().stream()
      .map(check -> new EslintBridgeServer.Rule(check.eslintKey(), check.configurations()))
      .toArray(Rule[]::new);

    this.eslintBridgeServer = eslintBridgeServer;
    this.analysisWarnings = analysisWarnings;
  }

  @Override
  public void execute(SensorContext context) {
    if (rules.length == 0) {
      LOG.debug("Skipping execution of eslint-based rules because none of them are activated");
      return;
    }
    try {
      eslintBridgeServer.startServerLazily(context);
      Iterable<InputFile> inputFiles = getInputFiles(context);
      startProgressReport(inputFiles);

      for (InputFile inputFile : inputFiles) {
        analyze(inputFile, context);
        progressReport.nextFile();
      }
      progressReport.stop();
    } catch (ServerAlreadyFailedException e) {
      LOG.debug("Skipping start of eslint-bridge server due to the failure during first analysis");
      LOG.debug("Skipping execution of eslint-based rules due to the problems with eslint-bridge server");

    } catch (NodeCommandException e) {
      LOG.error(e.getMessage(), e);
      if (analysisWarnings != null) {
        analysisWarnings.addUnique("Some eslint-based rules were not executed. " + e.getMessage());
      }
    } catch (Exception e) {
      LOG.error("Failure during analysis, " + eslintBridgeServer.getCommandInfo(), e);
    } finally {
      progressReport.cancel();
    }
  }

  protected abstract Iterable<InputFile> getInputFiles(SensorContext sensorContext);

  protected abstract void analyze(InputFile file, SensorContext context);

  private void startProgressReport(Iterable<InputFile> inputFiles) {
    Collection<String> files = StreamSupport.stream(inputFiles.spliterator(), false)
      .map(InputFile::toString)
      .collect(Collectors.toList());

    progressReport.start(files);
  }
}
