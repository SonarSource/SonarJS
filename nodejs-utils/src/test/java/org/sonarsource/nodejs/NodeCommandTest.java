
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
package org.sonarsource.nodejs;


import com.google.gson.Gson;
import java.io.File;
import java.io.IOException;
import java.net.URISyntaxException;
import java.util.List;
import java.util.Map;
import org.junit.Before;
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

  @Mock
  private NodeCommand.ProcessWrapper mockProcessWrapper;


  @Before
  public void setUp() throws Exception {
    MockitoAnnotations.initMocks(this);
    when(mockProcessWrapper.start(any())).thenReturn(mock(Process.class));
  }

  @Test
  public void test() throws Exception {
    NodeCommand nodeCommand = NodeCommand.builder()
      .script(resourceScript(PATH_TO_SCRIPT))
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
      .build();
    nodeCommand.start();
    int exitValue = nodeCommand.waitFor();
    assertThat(output.toString()).isEqualTo("Hello!");
    assertThat(error.toString()).isEqualTo("Error!");
    assertThat(exitValue).isEqualTo(1);
  }

  @Test
  public void test_min_version() {
    thrown.expect(NodeCommandException.class);
    thrown.expectMessage("Only Node.js v99 or later is supported, got");

    NodeCommand.builder()
      .minNodeVersion(99)
      .build();
  }

  @Test
  public void test_min_version_positive() throws Exception {
    NodeCommand nodeCommand = NodeCommand.builder()
      .minNodeVersion(1)
      .script(resourceScript(PATH_TO_SCRIPT))
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

  @Test
  public void test_max_old_space_size_setting() {
    StringBuilder output = new StringBuilder();
    NodeCommand command = NodeCommand.builder()
      .maxOldSpaceSize(2048)
      .nodeJsArgs("-p", "v8.getHeapStatistics()")
      .outputConsumer(output::append)
      .build();
    command.start();
    command.waitFor();
    Map map = new Gson().fromJson(output.toString(), Map.class);
    double total_available_size = (double) map.get("total_available_size");
    assertThat(total_available_size).isGreaterThan(2048 * 1000);
  }


  @Test
  public void test_executable_from_configuration() throws Exception {
    File nodeExecutable = temporaryFolder.newFile("custom-node");
    MapSettings mapSettings = new MapSettings();
    mapSettings.setProperty("sonar.nodejs.executable", nodeExecutable.getAbsolutePath());
    Configuration configuration = mapSettings.asConfig();
    NodeCommand nodeCommand = NodeCommand.builder(mockProcessWrapper)
      .configuration(configuration)
      .script("not-used")
      .build();
    nodeCommand.start();

    verify(mockProcessWrapper).start(processStartArgument.capture());
    assertThat(processStartArgument.getValue()).contains(nodeExecutable.getAbsolutePath());
  }

  @Test
  public void test_empty_configuration() throws Exception {
    NodeCommand nodeCommand = NodeCommand.builder(mockProcessWrapper)
      .configuration(new MapSettings().asConfig())
      .script("not-used")
      .build();
    nodeCommand.start();

    verify(mockProcessWrapper).start(processStartArgument.capture());
    assertThat(processStartArgument.getValue()).contains("node");
  }

  @Test
  public void test_non_existing_node_file() throws Exception {
    MapSettings settings = new MapSettings();
    settings.setProperty("sonar.nodejs.executable", "non-existing-file");
    NodeCommand nodeCommand = NodeCommand.builder(mockProcessWrapper)
      .configuration(settings.asConfig())
      .script("not-used")
      .build();
    nodeCommand.start();

    verify(mockProcessWrapper).start(processStartArgument.capture());
    assertThat(processStartArgument.getValue()).contains("node");
    await().until(() -> logTester.logs(LoggerLevel.WARN).stream()
      .anyMatch(log -> log.startsWith("Provided Node.js executable file (property 'sonar.nodejs.executable') does not exist")));
    await().until(() -> logTester.logs(LoggerLevel.INFO).stream()
      .anyMatch(log -> log.startsWith("Using default Node.js executable: 'node'.")));
  }

  @Test
  public void test_exception_start() throws Exception {
    IOException cause = new IOException("Error starting process");
    when(mockProcessWrapper.start(any())).thenThrow(cause);
    NodeCommand nodeCommand = NodeCommand.builder(mockProcessWrapper)
      .script(resourceScript(PATH_TO_SCRIPT))
      .build();
    assertThatThrownBy(nodeCommand::start)
      .isInstanceOf(NodeCommandException.class)
      .hasMessageStartingWith("Error when starting the process: ")
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
      .hasMessage("Failed to run Node.js with -v to determine the version, exit value 1");
  }

  @Test
  public void test_toString() {
    NodeCommand nodeCommand = NodeCommand.builder()
      .nodeJsArgs("-v")
      .script("script.js")
      .scriptArgs("arg1", "arg2")
      .build();

    assertThat(nodeCommand.toString()).isEqualTo("node -v script.js arg1 arg2");
  }

  private static String resourceScript(String script) throws URISyntaxException {
    return new File(NodeCommandTest.class.getResource("/" + script).toURI()).getAbsolutePath();
  }
}
