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
package org.sonar.plugins.javascript.bridge;

import java.io.IOException;
import java.util.List;
import java.util.Scanner;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import org.sonar.api.batch.fs.FilePredicates;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.CancellationException;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.bridge.BridgeServer.JsAnalysisRequest;
import org.sonar.plugins.javascript.bridge.cache.CacheAnalysis;
import org.sonar.plugins.javascript.bridge.cache.CacheStrategies;
import org.sonar.plugins.javascript.utils.ProgressReport;

public class YamlSensor extends AbstractBridgeSensor {

  public static final String LANGUAGE = "yaml";
  public static final String SAM_TRANSFORM_FIELD = "AWS::Serverless-2016-10-31";
  public static final String NODEJS_RUNTIME_REGEX = "^\\s*Runtime:\\s*[\'\"]?nodejs\\S*[\'\"]?";

  private static final Logger LOG = Loggers.get(YamlSensor.class);
  private final JsTsChecks checks;
  private final AnalysisProcessor analysisProcessor;
  private AnalysisMode analysisMode;

  public YamlSensor(
    JsTsChecks checks,
    BridgeServer bridgeServer,
    AnalysisWarningsWrapper analysisWarnings,
    Monitoring monitoring,
    AnalysisProcessor processAnalysis
  ) {
    // The monitoring sensor remains inactive during YAML files analysis, as the
    // bridge doesn't provide nor compute metrics for such files.
    super(bridgeServer, analysisWarnings, monitoring, "JS in YAML");
    this.checks = checks;
    this.analysisProcessor = processAnalysis;
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor.name("JavaScript inside YAML analysis").onlyOnLanguage(LANGUAGE);
  }

  @Override
  protected void analyzeFiles(List<InputFile> inputFiles) throws IOException {
    analysisMode = AnalysisMode.getMode(context, checks.eslintRules());
    var progressReport = new ProgressReport("Analysis progress", TimeUnit.SECONDS.toMillis(10));
    var success = false;
    try {
      progressReport.start(inputFiles.size(), inputFiles.iterator().next().absolutePath());
      bridgeServer.initLinter(
        checks.eslintRules(),
        environments,
        globals,
        analysisMode,
        context.fileSystem().baseDir().getAbsolutePath(),
        exclusions
      );
      for (var inputFile : inputFiles) {
        if (context.isCancelled()) {
          throw new CancellationException(
            "Analysis interrupted because the SensorContext is in cancelled state"
          );
        }
        progressReport.nextFile(inputFile.absolutePath());
        analyze(inputFile);
      }
      success = true;
    } finally {
      if (success) {
        progressReport.stop();
      } else {
        progressReport.cancel();
      }
    }
  }

  @Override
  protected List<InputFile> getInputFiles() {
    var fileSystem = context.fileSystem();
    FilePredicates p = fileSystem.predicates();
    var filePredicate = p.and(
      p.hasLanguage(YamlSensor.LANGUAGE),
      input -> isSamTemplate(input, LOG)
    );
    var inputFiles = context.fileSystem().inputFiles(filePredicate);
    return StreamSupport.stream(inputFiles.spliterator(), false).collect(Collectors.toList());
  }

  // Inspired from
  // https://github.com/SonarSource/sonar-security/blob/14251a6e51d210d268fa71abbac40e4996d03227/sonar-security-plugin/src/main/java/com/sonar/security/aws/AwsSensorUtils.java#L51
  private static boolean isSamTemplate(InputFile inputFile, Logger logger) {
    boolean hasAwsTransform = false;
    boolean hasNodeJsRuntime = false;
    try (Scanner scanner = new Scanner(inputFile.inputStream(), inputFile.charset().name())) {
      Pattern regex = Pattern.compile(NODEJS_RUNTIME_REGEX);
      while (scanner.hasNextLine()) {
        String line = scanner.nextLine();
        // Normally, we would be looking for an entry like "Transform: AWS::Serverless-2016-10-31", however, checking the whole entry could be
        // problematic with whitespaces, so we will be looking just for the field value.
        if (line.contains(SAM_TRANSFORM_FIELD)) {
          hasAwsTransform = true;
        }
        // We check early the runtime to avoid making Node.js a mandatory dependency on projects that include YAML configuration files for AWS,
        // and we consider only those which define Node.js as the runtime, which potentially embed JavaScript code.
        Matcher lineMatch = regex.matcher(line);
        if (lineMatch.find()) {
          hasNodeJsRuntime = true;
        }
        if (hasAwsTransform && hasNodeJsRuntime) {
          return true;
        }
      }
    } catch (IOException e) {
      logger.error(String.format("Unable to read file: %s.", inputFile.uri()));
      logger.error(e.getMessage());
    }

    return false;
  }

  private void analyze(InputFile file) throws IOException {
    var cacheStrategy = CacheStrategies.getStrategyFor(context, file);
    // When there is no analysis required, the sensor doesn't need to do anything as the CPD tokens are handled by the sonar-iac plugin.
    // See AnalysisProcessor for more details.
    if (cacheStrategy.isAnalysisRequired()) {
      try {
        LOG.debug("Analyzing file: {}", file.uri());
        monitoring.startFile(file);
        var fileContent = contextUtils.shouldSendFileContent(file) ? file.contents() : null;
        var jsAnalysisRequest = new JsAnalysisRequest(
          file.absolutePath(),
          file.type().toString(),
          JavaScriptLanguage.KEY,
          fileContent,
          contextUtils.ignoreHeaderComments(),
          null,
          null,
          analysisMode.getLinterIdFor(file)
        );
        var response = bridgeServer.analyzeYaml(jsAnalysisRequest);
        analysisProcessor.processResponse(context, checks, file, response);
        cacheStrategy.writeAnalysisToCache(
          CacheAnalysis.fromResponse(response.ucfgPaths, response.cpdTokens),
          file
        );
      } catch (IOException e) {
        LOG.error("Failed to get response while analyzing " + file.uri(), e);
        throw e;
      }
    }
  }
}
