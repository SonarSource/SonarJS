/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis
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

import java.util.ArrayList;
import java.util.List;

import org.sonar.api.Extension;
import org.sonar.api.Plugin;
import org.sonar.api.Properties;
import org.sonar.api.Property;
import org.sonar.plugins.javascript.colorizer.JavaScriptColorizerFormat;
import org.sonar.plugins.javascript.complexity.JavaScriptComplexitySensor;
import org.sonar.plugins.javascript.cpd.JavaScriptCpdMapping;
import org.sonar.plugins.javascript.jslint.JavaScriptDefaultProfile;
import org.sonar.plugins.javascript.jslint.JavaScriptJSLintSensor;
import org.sonar.plugins.javascript.jslint.JavaScriptRuleRepository;
import org.sonar.plugins.javascript.jslint.JsLintRuleManager;
import org.sonar.plugins.javascript.squid.JavaScriptSquidSensor;

@Properties({
    @Property(key = JavaScriptPlugin.FILE_SUFFIXES_KEY, defaultValue = JavaScriptPlugin.FILE_SUFFIXES_DEFVALUE, name = "File suffixes",
        description = "Comma-separated list of suffixes for files to analyze. To not filter, leave the list empty.", global = true,
        project = true),

    // JSLint global settings (http://jslint.com/)
    @Property(key = JavaScriptPlugin.ASSUME_A_BROWSER_KEY, defaultValue = JavaScriptPlugin.FALSE, name = "Assume a browser",
        description = "Assume a browser", global = true, project = true),
    @Property(key = JavaScriptPlugin.ASSUME_CONSOLE_ALERT_KEY, defaultValue = JavaScriptPlugin.FALSE, name = "Assume console, alert, ...",
        description = "Assume console, alert, ...", global = true, project = true),
    @Property(key = JavaScriptPlugin.ASSUME_A_YAHOO_WIDGET_KEY, defaultValue = JavaScriptPlugin.FALSE, name = "Assume a Yahoo Widget",
        description = "Assume a Yahoo Widget", global = true, project = true),
    @Property(key = JavaScriptPlugin.ASSUME_WINDOWS_KEY, defaultValue = JavaScriptPlugin.FALSE, name = "Assume Windows",
        description = "Assume Windows", global = true, project = true),
    @Property(key = JavaScriptPlugin.ASSUME_RHINO_KEY, defaultValue = JavaScriptPlugin.FALSE, name = "Assume Rhino",
        description = "Assume Rhino", global = true, project = true),
    @Property(key = JavaScriptPlugin.SAFE_SUBSET_KEY, defaultValue = JavaScriptPlugin.FALSE, name = "Safe Subset",
        description = "Safe Subset", global = true, project = true),
    @Property(key = JavaScriptPlugin.PREDEFINED_KEY, defaultValue = "", name = "Predefined variables",
        description = "Predefined variables ( , separated) ", global = true, project = true),
    @Property(key = JavaScriptPlugin.MAXIMUM_NUMBER_OF_ERRORS_KEY, defaultValue = "50", name = "Maximum number of errors",
        description = "Maximum number of errors", global = true, project = true) })
public class JavaScriptPlugin implements Plugin {

  public String getKey() {
    return JAVASCRIPT_PLUGIN;
  }

  public String getName() {
    return "JavaScript";
  }

  public String getDescription() {
    return "Analysis of JavaScript projects";
  }

  public List<Class<? extends Extension>> getExtensions() {
    List<Class<? extends Extension>> list = new ArrayList<Class<? extends Extension>>();

    list.add(JavaScriptColorizerFormat.class);
    list.add(JavaScript.class);
    list.add(JavaScriptSourceImporter.class);

    list.add(JavaScriptCpdMapping.class);

    list.add(JavaScriptRuleRepository.class);

    list.add(JavaScriptSquidSensor.class);

    list.add(JavaScriptJSLintSensor.class);

    list.add(JsLintRuleManager.class);

    list.add(JavaScriptDefaultProfile.class);
    
    list.add(JavaScriptComplexitySensor.class);

    return list;
  }

  public final static String FALSE = "false";
  public final static String JAVASCRIPT_PLUGIN = "JavaScriptPlugin";

  public static final String FILE_SUFFIXES_KEY = "sonar.javascript.file.suffixes";
  public static final String FILE_SUFFIXES_DEFVALUE = "js";

  public static final String PROPERTY_PREFIX = "sonar.javascript.lslint";

  public static final String ASSUME_A_BROWSER_KEY = PROPERTY_PREFIX + ".BROWSER";
  public static final String ASSUME_CONSOLE_ALERT_KEY = PROPERTY_PREFIX + ".DEVEL";
  public static final String ASSUME_A_YAHOO_WIDGET_KEY = PROPERTY_PREFIX + ".WIDGET";

  public static final String ASSUME_WINDOWS_KEY = PROPERTY_PREFIX + ".WINDOWS";
  public static final String ASSUME_RHINO_KEY = PROPERTY_PREFIX + ".RHINO";
  public static final String SAFE_SUBSET_KEY = PROPERTY_PREFIX + ".SAFE";

  public static final String MAXIMUM_NUMBER_OF_ERRORS_KEY = PROPERTY_PREFIX + ".MAXERR";

  public static final String PREDEFINED_KEY = PROPERTY_PREFIX + ".PREDEF";

  public static final String[] GLOBAL_PARAMETERS = new String[] { ASSUME_A_BROWSER_KEY, ASSUME_CONSOLE_ALERT_KEY,
    ASSUME_A_YAHOO_WIDGET_KEY, ASSUME_WINDOWS_KEY, ASSUME_RHINO_KEY, SAFE_SUBSET_KEY, MAXIMUM_NUMBER_OF_ERRORS_KEY, PREDEFINED_KEY };
}
