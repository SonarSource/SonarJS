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

import static org.sonar.plugins.javascript.JavaScriptFilePredicate.getYamlPredicate;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.StreamSupport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.FilePredicates;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.plugins.javascript.CancellationException;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.analysis.cache.CacheAnalysis;
import org.sonar.plugins.javascript.analysis.cache.CacheStrategies;
import org.sonar.plugins.javascript.bridge.AnalysisMode;
import org.sonar.plugins.javascript.bridge.AnalysisWarningsWrapper;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.bridge.BridgeServer.JsAnalysisRequest;
import org.sonar.plugins.javascript.utils.ProgressReport;

public class YamlSensor extends AbstractBridgeSensor {

  public static final String LANGUAGE = "yaml";
  public static final String SAM_TRANSFORM_FIELD = "AWS::Serverless-2016-10-31";
  public static final String NODEJS_RUNTIME_REGEX = "^\\s*Runtime:\\s*[\'\"]?nodejs\\S*[\'\"]?";

  private static final Logger LOG = LoggerFactory.getLogger(YamlSensor.class);
  private final JsTsChecks checks;
  private final AnalysisProcessor analysisProcessor;
  private AnalysisMode analysisMode;

  public YamlSensor(
    JsTsChecks checks,
    BridgeServer bridgeServer,
    AnalysisWarningsWrapper analysisWarnings,
    AnalysisProcessor processAnalysis
  ) {
    // The monitoring sensor remains inactive during YAML files analysis, as the
    // bridge doesn't provide nor compute metrics for such files.
    super(bridgeServer, "JS in YAML");
    this.checks = checks;
    this.analysisProcessor = processAnalysis;
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor.name("JavaScript inside YAML analysis").onlyOnLanguage(LANGUAGE);
  }

  @Override
  protected List<BridgeServer.Issue> analyzeFiles(List<InputFile> inputFiles) throws IOException {
    var issues = new ArrayList<BridgeServer.Issue>();

    analysisMode = AnalysisMode.getMode(context);
    var progressReport = new ProgressReport("Analysis progress", TimeUnit.SECONDS.toMillis(10));
    var success = false;
    try {
      progressReport.start(inputFiles.size(), inputFiles.iterator().next().toString());
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
        progressReport.nextFile(inputFile.toString());
        issues.addAll(analyze(inputFile));
      }
      success = true;
    } finally {
      if (success) {
        progressReport.stop();
      } else {
        progressReport.cancel();
      }
    }

    return issues;
  }

  @Override
  protected List<InputFile> getInputFiles() {
    var fileSystem = context.fileSystem();
    FilePredicates p = fileSystem.predicates();
    var yamlPredicate = getYamlPredicate(fileSystem);
    var filePredicate = p.and(yamlPredicate, input -> isSamTemplate(input, LOG));
    var inputFiles = context.fileSystem().inputFiles(filePredicate);
    return StreamSupport.stream(inputFiles.spliterator(), false).toList();
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

  private List<BridgeServer.Issue> analyze(InputFile file) throws IOException {
    List<BridgeServer.Issue> issues = new ArrayList<>();

    var cacheStrategy = CacheStrategies.getStrategyFor(context, file);
    // When there is no analysis required, the sensor doesn't need to do anything as the CPD tokens are handled by the sonar-iac plugin.
    // See AnalysisProcessor for more details.
    if (cacheStrategy.isAnalysisRequired()) {
      try {
        LOG.debug("Analyzing file: {}", file.uri());
        var fileContent = contextUtils.shouldSendFileContent(file) ? file.contents() : null;
        var jsAnalysisRequest = new JsAnalysisRequest(
          file.absolutePath(),
          file.type().toString(),
          JavaScriptLanguage.KEY,
          fileContent,
          contextUtils.ignoreHeaderComments(),
          null,
          null,
          analysisMode.getLinterIdFor(file),
          false,
          false
        );
        var response = bridgeServer.analyzeYaml(jsAnalysisRequest);
        issues = analysisProcessor.processResponse(context, checks, file, response);
        cacheStrategy.writeAnalysisToCache(
          CacheAnalysis.fromResponse(response.ucfgPaths(), response.cpdTokens()),
          file
        );
      } catch (IOException e) {
        LOG.error("Failed to get response while analyzing " + file.uri(), e);
        throw e;
      }
    }

    return issues;
  }
}
