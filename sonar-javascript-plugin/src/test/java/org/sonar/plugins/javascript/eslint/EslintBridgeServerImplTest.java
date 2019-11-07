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
package org.sonar.plugins.javascript.eslint;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.config.Configuration;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.api.utils.internal.JUnitTempFolder;
import org.sonar.api.utils.log.LogTester;
import org.sonar.api.utils.log.LoggerLevel;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.AnalysisRequest;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.Rule;
import org.sonarsource.nodejs.NodeCommand;
import org.sonarsource.nodejs.NodeCommandBuilder;
import org.sonarsource.nodejs.NodeCommandException;

import static java.util.Collections.singletonList;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.sonar.api.utils.log.LoggerLevel.DEBUG;
import static org.sonar.api.utils.log.LoggerLevel.ERROR;
import static org.sonar.api.utils.log.LoggerLevel.INFO;
import static org.sonar.api.utils.log.LoggerLevel.WARN;

public class EslintBridgeServerImplTest {

  private static final String START_SERVER_SCRIPT = "startServer.js";
  private static final int TEST_TIMEOUT_SECONDS = 1;

  @org.junit.Rule
  public LogTester logTester = new LogTester();

  @org.junit.Rule
  public final ExpectedException thrown = ExpectedException.none();

  @org.junit.Rule
  public JUnitTempFolder tempFolder = new JUnitTempFolder();

  private SensorContextTester context;
  private EslintBridgeServerImpl eslintBridgeServer;
  private TestBundle testBundle = new TestBundle(START_SERVER_SCRIPT);

  @Before
  public void setUp() throws Exception {
    context = SensorContextTester.create(tempFolder.newDir());
  }

  @After
  public void tearDown() throws Exception {
    eslintBridgeServer.clean();
  }

  @Test
  public void should_throw_when_not_existing_script() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("NOT_EXISTING.js");
    eslintBridgeServer.deploy();

    thrown.expect(NodeCommandException.class);
    thrown.expectMessage("Node.js script to start eslint-bridge server doesn't exist:");

    eslintBridgeServer.startServer(context);
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

    eslintBridgeServer = new EslintBridgeServerImpl(new MapSettings().asConfig(), nodeCommandBuilder, TEST_TIMEOUT_SECONDS, testBundle);
    eslintBridgeServer.deploy();

    thrown.expect(NodeCommandException.class);
    thrown.expectMessage("msg");

    eslintBridgeServer.startServer(context);
  }

  @Test
  public void should_forward_process_streams() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("logging.js");
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context);

    assertThat(logTester.logs(DEBUG)).contains("testing debug log");
    assertThat(logTester.logs(WARN)).contains("testing warn log");
    assertThat(logTester.logs(INFO)).contains("testing info log");
  }

  @Test
  public void should_get_answer_from_server() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context);

    DefaultInputFile inputFile = TestInputFileBuilder.create("foo", "foo.js")
      .setContents("alert('Fly, you fools!')")
      .build();
    AnalysisRequest request = new AnalysisRequest(inputFile.absolutePath(), null, new Rule[0], true, null);
    assertThat(eslintBridgeServer.analyzeJavaScript(request).issues).isEmpty();
  }

  @Test
  public void should_get_answer_from_server_for_ts_request() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context);

    DefaultInputFile inputFile = TestInputFileBuilder.create("foo", "foo.ts")
      .setContents("alert('Fly, you fools!')")
      .build();
    DefaultInputFile tsConfig = TestInputFileBuilder.create("foo", "tsconfig.json")
      .setContents("{\"compilerOptions\": {\"target\": \"es6\", \"allowJs\": true }}")
      .build();
    AnalysisRequest request = new AnalysisRequest(inputFile.absolutePath(), null, new Rule[0], true,
      singletonList(tsConfig.absolutePath()));
    assertThat(eslintBridgeServer.analyzeTypeScript(request).issues).isEmpty();
  }

  @Test
  public void should_throw_if_failed_to_start() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("throw.js");
    eslintBridgeServer.deploy();

    thrown.expect(NodeCommandException.class);
    thrown.expectMessage("Failed to start server (" + TEST_TIMEOUT_SECONDS + "s timeout)");

    eslintBridgeServer.startServer(context);
  }

  @Test
  public void should_return_command_info() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    assertThat(eslintBridgeServer.getCommandInfo()).isEqualTo("Node.js command to start eslint-bridge server was not built yet.");

    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context);

    assertThat(eslintBridgeServer.getCommandInfo()).contains("Node.js command to start eslint-bridge was: ", "node", START_SERVER_SCRIPT);
    assertThat(eslintBridgeServer.getCommandInfo()).doesNotContain("--max-old-space-size");
  }

  @Test
  public void should_set_max_old_space_size() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    assertThat(eslintBridgeServer.getCommandInfo()).isEqualTo("Node.js command to start eslint-bridge server was not built yet.");

    eslintBridgeServer.deploy();
    context.setSettings(new MapSettings().setProperty("sonar.javascript.node.maxspace", 2048));
    eslintBridgeServer.startServer(context);

    assertThat(eslintBridgeServer.getCommandInfo()).contains("--max-old-space-size=2048");
  }

  @Test
  public void test_isAlive() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    assertThat(eslintBridgeServer.isAlive()).isFalse();
    eslintBridgeServer.startServerLazily(context);
    assertThat(eslintBridgeServer.isAlive()).isTrue();
    eslintBridgeServer.clean();
    assertThat(eslintBridgeServer.isAlive()).isFalse();
  }

  @Test
  public void test_lazy_start() throws Exception {
    String alreadyStarted = "SonarJS eslint-bridge server is up, no need to start.";
    String starting = "Starting Node.js process to start eslint-bridge server at port";
    eslintBridgeServer = createEslintBridgeServer("startServer.js");
    eslintBridgeServer.startServerLazily(context);
    assertThat(logTester.logs(DEBUG).stream().anyMatch(s -> s.startsWith(starting))).isTrue();
    assertThat(logTester.logs(DEBUG)).doesNotContain(alreadyStarted);
    logTester.clear();
    eslintBridgeServer.startServerLazily(context);
    assertThat(logTester.logs(DEBUG).stream().noneMatch(s -> s.startsWith(starting))).isTrue();
    assertThat(logTester.logs(DEBUG)).contains(alreadyStarted);
  }

  @Test
  public void should_throw_special_exception_when_failed_already() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("throw.js");
    String failedToStartExceptionMessage = "Failed to start server (" + TEST_TIMEOUT_SECONDS + "s timeout)";
    assertThatThrownBy(() -> eslintBridgeServer.startServerLazily(context))
      .isInstanceOf(NodeCommandException.class)
      .hasMessage(failedToStartExceptionMessage);

    assertThatThrownBy(() -> eslintBridgeServer.startServerLazily(context))
      .isInstanceOf(ServerAlreadyFailedException.class);
  }

  @Test
  public void should_not_explode_if_bad_json_response() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("badResponse.js");
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServerLazily(context);

    DefaultInputFile inputFile = TestInputFileBuilder.create("foo", "foo.js")
      .setContents("alert('Fly, you fools!')")
      .build();
    AnalysisRequest request = new AnalysisRequest(inputFile.absolutePath(), null, new Rule[0], true, null);
    EslintBridgeServer.AnalysisResponse response = eslintBridgeServer.analyzeJavaScript(request);
    assertThat(response.issues).isEmpty();

    assertThat(logTester.logs(LoggerLevel.ERROR).stream().anyMatch(log -> log.startsWith("Failed to parse response for file foo/foo.js: \n" +
      "-----\n" +
      "Invalid response\n" +
      "-----\n"))).isTrue();
    assertThat(context.allIssues()).isEmpty();
  }

  @Test
  public void should_use_typescript_from_property() throws Exception {
    Path path = Paths.get("/tmp/my/");
    Configuration configuration = new MapSettings()
      .setProperty("sonar.typescript.internal.typescriptLocation", path.toString())
      .asConfig();
    eslintBridgeServer = new EslintBridgeServerImpl(configuration, NodeCommand.builder(), TEST_TIMEOUT_SECONDS, testBundle);
    eslintBridgeServer.deploy();
    SensorContextTester ctx = SensorContextTester.create(tempFolder.newDir());
    DefaultInputFile tsFile = TestInputFileBuilder.create("", "foo.ts").setLanguage("ts").build();
    ctx.fileSystem().add(tsFile);
    eslintBridgeServer.startServer(ctx);
    assertThat(eslintBridgeServer.getCommandInfo())
      .startsWith("Node.js command to start eslint-bridge was: {NODE_PATH=" + path.toAbsolutePath() + "}");
  }

  @Test
  public void should_use_typescript_from_filesystem() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    eslintBridgeServer.deploy();
    Path baseDir = tempFolder.newDir().toPath();
    SensorContextTester ctx = SensorContextTester.create(baseDir);
    DefaultInputFile tsFile = TestInputFileBuilder.create("", "foo.ts").setLanguage("ts").build();
    ctx.fileSystem().add(tsFile);
    Path tsDir = baseDir.resolve("dir/node_modules/typescript");
    Files.createDirectories(tsDir);
    eslintBridgeServer.startServer(ctx);
    assertThat(eslintBridgeServer.getCommandInfo())
      .startsWith("Node.js command to start eslint-bridge was: {NODE_PATH=" + baseDir.resolve("dir/node_modules") + "}");
  }

  @Test
  public void should_not_search_typescript_when_no_ts_file() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    eslintBridgeServer.deploy();
    Path baseDir = tempFolder.newDir().toPath();
    SensorContextTester ctx = SensorContextTester.create(baseDir);
    Path tsDir = baseDir.resolve("dir/node_modules/typescript");
    Files.createDirectories(tsDir);
    eslintBridgeServer.startServer(ctx);
    assertThat(eslintBridgeServer.getCommandInfo()).doesNotContain("NODE_PATH");
  }

  @Test
  public void should_log_when_typescript_not_found() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    eslintBridgeServer.deploy();
    Path baseDir = tempFolder.newDir().toPath();
    SensorContextTester ctx = SensorContextTester.create(baseDir);
    DefaultInputFile tsFile = TestInputFileBuilder.create("", "foo.ts").setLanguage("ts").build();
    ctx.fileSystem().add(tsFile);
    eslintBridgeServer.startServer(ctx);
    assertThat(eslintBridgeServer.getCommandInfo()).doesNotContain("NODE_PATH");
    assertThat(logTester.logs(INFO)).contains("TypeScript dependency was not found inside project directory, Node.js will search TypeScript using " +
      "module resolution algorithm; analysis will fail without TypeScript.");
  }

  @Test
  public void should_reload_tsconfig() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context);
    assertThat(eslintBridgeServer.newTsConfig()).isTrue();
  }

  @Test
  public void should_return_files_for_tsconfig() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context);
    String tsconfig = "path/to/tsconfig.json";
    EslintBridgeServerImpl.TsConfigResponse tsConfigResponse = eslintBridgeServer.tsConfigFiles(tsconfig);
    assertThat(tsConfigResponse.files).contains("abs/path/file1", "abs/path/file2", "abs/path/file3");
    assertThat(tsConfigResponse.error).isNull();

    TsConfigFile tsConfigFile = eslintBridgeServer.loadTsConfig(tsconfig);
    assertThat(tsConfigFile.files).contains("abs/path/file1", "abs/path/file2", "abs/path/file3");
    assertThat(tsConfigFile.filename).isEqualTo(tsconfig);
  }

  @Test
  public void should_return_no_files_for_tsconfig_bad_response() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("badResponse.js");
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context);
    EslintBridgeServerImpl.TsConfigResponse response = eslintBridgeServer.tsConfigFiles("path/to/tsconfig.json");
    assertThat(response.files).isEmpty();
    assertThat(response.error).isEqualTo("Invalid response");
  }

  @Test
  public void should_return_no_files_for_tsconfig_no_response() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("badResponse.js");
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context);
    assertThat(eslintBridgeServer.tsConfigFiles("path/to/tsconfig.json").files).isEmpty();
    TsConfigFile tsConfigFile = eslintBridgeServer.loadTsConfig("path/to/tsconfig.json");
    assertThat(tsConfigFile.files).isEmpty();
  }

  @Test
  public void should_return_no_files_for_tsconfig_on_error() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("tsConfigError.js");
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context);

    TsConfigFile tsConfigFile = eslintBridgeServer.loadTsConfig("path/to/tsconfig.json");
    assertThat(tsConfigFile.files).isEmpty();
    assertThat(logTester.logs(ERROR)).contains("Other error");
  }

  @Test
  public void missing_typescript() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("missingTs.js");
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context);
    assertThatThrownBy(() -> eslintBridgeServer.loadTsConfig("tsconfig.json"))
      .isInstanceOf(MissingTypeScriptException.class);

    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("TypeScript dependency was not found and it is required for analysis.");
  }

  private EslintBridgeServerImpl createEslintBridgeServer(String startServerScript) {
    return new EslintBridgeServerImpl(new MapSettings().asConfig(), NodeCommand.builder(), TEST_TIMEOUT_SECONDS, new TestBundle(startServerScript));
  }

  static class TestBundle implements Bundle {

    final String startServerScript;

    TestBundle(String startServerScript) {
      this.startServerScript = startServerScript;
    }

    @Override
    public void deploy() {
      // no-op for unit test
    }

    @Override
    public String startServerScript() {
      return "src/test/resources/mock-eslint-bridge/" + startServerScript;
    }
  }
}
