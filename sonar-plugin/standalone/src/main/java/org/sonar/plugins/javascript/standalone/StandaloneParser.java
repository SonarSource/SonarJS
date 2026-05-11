/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.standalone;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Path;
import java.util.Optional;
import org.sonar.api.SonarProduct;
import org.sonar.plugins.javascript.analyzeproject.grpc.AnalyzeProjectRequest;
import org.sonar.plugins.javascript.analyzeproject.grpc.AnalyzeProjectUnaryResponse;
import org.sonar.plugins.javascript.analyzeproject.grpc.FileStatus;
import org.sonar.plugins.javascript.analyzeproject.grpc.FileType;
import org.sonar.plugins.javascript.analyzeproject.grpc.ProjectAnalysisFileResult;
import org.sonar.plugins.javascript.analyzeproject.grpc.ProjectConfiguration;
import org.sonar.plugins.javascript.analyzeproject.grpc.ProjectFileInput;
import org.sonar.plugins.javascript.api.estree.ESTree;
import org.sonar.plugins.javascript.bridge.AnalysisConfiguration;
import org.sonar.plugins.javascript.bridge.AnalysisWarningsWrapper;
import org.sonar.plugins.javascript.bridge.AnalyzeProjectMessages;
import org.sonar.plugins.javascript.bridge.AstProtoUtils;
import org.sonar.plugins.javascript.bridge.BridgeServerConfig;
import org.sonar.plugins.javascript.bridge.BridgeServerImpl;
import org.sonar.plugins.javascript.bridge.BundleImpl;
import org.sonar.plugins.javascript.bridge.ESTreeFactory;
import org.sonar.plugins.javascript.bridge.EmbeddedNode;
import org.sonar.plugins.javascript.bridge.Environment;
import org.sonar.plugins.javascript.bridge.NodeDeprecationWarning;
import org.sonar.plugins.javascript.bridge.RulesBundles;
import org.sonar.plugins.javascript.bridge.protobuf.Node;
import org.sonar.plugins.javascript.nodejs.NodeCommandBuilder;
import org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl;
import org.sonar.plugins.javascript.nodejs.ProcessWrapperImpl;

public class StandaloneParser implements AutoCloseable {

  private static final int DEFAULT_TIMEOUT_SECONDS = 5 * 60;
  private static final long MAX_FILE_SIZE_KB = Long.MAX_VALUE / 1024;

  private final BridgeServerImpl bridge;
  private final String baseDir;
  private final ProjectConfiguration.Builder parserConfigurationBuilder;

  public StandaloneParser() {
    this(builder());
  }

  private StandaloneParser(Builder builder) {
    ProcessWrapperImpl processWrapper = new ProcessWrapperImpl();
    NodeCommandBuilder nodeCommandBuilder = new NodeCommandBuilderImpl(processWrapper);

    if (builder.maxOldSpaceSize > 0) {
      nodeCommandBuilder = nodeCommandBuilder.maxOldSpaceSize(builder.maxOldSpaceSize);
    }

    if (builder.nodeJsArgs != null && builder.nodeJsArgs.length > 0) {
      nodeCommandBuilder = nodeCommandBuilder.nodeJsArgs(builder.nodeJsArgs);
    }

    var temporaryFolder = new StandaloneTemporaryFolder();
    baseDir = temporaryFolder.newDir().getAbsolutePath();
    bridge = new BridgeServerImpl(
      nodeCommandBuilder,
      builder.timeout,
      new BundleImpl(),
      new RulesBundles(),
      new NodeDeprecationWarning(new AnalysisWarningsWrapper()),
      temporaryFolder,
      new EmbeddedNode(processWrapper, new Environment(builder.configuration))
    );
    parserConfigurationBuilder = AnalyzeProjectMessages.newProjectConfigurationBuilder(
      baseDir,
      new StandaloneAnalysisConfiguration()
    ).setSkipAst(false);
    try {
      bridge.startServerLazily(
        new BridgeServerConfig(
          builder.configuration,
          temporaryFolder.newDir().getAbsolutePath(),
          SonarProduct.SONARLINT
        )
      );
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  public static Builder builder() {
    return new Builder();
  }

  public static class Builder {

    private int timeout = DEFAULT_TIMEOUT_SECONDS;
    private int maxOldSpaceSize = -1;
    private org.sonar.api.config.Configuration configuration = new EmptyConfiguration();
    private String[] nodeJsArgs;

    private Builder() {}

    public Builder timeout(int timeout) {
      this.timeout = timeout;
      return this;
    }

    public Builder maxOldSpaceSize(int maxOldSpaceSize) {
      this.maxOldSpaceSize = maxOldSpaceSize;
      return this;
    }

    public Builder configuration(org.sonar.api.config.Configuration configuration) {
      this.configuration = configuration;
      return this;
    }

    public Builder nodeJsArgs(String... nodeJsArgs) {
      this.nodeJsArgs = nodeJsArgs;
      return this;
    }

    public StandaloneParser build() {
      return new StandaloneParser(this);
    }
  }

  public boolean isAlive() {
    return bridge.isAlive();
  }

  public ESTree.Program parse(String code) {
    return parse(code, "file.js");
  }

  public ESTree.Program parse(String code, String filename) {
    String filePath = toAbsolutePath(filename);
    var request = AnalyzeProjectRequest.newBuilder()
      .setConfiguration(parserConfigurationBuilder.build())
      .putFiles(
        filePath,
        ProjectFileInput.newBuilder()
          .setFileType(FileType.FILE_TYPE_MAIN)
          .setFileStatus(FileStatus.FILE_STATUS_ADDED)
          .setFileContent(code)
          .build()
      )
      .build();
    try {
      var output = bridge.analyzeProject(request);
      var result = toSingleFileResponse(output, filePath);
      Node ast = responseAst(result);
      if (ast == null) {
        var parsingErrors = result.getParsingErrorsList();
        var message =
          !parsingErrors.isEmpty() && !parsingErrors.get(0).getMessage().isBlank()
            ? String.format(
                "Failed to parse the code: [%s] in [%s]",
                parsingErrors.get(0).getMessage(),
                filename
              )
            : "Failed to parse the code";
        throw new IllegalArgumentException(message);
      }
      return ESTreeFactory.from(ast, ESTree.Program.class);
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  private String toAbsolutePath(String filename) {
    return Path.of(filename).isAbsolute() ? filename : Path.of(baseDir, filename).toString();
  }

  private static ProjectAnalysisFileResult toSingleFileResponse(
    AnalyzeProjectUnaryResponse output,
    String filePath
  ) {
    var response = output.getFilesMap().get(filePath);
    if (response == null && output.getFilesCount() == 1) {
      response = output.getFilesMap().values().iterator().next();
    }
    return response == null ? ProjectAnalysisFileResult.getDefaultInstance() : response;
  }

  private static Node responseAst(ProjectAnalysisFileResult response) throws IOException {
    return response.getAst().isEmpty()
      ? null
      : AstProtoUtils.readProtobufFromBytes(response.getAst().toByteArray());
  }

  @Override
  public void close() {
    bridge.stop();
  }

  // Visible for testing
  static class EmptyConfiguration implements org.sonar.api.config.Configuration {

    @Override
    public Optional<String> get(String key) {
      return Optional.empty();
    }

    @Override
    public boolean hasKey(String key) {
      return false;
    }

    @Override
    public String[] getStringArray(String key) {
      return new String[0];
    }
  }

  private static class StandaloneAnalysisConfiguration implements AnalysisConfiguration {

    @Override
    public long getMaxFileSizeProperty() {
      return MAX_FILE_SIZE_KB;
    }

    @Override
    public boolean shouldDetectBundles() {
      return false;
    }

    @Override
    public boolean canAccessFileSystem() {
      return false;
    }

    @Override
    public boolean shouldCreateTSProgramForOrphanFiles() {
      return false;
    }

    @Override
    public boolean shouldDisableTypeChecking() {
      return true;
    }
  }
}
