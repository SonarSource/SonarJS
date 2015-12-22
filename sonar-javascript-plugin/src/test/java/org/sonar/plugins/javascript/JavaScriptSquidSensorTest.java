/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
package org.sonar.plugins.javascript;

import com.google.common.collect.ImmutableList;
import com.sonar.sslr.api.RecognitionException;
import java.io.File;
import java.io.InterruptedIOException;
import org.junit.Before;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.DefaultFileSystem;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.rule.ActiveRules;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.rule.internal.ActiveRulesBuilder;
import org.sonar.api.component.ResourcePerspectives;
import org.sonar.api.config.Settings;
import org.sonar.api.issue.Issuable;
import org.sonar.api.issue.Issue;
import org.sonar.api.issue.NoSonarFilter;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.FileLinesContext;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.resources.Project;
import org.sonar.api.resources.Resource;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.source.Highlightable;
import org.sonar.api.source.Symbolizable;
import org.sonar.api.source.Symbolizable.SymbolTableBuilder;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.api.CustomJavaScriptRulesDefinition;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;
import org.sonar.squidbridge.ProgressReport;
import org.sonar.squidbridge.api.AnalysisException;

import static org.fest.assertions.Assertions.assertThat;
import static org.mockito.Matchers.any;
import static org.mockito.Matchers.anyDouble;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class JavaScriptSquidSensorTest {

  @org.junit.Rule
  public final ExpectedException thrown = ExpectedException.none();

  private FileLinesContextFactory fileLinesContextFactory;
  private final Project project = new Project("project");
  private CheckFactory checkFactory = new CheckFactory(mock(ActiveRules.class));
  private final CustomJavaScriptRulesDefinition[] CUSTOM_RULES = {new CustomJavaScriptRulesDefinition() {
    @Override
    public String repositoryName() {
      return "custom name";
    }

    @Override
    public String repositoryKey() {
      return "customKey";
    }

    @Override
    public Class[] checkClasses() {
      return new Class[]{MyCustomRule.class};
    }
  }};

  private final ResourcePerspectives perspectives = mock(ResourcePerspectives.class);
  private final DefaultFileSystem fileSystem = new DefaultFileSystem();
  private final Settings settings = new Settings();
  private final ProgressReport progressReport = mock(ProgressReport.class);
  private final SensorContext context = mock(SensorContext.class);

  private JavaScriptSquidSensor createSensor() {
    return new JavaScriptSquidSensor(checkFactory, fileLinesContextFactory, perspectives, fileSystem, new NoSonarFilter(), settings, CUSTOM_RULES);
  }

  @Before
  public void setUp() {
    fileLinesContextFactory = mock(FileLinesContextFactory.class);
    FileLinesContext fileLinesContext = mock(FileLinesContext.class);
    when(fileLinesContextFactory.createFor(any(InputFile.class))).thenReturn(fileLinesContext);
  }

  @Test
  public void should_execute_if_js_files() {
    JavaScriptSquidSensor sensor = createSensor();

    // no JS files -> do not execute
    assertThat(sensor.shouldExecuteOnProject(project)).isFalse();

    // at least one JS file -> do execute
    fileSystem.add(new DefaultInputFile("file.js").setType(InputFile.Type.MAIN).setLanguage(JavaScriptLanguage.KEY));
    assertThat(sensor.shouldExecuteOnProject(project)).isTrue();
  }

  @Test
  public void should_analyse() {
    InputFile inputFile = inputFile("cpd/Person.js");
    fileSystem.add(inputFile);

    SensorContext context = mock(SensorContext.class);
    mockInputFile(inputFile, context);

    settings.setProperty(JavaScriptPlugin.IGNORE_HEADER_COMMENTS, true);

    createSensor().analyse(project, context);

    verify(context).saveMeasure(any(InputFile.class), eq(CoreMetrics.LINES), eq(33.0));
    verify(context).saveMeasure(any(InputFile.class), eq(CoreMetrics.NCLOC), eq(19.0));
    verify(context).saveMeasure(any(InputFile.class), eq(CoreMetrics.CLASSES), eq(1.0));
    verify(context).saveMeasure(any(InputFile.class), eq(CoreMetrics.FUNCTIONS), eq(3.0));
    verify(context).saveMeasure(any(InputFile.class), eq(CoreMetrics.ACCESSORS), eq(2.0));
    verify(context).saveMeasure(any(InputFile.class), eq(CoreMetrics.STATEMENTS), eq(8.0));
    verify(context).saveMeasure(any(InputFile.class), eq(CoreMetrics.COMPLEXITY), eq(4.0));
    verify(context).saveMeasure(any(InputFile.class), eq(CoreMetrics.COMPLEXITY_IN_CLASSES), eq(1.0));
    verify(context).saveMeasure(any(InputFile.class), eq(CoreMetrics.COMPLEXITY_IN_FUNCTIONS), eq(4.0));
    verify(context).saveMeasure(any(InputFile.class), eq(CoreMetrics.COMMENT_LINES), eq(1.0));
  }

  @Test
  public void parsing_error() {
    InputFile inputFile = inputFile("cpd/parsingError.js");
    fileSystem.add(inputFile);

    Highlightable highlightable = mock(Highlightable.class);
    Highlightable.HighlightingBuilder builder = mock(Highlightable.HighlightingBuilder.class);
    when(perspectives.as(Highlightable.class, inputFile)).thenReturn(highlightable);
    when(highlightable.newHighlighting()).thenReturn(builder);

    String parsingErrorCheckKey = "ParsingError";

    ActiveRules activeRules = (new ActiveRulesBuilder())
      .create(RuleKey.of(CheckList.REPOSITORY_KEY, parsingErrorCheckKey))
      .setName("ParsingError")
      .activate()
      .build();

    checkFactory = new CheckFactory(activeRules);

    Resource resource = mock(Resource.class);
    Issuable.IssueBuilder issueBuilder = mock(Issuable.IssueBuilder.class);
    Issue issue = mock(Issue.class);
    Issuable issuable = mock(Issuable.class);

    mockPerspectives(inputFile, issuable);
    when(resource.getEffectiveKey()).thenReturn("someKey");
    when(context.getResource(inputFile)).thenReturn(resource);
    when(issuable.newIssueBuilder()).thenReturn(issueBuilder);
    when(issueBuilder.ruleKey(any(RuleKey.class))).thenReturn(issueBuilder);
    when(issueBuilder.line(3)).thenReturn(issueBuilder);
    when(issueBuilder.message(any(String.class))).thenReturn(issueBuilder);
    when(issueBuilder.build()).thenReturn(issue);
    when(issuable.addIssue(issue)).thenReturn(true);

    createSensor().analyse(project, context);

    verify(issuable).addIssue(any(Issue.class));
  }

  @Test
  public void progress_report_should_be_stopped() throws Exception {
    InputFile inputFile = inputFile("cpd/Person.js");
    mockPerspectives(inputFile, mock(Issuable.class));
    createSensor().analyseFiles(context, ImmutableList.<JavaScriptCheck>of(), ImmutableList.of(inputFile), progressReport);
    verify(progressReport).stop();
  }

  @Test
  public void progress_report_should_be_stopped_without_files() throws Exception {
    createSensor().analyseFiles(context, ImmutableList.<JavaScriptCheck>of(), ImmutableList.<InputFile>of(), progressReport);
    verify(progressReport).stop();
  }

  @Test
  public void cancelled_analysis() throws Exception {
    JavaScriptCheck check = new ExceptionRaisingCheck(new IllegalStateException(new InterruptedException()));
    analyseFileWithException(check, inputFile("cpd/Person.js"), "Analysis cancelled");
  }

  @Test
  public void cancelled_analysis_causing_recognition_exception() throws Exception {
    JavaScriptCheck check = new ExceptionRaisingCheck(new RecognitionException(42, "message", new InterruptedIOException()));
    analyseFileWithException(check, inputFile("cpd/Person.js"), "Analysis cancelled");
  }

  @Test
  public void exception_should_report_file_name() throws Exception {
    JavaScriptCheck check = new ExceptionRaisingCheck(new IllegalStateException());
    analyseFileWithException(check, inputFile("cpd/Person.js"), "Person.js");
  }

  private void analyseFileWithException(JavaScriptCheck check, InputFile inputFile, String expectedMessageSubstring) {
    mockPerspectives(inputFile, mock(Issuable.class));
    JavaScriptSquidSensor sensor = createSensor();
    thrown.expect(AnalysisException.class);
    thrown.expectMessage(expectedMessageSubstring);
    try {
      sensor.analyseFiles(context, ImmutableList.of(check), ImmutableList.of(inputFile), progressReport);
    } finally {
      verify(progressReport).cancel();
    }
  }

  @Test
  public void not_analyse_minified_files_default_config() throws Exception {
    testExcludeMinifiedFileProperty(true);

  }

  @Test
  public void analyse_minified_files_user_config() throws Exception {
    testExcludeMinifiedFileProperty(false);
  }

  private void testExcludeMinifiedFileProperty(boolean excludeMinified) {
    SensorContext context = mock(SensorContext.class);
    settings.setProperty(JavaScriptPlugin.EXCLUDE_MINIFIED_FILES, excludeMinified);
    InputFile inputFile1 = inputFile("test_minified/file.js");
    InputFile inputFile2 = inputFile("test_minified/file.min.js");
    InputFile inputFile3 = inputFile("test_minified/file-min.js");
    fileSystem.add(inputFile1);
    fileSystem.add(inputFile2);
    fileSystem.add(inputFile3);


    mockInputFile(inputFile1, context);
    mockInputFile(inputFile2, context);
    mockInputFile(inputFile3, context);

    createSensor().analyse(project, context);

    int times = 3;
    if (excludeMinified) {
      times = 1;
    }
    verify(context, times(times)).saveMeasure(any(InputFile.class), eq(CoreMetrics.NCLOC), anyDouble());
  }

  private void mockInputFile(InputFile inputFile, SensorContext context) {
    Highlightable highlightable = mock(Highlightable.class);
    Highlightable.HighlightingBuilder builder = mock(Highlightable.HighlightingBuilder.class);
    Resource resource = mock(Resource.class);
    mockPerspectives(inputFile, mock(Issuable.class));
    when(perspectives.as(Highlightable.class, inputFile)).thenReturn(highlightable);
    when(highlightable.newHighlighting()).thenReturn(builder);
    when(resource.getEffectiveKey()).thenReturn("someKey");
    when(context.getResource(inputFile)).thenReturn(resource);
  }

  @Test
  public void test_to_string() {
    assertThat(createSensor().toString()).isNotNull();
  }

  private void mockPerspectives(InputFile inputFile, Issuable issuable) {
    when(perspectives.as(Issuable.class, inputFile)).thenReturn(issuable);
    Symbolizable symbolizable = mock(Symbolizable.class);
    when(symbolizable.newSymbolTableBuilder()).thenReturn(mock(SymbolTableBuilder.class));
    when(perspectives.as(Symbolizable.class, inputFile)).thenReturn(symbolizable);
  }

  private InputFile inputFile(String fileName) {
    String relativePath = "src/test/resources/" + fileName;
    return new DefaultInputFile(relativePath)
      .setAbsolutePath(new File(relativePath).getAbsolutePath())
      .setType(InputFile.Type.MAIN)
      .setLanguage(JavaScriptLanguage.KEY);
  }

  private final class ExceptionRaisingCheck implements JavaScriptCheck {

    private final RuntimeException exception;

    public ExceptionRaisingCheck(RuntimeException exception) {
      this.exception = exception;
    }

    @Override
    public TreeVisitorContext getContext() {
      return null;
    }

    @Override
    public void scanFile(TreeVisitorContext context) {
      throw exception;
    }
  }

  @Rule(
    key = "key",
    name = "name",
    description = "desc",
    tags = {"bug"})
  public class MyCustomRule extends BaseTreeVisitor {
    @RuleProperty(
      key = "customParam",
      description = "Custome parameter",
      defaultValue = "value")
    public String customParam = "value";
  }

}
