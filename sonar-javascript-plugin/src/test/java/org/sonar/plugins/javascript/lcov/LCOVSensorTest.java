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
package org.sonar.plugins.javascript.lcov;

import org.junit.Before;
import org.junit.Test;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.config.Settings;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.Measure;
import org.sonar.api.resources.InputFile;
import org.sonar.api.resources.InputFileUtils;
import org.sonar.api.resources.Language;
import org.sonar.api.resources.Project;
import org.sonar.api.resources.ProjectFileSystem;
import org.sonar.api.resources.Resource;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.core.JavaScript;

import java.io.File;
import java.util.Arrays;
import java.util.Collections;

import static org.fest.assertions.Assertions.assertThat;
import static org.mockito.Matchers.anyObject;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyZeroInteractions;
import static org.mockito.Mockito.when;

public class LCOVSensorTest {

    private final File baseDir = new File("src/test/resources/org/sonar/plugins/javascript/jstestdriver/sensortests/main");

    private LCOVSensor sensor;

    private SensorContext context;

    private Settings settings;

    private ProjectFileSystem fileSystem = mock(ProjectFileSystem.class);

    private Project project;

    @Before
    public void init() {
        settings = new Settings();
        settings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATH, "jsTestDriver.conf-coverage.dat");
        sensor = new LCOVSensor(new JavaScript(settings));
        context = mock(SensorContext.class);
        project = mockProject();
    }

    @Test
    public void test_should_execute() {
        // no JS files -> do not execute
        assertThat(sensor.shouldExecuteOnProject(project)).isFalse();

        // at least one JS file -> do execute
        when(fileSystem.mainFiles("js")).thenReturn(Collections.singletonList(mock(InputFile.class)));
        assertThat(sensor.shouldExecuteOnProject(project)).isTrue();

        // no path to report -> do not execute
        project.setBranch("");
        assertThat(sensor.shouldExecuteOnProject(project)).isFalse();
    }

    @Test
    public void report_not_found() throws Exception {
        Project project = mockProject();
        when(fileSystem.resolvePath("jsTestDriver.conf-coverage.dat")).thenReturn(new File("not-found"));

        sensor.analyse(project, context);

        verifyZeroInteractions(context);
    }

    @Test
    public void testFileInJsTestDriverCoverageReport() {
        when(fileSystem.mainFiles(JavaScript.KEY)).thenReturn(Arrays.asList(InputFileUtils.create(baseDir, "Person.js")));

        when(fileSystem.resolvePath("jsTestDriver.conf-coverage.dat")).thenReturn(
                new File("src/test/resources/org/sonar/plugins/javascript/jstestdriver/jsTestDriver.conf-coverage.dat"));
        when(fileSystem.resolvePath("Person.js")).thenReturn(
                new File("src/test/resources/org/sonar/plugins/javascript/jstestdriver/sensortests/main/Person.js"));
        when(fileSystem.resolvePath("PersonTest.js")).thenReturn(
                new File("src/test/resources/org/sonar/plugins/javascript/jstestdriver/sensortests/test/PersonTest.js"));

        sensor.analyse(project, context);
        verify(context, times(3)).saveMeasure((Resource) anyObject(), (Measure) anyObject());
    }

    @Test
    public void testFileNotInJsTestDriverCoverageReport() {
        InputFile inputFile = InputFileUtils.create(baseDir, "another.js");
        when(fileSystem.mainFiles(JavaScript.KEY)).thenReturn(Arrays.asList(inputFile));

        when(fileSystem.resolvePath("jsTestDriver.conf-coverage.dat")).thenReturn(
                new File("src/test/resources/org/sonar/plugins/javascript/jstestdriver/jsTestDriver.conf-coverage.dat"));
        when(fileSystem.resolvePath("Person.js")).thenReturn(
                new File("src/test/resources/org/sonar/plugins/javascript/jstestdriver/sensortests/main/Person.js"));
        when(fileSystem.resolvePath("PersonTest.js")).thenReturn(
                new File("src/test/resources/org/sonar/plugins/javascript/jstestdriver/sensortests/test/PersonTest.js"));

        when(context.getMeasure(org.sonar.api.resources.File.fromIOFile(inputFile.getFile(), project), CoreMetrics.LINES))
                .thenReturn(new Measure(CoreMetrics.LINES, (double) 20));
        when(context.getMeasure(org.sonar.api.resources.File.fromIOFile(inputFile.getFile(), project), CoreMetrics.NCLOC))
                .thenReturn(new Measure(CoreMetrics.LINES, (double) 22));

        sensor.analyse(project, context);

        verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.LINES_TO_COVER), eq(22.0));
        verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.UNCOVERED_LINES), eq(22.0));
    }

    @Test
    public void test_toString() {
        assertThat(sensor.toString()).isEqualTo("LCOVSensor");
    }

    private Project mockProject() {
        return new Project("dummy") {
            private Object property = "jsTestDriver.conf-coverage.dat";

            @Override
            public ProjectFileSystem getFileSystem() {
                return fileSystem;
            }

            @Override
            public Language getLanguage() {
                throw new UnsupportedOperationException("should not be used for multi-language support in SQ 4.2");
            }

            @Override
            public String getLanguageKey() {
                throw new UnsupportedOperationException("should not be used for multi-language support in SQ 4.2");
            }

            @Override
            public Object getProperty(String key) {
                return property;
            }

            @Override
            public Project setBranch(String property) {
                this.property = property;

                return this;
            }
        };
    }

}
