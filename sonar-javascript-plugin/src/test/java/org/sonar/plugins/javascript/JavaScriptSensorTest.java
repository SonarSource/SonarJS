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
package org.sonar.plugins.javascript;

import com.google.common.base.Charsets;
import com.google.common.collect.ImmutableList;
import com.sonar.sslr.api.RecognitionException;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.InterruptedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.apache.commons.lang.NotImplementedException;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.DefaultTextPointer;
import org.sonar.api.batch.fs.internal.DefaultTextRange;
import org.sonar.api.batch.fs.internal.FileMetadata;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.rule.ActiveRules;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.rule.internal.ActiveRulesBuilder;
import org.sonar.api.batch.rule.internal.NewActiveRule;
import org.sonar.api.batch.sensor.internal.DefaultSensorDescriptor;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.batch.sensor.issue.Issue;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.utils.log.LogTester;
import org.sonar.api.utils.log.LoggerLevel;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.api.CustomJavaScriptRulesDefinition;
import org.sonar.plugins.javascript.api.CustomRuleRepository;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.LineIssue;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;
import org.sonarsource.analyzer.commons.ProgressReport;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.sonar.plugins.javascript.JavaScriptPlugin.DEPRECATED_ESLINT_PROPERTY;

public class JavaScriptSensorTest {

  @org.junit.Rule
  public final ExpectedException thrown = ExpectedException.none();

  @org.junit.Rule
  public LogTester logTester = new LogTester();

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

  private final CustomRuleRepository[] CUSTOM_RULE_REPOSITORIES = {
    new CustomRuleRepository() {
      @Override
      public String repositoryKey() {
        return "custom-repo";
      }

      @Override
      public List<Class> checkClasses() {
        return ImmutableList.of(CustomRuleWithRuleRepository.class);
      }
    }
  };

  private File baseDir = new File("src/test/resources");
  private final ProgressReport progressReport = mock(ProgressReport.class);
  private SensorContextTester context = SensorContextTester.create(baseDir);

  private JavaScriptSensor createSensor() {
    return new JavaScriptSensor(checkFactory, context.fileSystem());
  }

  private JavaScriptSensor createSensorWithCustomRules() {
    return new JavaScriptSensor(checkFactory, context.fileSystem(), CUSTOM_RULES);
  }

  private JavaScriptSensor createSensorWithCustomRuleRepository() {
    return new JavaScriptSensor(checkFactory, context.fileSystem(), CUSTOM_RULE_REPOSITORIES);
  }

  @Test
  public void should_only_log_debug_if_a_parsing_error() {
    String relativePath = "cpd/parsingError.js";
    InputFile inputFile = inputFile(relativePath);

    String parsingErrorCheckKey = "ParsingError";

    ActiveRules activeRules = (new ActiveRulesBuilder())
      .addRule(new NewActiveRule.Builder().setName("ParsingError").setRuleKey(RuleKey.of(CheckList.JS_REPOSITORY_KEY, parsingErrorCheckKey)).build())
      .build();

    checkFactory = new CheckFactory(activeRules);

    context.setActiveRules(activeRules);
    createSensor().execute(context);
    Collection<Issue> issues = context.allIssues();
    assertThat(issues).hasSize(0);
    assertThat(context.allAnalysisErrors()).hasSize(0);

    assertThat(logTester.logs(LoggerLevel.DEBUG).get(0)).isEqualTo("Unable to parse file with java-based frontend (some rules will not be executed): " + inputFile.toString());
    assertThat(logTester.logs(LoggerLevel.DEBUG).get(1)).startsWith("Parse error at line 3 column 1:");
  }

  @Test
  public void should_add_error_to_context_but_not_fail_analysis_with_technical_error() {
    JavaScriptCheck check = new ExceptionRaisingCheck(new NullPointerException("NPE forcibly raised by check class"));

    InputFile file = inputFile("file.js");
    createSensor().analyseFiles(context, ImmutableList.of((TreeVisitor) check), ImmutableList.of(file), progressReport);
    assertThat(context.allAnalysisErrors()).hasSize(1);

    assertThat(logTester.logs()).contains("Unable to analyse file: " + file.uri());
  }

  @Test
  public void should_not_add_error_to_context_when_analysis_raises_no_issue() {
    inputFile("file.js");

    createSensor().execute(context);

    Collection<Issue> issues = context.allIssues();
    assertThat(issues).hasSize(0);

    assertThat(context.allAnalysisErrors()).isEmpty();
  }

  @Test
  public void should_not_add_error_to_context_when_analysis_raises_issues() {
    inputFile("file.js");

    ActiveRules activeRules = (new ActiveRulesBuilder())
      .addRule(new NewActiveRule.Builder().setRuleKey(RuleKey.of(CheckList.JS_REPOSITORY_KEY, "OctalNumber")).build())
      .build();
    checkFactory = new CheckFactory(activeRules);

    createSensor().execute(context);

    Collection<Issue> issues = context.allIssues();
    assertThat(issues).hasSize(1);

    assertThat(context.allAnalysisErrors()).isEmpty();
  }

  @Test
  public void should_save_issue() throws Exception {
    inputFile("file.js");

    ActiveRules activeRules = (new ActiveRulesBuilder())
      .addRule(new NewActiveRule.Builder().setRuleKey(RuleKey.of(CheckList.JS_REPOSITORY_KEY, "OctalNumber")).build())
      .build();

    checkFactory = new CheckFactory(activeRules);
    createSensor().execute(context);
    Collection<Issue> issues = context.allIssues();
    assertThat(issues).hasSize(1);
    assertThat(logTester.logs(LoggerLevel.WARN)).doesNotContain("SonarJS custom rules usage is deprecated. Consider using ESlint custom rules instead");
  }

  @Test
  public void should_run_custom_rule() throws Exception {
    inputFile("file.js");
    ActiveRules activeRules = (new ActiveRulesBuilder())
      .addRule(new NewActiveRule.Builder().setRuleKey(RuleKey.of("customKey", "key")).build())
      .build();
    checkFactory = new CheckFactory(activeRules);
    createSensorWithCustomRules().execute(context);

    Collection<Issue> issues = context.allIssues();
    assertThat(issues).hasSize(1);
    Map<Integer, Issue> issueByLine = issues.stream().collect(Collectors.toMap(issue -> issue.primaryLocation().textRange().start().line(), i -> i));
    assertThat(issueByLine.keySet()).containsExactlyInAnyOrder(1);

    Issue issue = issueByLine.get(1);
    assertThat(issue.gap()).isEqualTo(42);
    assertThat(issue.primaryLocation().message()).isEqualTo("Message of custom rule");
    assertThat(issue.primaryLocation().textRange()).isEqualTo(new DefaultTextRange(new DefaultTextPointer(1, 0), new DefaultTextPointer(1, 7)));
  }

  @Test
  public void should_run_custom_rule_repository() throws Exception {
    inputFile("file.js");
    ActiveRules activeRules = (new ActiveRulesBuilder())
      .addRule(new NewActiveRule.Builder().setRuleKey(RuleKey.of("custom-repo", "key2")).build())
      .build();
    checkFactory = new CheckFactory(activeRules);
    createSensorWithCustomRuleRepository().execute(context);

    Collection<Issue> issues = context.allIssues();
    assertThat(issues).hasSize(1);
    Map<Integer, Issue> issueByLine = issues.stream().collect(Collectors.toMap(issue -> issue.primaryLocation().textRange().start().line(), i -> i));
    assertThat(issueByLine.keySet()).containsExactlyInAnyOrder(2);

    Issue issue = issueByLine.get(2);
    assertThat(issue.gap()).isEqualTo(42);
    assertThat(issue.primaryLocation().message()).isEqualTo("Message of custom rule");
    assertThat(issue.primaryLocation().textRange()).isEqualTo(new DefaultTextRange(new DefaultTextPointer(2, 0), new DefaultTextPointer(2, 5)));
  }


  @Test
  public void should_log_deprecation_warning() throws Exception {
    JavaScriptSensor sensor = new JavaScriptSensor(checkFactory, context.fileSystem(), CUSTOM_RULES, CUSTOM_RULE_REPOSITORIES);
    sensor.execute(context);
    assertThat(logTester.logs(LoggerLevel.WARN)).contains("SonarJS custom rules usage is deprecated. Consider using ESlint custom rules instead");

    logTester.clear();
    sensor = new JavaScriptSensor(checkFactory, context.fileSystem(), null, CUSTOM_RULE_REPOSITORIES);
    sensor.execute(context);
    assertThat(logTester.logs(LoggerLevel.WARN)).contains("SonarJS custom rules usage is deprecated. Consider using ESlint custom rules instead");
  }

  @Test
  public void should_stop_progress_report() throws Exception {
    InputFile inputFile = inputFile("cpd/Person.js");
    createSensor().analyseFiles(context, ImmutableList.of(), ImmutableList.of(inputFile), progressReport);
    verify(progressReport).stop();
  }

  @Test
  public void should_stop_progress_report_without_files() throws Exception {
    createSensor().analyseFiles(context, ImmutableList.of(), ImmutableList.of(), progressReport);
    verify(progressReport).stop();
  }

  @Test
  public void should_cancel_analysis_on_exception() throws Exception {
    JavaScriptCheck check = new ExceptionRaisingCheck(new IllegalStateException(new InterruptedException()));
    analyseFileWithException(check, inputFile("cpd/Person.js"), "Analysis cancelled");
    assertThat(context.allAnalysisErrors()).hasSize(1);
  }

  @Test
  public void should_cancel_analysis_on_recognition_exception() throws Exception {
    JavaScriptCheck check = new ExceptionRaisingCheck(new RecognitionException(42, "message", new InterruptedIOException()));
    analyseFileWithException(check, inputFile("cpd/Person.js"), "Analysis cancelled");
    assertThat(context.allAnalysisErrors()).hasSize(1);
  }

  @Test
  public void should_cancel_progress_report_and_return_with_no_exception_when_context_cancelled() {
    JavaScriptCheck check = new DoubleDispatchVisitorCheck() {};
    JavaScriptSensor sensor = createSensor();
    SensorContextTester cancelledContext = SensorContextTester.create(baseDir);
    cancelledContext.setCancelled(true);
    sensor.analyseFiles(cancelledContext, ImmutableList.of((TreeVisitor) check), ImmutableList.of(inputFile("cpd/Person.js")), progressReport);
    verify(progressReport).cancel();
  }

  private void analyseFile(String relativePath) {
    ActiveRules activeRules = (new ActiveRulesBuilder())
      .addRule(new NewActiveRule.Builder().setRuleKey(RuleKey.of(CheckList.JS_REPOSITORY_KEY, "OctalNumber")).build())
      .build();
    checkFactory = new CheckFactory(activeRules);
    context.setActiveRules(activeRules);

    inputFile(relativePath);

    createSensor().execute(context);
  }

  @Test
  public void should_skip_vue_script_with_lang_ts() {
    analyseFile("vue/tsScript.vue");
    assertThat(context.allIssues()).isEmpty();
  }

  @Test
  public void should_analyse_vue_script_with_lang_js() {
    analyseFile("vue/jsScript.vue");
    assertThat(context.allIssues()).hasSize(1);
  }

  @Test
  public void should_analyse_vue_with_custom_sections() {
    analyseFile("vue/customSections.vue");
    assertThat(context.allIssues()).hasSize(1);
  }

  @Test
  public void should_log_deprecated_property_used() throws Exception {
    context.settings().setProperty(DEPRECATED_ESLINT_PROPERTY, "eslint-report.json");
    createSensor().execute(context);
    assertThat(logTester.logs(LoggerLevel.WARN)).contains("Property 'sonar.typescript.eslint.reportPaths' is deprecated, use 'sonar.eslint.reportPaths'.");
  }

  private void analyseFileWithException(JavaScriptCheck check, InputFile inputFile, String expectedMessageSubstring) {
    JavaScriptSensor sensor = createSensor();
    thrown.expect(JavaScriptSensor.AnalysisException.class);
    thrown.expectMessage(expectedMessageSubstring);
    try {
      sensor.analyseFiles(context, ImmutableList.of((TreeVisitor) check), ImmutableList.of(inputFile), progressReport);
    } finally {
      verify(progressReport).cancel();
    }
  }

  private InputFile inputFile(String relativePath) {
    DefaultInputFile inputFile = new TestInputFileBuilder("moduleKey", relativePath)
      .setModuleBaseDir(baseDir.toPath())
      .setType(Type.MAIN)
      .setLanguage(JavaScriptLanguage.KEY)
      .setCharset(StandardCharsets.UTF_8)
      .build();

    context.fileSystem().add(inputFile);

    try {
      inputFile.setMetadata(new FileMetadata().readMetadata(new FileInputStream(inputFile.file()), Charsets.UTF_8, inputFile.absolutePath()));
    } catch (FileNotFoundException e) {
      e.printStackTrace();
    }
    return inputFile;
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

  @Rule(key = "key2")
  public static class CustomRuleWithRuleRepository extends DoubleDispatchVisitorCheck {

    public void visitScript(ScriptTree tree) {
      addIssue(new LineIssue(this, 2, "Message of custom rule")).cost(42);
    }
  }

}
