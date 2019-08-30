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

import com.google.gson.Gson;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.List;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.DefaultTextPointer;
import org.sonar.api.batch.fs.internal.DefaultTextRange;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.rule.internal.ActiveRulesBuilder;
import org.sonar.api.batch.rule.internal.NewActiveRule;
import org.sonar.api.batch.sensor.highlighting.TypeOfText;
import org.sonar.api.batch.sensor.internal.DefaultSensorDescriptor;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.batch.sensor.issue.Issue;
import org.sonar.api.batch.sensor.issue.IssueLocation;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.api.issue.NoSonarFilter;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.FileLinesContext;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.utils.internal.JUnitTempFolder;
import org.sonar.api.utils.log.LogTester;
import org.sonar.api.utils.log.LoggerLevel;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.AnalysisRequest;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.AnalysisResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class TypeScriptSensorTest {

  private static final String ESLINT_BASED_RULE = "S3923";

  @Rule
  public LogTester logTester = new LogTester();

  @Rule
  public JUnitTempFolder tempFolder = new JUnitTempFolder();

  @Mock
  private EslintBridgeServer eslintBridgeServerMock;

  @Mock
  private FileLinesContextFactory fileLinesContextFactory;

  private SensorContextTester context;

  @Before
  public void setUp() throws Exception {
    MockitoAnnotations.initMocks(this);

    when(eslintBridgeServerMock.analyzeTypeScript(any())).thenReturn(new AnalysisResponse());
    context = SensorContextTester.create(tempFolder.newDir());

    FileLinesContext fileLinesContext = mock(FileLinesContext.class);
    when(fileLinesContextFactory.createFor(any(InputFile.class))).thenReturn(fileLinesContext);
  }

  @Test
  public void should_have_descriptor() throws Exception {
    DefaultSensorDescriptor descriptor = new DefaultSensorDescriptor();

    createSensor().describe(descriptor);
    assertThat(descriptor.name()).isEqualTo("ESLint-based TypeScript analysis");
    assertThat(descriptor.languages()).containsOnly("ts");
    assertThat(descriptor.type()).isEqualTo(Type.MAIN);
  }

  @Test
  public void should_analyse() throws Exception {
    AnalysisResponse expectedResponse = createResponse();
    when(eslintBridgeServerMock.analyzeTypeScript(any())).thenReturn(expectedResponse);

    TypeScriptSensor sensor = createSensor();
    DefaultInputFile inputFile = createInputFile(context);
    createTSConfigFile(context);
    
    sensor.execute(context);

    assertThat(context.allIssues()).hasSize(expectedResponse.issues.length);

    Iterator<Issue> issues = context.allIssues().iterator();
    Issue firstIssue = issues.next();
    Issue secondIssue = issues.next();

    IssueLocation location = firstIssue.primaryLocation();
    assertThat(location.inputComponent()).isEqualTo(inputFile);
    assertThat(location.message()).isEqualTo("Issue message");
    assertThat(location.textRange()).isEqualTo(new DefaultTextRange(new DefaultTextPointer(1, 2), new DefaultTextPointer(3, 4)));

    location = secondIssue.primaryLocation();
    assertThat(location.inputComponent()).isEqualTo(inputFile);
    assertThat(location.message()).isEqualTo("Line issue message");
    assertThat(location.textRange()).isEqualTo(new DefaultTextRange(new DefaultTextPointer(1, 0), new DefaultTextPointer(1, 9)));

    assertThat(firstIssue.ruleKey().rule()).isEqualTo("S3923");
    assertThat(secondIssue.ruleKey().rule()).isEqualTo("S3923");

    assertThat(context.highlightingTypeAt(inputFile.key(), 1, 0)).isNotEmpty();
    assertThat(context.highlightingTypeAt(inputFile.key(), 1, 0).get(0)).isEqualTo(TypeOfText.KEYWORD);
    assertThat(context.highlightingTypeAt(inputFile.key(), 2, 1)).isNotEmpty();
    assertThat(context.highlightingTypeAt(inputFile.key(), 2, 1).get(0)).isEqualTo(TypeOfText.CONSTANT);
    assertThat(context.highlightingTypeAt(inputFile.key(), 3, 0)).isEmpty();

    assertThat(context.measure(inputFile.key(), CoreMetrics.FUNCTIONS).value()).isEqualTo(1);
    assertThat(context.measure(inputFile.key(), CoreMetrics.STATEMENTS).value()).isEqualTo(2);
    assertThat(context.measure(inputFile.key(), CoreMetrics.CLASSES).value()).isEqualTo(3);
    assertThat(context.measure(inputFile.key(), CoreMetrics.NCLOC).value()).isEqualTo(3);
    assertThat(context.measure(inputFile.key(), CoreMetrics.COMMENT_LINES).value()).isEqualTo(3);

    assertThat(context.cpdTokens(inputFile.key())).hasSize(2);
  }

  @Test
  public void should_not_explode_if_no_response() throws Exception {
    when(eslintBridgeServerMock.analyzeTypeScript(any())).thenThrow(new IOException("error"));
    
    TypeScriptSensor sensor = createSensor();
    DefaultInputFile inputFile = createInputFile(context);
    sensor.execute(context);

    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("Failed to get response while analyzing " + inputFile);
    assertThat(context.allIssues()).isEmpty();
  }

  @Test
  public void should_lookup_tsconfig_files() throws Exception {
    Path baseDir = tempFolder.newDir().toPath();
    Path tsconfig1 = baseDir.resolve("tsconfig.json");
    Files.createFile(tsconfig1);
    Path subdir = baseDir.resolve("subdir");
    Files.createDirectory(subdir);
    Files.createDirectory(subdir.resolve("node_modules"));
    Path tsconfig2 = Files.createFile(subdir.resolve("tsconfig.json"));
    // these should not be taken into account
    Files.createFile(subdir.resolve("node_modules/tsconfig.json"));
    Files.createFile(subdir.resolve("base.tsconfig.json"));

    SensorContextTester ctx = SensorContextTester.create(baseDir);
    createInputFile(ctx, "file1.ts");
    createInputFile(ctx, "file2.ts");
    TypeScriptSensor typeScriptSensor = createSensor();
    typeScriptSensor.execute(ctx);

    ArgumentCaptor<AnalysisRequest> request = ArgumentCaptor.forClass(AnalysisRequest.class);
    verify(eslintBridgeServerMock, times(2)).analyzeTypeScript(request.capture());

    List<String> firstCall = request.getAllValues().get(0).tsConfigs;
    List<String> secondCall = request.getAllValues().get(1).tsConfigs;

    assertThat(firstCall).containsOnly(tsconfig1.toString(), tsconfig2.toString());

    // test that we cache the instance and don't lookup twice
    assertThat(firstCall).isSameAs(secondCall);
  }

  @Test
  public void should_use_tsconfig_from_property() throws Exception {
    Path baseDir = tempFolder.newDir().toPath();
    Files.createFile(baseDir.resolve("custom.tsconfig.json"));
    SensorContextTester ctx = SensorContextTester.create(baseDir);
    ctx.setSettings(new MapSettings().setProperty("sonar.typescript.tsconfigPath", "custom.tsconfig.json"));
    createInputFile(ctx);
    TypeScriptSensor typeScriptSensor = createSensor();
    typeScriptSensor.execute(ctx);

    ArgumentCaptor<AnalysisRequest> request = ArgumentCaptor.forClass(AnalysisRequest.class);
    verify(eslintBridgeServerMock).analyzeTypeScript(request.capture());

    String absolutePath = baseDir.resolve("custom.tsconfig.json").toAbsolutePath().toString();
    assertThat(request.getValue().tsConfigs).containsOnly(absolutePath);

    ctx.setSettings(new MapSettings().setProperty("sonar.typescript.tsconfigPath", absolutePath));
    createSensor().execute(ctx);
    assertThat(request.getValue().tsConfigs).containsOnly(absolutePath);
  }

  @Test
  public void should_log_and_stop_with_wrong_tsconfig() throws Exception {
    Path baseDir = tempFolder.newDir().toPath();
    SensorContextTester ctx = SensorContextTester.create(baseDir);
    ctx.setSettings(new MapSettings().setProperty("sonar.typescript.tsconfigPath", "wrong.json"));
    createInputFile(ctx);
    TypeScriptSensor typeScriptSensor = createSensor();
    typeScriptSensor.execute(ctx);

    verify(eslintBridgeServerMock, never()).analyzeTypeScript(any());

    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("Provided tsconfig.json path doesn't exist. Path: '" + baseDir.resolve("wrong.json") + "'");
  }

  private TypeScriptSensor createSensor() {
    return new TypeScriptSensor(checkFactory(ESLINT_BASED_RULE), new NoSonarFilter(), fileLinesContextFactory, eslintBridgeServerMock);
  }

  private AnalysisResponse createResponse() {
    return new Gson().fromJson("{" + createIssues() + "," + createHighlights() + "," + createMetrics() + "," + createCpdTokens() + "}", AnalysisResponse.class);
  }

  private String createIssues() {
    return "issues: [{"
    + "\"line\":1,\"column\":2,\"endLine\":3,\"endColumn\":4,\"ruleId\":\"no-all-duplicated-branches\",\"message\":\"Issue message\", \"secondaryLocations\": []},"
    + "{\"line\":1,\"column\":1,\"ruleId\":\"no-all-duplicated-branches\",\"message\":\"Line issue message\", \"secondaryLocations\": []"
    + "}]";
  }

  private String createHighlights() {
    return "highlights: ["
    + "{\"startLine\":1,\"startCol\":0,\"endLine\":1,\"endCol\":4,\"textType\":\"KEYWORD\"},"
    + "{\"startLine\":2,\"startCol\":1,\"endLine\":2,\"endCol\":5,\"textType\":\"CONSTANT\"}"
    + "]";
  }

  private String createMetrics() {
    return "metrics: {"
    + "\"ncloc\":[1, 2, 3],"
    + "\"commentLines\":[4, 5, 6],"
    + "\"nosonarLines\":[7, 8, 9],"
    + "\"executableLines\":[10, 11, 12],"
    + "\"functions\":1,"
    + "\"statements\":2,"
    + "\"classes\":3"
    + "}";
  }

  private String createCpdTokens() {
    return "cpdTokens: ["
    + "{\"startLine\":1,\"startCol\":0,\"endLine\":1,\"endCol\":4,\"image\":\"LITERAL\"},"
    + "{\"startLine\":2,\"startCol\":1,\"endLine\":2,\"endCol\":5,\"image\":\"if\"}"
    + "]";
  }

  private static DefaultInputFile createInputFile(SensorContextTester context) {
    return createInputFile(context, "dir/file.ts");
  }

  private static DefaultInputFile createInputFile(SensorContextTester context, String relativePath) {
    DefaultInputFile inputFile = new TestInputFileBuilder("moduleKey", relativePath)
      .setLanguage("ts")
      .setContents("if (cond)\ndoFoo(); \nelse \ndoFoo();")
      .build();
    context.fileSystem().add(inputFile);
    return inputFile;
  }

  private static void createTSConfigFile(SensorContextTester context) {
    DefaultInputFile inputFile = new TestInputFileBuilder("moduleKey", "tsconfig.json")
      .setContents("{\"compilerOptions\": {\"target\": \"es6\", \"allowJs\": true }}")
      .build();
    context.fileSystem().add(inputFile);
  }

  private static CheckFactory checkFactory(String... ruleKeys) {
    ActiveRulesBuilder builder = new ActiveRulesBuilder();
    for (String ruleKey : ruleKeys) {
      builder.addRule(new NewActiveRule.Builder().setRuleKey(RuleKey.of(CheckList.TS_REPOSITORY_KEY, ruleKey)).build());
    }
    return new CheckFactory(builder.build());
  }
}
