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
package org.sonar.plugins.javascript;

import com.google.common.collect.ImmutableList;
import org.sonar.api.Extension;
import org.sonar.api.Properties;
import org.sonar.api.Property;
import org.sonar.api.SonarPlugin;
import org.sonar.plugins.javascript.colorizer.JavaScriptColorizerFormat;
import org.sonar.plugins.javascript.core.JavaScript;
import org.sonar.plugins.javascript.core.JavaScriptSourceImporter;
import org.sonar.plugins.javascript.cpd.JavaScriptCpdMapping;
import org.sonar.plugins.javascript.coverage.JavaScriptCoverageSensor;
import org.sonar.plugins.javascript.jstest.JsTestMavenInitializer;
import org.sonar.plugins.javascript.jstest.JsTestMavenPluginHandler;

import java.util.List;

@Properties({
  // Global JavaScript settings
  @Property(
    key = JavaScriptPlugin.FILE_SUFFIXES_KEY,
    defaultValue = JavaScriptPlugin.FILE_SUFFIXES_DEFVALUE,
    name = "File suffixes",
    description = "Comma-separated list of suffixes for files to analyze.",
    global = true,
    project = true),
  @Property(
    key = JavaScriptPlugin.COVERAGE_PLUGIN_KEY,
    defaultValue = JavaScriptPlugin.COVERAGE_PLUGIN_DEFVALUE,
    name = "Code coverage plugin",
    description = "Key of the code coverage plugin to use for unit tests",
    global = true,
    project = true),  
  @Property(
    key = JavaScriptPlugin.UNIT_TESTS_REPORT_PATH_KEY,
    defaultValue = JavaScriptPlugin.UNIT_TESTS_DEFAULT_REPORT_PATH,
    name = "Path to junit compatible unit test report(s)",
    description = "Relative to projects' root. Ant patterns are accepted",
    global = false,
    project = true),
  @Property(
    key = JavaScriptPlugin.COVERAGE_REPORT_PATH_KEY,
    defaultValue = JavaScriptPlugin.COVERAGE_DEFAULT_REPORT_PATH,
    name = "Path to unit test coverage report(s)",
    description = "Relative to projects' root. Ant patterns are accepted",
    global = false,
    project = true),
    @Property(
    key = JavaScriptPlugin.COVERAGE_IT_REPORT_PATH_KEY,
    defaultValue = JavaScriptPlugin.COVERAGE_IT_DEFAULT_REPORT_PATH,
    name = "Path to integration test coverage report(s)",
    description = "Relative to projects' root. Ant patterns are accepted",
    global = false,
    project = true),
    @Property(
    key = JavaScriptPlugin.COVERAGE_OVERALL_REPORT_PATH_KEY,
    defaultValue = JavaScriptPlugin.COVERAGE_OVERALL_DEFAULT_REPORT_PATH,
    name = "Path to overall test coverage report(s)",
    description = "Relative to projects' root. Ant patterns are accepted",
    global = false,
    project = true)
})
public class JavaScriptPlugin extends SonarPlugin {

  public List<Class<? extends Extension>> getExtensions() {
    return ImmutableList.of(
        JavaScript.class,
        JavaScriptSourceImporter.class,
        JavaScriptColorizerFormat.class,
        JavaScriptCpdMapping.class,

        JavaScriptSquidSensor.class,
        JavaScriptRuleRepository.class,
        JavaScriptProfile.class,

        JavaScriptCommonRulesEngineProvider.class,

        //JsTestDriverSurefireSensor.class,
        JavaScriptCoverageSensor.class,

        JsTestMavenInitializer.class,
        JsTestMavenPluginHandler.class,
        JavaScriptSurefireSensor.class);
  }

  // Global JavaScript constants
  public static final String FALSE = "false";

  public static final String FILE_SUFFIXES_KEY = "sonar.javascript.file.suffixes";
  public static final String FILE_SUFFIXES_DEFVALUE = "js";

  public static final String PROPERTY_PREFIX = "sonar.javascript.";
  
  public static final String COVERAGE_PLUGIN_KEY = PROPERTY_PREFIX + "coveragePlugin";
  public static final String COVERAGE_PLUGIN_DEFVALUE = "lcov";

  //Unit tests
  public static final String UNIT_TESTS_REPORT_PATH_KEY = PROPERTY_PREFIX + "reportPath";
  public static final String UNIT_TESTS_DEFAULT_REPORT_PATH = "unit-reports/*.xml";
  
  //Coverage
  public static final String COVERAGE_REPORT_PATH_KEY = PROPERTY_PREFIX + "coverage.reportPath";
  public static final String COVERAGE_IT_REPORT_PATH_KEY = PROPERTY_PREFIX + "coverage.itReportPath";
  public static final String COVERAGE_OVERALL_REPORT_PATH_KEY = PROPERTY_PREFIX + "coverage.overallReportPath";
  public static final String COVERAGE_DEFAULT_REPORT_PATH = "coverage/coverage-*.xml, coverage/coverage-*.dat";
  public static final String COVERAGE_IT_DEFAULT_REPORT_PATH = "coverage/it-coverage-*.xml, coverage/it-coverage-*.dat";
  public static final String COVERAGE_OVERALL_DEFAULT_REPORT_PATH = "coverage/overall-coverage-*.xml, coverage/overall-coverage-*.dat";


}
