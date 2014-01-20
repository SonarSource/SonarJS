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
import org.sonar.api.Extension;
import org.sonar.api.Properties;
import org.sonar.api.Property;
import org.sonar.api.SonarPlugin;
import org.sonar.plugins.javascript.colorizer.JavaScriptColorizerFormat;
import org.sonar.plugins.javascript.core.JavaScript;
import org.sonar.plugins.javascript.core.JavaScriptSourceImporter;
import org.sonar.plugins.javascript.cpd.JavaScriptCpdMapping;
import org.sonar.plugins.javascript.lcov.LCOVSensor;

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
    key = JavaScriptPlugin.LCOV_REPORT_PATH,
    defaultValue = JavaScriptPlugin.LCOV_REPORT_PATH_DEFAULT_VALUE,
    name = "LCOV file",
    description = "Path (absolute or relative) to the file with LCOV data.",
    global = true,
    project = true)
})
public class JavaScriptPlugin extends SonarPlugin {

  // Global JavaScript constants
  public static final String FALSE = "false";

  public static final String FILE_SUFFIXES_KEY = "sonar.javascript.file.suffixes";
  public static final String FILE_SUFFIXES_DEFVALUE = ".js";

  public static final String PROPERTY_PREFIX = "sonar.javascript";

  public static final String LCOV_REPORT_PATH = PROPERTY_PREFIX + ".lcov.reportPath";
  public static final String LCOV_REPORT_PATH_DEFAULT_VALUE = "";

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

        LCOVSensor.class);
  }
}
