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
package org.sonar.plugins.javascript.lcov;

import org.junit.Before;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.DefaultFileSystem;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.config.Settings;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.Measure;
import org.sonar.api.measures.Metric;
import org.sonar.api.resources.Project;
import org.sonar.api.resources.Resource;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.test.TestUtils;

import static org.fest.assertions.Assertions.assertThat;
import static org.mockito.Matchers.any;
import static org.mockito.Matchers.anyObject;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyZeroInteractions;
import static org.mockito.Mockito.when;

public class CoverageSensorTest {

  private SensorContext context;
  private Settings settings;
  private Project project;

  @Before
  public void init() {
    settings = new Settings();
    settings.setProperty(JavaScriptPlugin.LCOV_UT_REPORT_PATH, "test_lcov_report_ut.dat");
    settings.setProperty(JavaScriptPlugin.LCOV_IT_REPORT_PATH, "test_lcov_report_it.dat");
    context = mock(SensorContext.class);
    project = new Project("project");

  }

  @Test
  public void test_should_execute() {
    DefaultFileSystem fs = new DefaultFileSystem();
    Settings localSettings = new Settings();
    LCOVCoverageSensor localSensor = newUTSensor(fs, localSettings);

    // no JS files -> do not execute
    assertThat(localSensor.shouldExecuteOnProject(project)).isFalse();

    // at least one JS file -> do execute
    fs.add(new DefaultInputFile("fake_file.js").setType(InputFile.Type.MAIN).setLanguage(JavaScriptLanguage.KEY));
    assertThat(localSensor.shouldExecuteOnProject(project)).isTrue();

    // no path to report -> do execute
    localSettings.setProperty(JavaScriptPlugin.LCOV_UT_REPORT_PATH, "");
    assertThat(localSensor.shouldExecuteOnProject(project)).isTrue();
  }

  @Test
  public void report_not_found() throws Exception {
    DefaultFileSystem fs = newFileSystem();

    // Setting with bad report path
    Settings localSettings = new Settings();
    localSettings.setProperty(JavaScriptPlugin.LCOV_UT_REPORT_PATH, "/fake/path/lcov_report.dat");

    newUTSensor(fs, localSettings).analyse(project, context);

    verifyZeroInteractions(context);
  }

  @Test
  public void test_file_in_ut_coverage_report() {
    DefaultFileSystem fs = newFileSystem();
    fs.add(newSourceInputFile("fake_file1.js"));
    fs.add(newSourceInputFile("fake_file2.js"));
    fs.add(newSourceInputFile("fake_file3.js"));
    newUTSensor(fs, settings).analyse(project, context);

    // 3 line coverage metrics for two files, 4 condition coverage metrics for 1 file
    verify(context, times(10)).saveMeasure(any(Resource.class), (Measure) anyObject());
  }

  @Test
  public void test_file_in_it_coverage_report() {
    DefaultFileSystem fs = newFileSystem();
    fs.add(newSourceInputFile("fake_file1.js"));
    fs.add(newSourceInputFile("fake_file2.js"));
    fs.add(newSourceInputFile("fake_file3.js"));
    newITSensor(fs, settings).analyse(project, context);

    // 3 line coverage metrics for two files, 4 condition coverage metrics for 1 file
    verify(context, times(10)).saveMeasure(any(Resource.class), (Measure) anyObject());
  }

  @Test
  public void test_file_in_overall_coverage_report() {
    DefaultFileSystem fs = newFileSystem();
    fs.add(newSourceInputFile("fake_file1.js"));
    fs.add(newSourceInputFile("fake_file2.js"));
    fs.add(newSourceInputFile("fake_file3.js"));
    newOverallSensor(fs, settings).analyse(project, context);

    // 3 line coverage metrics for two files, 4 condition coverage metrics for 1 file for both the it and ut file
    // minus 3 line coverages, that are in both files and so get merged
    verify(context, times(17)).saveMeasure(any(Resource.class), (Measure) anyObject());
  }

  @Test
  public void test_wrong_lines_in_file() {
    settings.setProperty(JavaScriptPlugin.LCOV_UT_REPORT_PATH, "wrong_line_lcov.info");
    DefaultFileSystem fs = newFileSystem();
    fs.add(newSourceInputFile("fake_file.js"));
    newUTSensor(fs, settings).analyse(project, context);

    ArgumentCaptor<Measure> measures = ArgumentCaptor.forClass(Measure.class);

    verify(context, atLeast(2)).saveMeasure((Resource) anyObject(), measures.capture());

    boolean lineCoverageMetric = false;
    boolean conditionCoverageMetric = false;

    for (Measure measure : measures.getAllValues()) {
      if (measure.getMetricKey().equals(CoreMetrics.COVERAGE_LINE_HITS_DATA_KEY)) {
        assertThat(measure.getData()).isEqualTo("5=1");
        lineCoverageMetric = true;

      } else if (measure.getMetricKey().equals(CoreMetrics.CONDITIONS_BY_LINE_KEY)) {
        assertThat(measure.getData()).isEqualTo("7=3");
        conditionCoverageMetric = true;
      }
    }

    assertThat(lineCoverageMetric).isTrue();
    assertThat(conditionCoverageMetric).isTrue();
  }

  @Test
  public void test_file_not_in_coverage_report() {
    DefaultFileSystem fs = newFileSystem();
    fs.add(newSourceInputFile("not_in_report.js"));

    when(context.getMeasure(any(org.sonar.api.resources.File.class), eq(CoreMetrics.NCLOC)))
      .thenReturn(new Measure(CoreMetrics.NCLOC, (double) 2));
    when(context.getMeasure(any(org.sonar.api.resources.File.class), eq(CoreMetrics.NCLOC_DATA)))
      .thenReturn(new Measure(CoreMetrics.NCLOC_DATA, "1=0;2=1;3=1;4=0"));

    newUTSensor(fs, settings).analyse(project, context);

    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.LINES_TO_COVER), eq(2.0));
    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.UNCOVERED_LINES), eq(2.0));
  }

  @Test
  public void save_zero_value_for_all_files_when_no_report() throws Exception {
    DefaultFileSystem fs = newFileSystem();
    fs.add(newSourceInputFile("fake_file.js"));

    settings.setProperty(JavaScriptPlugin.FORCE_ZERO_COVERAGE_KEY, "true");
    settings.setProperty(JavaScriptPlugin.LCOV_UT_REPORT_PATH, "");
    when(context.getMeasure(any(Resource.class), any(Metric.class))).thenReturn(new Measure().setValue(1d));
    when(context.getMeasure(any(org.sonar.api.resources.File.class), eq(CoreMetrics.NCLOC_DATA)))
      .thenReturn(new Measure(CoreMetrics.NCLOC_DATA, "1=0;2=1;3=1;4=0"));
    newUTSensor(fs, settings).analyse(project, context);

    verify(context, times(1)).saveMeasure((Resource) anyObject(), eq(CoreMetrics.LINES_TO_COVER), eq(1d));
    verify(context, times(1)).saveMeasure((Resource) anyObject(), eq(CoreMetrics.UNCOVERED_LINES), eq(1d));
  }

  @Test
  public void save_zero_value_for_all_files_when_no_report_and_no_ncloc() throws Exception {
    DefaultFileSystem fs = newFileSystem();
    fs.add(newSourceInputFile("fake_file.js"));

    settings.setProperty(JavaScriptPlugin.FORCE_ZERO_COVERAGE_KEY, "true");
    settings.setProperty(JavaScriptPlugin.LCOV_UT_REPORT_PATH, "");
    newUTSensor(fs, settings).analyse(project, context);

    verify(context, never()).saveMeasure((Resource) anyObject(), eq(CoreMetrics.LINES_TO_COVER), Mockito.anyDouble());
  }

  public DefaultInputFile newSourceInputFile(String name) {
    return new DefaultInputFile("relative/path/" + name)
      .setAbsolutePath("absolute/path/" + name)
      .setType(InputFile.Type.MAIN)
      .setLines(42)
      .setLanguage(JavaScriptLanguage.KEY);
  }

  public DefaultFileSystem newFileSystem() {
    DefaultFileSystem fs = new DefaultFileSystem();
    fs.setBaseDir(TestUtils.getResource("org/sonar/plugins/javascript/unittest/jstestdriver/"));

    return fs;
  }

  public LCOVCoverageSensor newUTSensor(DefaultFileSystem fs, Settings settings) {
    return new UTCoverageSensor(fs, settings);
  }

  public LCOVCoverageSensor newITSensor(DefaultFileSystem fs, Settings settings) {
    return new ITCoverageSensor(fs, settings);
  }

  public LCOVCoverageSensor newOverallSensor(DefaultFileSystem fs, Settings settings) {
    return new OverallCoverageSensor(fs, settings);
  }

}
