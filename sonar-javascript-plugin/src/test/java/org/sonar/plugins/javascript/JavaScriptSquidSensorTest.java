/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * dev@sonar.codehaus.org
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

import static org.fest.assertions.Assertions.assertThat;
import static org.mockito.Matchers.any;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.Before;
import org.junit.Test;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.DefaultFileSystem;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.rule.ActiveRules;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.checks.NoSonarFilter;
import org.sonar.api.component.ResourcePerspectives;
import org.sonar.api.config.Settings;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.FileLinesContext;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.resources.File;
import org.sonar.api.resources.Project;
import org.sonar.api.resources.Resource;
import org.sonar.api.scan.filesystem.PathResolver;
import org.sonar.api.source.Highlightable;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.plugins.javascript.api.CustomJavaScriptRulesDefinition;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.plugins.javascript.core.JavaScript;
import org.sonar.test.TestUtils;

public class JavaScriptSquidSensorTest {

  private final DefaultFileSystem FS = new DefaultFileSystem();
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
      Class[] checks = {MyCustomRule.class};
      return checks;
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
    JavaScriptSquidSensor sensor = new JavaScriptSquidSensor(checkFactory, fileLinesContextFactory, mock(ResourcePerspectives.class), localFS, new NoSonarFilter(
      mock(SensorContext.class)), new PathResolver(), new Settings(), CUSTOM_RULES);

    // no JS files -> do not execute
    assertThat(sensor.shouldExecuteOnProject(project)).isFalse();

    // at least one JS file -> do execute
    localFS.add(new DefaultInputFile("file.js").setType(InputFile.Type.MAIN).setLanguage(JavaScript.KEY));
    assertThat(sensor.shouldExecuteOnProject(project)).isTrue();
  }

  @Test
  public void should_analyse() {
    FS.setBaseDir(TestUtils.getResource("/cpd/"));
    InputFile inputFile = new DefaultInputFile("Person.js")
        .setAbsolutePath(TestUtils.getResource("/cpd/Person.js").getAbsolutePath())
        .setType(InputFile.Type.MAIN)
        .setLanguage(JavaScript.KEY);
    FS.add(inputFile);

    SensorContext context = mock(SensorContext.class);
    ResourcePerspectives perspectives = mock(ResourcePerspectives.class);
    Highlightable highlightable = mock(Highlightable.class);
    Highlightable.HighlightingBuilder builder = mock(Highlightable.HighlightingBuilder.class);

    when(perspectives.as(Highlightable.class, inputFile)).thenReturn(highlightable);
    when(highlightable.newHighlighting()).thenReturn(builder);
    when(context.getResource(any(Resource.class))).thenReturn(File.create((new PathResolver()).relativePath(FS.baseDir(), TestUtils.getResource("/cpd/Person.js"))));

    when(context.getResource(any(Resource.class))).thenReturn(File.create((new PathResolver()).relativePath(FS.baseDir(), TestUtils.getResource("/cpd/Person.js"))));
    JavaScriptSquidSensor sensor = new JavaScriptSquidSensor(checkFactory, fileLinesContextFactory, mock(ResourcePerspectives.class), FS, new NoSonarFilter(
      mock(SensorContext.class)), new PathResolver(), new Settings(), CUSTOM_RULES);

    sensor.analyse(project, context);

    verify(context).saveMeasure(any(Resource.class), eq(CoreMetrics.LINES), eq(32.0));
    verify(context).saveMeasure(any(Resource.class), eq(CoreMetrics.NCLOC), eq(18.0));
    verify(context).saveMeasure(any(Resource.class), eq(CoreMetrics.CLASSES), eq(1.0));
    verify(context).saveMeasure(any(Resource.class), eq(CoreMetrics.FUNCTIONS), eq(2.0));
    verify(context).saveMeasure(any(Resource.class), eq(CoreMetrics.ACCESSORS), eq(2.0));
    verify(context).saveMeasure(any(Resource.class), eq(CoreMetrics.STATEMENTS), eq(8.0));
    verify(context).saveMeasure(any(Resource.class), eq(CoreMetrics.COMPLEXITY), eq(3.0));
    verify(context).saveMeasure(any(Resource.class), eq(CoreMetrics.COMPLEXITY_IN_CLASSES), eq(0.0));
    verify(context).saveMeasure(any(Resource.class), eq(CoreMetrics.COMMENT_LINES), eq(2.0));
  }

  @Test
  public void test_to_string() {
    JavaScriptSquidSensor sensor = new JavaScriptSquidSensor(
      checkFactory,
      fileLinesContextFactory,
      mock(ResourcePerspectives.class),
      new DefaultFileSystem(), new NoSonarFilter(mock(SensorContext.class)), new PathResolver(),
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
