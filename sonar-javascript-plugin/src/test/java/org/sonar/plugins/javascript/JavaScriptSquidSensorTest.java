/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.plugins.javascript;

import org.junit.Before;
import org.junit.Test;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFile.Type;
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
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;

import static org.fest.assertions.Assertions.assertThat;
import static org.mockito.Matchers.any;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class JavaScriptSquidSensorTest {

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

  @Before
  public void setUp() {
    fileLinesContextFactory = mock(FileLinesContextFactory.class);
    FileLinesContext fileLinesContext = mock(FileLinesContext.class);
    when(fileLinesContextFactory.createFor(any(InputFile.class))).thenReturn(fileLinesContext);
  }

  @Test
  public void should_execute_if_js_files() {
    DefaultFileSystem localFS = new DefaultFileSystem();

    JavaScriptSquidSensor sensor = new JavaScriptSquidSensor(
        checkFactory,
        fileLinesContextFactory,
        mock(ResourcePerspectives.class),
        localFS,
        new NoSonarFilter(),
        new Settings(),
        CUSTOM_RULES
    );

    // no JS files -> do not execute
    assertThat(sensor.shouldExecuteOnProject(project)).isFalse();

    // at least one JS file -> do execute
    localFS.add(new DefaultInputFile("file.js").setType(InputFile.Type.MAIN).setLanguage(JavaScriptLanguage.KEY));
    assertThat(sensor.shouldExecuteOnProject(project)).isTrue();
  }

  @Test
  public void should_analyse() {
    DefaultFileSystem fileSystem = new DefaultFileSystem();

    DefaultInputFile inputFile = new DefaultInputFile("src/test/resources/cpd/Person.js")
        .setAbsolutePath((new java.io.File("src/test/resources/cpd/Person.js")).getAbsolutePath())
        .setLanguage(JavaScriptLanguage.KEY)
        .setType(Type.MAIN);

    fileSystem.add(inputFile);

    SensorContext context = mock(SensorContext.class);
    ResourcePerspectives perspectives = mock(ResourcePerspectives.class);
    Highlightable highlightable = mock(Highlightable.class);
    Highlightable.HighlightingBuilder builder = mock(Highlightable.HighlightingBuilder.class);
    Symbolizable symbolizable = mock(Symbolizable.class);
    Resource resource = mock(Resource.class);
    Issuable issuable = mock(Issuable.class);

    when(perspectives.as(Highlightable.class, inputFile)).thenReturn(highlightable);
    when(perspectives.as(Symbolizable.class, inputFile)).thenReturn(symbolizable);
    when(perspectives.as(Issuable.class, inputFile)).thenReturn(issuable);
    when(highlightable.newHighlighting()).thenReturn(builder);
    when(symbolizable.newSymbolTableBuilder()).thenReturn(mock(SymbolTableBuilder.class));
    when(resource.getEffectiveKey()).thenReturn("someKey");
    when(context.getResource(inputFile)).thenReturn(resource);

    Settings settings = new Settings();
    settings.setProperty(JavaScriptPlugin.IGNORE_HEADER_COMMENTS, true);

    JavaScriptSquidSensor sensor = new JavaScriptSquidSensor(checkFactory, fileLinesContextFactory, perspectives, fileSystem, new NoSonarFilter(), settings, CUSTOM_RULES);
    sensor.analyse(project, context);

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
    DefaultFileSystem fileSystem = new DefaultFileSystem();

    DefaultInputFile inputFile = new DefaultInputFile("src/test/resources/cpd/parsingError.js")
        .setAbsolutePath((new java.io.File("src/test/resources/cpd/parsingError.js")).getAbsolutePath())
        .setLanguage(JavaScriptLanguage.KEY)
        .setType(Type.MAIN);

    fileSystem.add(inputFile);

    SensorContext context = mock(SensorContext.class);
    ResourcePerspectives perspectives = mock(ResourcePerspectives.class);
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

    Symbolizable symbolizable = mock(Symbolizable.class);
    Resource resource = mock(Resource.class);
    Issuable.IssueBuilder issueBuilder = mock(Issuable.IssueBuilder.class);
    Issue issue = mock(Issue.class);
    Issuable issuable = mock(Issuable.class);

    when(perspectives.as(Symbolizable.class, inputFile)).thenReturn(symbolizable);
    when(symbolizable.newSymbolTableBuilder()).thenReturn(mock(SymbolTableBuilder.class));
    when(resource.getEffectiveKey()).thenReturn("someKey");
    when(context.getResource(inputFile)).thenReturn(resource);
    when(perspectives.as(Issuable.class, inputFile)).thenReturn(issuable);
    when(issuable.newIssueBuilder()).thenReturn(issueBuilder);
    when(issueBuilder.ruleKey(any(RuleKey.class))).thenReturn(issueBuilder);
    when(issueBuilder.line(3)).thenReturn(issueBuilder);
    when(issueBuilder.message(any(String.class))).thenReturn(issueBuilder);
    when(issueBuilder.build()).thenReturn(issue);
    when(issuable.addIssue(issue)).thenReturn(true);

    JavaScriptSquidSensor sensor = new JavaScriptSquidSensor(checkFactory, fileLinesContextFactory, perspectives, fileSystem, new NoSonarFilter(), new Settings(), CUSTOM_RULES);
    sensor.analyse(project, context);

    verify(issuable).addIssue(any(Issue.class));
  }

  @Test
  public void test_to_string() {
    JavaScriptSquidSensor sensor = new JavaScriptSquidSensor(
      checkFactory,
      fileLinesContextFactory,
      mock(ResourcePerspectives.class),
      new DefaultFileSystem(), new NoSonarFilter(),
      new Settings(), CUSTOM_RULES);

    assertThat(sensor.toString()).isNotNull();
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
