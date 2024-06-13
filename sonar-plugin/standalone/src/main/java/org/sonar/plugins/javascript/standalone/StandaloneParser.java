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
package org.sonar.plugins.javascript.standalone;

import java.io.File;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Optional;
import org.sonar.api.SonarProduct;
import org.sonar.plugins.javascript.api.estree.ESTree;
import org.sonar.plugins.javascript.bridge.AnalysisMode;
import org.sonar.plugins.javascript.bridge.AnalysisWarningsWrapper;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.bridge.BridgeServerConfig;
import org.sonar.plugins.javascript.bridge.BridgeServerImpl;
import org.sonar.plugins.javascript.bridge.BundleImpl;
import org.sonar.plugins.javascript.bridge.ESTreeFactory;
import org.sonar.plugins.javascript.bridge.EmbeddedNode;
import org.sonar.plugins.javascript.bridge.Environment;
import org.sonar.plugins.javascript.bridge.NodeDeprecationWarning;
import org.sonar.plugins.javascript.bridge.RulesBundles;
import org.sonar.plugins.javascript.bridge.protobuf.Node;
import org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl;
import org.sonar.plugins.javascript.nodejs.ProcessWrapperImpl;

public class StandaloneParser implements AutoCloseable {

  private final BridgeServerImpl bridge;

  public StandaloneParser() {
    ProcessWrapperImpl processWrapper = new ProcessWrapperImpl();
    EmptyConfiguration emptyConfiguration = new EmptyConfiguration();
    bridge = new BridgeServerImpl(new NodeCommandBuilderImpl(processWrapper), new BundleImpl(), new RulesBundles(),
      new NodeDeprecationWarning(new AnalysisWarningsWrapper()), new StandaloneTemporaryFolder(), new EmbeddedNode(processWrapper, new Environment(emptyConfiguration)));
    try {
      bridge.startServerLazily(new BridgeServerConfig(emptyConfiguration, new File(".").getAbsolutePath(), SonarProduct.SONARLINT));
      bridge.initLinter(List.of(), List.of(), List.of(), AnalysisMode.DEFAULT, null, List.of());
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  public ESTree.Program parse(String code) {
    BridgeServer.JsAnalysisRequest request = new BridgeServer.JsAnalysisRequest(
      "file.js",
      "MAIN",
      "js",
      code,
      true,
      null,
      null,
      AnalysisMode.DEFAULT_LINTER_ID);
    try {
      BridgeServer.AnalysisResponse result = bridge.analyzeJavaScript(request);
      Node ast = result.ast();
      if (ast == null) {
        throw new IllegalStateException("Failed to parse the code");
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

  private static class EmptyConfiguration implements org.sonar.api.config.Configuration {

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
