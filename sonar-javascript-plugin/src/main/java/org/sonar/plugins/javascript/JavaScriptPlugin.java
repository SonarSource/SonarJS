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

import com.google.common.collect.ImmutableList;
import org.sonar.api.PropertyType;
import org.sonar.api.SonarPlugin;
import org.sonar.api.config.PropertyDefinition;
import org.sonar.api.resources.Qualifiers;
import org.sonar.plugins.javascript.colorizer.JavaScriptColorizerFormat;
import org.sonar.plugins.javascript.core.JavaScript;
import org.sonar.plugins.javascript.core.JavaScriptSourceImporter;
import org.sonar.plugins.javascript.cpd.JavaScriptCpdMapping;
import org.sonar.plugins.javascript.unittest.jstest.JsTestSensor;
import org.sonar.plugins.javascript.unittest.jstestdriver.JsTestDriverSensor;
import org.sonar.plugins.javascript.lcov.CoverageSensor;

import java.util.List;

public class JavaScriptPlugin extends SonarPlugin {

  // Global JavaScript constants
  public static final String FALSE = "false";

  public static final String FILE_SUFFIXES_KEY = "sonar.javascript.file.suffixes";
  public static final String FILE_SUFFIXES_DEFVALUE = ".js";

  public static final String PROPERTY_PREFIX = "sonar.javascript";

  public static final String LCOV_REPORT_PATH = PROPERTY_PREFIX + ".lcov.reportPath";
  public static final String LCOV_REPORT_PATH_DEFAULT_VALUE = "";

  public static final String FORCE_ZERO_COVERAGE_KEY = "sonar.javascript.forceZeroCoverage";
  public static final String FORCE_ZERO_COVERAGE_DEFAULT_VALUE = "false";

  public static final String JSTESTDRIVER_REPORTS_PATH = PROPERTY_PREFIX + ".jstestdriver.reportsPath";
  public static final String JSTESTDRIVER_REPORTS_PATH_DEFAULT_VALUE = "";

  public static final String JSTEST_REPORTS_PATH = PROPERTY_PREFIX + ".jstest.reportsPath";
  public static final String JSTEST_REPORTS_PATH_DEFAULT_VALUE = "";

  @Override
  public List getExtensions() {
    return ImmutableList.of(
        JavaScript.class,
        JavaScriptSourceImporter.class,
        JavaScriptColorizerFormat.class,
        JavaScriptCpdMapping.class,

        JavaScriptSquidSensor.class,
        JavaScriptRuleRepository.class,
        JavaScriptProfile.class,

        JavaScriptCommonRulesEngine.class,
        JavaScriptCommonRulesDecorator.class,

        JsTestSensor.class,
        JsTestDriverSensor.class,
        CoverageSensor.class,

        PropertyDefinition.builder(FILE_SUFFIXES_KEY)
          .defaultValue(FILE_SUFFIXES_DEFVALUE)
          .name("File Suffixes")
          .description("Comma-separated list of suffixes for files to analyze.")
          .build(),

        PropertyDefinition.builder(LCOV_REPORT_PATH)
        .defaultValue(LCOV_REPORT_PATH_DEFAULT_VALUE)
        .name("LCOV File")
        .description("Path (absolute or relative) to the file with LCOV data.")
        .onQualifiers(Qualifiers.MODULE, Qualifiers.PROJECT)
        .build(),

        PropertyDefinition.builder(FORCE_ZERO_COVERAGE_KEY)
          .defaultValue(FORCE_ZERO_COVERAGE_DEFAULT_VALUE)
          .name("Force 0 coverage value")
          .description("Force coverage to be set to 0 when no report is provided.")
          .onQualifiers(Qualifiers.MODULE, Qualifiers.PROJECT)
          .type(PropertyType.BOOLEAN)
          .build(),

        PropertyDefinition.builder(JavaScriptPlugin.JSTESTDRIVER_REPORTS_PATH)
          .defaultValue(JavaScriptPlugin.JSTESTDRIVER_REPORTS_PATH_DEFAULT_VALUE)
          .name("JSTestDriver output folder")
          .description("Folder where JsTestDriver unit test reports are located.")
          .onQualifiers(Qualifiers.MODULE, Qualifiers.PROJECT)
          .build(),

        PropertyDefinition.builder(JavaScriptPlugin.JSTEST_REPORTS_PATH)
         .defaultValue(JavaScriptPlugin.JSTEST_REPORTS_PATH_DEFAULT_VALUE)
          .name("JSTest output folder")
          .description("Folder where JsTest unit test reports are located.")
          .onQualifiers(Qualifiers.MODULE, Qualifiers.PROJECT)
          .build()
    );
  }

}
