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
package org.sonar.plugins.javascript.standalone;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Optional;
import org.sonar.api.SonarProduct;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.plugins.javascript.api.AnalysisMode;
import org.sonar.plugins.javascript.api.estree.ESTree;
import org.sonar.plugins.javascript.bridge.AnalysisWarningsWrapper;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.bridge.BridgeServerConfig;
import org.sonar.plugins.javascript.bridge.BridgeServerImpl;
import org.sonar.plugins.javascript.bridge.BundleImpl;
import org.sonar.plugins.javascript.bridge.ESTreeFactory;
import org.sonar.plugins.javascript.bridge.EmbeddedNode;
import org.sonar.plugins.javascript.bridge.Environment;
import org.sonar.plugins.javascript.bridge.Http;
import org.sonar.plugins.javascript.bridge.NodeDeprecationWarning;
import org.sonar.plugins.javascript.bridge.RulesBundles;
import org.sonar.plugins.javascript.bridge.protobuf.Node;
import org.sonar.plugins.javascript.nodejs.NodeCommandBuilder;
import org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl;
import org.sonar.plugins.javascript.nodejs.ProcessWrapperImpl;

public class StandaloneParser implements AutoCloseable {

  private static final int DEFAULT_TIMEOUT_SECONDS = 5 * 60;

  private final BridgeServerImpl bridge;

  public StandaloneParser() {
    this(builder());
  }

  public StandaloneParser(Http http) {
    this(builder().http(http));
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
    Http httpClient = builder.http != null ? builder.http : Http.getJdkHttpClient();
    bridge = new BridgeServerImpl(
      nodeCommandBuilder,
      builder.timeout,
      new BundleImpl(),
      new RulesBundles(),
      new NodeDeprecationWarning(new AnalysisWarningsWrapper()),
      temporaryFolder,
      new EmbeddedNode(processWrapper, new Environment(builder.configuration)),
      httpClient
    );
    try {
      bridge.startServerLazily(
        new BridgeServerConfig(
          builder.configuration,
          temporaryFolder.newDir().getAbsolutePath(),
          SonarProduct.SONARLINT
        )
      );
      bridge.initLinter(
        List.of(),
        List.of(),
        List.of(),
        temporaryFolder.newDir().getAbsolutePath(),
        true
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
    private Http http;

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

    public Builder http(Http http) {
      this.http = http;
      return this;
    }

    public StandaloneParser build() {
      return new StandaloneParser(this);
    }
  }

  public ESTree.Program parse(String code) {
    return parse(code, "file.js");
  }

  public ESTree.Program parse(String code, String filename) {
    BridgeServer.JsAnalysisRequest request = new BridgeServer.JsAnalysisRequest(
      filename,
      "MAIN",
      code,
      true,
      null,
      null,
      InputFile.Status.ADDED,
      AnalysisMode.DEFAULT,
      false,
      false,
      true,
      true
    );
    try {
      BridgeServer.AnalysisResponse result = bridge.analyzeJsTs(request);
      Node ast = result.ast();
      if (ast == null) {
        throw new IllegalArgumentException("Failed to parse the code");
      }
      return ESTreeFactory.from(ast, ESTree.Program.class);
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
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
}
