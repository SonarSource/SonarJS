/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
package org.sonar.plugins.javascript.bridge;

import com.google.gson.Gson;
import java.util.List;
import java.util.Map;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeCssRequest;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeHtmlRequest;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeJsTsRequest;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeProjectRequest;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeYamlRequest;
import org.sonar.plugins.javascript.bridge.grpc.InitLinterRequest;
import org.sonar.plugins.javascript.bridge.grpc.ProjectAnalysisConfiguration;

/**
 * Converts Java domain objects to gRPC request messages.
 */
public final class BridgeRequestConverter {

  private static final Gson GSON = new Gson();

  private BridgeRequestConverter() {
    // Utility class
  }

  /**
   * Converts InitLinterRequest parameters to gRPC InitLinterRequest.
   */
  public static InitLinterRequest toInitLinterRequest(
    List<EslintRule> rules,
    List<String> environments,
    List<String> globals,
    String baseDir,
    boolean sonarlint,
    List<String> bundles,
    String rulesWorkdir
  ) {
    InitLinterRequest.Builder builder = InitLinterRequest.newBuilder();

    for (EslintRule rule : rules) {
      org.sonar.plugins.javascript.bridge.grpc.EslintRule.Builder ruleBuilder =
        org.sonar.plugins.javascript.bridge.grpc.EslintRule.newBuilder()
          .setKey(rule.key)
          .setLanguage(rule.language)
          .addAllFileTypeTargets(rule.fileTypeTargets)
          .addAllBlacklistedExtensions(rule.blacklistedExtensions);

      // Serialize configurations to JSON strings
      for (Object config : rule.configurations) {
        ruleBuilder.addConfigurations(GSON.toJson(config));
      }

      // Convert analysis modes to strings
      for (var mode : rule.analysisModes) {
        ruleBuilder.addAnalysisModes(mode.name());
      }

      builder.addRules(ruleBuilder.build());
    }

    builder
      .addAllEnvironments(environments)
      .addAllGlobals(globals)
      .setBaseDir(baseDir)
      .setSonarlint(sonarlint)
      .addAllBundles(bundles)
      .setRulesWorkdir(rulesWorkdir);

    return builder.build();
  }

  /**
   * Converts JsAnalysisRequest to gRPC AnalyzeJsTsRequest.
   */
  public static AnalyzeJsTsRequest toAnalyzeJsTsRequest(BridgeServer.JsAnalysisRequest request) {
    AnalyzeJsTsRequest.Builder builder = AnalyzeJsTsRequest.newBuilder()
      .setFilePath(request.filePath())
      .setFileType(request.fileType())
      .setIgnoreHeaderComments(request.ignoreHeaderComments())
      .setFileStatus(request.fileStatus() != null ? request.fileStatus().name() : "ADDED")
      .setAnalysisMode(request.analysisMode().name())
      .setSkipAst(request.skipAst())
      .setShouldClearDependenciesCache(request.shouldClearDependenciesCache())
      .setSonarlint(request.sonarlint())
      .setAllowTsParserJsFiles(request.allowTsParserJsFiles());

    if (request.fileContent() != null) {
      builder.setFileContent(request.fileContent());
    }

    if (request.tsConfigs() != null) {
      builder.addAllTsConfigs(request.tsConfigs());
    }

    if (request.programId() != null) {
      builder.setProgramId(request.programId());
    }

    if (request.configuration() != null) {
      builder.setConfiguration(toProjectConfiguration(request.configuration()));
    }

    return builder.build();
  }

  /**
   * Converts CssAnalysisRequest to gRPC AnalyzeCssRequest.
   */
  public static AnalyzeCssRequest toAnalyzeCssRequest(BridgeServer.CssAnalysisRequest request) {
    AnalyzeCssRequest.Builder builder = AnalyzeCssRequest.newBuilder().setFilePath(
      request.filePath()
    );

    if (request.fileContent() != null) {
      builder.setFileContent(request.fileContent());
    }

    for (StylelintRule rule : request.rules()) {
      org.sonar.plugins.javascript.bridge.grpc.StylelintRule.Builder ruleBuilder =
        org.sonar.plugins.javascript.bridge.grpc.StylelintRule.newBuilder().setKey(rule.key);

      for (Object config : rule.configurations) {
        ruleBuilder.addConfigurations(GSON.toJson(config));
      }

      builder.addRules(ruleBuilder.build());
    }

    if (request.configuration() != null) {
      builder.setConfiguration(toProjectConfiguration(request.configuration()));
    }

    return builder.build();
  }

  /**
   * Converts JsAnalysisRequest to gRPC AnalyzeYamlRequest.
   */
  public static AnalyzeYamlRequest toAnalyzeYamlRequest(BridgeServer.JsAnalysisRequest request) {
    AnalyzeYamlRequest.Builder builder = AnalyzeYamlRequest.newBuilder().setFilePath(
      request.filePath()
    );

    if (request.fileContent() != null) {
      builder.setFileContent(request.fileContent());
    }

    if (request.configuration() != null) {
      builder.setConfiguration(toProjectConfiguration(request.configuration()));
    }

    return builder.build();
  }

  /**
   * Converts JsAnalysisRequest to gRPC AnalyzeHtmlRequest.
   */
  public static AnalyzeHtmlRequest toAnalyzeHtmlRequest(BridgeServer.JsAnalysisRequest request) {
    AnalyzeHtmlRequest.Builder builder = AnalyzeHtmlRequest.newBuilder().setFilePath(
      request.filePath()
    );

    if (request.fileContent() != null) {
      builder.setFileContent(request.fileContent());
    }

    if (request.configuration() != null) {
      builder.setConfiguration(toProjectConfiguration(request.configuration()));
    }

    return builder.build();
  }

  /**
   * Converts ProjectAnalysisRequest to gRPC AnalyzeProjectRequest.
   */
  public static AnalyzeProjectRequest toAnalyzeProjectRequest(
    BridgeServer.ProjectAnalysisRequest request,
    List<String> bundles,
    String rulesWorkdir
  ) {
    AnalyzeProjectRequest.Builder builder = AnalyzeProjectRequest.newBuilder();

    // Convert files map
    for (Map.Entry<String, BridgeServer.JsTsFile> entry : request.getFiles().entrySet()) {
      BridgeServer.JsTsFile file = entry.getValue();
      org.sonar.plugins.javascript.bridge.grpc.JsTsFile.Builder fileBuilder =
        org.sonar.plugins.javascript.bridge.grpc.JsTsFile.newBuilder()
          .setFilePath(file.filePath())
          .setFileType(file.fileType())
          .setFileStatus(file.fileStatus().name());

      if (file.fileContent() != null) {
        fileBuilder.setFileContent(file.fileContent());
      }

      builder.putFiles(entry.getKey(), fileBuilder.build());
    }

    // Convert rules - get rules from request
    // Note: Rules should be passed from the request object
    // This will need to be refactored to match the actual request structure

    if (request.getConfiguration() != null) {
      builder.setConfiguration(toProjectConfiguration(request.getConfiguration()));
    }

    builder.addAllBundles(bundles).setRulesWorkdir(rulesWorkdir);

    return builder.build();
  }

  /**
   * Converts ProjectAnalysisConfiguration to gRPC ProjectAnalysisConfiguration.
   */
  private static ProjectAnalysisConfiguration toProjectConfiguration(
    BridgeServer.ProjectAnalysisConfiguration config
  ) {
    ProjectAnalysisConfiguration.Builder builder = ProjectAnalysisConfiguration.newBuilder()
      .setBaseDir(config.baseDir)
      .setSonarlint(config.sonarlint)
      .setAllowTsParserJsFiles(config.allowTsParserJsFiles)
      .setAnalysisMode(config.analysisMode.name())
      .setSkipAst(config.skipAst())
      .setIgnoreHeaderComments(config.ignoreHeaderComments)
      .setMaxFileSize(config.maxFileSize)
      .setDetectBundles(config.detectBundles)
      .setCanAccessFileSystem(config.canAccessFileSystem);

    if (config.fsEvents != null) {
      builder.putAllFsEvents(config.fsEvents);
    }

    if (config.environments != null) {
      builder.addAllEnvironments(config.environments);
    }

    if (config.globals != null) {
      builder.addAllGlobals(config.globals);
    }

    if (config.tsSuffixes != null) {
      builder.addAllTsSuffixes(config.tsSuffixes);
    }

    if (config.jsSuffixes != null) {
      builder.addAllJsSuffixes(config.jsSuffixes);
    }

    if (config.cssSuffixes != null) {
      builder.addAllCssSuffixes(config.cssSuffixes);
    }

    if (config.tsConfigPaths != null) {
      builder.addAllTsConfigPaths(config.tsConfigPaths);
    }

    if (config.jsTsExclusions != null) {
      builder.addAllJsTsExclusions(config.jsTsExclusions);
    }

    if (config.sources != null) {
      builder.addAllSources(config.sources);
    }

    if (config.inclusions != null) {
      builder.addAllInclusions(config.inclusions);
    }

    if (config.exclusions != null) {
      builder.addAllExclusions(config.exclusions);
    }

    if (config.tests != null) {
      builder.addAllTests(config.tests);
    }

    if (config.testInclusions != null) {
      builder.addAllTestInclusions(config.testInclusions);
    }

    if (config.testExclusions != null) {
      builder.addAllTestExclusions(config.testExclusions);
    }

    return builder.build();
  }
}
