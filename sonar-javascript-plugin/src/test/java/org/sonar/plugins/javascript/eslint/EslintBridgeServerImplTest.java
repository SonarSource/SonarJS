/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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

import org.junit.After;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.sonar.api.utils.internal.JUnitTempFolder;
import org.sonar.api.utils.log.LogTester;
import org.sonar.api.utils.log.LoggerLevel;
import org.sonarsource.nodejs.NodeCommand;
import org.sonarsource.nodejs.NodeCommandBuilder;
import org.sonarsource.nodejs.NodeCommandException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

public class EslintBridgeServerImplTest {

  // "mock-eslint-bundle.tar.xz" is created from "mock-eslint-bridge" directory
  // with this command: tar -cJ -f mock-eslint-bridge.tar.xz mock-eslint-bridge
  // might require "--force-local" option for windows
  private static final String MOCK_ESLINT_BUNDLE = "/mock-eslint-bundle.tar.xz";

  @Rule
  public LogTester logTester = new LogTester();

  @Rule
  public final ExpectedException thrown = ExpectedException.none();

  @Rule
  public JUnitTempFolder tempFolder = new JUnitTempFolder();

  private EslintBridgeServerImpl eslintBridgeServer;

  @After
  public void tearDown() throws Exception {
    eslintBridgeServer.clean();
  }

  @Test
  public void should_not_fail_when_deployed_twice() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("startServer.js");
    eslintBridgeServer.deploy();
    eslintBridgeServer.deploy();
  }

  @Test
  public void should_throw_when_not_existing_script() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("NOT_EXISTING.js");
    eslintBridgeServer.deploy();

    thrown.expect(IllegalStateException.class);
    thrown.expectMessage("Node.js script to start eslint-bridge server doesn't exist:");

    eslintBridgeServer.startServer();
  }

  @Test
  public void should_throw_if_failed_to_build_node_command() throws Exception {
    NodeCommandBuilder nodeCommandBuilder = mock(NodeCommandBuilder.class, invocation -> {
      if (NodeCommandBuilder.class.equals(invocation.getMethod().getReturnType())) {
        return invocation.getMock();
      } else {
        throw new NodeCommandException("msg");
      }
    });

    eslintBridgeServer = new EslintBridgeServerImpl(null, nodeCommandBuilder, tempFolder, 1, "startServer.js", MOCK_ESLINT_BUNDLE);
    eslintBridgeServer.deploy();

    thrown.expect(NodeCommandException.class);
    thrown.expectMessage("msg");

    eslintBridgeServer.startServer();
  }

  @Test
  public void should_forward_process_streams() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("logging.js");
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer();

    assertThat(logTester.logs(LoggerLevel.DEBUG)).contains("testing debug log");
    assertThat(logTester.logs(LoggerLevel.INFO)).contains("testing info log");
  }

  @Test
  public void should_get_answer_from_server() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("startServer.js");
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer();

    assertThat(eslintBridgeServer.call("{}")).isEqualTo("answer from eslint-bridge");
  }

  @Test
  public void should_throw_if_failed_to_start() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("throw.js");
    eslintBridgeServer.deploy();

    thrown.expect(IllegalStateException.class);
    thrown.expectMessage("Failed to start server (1s timeout)");

    eslintBridgeServer.startServer();
  }

  @Test
  public void should_return_command_info() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("startServer.js");
    assertThat(eslintBridgeServer.getCommandInfo()).isEqualTo("Node.js command to start eslint-bridge server was not built yet.");

    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer();

    assertThat(eslintBridgeServer.getCommandInfo()).contains("Node.js command to start eslint-bridge was: node", "startServer.js");
  }

  @Test
  public void test_isAlive() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("startServer.js");
    assertThat(eslintBridgeServer.isAlive()).isFalse();
    eslintBridgeServer.deploy();
    assertThat(eslintBridgeServer.isAlive()).isFalse();
    eslintBridgeServer.startServer();
    assertThat(eslintBridgeServer.isAlive()).isTrue();
    eslintBridgeServer.clean();
    assertThat(eslintBridgeServer.isAlive()).isFalse();
  }

  private EslintBridgeServerImpl createEslintBridgeServer(String startServerScript) {
    return new EslintBridgeServerImpl(null, NodeCommand.builder(), tempFolder, 1, startServerScript, MOCK_ESLINT_BUNDLE);
  }
}
