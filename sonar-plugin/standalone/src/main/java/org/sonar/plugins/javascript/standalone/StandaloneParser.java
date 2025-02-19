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
package org.sonar.plugins.javascript.standalone;

import java.io.File;
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
import org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl;
import org.sonar.plugins.javascript.nodejs.ProcessWrapperImpl;

public class StandaloneParser implements AutoCloseable {

  private static final int DEFAULT_TIMEOUT_SECONDS = 5 * 60;

  private final BridgeServerImpl bridge;

  public StandaloneParser() {
    this(Http.getJdkHttpClient());
  }

  public StandaloneParser(Http http) {
    ProcessWrapperImpl processWrapper = new ProcessWrapperImpl();
    EmptyConfiguration emptyConfiguration = new EmptyConfiguration();
    bridge = new BridgeServerImpl(
      new NodeCommandBuilderImpl(processWrapper),
      DEFAULT_TIMEOUT_SECONDS,
      new BundleImpl(),
      new RulesBundles(),
      new NodeDeprecationWarning(new AnalysisWarningsWrapper()),
      new StandaloneTemporaryFolder(),
      new EmbeddedNode(processWrapper, new Environment(emptyConfiguration)),
      http
    );
    try {
      bridge.startServerLazily(
        new BridgeServerConfig(
          emptyConfiguration,
          new File(".").getAbsolutePath(),
          SonarProduct.SONARLINT
        )
      );
      bridge.initLinter(List.of(), List.of(), List.of(), null);
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  public ESTree.Program parse(String code) {
    BridgeServer.JsAnalysisRequest request = new BridgeServer.JsAnalysisRequest(
      "file.js",
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
