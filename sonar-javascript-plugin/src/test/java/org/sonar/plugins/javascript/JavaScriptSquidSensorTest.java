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
import java.nio.charset.Charset;
import java.util.Collection;
import org.apache.commons.lang.NotImplementedException;
import org.junit.Before;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.DefaultTextPointer;
import org.sonar.api.batch.fs.internal.DefaultTextRange;
import org.sonar.api.batch.fs.internal.FileMetadata;
import org.sonar.api.batch.rule.ActiveRules;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.rule.internal.ActiveRulesBuilder;
import org.sonar.api.batch.sensor.internal.DefaultSensorDescriptor;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.batch.sensor.issue.Issue;
import org.sonar.api.config.Settings;
import org.sonar.api.internal.google.common.base.Charsets;
import org.sonar.api.issue.NoSonarFilter;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.FileLinesContext;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.rule.RuleKey;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.checks.CheckList;
import org.sonar.javascript.tree.visitors.CharsetAwareVisitor;
import org.sonar.plugins.javascript.api.CustomJavaScriptRulesDefinition;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.LineIssue;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;
import org.sonar.squidbridge.ProgressReport;
import org.sonar.squidbridge.api.AnalysisException;

import static org.fest.assertions.Assertions.assertThat;
import static org.mockito.Matchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class JavaScriptSquidSensorTest {

  @org.junit.Rule
  public final ExpectedException thrown = ExpectedException.none();

  private FileLinesContextFactory fileLinesContextFactory;
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

  private final File baseDir = new File("src/test/resources");
  private final Settings settings = new Settings();
  private final ProgressReport progressReport = mock(ProgressReport.class);
  private final SensorContextTester context = SensorContextTester.create(baseDir);

  private JavaScriptSquidSensor createSensor() {
    return new JavaScriptSquidSensor(checkFactory, fileLinesContextFactory, context.fileSystem(), new NoSonarFilter(), settings, CUSTOM_RULES);
  }

  @Before
  public void setUp() {
    fileLinesContextFactory = mock(FileLinesContextFactory.class);
    FileLinesContext fileLinesContext = mock(FileLinesContext.class);
    when(fileLinesContextFactory.createFor(any(InputFile.class))).thenReturn(fileLinesContext);
  }

  @Test
  public void sensor_descriptor() {
    DefaultSensorDescriptor descriptor = new DefaultSensorDescriptor();

    createSensor().describe(descriptor);
    assertThat(descriptor.name()).isEqualTo("JavaScript Squid Sensor");
    assertThat(descriptor.languages()).containsOnly("js");
    assertThat(descriptor.type()).isEqualTo(Type.MAIN);
  }

  @Test
  public void should_analyse() {
    String relativePath = "cpd/Person.js";
    inputFile(relativePath);
    settings.setProperty(JavaScriptPlugin.IGNORE_HEADER_COMMENTS, true);

    createSensor().execute(context);

    String key = "moduleKey:" + relativePath;

    assertThat(context.measure(key, CoreMetrics.LINES).value()).isEqualTo(33);
    assertThat(context.measure(key, CoreMetrics.NCLOC).value()).isEqualTo(19);
    assertThat(context.measure(key, CoreMetrics.CLASSES).value()).isEqualTo(1);
    assertThat(context.measure(key, CoreMetrics.FUNCTIONS).value()).isEqualTo(5);
    assertThat(context.measure(key, CoreMetrics.STATEMENTS).value()).isEqualTo(8);
    assertThat(context.measure(key, CoreMetrics.COMPLEXITY).value()).isEqualTo(6);
    assertThat(context.measure(key, CoreMetrics.COMPLEXITY_IN_CLASSES).value()).isEqualTo(1);
    assertThat(context.measure(key, CoreMetrics.COMPLEXITY_IN_FUNCTIONS).value()).isEqualTo(6);
    assertThat(context.measure(key, CoreMetrics.COMMENT_LINES).value()).isEqualTo(1);
  }

  @Test
  public void parsing_error() {
    String relativePath = "cpd/parsingError.js";
    inputFile(relativePath);

    String parsingErrorCheckKey = "ParsingError";


    ActiveRules activeRules = (new ActiveRulesBuilder())
      .create(RuleKey.of(CheckList.REPOSITORY_KEY, parsingErrorCheckKey))
      .setName("ParsingError")
      .activate()
      .build();

    checkFactory = new CheckFactory(activeRules);

    context.setActiveRules(activeRules);
    createSensor().execute(context);
    Collection<Issue> issues = context.allIssues();
    assertThat(issues).hasSize(1);
    Issue issue = issues.iterator().next();
    assertThat(issue.primaryLocation().textRange().start().line()).isEqualTo(3);
  }

  @Test
  public void save_issue() throws Exception {
    inputFile("file.js");

    ActiveRules activeRules = (new ActiveRulesBuilder())
      .create(RuleKey.of(CheckList.REPOSITORY_KEY, "MissingNewlineAtEndOfFile"))
      .activate()
      .create(RuleKey.of(CheckList.REPOSITORY_KEY, "VariableDeclarationAfterUsage"))
      .activate()
      .build();

    checkFactory = new CheckFactory(activeRules);
    createSensor().execute(context);
    Collection<Issue> issues = context.allIssues();
    assertThat(issues).hasSize(2);
  }

  @Test
  public void custom_rule() throws Exception {
    inputFile("file.js");
    ActiveRules activeRules = (new ActiveRulesBuilder())
      .create(RuleKey.of("customKey", "key"))
      .activate()
      .build();
    checkFactory = new CheckFactory(activeRules);
    createSensor().execute(context);

    Collection<Issue> issues = context.allIssues();
    assertThat(issues).hasSize(1);
    Issue issue = issues.iterator().next();
    assertThat(issue.gap()).isEqualTo(42);
    assertThat(issue.primaryLocation().message()).isEqualTo("Message of custom rule");
    assertThat(issue.primaryLocation().textRange()).isEqualTo(new DefaultTextRange(new DefaultTextPointer(1, 0), new DefaultTextPointer(1, 7)));
  }

  @Test
  public void progress_report_should_be_stopped() throws Exception {
    InputFile inputFile = inputFile("cpd/Person.js");
    createSensor().analyseFiles(context, ImmutableList.<TreeVisitor>of(), ImmutableList.of(inputFile), progressReport);
    verify(progressReport).stop();
  }

  @Test
  public void progress_report_should_be_stopped_without_files() throws Exception {
    createSensor().analyseFiles(context, ImmutableList.<TreeVisitor>of(), ImmutableList.<InputFile>of(), progressReport);
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
    JavaScriptSquidSensor sensor = createSensor();
    thrown.expect(AnalysisException.class);
    thrown.expectMessage(expectedMessageSubstring);
    try {
      sensor.analyseFiles(context, ImmutableList.of((TreeVisitor)check), ImmutableList.of(inputFile), progressReport);
    } finally {
      verify(progressReport).cancel();
    }
  }

  @Test
  public void test_exclude_minified_files() {
    inputFile("test_minified/file.js");
    inputFile("test_minified/file.min.js");
    inputFile("test_minified/file-min.js");

    createSensor().execute(context);

    assertThat(context.measure("moduleKey:test_minified/file.js", CoreMetrics.NCLOC)).isNotNull();
    assertThat(context.measure("moduleKey:test_minified/file.min.js", CoreMetrics.NCLOC)).isNull();
    assertThat(context.measure("moduleKey:test_minified/file-min.js", CoreMetrics.NCLOC)).isNull();
  }

  private DefaultInputFile inputFile(String relativePath) {
    DefaultInputFile inputFile = new DefaultInputFile("moduleKey", relativePath)
      .setModuleBaseDir(baseDir.toPath())
      .setType(Type.MAIN)
      .setLanguage(JavaScriptLanguage.KEY);

    context.fileSystem().add(inputFile);

    return inputFile.initMetadata(new FileMetadata().readMetadata(inputFile.file(), Charsets.UTF_8));
  }

  private final class ExceptionRaisingCheck extends DoubleDispatchVisitorCheck {

    private final RuntimeException exception;

    public ExceptionRaisingCheck(RuntimeException exception) {
      this.exception = exception;
    }

    @Override
    public TreeVisitorContext getContext() {
      return null;
    }

    @Override
    public LineIssue addLineIssue(Tree tree, String message) {
      throw new NotImplementedException();
    }

    @Override
    public void visitScript(ScriptTree tree) {
      throw exception;
    }
  }

  @Rule(
    key = "key",
    name = "name",
    description = "desc",
    tags = {"bug"})
  public static class MyCustomRule extends DoubleDispatchVisitorCheck implements CharsetAwareVisitor {
    @RuleProperty(
      key = "customParam",
      description = "Custome parameter",
      defaultValue = "value")
    public String customParam = "value";

    Charset charset;

    @Override
    public void setCharset(Charset charset) {
      this.charset = charset;
    }

    @Override
    public void visitScript(ScriptTree tree) {
      addIssue(new LineIssue(this, 1, "Message of custom rule")).cost(42);
    }
  }

}
