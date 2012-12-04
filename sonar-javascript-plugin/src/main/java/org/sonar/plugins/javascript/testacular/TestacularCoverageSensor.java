/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis and SonarSource
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
package org.sonar.plugins.javascript.testacular;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.CoverageExtension;
import org.sonar.api.batch.Sensor;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.CoverageMeasuresBuilder;
import org.sonar.api.measures.Measure;
import org.sonar.api.resources.InputFile;
import org.sonar.api.resources.Project;
import org.sonar.api.resources.Resource;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.core.JavaScript;
import org.sonar.plugins.javascript.coverage.LCOVParser;

import java.io.File;
import java.util.Map;

/**
 * @author: deag
 */
public class TestacularCoverageSensor implements Sensor, CoverageExtension {
    protected JavaScript javascript;

    public TestacularCoverageSensor(JavaScript javascript) {
        this.javascript = javascript;
    }

    private static final Logger LOG = LoggerFactory.getLogger(TestacularCoverageSensor.class);

    public boolean shouldExecuteOnProject(Project project) {
        return javascript.equals(project.getLanguage())
                && "testacular".equals(javascript.getConfiguration().getString(JavaScriptPlugin.TEST_FRAMEWORK_KEY, JavaScriptPlugin.TEST_FRAMEWORK_DEFAULT));
    }

    public void analyse(Project project, SensorContext sensorContext) {
        File jsTestDriverCoverageReportFile = new File(project.getFileSystem().getBasedir(), getTestReportsFolder()
                + "/" + getTestCoverageFileName());

        LCOVParser parser = new LCOVParser();
        Map<String, CoverageMeasuresBuilder> coveredFiles = parser.parseFile(jsTestDriverCoverageReportFile, new File(getBasePath()));

        for (InputFile inputFile : project.getFileSystem().mainFiles(JavaScript.KEY)) {
            Resource resource = org.sonar.api.resources.File.fromIOFile(inputFile.getFile(), project);
            CoverageMeasuresBuilder measures = coveredFiles.get(inputFile.getFile().getAbsolutePath());

            if (measures == null) {
                // colour all lines as not executed
                measures = CoverageMeasuresBuilder.create();
                for (int x = 1; x < sensorContext.getMeasure(resource, CoreMetrics.LINES).getIntValue(); x++) {
                    measures.setHits(x, 0);
                }
            }

            for (Measure measure : measures.createMeasures()) {
                sensorContext.saveMeasure(resource, measure);
            }

        }
    }

    protected String getTestReportsFolder() {
        return javascript.getConfiguration().getString(JavaScriptPlugin.TESTACULAR_FOLDER_KEY, JavaScriptPlugin.TESTACULAR_DEFAULT_FOLDER);
    }

    protected String getBasePath() {
        return javascript.getConfiguration().getString(JavaScriptPlugin.TESTACULAR_BASEPATH_KEY, JavaScriptPlugin.TESTACULAR_DEFAULT_BASEPATH);
    }

    protected String getTestCoverageFileName() {
        return javascript.getConfiguration().getString(JavaScriptPlugin.TESTACULAR_COVERAGE_FILE_KEY, JavaScriptPlugin.TESTACULAR_COVERAGE_REPORT_FILENAME);
    }

    @Override
    public String toString() {
        return getClass().getSimpleName();
    }

}
