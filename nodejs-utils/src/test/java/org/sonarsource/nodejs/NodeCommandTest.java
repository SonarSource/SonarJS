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
package org.sonarsource.nodejs;


import com.google.gson.Gson;
import java.io.File;
import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import org.junit.Before;
import org.junit.Ignore;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.junit.rules.TemporaryFolder;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.sonar.api.config.Configuration;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.api.utils.log.LogTester;
import org.sonar.api.utils.log.LoggerLevel;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.entry;
import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class NodeCommandTest {

  private static final String PATH_TO_SCRIPT = "files/script.js";
  @Rule
  public TemporaryFolder temporaryFolder = new TemporaryFolder();

  @Rule
  public LogTester logTester = new LogTester();

  @Rule
  public final ExpectedException thrown = ExpectedException.none();

  @Captor
  private ArgumentCaptor<List<String>> processStartArgument;

  @Captor
  private ArgumentCaptor<Map<String, String>> processStartEnv;

  @Mock
  private NodeCommand.ProcessWrapper mockProcessWrapper;


  @Before
  public void setUp() throws Exception {
    MockitoAnnotations.initMocks(this);
    when(mockProcessWrapper.start(any(), any())).thenReturn(mock(Process.class));
  }

  @Test
  public void test() throws Exception {
    NodeCommand nodeCommand = NodeCommand.builder()
      .script(resourceScript(PATH_TO_SCRIPT))
      .pathResolver(getPathResolver())
      .build();
    nodeCommand.start();
    int exitValue = nodeCommand.waitFor();
    assertThat(exitValue).isEqualTo(0);
  }

  @Test
  public void test_output_error_consumer() throws Exception {
    StringBuilder output = new StringBuilder();
    StringBuilder error = new StringBuilder();
    NodeCommand nodeCommand = NodeCommand.builder()
      .script(resourceScript("files/error.js"))
      .outputConsumer(output::append)
      .errorConsumer(error::append)
      .pathResolver(getPathResolver())
      .build();
    nodeCommand.start();
    int exitValue = nodeCommand.waitFor();
    assertThat(output.toString()).isEqualTo("Hello!");
    assertThat(error.toString()).isEqualTo("Error!");
    assertThat(exitValue).isEqualTo(1);
  }

  @Test
  public void test_min_version() throws IOException {
    thrown.expect(NodeCommandException.class);
    thrown.expectMessage("Only Node.js v99 or later is supported, got");

    NodeCommand.builder()
      .minNodeVersion(99)
      .pathResolver(getPathResolver())
      .build();
  }

  @Test
  public void test_mac_default_executable_not_found() throws IOException {
    when(mockProcessWrapper.isMac()).thenReturn(true);
    thrown.expect(NodeCommandException.class);
    thrown.expectMessage("Default Node.js executable for MacOS does not exist.");

    NodeCommand.builder(mockProcessWrapper)
      .pathResolver(p -> "/file/does/not/exist")
      .build();
  }

  @Test
  public void test_min_version_positive() throws Exception {
    NodeCommand nodeCommand = NodeCommand.builder()
      .minNodeVersion(1)
      .script(resourceScript(PATH_TO_SCRIPT))
      .pathResolver(getPathResolver())
      .build();

    nodeCommand.start();
    int exitValue = nodeCommand.waitFor();
    assertThat(exitValue).isEqualTo(0);
  }

  @Test
  public void test_version_check() {
    assertThat(NodeCommandBuilderImpl.checkVersion("v5.1.1", 6)).isFalse();
    assertThat(NodeCommandBuilderImpl.checkVersion("v10.8.0", 6)).isTrue();
    assertThat(NodeCommandBuilderImpl.checkVersion("v10.8.0+123", 6)).isTrue();

    thrown.expect(NodeCommandException.class);
    thrown.expectMessage("Failed to parse Node.js version, got 'Invalid version'");
    assertThat(NodeCommandBuilderImpl.checkVersion("Invalid version", 6)).isFalse();
  }

  @Ignore
  @Test
  public void test_max_old_space_size_setting() throws IOException {
    String request = "v8.getHeapStatistics()";
    if (System.getProperty("os.name").startsWith("Mac")) {
      // on Mac Node.js is launched with "sh" so we need to escape
      request = "v8.getHeapStatistics\\(\\)";
    }
    StringBuilder output = new StringBuilder();
    NodeCommand command = NodeCommand.builder()
      .maxOldSpaceSize(2048)
      .nodeJsArgs("-p", request)
      .outputConsumer(output::append)
      .pathResolver(getPathResolver())
      .build();
    command.start();
    command.waitFor();
    Map map = new Gson().fromJson(output.toString(), Map.class);
    double total_available_size = (double) map.get("total_available_size");
    assertThat(total_available_size).isGreaterThan(2048 * 1000);
  }

  @Test
  public void test_executable_from_configuration() throws Exception {
    String NODE_EXECUTABLE_PROPERTY = "sonar.nodejs.executable";
    File nodeExecutable = temporaryFolder.newFile("custom-node");
    MapSettings mapSettings = new MapSettings();
    mapSettings.setProperty(NODE_EXECUTABLE_PROPERTY, nodeExecutable.getAbsolutePath());
    Configuration configuration = mapSettings.asConfig();
    NodeCommand nodeCommand = NodeCommand.builder(mockProcessWrapper)
      .configuration(configuration)
      .script("not-used")
      .build();
    nodeCommand.start();

    verify(mockProcessWrapper).start(processStartArgument.capture(), any());
    assertThat(processStartArgument.getValue()).contains(nodeExecutable.getAbsolutePath());
    await().until(() -> logTester.logs(LoggerLevel.INFO)
      .contains("Using Node.js executable " + nodeExecutable.getAbsolutePath() + " from property " + NODE_EXECUTABLE_PROPERTY + "."));
  }

  @Test
  public void test_node_with_deprecated_key() throws Exception {
    String NODE_EXECUTABLE_PROPERTY_TS = "sonar.typescript.node";
    File nodeExecutable = temporaryFolder.newFile("custom-node");
    MapSettings mapSettings = new MapSettings();
    mapSettings.setProperty(NODE_EXECUTABLE_PROPERTY_TS, nodeExecutable.getAbsolutePath());
    Configuration configuration = mapSettings.asConfig();
    NodeCommand nodeCommand = NodeCommand.builder(mockProcessWrapper)
      .configuration(configuration)
      .script("not-used")
      .build();
    nodeCommand.start();

    verify(mockProcessWrapper).start(processStartArgument.capture(), any());
    assertThat(processStartArgument.getValue()).contains(nodeExecutable.getAbsolutePath());
    await().until(() -> logTester.logs(LoggerLevel.WARN)
      .contains("The use of " + NODE_EXECUTABLE_PROPERTY_TS + " is deprecated, use sonar.nodejs.executable instead."));
    await().until(() -> logTester.logs(LoggerLevel.INFO)
      .contains("Using Node.js executable " + nodeExecutable.getAbsolutePath() + " from property " + NODE_EXECUTABLE_PROPERTY_TS + "."));
  }

  @Test
  public void test_node_with_both_key() throws Exception {
    String NODE_EXECUTABLE_PROPERTY_TS = "sonar.typescript.node";
    String NODE_EXECUTABLE_PROPERTY = "sonar.typescript.node";
    File nodeExecutable = temporaryFolder.newFile("custom-node");
    MapSettings mapSettings = new MapSettings();
    mapSettings.setProperty(NODE_EXECUTABLE_PROPERTY, nodeExecutable.getAbsolutePath());
    mapSettings.setProperty(NODE_EXECUTABLE_PROPERTY_TS, nodeExecutable.getAbsolutePath());
    Configuration configuration = mapSettings.asConfig();
    NodeCommand nodeCommand = NodeCommand.builder(mockProcessWrapper)
      .configuration(configuration)
      .script("not-used")
      .build();
    nodeCommand.start();

    verify(mockProcessWrapper).start(processStartArgument.capture(), any());
    assertThat(processStartArgument.getValue()).contains(nodeExecutable.getAbsolutePath());
    await().until(() -> logTester.logs(LoggerLevel.WARN)
      .contains("The use of " + NODE_EXECUTABLE_PROPERTY_TS + " is deprecated, use sonar.nodejs.executable instead."));
    await().until(() -> logTester.logs(LoggerLevel.INFO)
      .contains("Using Node.js executable " + nodeExecutable.getAbsolutePath() + " from property " + NODE_EXECUTABLE_PROPERTY + "."));
  }

  @Test
  public void test_empty_configuration() throws Exception {
    NodeCommand nodeCommand = NodeCommand.builder(mockProcessWrapper)
      .configuration(new MapSettings().asConfig())
      .script("not-used")
      .build();
    nodeCommand.start();

    verify(mockProcessWrapper).start(processStartArgument.capture(), any());
    assertThat(processStartArgument.getValue()).contains("node");
  }

  @Test
  public void test_non_existing_node_file() throws Exception {
    MapSettings settings = new MapSettings();
    settings.setProperty("sonar.nodejs.executable", "non-existing-file");
    NodeCommandBuilder nodeCommand = NodeCommand.builder(mockProcessWrapper)
      .configuration(settings.asConfig())
      .script("not-used");

    assertThatThrownBy(nodeCommand::build)
      .isInstanceOf(NodeCommandException.class)
      .hasMessage("Provided Node.js executable file does not exist.");

    await().until(() -> logTester.logs(LoggerLevel.ERROR)
      .contains("Provided Node.js executable file does not exist. Property 'sonar.nodejs.executable' was to 'non-existing-file'"));
  }

  @Test
  public void test_non_existing_node_file_deprecated_key() throws Exception {
    MapSettings settings = new MapSettings();
    settings.setProperty("sonar.typescript.node", "non-existing-file");
    NodeCommandBuilder nodeCommand = NodeCommand.builder(mockProcessWrapper)
      .configuration(settings.asConfig())
      .script("not-used");

    assertThatThrownBy(nodeCommand::build)
      .isInstanceOf(NodeCommandException.class)
      .hasMessage("Provided Node.js executable file does not exist.");

    await().until(() -> logTester.logs(LoggerLevel.ERROR)
      .contains("Provided Node.js executable file does not exist. Property 'sonar.typescript.node' was to 'non-existing-file'"));
  }

  @Test
  public void test_exception_start() throws Exception {
    IOException cause = new IOException("Error starting process");
    when(mockProcessWrapper.start(any(), any())).thenThrow(cause);
    NodeCommand nodeCommand = NodeCommand.builder(mockProcessWrapper)
      .script(resourceScript(PATH_TO_SCRIPT))
      .build();
    assertThatThrownBy(nodeCommand::start)
      .isInstanceOf(NodeCommandException.class)
      .hasMessageStartingWith("Error when running: '")
      .hasCause(cause);
  }

  @Test
  public void test_interrupted_waitFor() throws Exception {
    when(mockProcessWrapper.waitFor(any())).thenThrow(new InterruptedException());
    NodeCommand nodeCommand = NodeCommand.builder(mockProcessWrapper)
      .script(resourceScript(PATH_TO_SCRIPT))
      .build();
    nodeCommand.start();
    int exitValue = nodeCommand.waitFor();
    verify(mockProcessWrapper).interrupt();
    assertThat(logTester.logs()).contains("Interrupted while waiting for process to terminate.");
    assertThat(exitValue).isEqualTo(1);
  }

  @Test
  public void test_no_args() {
    NodeCommandBuilder commandBuilder = NodeCommand.builder(mockProcessWrapper);
    assertThatThrownBy(commandBuilder::build)
      .isInstanceOf(IllegalArgumentException.class)
      .hasMessage("Missing arguments for Node.js.");
  }

  @Test
  public void test_script_args() {
    NodeCommandBuilder commandBuilder = NodeCommand.builder(mockProcessWrapper).scriptArgs("arg");
    assertThatThrownBy(commandBuilder::build)
      .isInstanceOf(IllegalArgumentException.class)
      .hasMessage("No script provided, but script arguments found.");
  }

  @Test
  public void test_failed_get_version() throws Exception {
    when(mockProcessWrapper.waitFor(any())).thenReturn(1);
    NodeCommandBuilder commandBuilder = NodeCommand.builder(mockProcessWrapper)
      .minNodeVersion(8)
      .script(resourceScript(PATH_TO_SCRIPT));
    assertThatThrownBy(commandBuilder::build)
      .isInstanceOf(NodeCommandException.class)
      .hasMessage("Failed to determine the version of Node.js, exit value 1. Executed: 'node -v'");
  }

  @Test
  public void test_toString() throws IOException {
    when(mockProcessWrapper.isMac()).thenReturn(false);
    NodeCommand nodeCommand = NodeCommand.builder(mockProcessWrapper)
      .nodeJsArgs("-v")
      .script("script.js")
      .scriptArgs("arg1", "arg2")
      .build();

    assertThat(nodeCommand.toString()).endsWith("node -v script.js arg1 arg2");
  }

  @Test
  public void test_command_on_mac() throws Exception {
    when(mockProcessWrapper.isMac()).thenReturn(true);
    NodeCommand nodeCommand = NodeCommand.builder(mockProcessWrapper)
      .script("script.js")
      .pathResolver(getPathResolver())
      .build();
    nodeCommand.start();
    verify(mockProcessWrapper).start(processStartArgument.capture(), any());
     List<String> value = processStartArgument.getValue();
     assertThat(value).hasSize(2);
    assertThat(value.get(0)).endsWith("nodejs-utils/src/test/resources/package/node_modules/run-node/run-node");
    assertThat(value.get(1)).isEqualTo("script.js");
  }

  @Test
  public void test_missing_node() throws Exception {
    when(mockProcessWrapper.start(any(), any())).thenThrow(new IOException("CreateProcess error=2"));
    NodeCommand nodeCommand = NodeCommand.builder(mockProcessWrapper)
      .script("not-used")
      .build();

    assertThatThrownBy(nodeCommand::start).isInstanceOf(NodeCommandException.class);
  }

  @Test
  public void test_nodepath_setting() throws Exception {
    when(mockProcessWrapper.getenv(any())).thenReturn("/dir/previous");
    Path path = Paths.get("/dir/node_modules/typescript");
    NodeCommand nodeCommand = NodeCommand.builder(mockProcessWrapper)
      .addToNodePath(path)
      .script("script.js")
      .build();
    nodeCommand.start();
    verify(mockProcessWrapper).start(processStartArgument.capture(), processStartEnv.capture());
    assertThat(processStartEnv.getValue()).containsExactly(entry("NODE_PATH", "/dir/previous" + File.pathSeparator + path));
    assertThat(processStartArgument.getValue()).containsExactly("node", "script.js");
  }

  @Test
  public void setting_null_path_should_throw() throws Exception {
    assertThatThrownBy(() -> NodeCommand.builder(mockProcessWrapper)
      .addToNodePath(null)).isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  public void test_processwrapper() throws Exception {
    Path path = Paths.get("/dir/typescript");
    NodeCommand command = NodeCommand.builder()
      .addToNodePath(path)
      .script("script.js")
      .pathResolver(getPathResolver())
      .build();
    command.start();
    assertThat(command.toString()).startsWith("{NODE_PATH=" + path + "}");
    command.destroy();
  }

  private static String resourceScript(String script) throws URISyntaxException {
    return new File(NodeCommandTest.class.getResource("/" + script).toURI()).getAbsolutePath();
  }

  private static BundlePathResolver getPathResolver() {
    File file = new File("src/test/resources");
    return (p) -> new File(file.getAbsoluteFile(), p).getAbsolutePath();
  }
}
