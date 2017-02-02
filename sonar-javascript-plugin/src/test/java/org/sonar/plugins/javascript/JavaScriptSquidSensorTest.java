/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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
package org.sonar.plugins.javascript;

import com.google.common.collect.ImmutableList;
import com.sonar.sslr.api.RecognitionException;
import java.io.File;
import java.io.InterruptedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import org.apache.commons.lang.NotImplementedException;
import org.junit.Before;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.sonar.api.SonarQubeSide;
import org.sonar.api.SonarRuntime;
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
import org.sonar.api.config.MapSettings;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.internal.google.common.base.Charsets;
import org.sonar.api.issue.NoSonarFilter;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.FileLinesContext;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.utils.Version;
import org.sonar.api.utils.log.LogTester;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.checks.CheckList;
import org.sonar.javascript.compat.CompatibleInputFile;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Matchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.sonar.javascript.compat.CompatibilityHelper.wrap;
import static org.sonar.plugins.javascript.JavaScriptPlugin.FORCE_ZERO_COVERAGE_KEY;

public class JavaScriptSquidSensorTest {

  private static final SonarRuntime SONAR_RUNTIME_6_1 = SonarRuntimeImpl.forSonarQube(Version.create(6, 1), SonarQubeSide.SERVER);
  private static final SonarRuntime SONAR_RUNTIME_6_2 = SonarRuntimeImpl.forSonarQube(Version.create(6, 2), SonarQubeSide.SERVER);

  private static final Version SONARLINT_DETECTABLE_VERSION = Version.create(6, 0);
  private static final SonarRuntime SONARLINT_RUNTIME = SonarRuntimeImpl.forSonarLint(SONARLINT_DETECTABLE_VERSION);
  private static final SonarRuntime NOSONARLINT_RUNTIME = SonarRuntimeImpl.forSonarQube(SONARLINT_DETECTABLE_VERSION, SonarQubeSide.SERVER);

  private static final String UT_LCOV = "reports/report_ut.lcov";
  private static final String IT_LCOV = "reports/report_it.lcov";

  @org.junit.Rule
  public final ExpectedException thrown = ExpectedException.none();

  @org.junit.Rule
  public LogTester logTester = new LogTester();

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
      return new Class[] {MyCustomRule.class};
    }
  }};

  private File baseDir = new File("src/test/resources");
  private final ProgressReport progressReport = mock(ProgressReport.class);
  private SensorContextTester context = SensorContextTester.create(baseDir);

  private JavaScriptSquidSensor createSensor() {
    return new JavaScriptSquidSensor(checkFactory, fileLinesContextFactory, context.fileSystem(), new NoSonarFilter(), CUSTOM_RULES);
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
    context.settings().setProperty(JavaScriptPlugin.IGNORE_HEADER_COMMENTS, true);

    createSensor().execute(context);

    String key = "moduleKey:" + relativePath;

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

    assertThat(context.allAnalysisErrors()).hasSize(1);
  }

  @Test
  public void technical_error_should_add_error_to_context() {
    thrown.expect(AnalysisException.class);

    JavaScriptCheck check = new ExceptionRaisingCheck(new NullPointerException("NPE forcibly raised by check class"));

    createSensor().analyseFiles(context, ImmutableList.of((TreeVisitor) check), ImmutableList.of(inputFile("file.js")), progressReport);
    assertThat(context.allAnalysisErrors()).hasSize(1);
  }

  @Test
  public void analysis_with_no_issue_should_not_add_error_to_context() {
    inputFile("file.js");

    createSensor().execute(context);

    Collection<Issue> issues = context.allIssues();
    assertThat(issues).hasSize(0);

    assertThat(context.allAnalysisErrors()).isEmpty();
  }

  @Test
  public void analysis_with_issues_should_not_add_error_to_context() {
    inputFile("file.js");

    ActiveRules activeRules = (new ActiveRulesBuilder())
      .create(RuleKey.of(CheckList.REPOSITORY_KEY, "MissingNewlineAtEndOfFile"))
      .activate()
      .build();
    checkFactory = new CheckFactory(activeRules);

    createSensor().execute(context);

    Collection<Issue> issues = context.allIssues();
    assertThat(issues).hasSize(1);

    assertThat(context.allAnalysisErrors()).isEmpty();
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
    CompatibleInputFile inputFile = inputFile("cpd/Person.js");
    createSensor().analyseFiles(context, ImmutableList.of(), ImmutableList.of(inputFile), progressReport);
    verify(progressReport).stop();
  }

  @Test
  public void progress_report_should_be_stopped_without_files() throws Exception {
    createSensor().analyseFiles(context, ImmutableList.of(), ImmutableList.of(), progressReport);
    verify(progressReport).stop();
  }

  @Test
  public void cancelled_analysis() throws Exception {
    JavaScriptCheck check = new ExceptionRaisingCheck(new IllegalStateException(new InterruptedException()));
    analyseFileWithException(check, inputFile("cpd/Person.js"), "Analysis cancelled");
    assertThat(context.allAnalysisErrors()).hasSize(1);
  }

  @Test
  public void cancelled_analysis_causing_recognition_exception() throws Exception {
    JavaScriptCheck check = new ExceptionRaisingCheck(new RecognitionException(42, "message", new InterruptedIOException()));
    analyseFileWithException(check, inputFile("cpd/Person.js"), "Analysis cancelled");
    assertThat(context.allAnalysisErrors()).hasSize(1);
  }

  @Test
  public void exception_should_report_file_name() throws Exception {
    JavaScriptCheck check = new ExceptionRaisingCheck(new IllegalStateException());
    analyseFileWithException(check, inputFile("cpd/Person.js"), "Person.js");
    assertThat(context.allAnalysisErrors()).hasSize(1);
  }

  @Test
  public void cancelled_context_should_cancel_progress_report_and_return_with_no_exception() {
    JavaScriptCheck check = new DoubleDispatchVisitorCheck() {};
    JavaScriptSquidSensor sensor = createSensor();
    SensorContextTester cancelledContext = SensorContextTester.create(baseDir);
    cancelledContext.setCancelled(true);
    sensor.analyseFiles(cancelledContext, ImmutableList.of((TreeVisitor) check), ImmutableList.of(inputFile("cpd/Person.js")), progressReport);
    verify(progressReport).cancel();
  }

  private void analyseFileWithException(JavaScriptCheck check, CompatibleInputFile inputFile, String expectedMessageSubstring) {
    JavaScriptSquidSensor sensor = createSensor();
    thrown.expect(AnalysisException.class);
    thrown.expectMessage(expectedMessageSubstring);
    try {
      sensor.analyseFiles(context, ImmutableList.of((TreeVisitor) check), ImmutableList.of(inputFile), progressReport);
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

  @Test
  public void test_logger_for_force_zero_property() throws Exception {
    String message = "Since SonarQube 6.2 property 'sonar.javascript.forceZeroCoverage' is removed and its value is not used during analysis";
    context.setSettings(new MapSettings().setProperty(FORCE_ZERO_COVERAGE_KEY, "false"));

    context.setRuntime(SONAR_RUNTIME_6_1);
    createSensor().execute(context);
    assertThat(logTester.logs()).doesNotContain(message);

    context.setRuntime(SONAR_RUNTIME_6_2);
    createSensor().execute(context);
    assertThat(logTester.logs()).doesNotContain(message);

    context.setSettings(new MapSettings().setProperty(FORCE_ZERO_COVERAGE_KEY, "true"));

    context.setRuntime(SONAR_RUNTIME_6_1);
    createSensor().execute(context);
    assertThat(logTester.logs()).doesNotContain(message);

    context.setRuntime(SONAR_RUNTIME_6_2);
    createSensor().execute(context);
    assertThat(logTester.logs()).contains(message);
  }

  @Test
  public void test_deprecation_log_for_report_properties() throws Exception {
    String deprecationMessage = "Since SonarQube 6.2 property '%s' is deprecated. Use 'sonar.javascript.lcov.reportPaths' instead.";
    String utReportMessage = String.format(deprecationMessage, JavaScriptPlugin.LCOV_UT_REPORT_PATH);
    String itDeprecationMessage = String.format(deprecationMessage, JavaScriptPlugin.LCOV_IT_REPORT_PATH);

    context.setRuntime(SONAR_RUNTIME_6_1);

    // no property is set
    createSensor().execute(context);
    assertThat(logTester.logs()).doesNotContain(utReportMessage);
    assertThat(logTester.logs()).doesNotContain(itDeprecationMessage);
    logTester.clear();
    context.setSettings(new MapSettings());

    // all report properties are set
    context.settings().setProperty(JavaScriptPlugin.LCOV_UT_REPORT_PATH, "foobar");
    context.settings().setProperty(JavaScriptPlugin.LCOV_IT_REPORT_PATH, "foobar");
    context.settings().setProperty(JavaScriptPlugin.LCOV_REPORT_PATHS, "foobar");
    createSensor().execute(context);
    assertThat(logTester.logs()).doesNotContain(utReportMessage);
    assertThat(logTester.logs()).doesNotContain(itDeprecationMessage);
    logTester.clear();
    context.setSettings(new MapSettings());

    context.setRuntime(SONAR_RUNTIME_6_2);

    // 'sonar.javascript.lcov.reportPaths' property is set
    context.settings().setProperty(JavaScriptPlugin.LCOV_UT_REPORT_PATH, "");
    context.settings().setProperty(JavaScriptPlugin.LCOV_REPORT_PATHS, "foobar");
    createSensor().execute(context);
    assertThat(logTester.logs()).doesNotContain(utReportMessage);
    assertThat(logTester.logs()).doesNotContain(itDeprecationMessage);
    logTester.clear();
    context.setSettings(new MapSettings());

    // all report properties are set
    context.settings().setProperty(JavaScriptPlugin.LCOV_UT_REPORT_PATH, "foobar");
    context.settings().setProperty(JavaScriptPlugin.LCOV_IT_REPORT_PATH, "foobar");
    context.settings().setProperty(JavaScriptPlugin.LCOV_REPORT_PATHS, "foobar");
    createSensor().execute(context);
    assertThat(logTester.logs()).contains(utReportMessage);
    assertThat(logTester.logs()).contains(itDeprecationMessage);
  }

  @Test
  public void sq_greater_6_1_still_honor_coverage_reports() throws Exception {
    baseDir = new File("src/test/resources/coverage");
    context = SensorContextTester.create(baseDir);
    context.setRuntime(SONAR_RUNTIME_6_2);

    context.settings().setProperty(JavaScriptPlugin.LCOV_UT_REPORT_PATH, UT_LCOV);
    context.settings().setProperty(JavaScriptPlugin.LCOV_IT_REPORT_PATH, IT_LCOV);
    context.settings().setProperty(JavaScriptPlugin.LCOV_REPORT_PATHS, "");

    inputFile("file1.js");
    createSensor().execute(context);

    assertThat(context.lineHits("moduleKey:file1.js", 1)).isEqualTo(6);
  }

  @Test
  public void sq_greater_6_1_prefer_single_coverage_property() throws Exception {
    baseDir = new File("src/test/resources/coverage");
    context = SensorContextTester.create(baseDir);
    context.setRuntime(SONAR_RUNTIME_6_2);

    context.settings().setProperty(JavaScriptPlugin.LCOV_UT_REPORT_PATH, UT_LCOV);
    context.settings().setProperty(JavaScriptPlugin.LCOV_IT_REPORT_PATH, IT_LCOV);
    context.settings().setProperty(JavaScriptPlugin.LCOV_REPORT_PATHS, IT_LCOV + ", " + UT_LCOV);

    inputFile("file1.js");
    createSensor().execute(context);

    assertThat(context.lineHits("moduleKey:file1.js", 1)).isEqualTo(3);
  }

  @Test
  public void should_disable_unnecessary_features_for_sonarlint() throws Exception {
    baseDir = new File("src/test/resources/coverage");
    context = SensorContextTester.create(baseDir);
    context.settings().setProperty(JavaScriptPlugin.LCOV_UT_REPORT_PATH, UT_LCOV);
    context.settings().setProperty(JavaScriptPlugin.LCOV_IT_REPORT_PATH, IT_LCOV);
    String key = inputFile("file1.js").wrapped().key();

    context.setRuntime(SONARLINT_RUNTIME);
    createSensor().execute(context);

    // no cpd tokens
    assertThat(context.cpdTokens(key)).isNull();

    // no highlighting
    assertThat(context.highlightingTypeAt(key, 1, 0)).isEmpty();

    // no coverage
    assertThat(context.lineHits(key, 0)).isNull();

    context.setRuntime(NOSONARLINT_RUNTIME);
    createSensor().execute(context);

    // cpd tokens exist
    assertThat(context.cpdTokens(key)).isNotEmpty();

    // highlighting exists
    assertThat(context.highlightingTypeAt(key, 1, 0)).isNotEmpty();

    // coverage exists
    assertThat(context.lineHits(key, 1)).isEqualTo(6);
  }

  private CompatibleInputFile inputFile(String relativePath) {
    DefaultInputFile inputFile = new DefaultInputFile("moduleKey", relativePath)
      .setModuleBaseDir(baseDir.toPath())
      .setType(Type.MAIN)
      .setLanguage(JavaScriptLanguage.KEY)
      .setCharset(StandardCharsets.UTF_8);

    context.fileSystem().add(inputFile);

    inputFile.initMetadata(new FileMetadata().readMetadata(inputFile.file(), Charsets.UTF_8));
    return wrap(inputFile);
  }

  private final class ExceptionRaisingCheck extends DoubleDispatchVisitorCheck {

    private final RuntimeException exception;

    ExceptionRaisingCheck(RuntimeException exception) {
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
  public static class MyCustomRule extends DoubleDispatchVisitorCheck {
    @RuleProperty(
      key = "customParam",
      description = "Custome parameter",
      defaultValue = "value")
    public String customParam = "value";

    @Override
    public void visitScript(ScriptTree tree) {
      addIssue(new LineIssue(this, 1, "Message of custom rule")).cost(42);
    }
  }

}
