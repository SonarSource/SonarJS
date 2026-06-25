/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.analysis;

import static org.sonar.plugins.javascript.JavaScriptPlugin.ESLINT_REPORT_PATHS;
import static org.sonar.plugins.javascript.JavaScriptPlugin.TSCONFIG_PATHS;
import static org.sonar.plugins.javascript.JavaScriptPlugin.TSCONFIG_PATHS_ALIAS;

import org.sonar.api.batch.sensor.Sensor;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.css.CssLanguage;
import org.sonar.plugins.javascript.JavaScriptFilePredicate;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptLanguage;

public class WebSensorModuleConfigurationSensor implements Sensor {

  private final WebSensorModuleConfiguration moduleConfiguration;

  public WebSensorModuleConfigurationSensor(WebSensorModuleConfiguration moduleConfiguration) {
    this.moduleConfiguration = moduleConfiguration;
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor
      .onlyOnLanguages(
        JavaScriptLanguage.KEY,
        TypeScriptLanguage.KEY,
        CssLanguage.KEY,
        JavaScriptFilePredicate.YAML_LANGUAGE,
        JavaScriptFilePredicate.WEB_LANGUAGE
      )
      .onlyWhenConfiguration(
        conf ->
          conf.hasKey(TSCONFIG_PATHS) ||
          conf.hasKey(TSCONFIG_PATHS_ALIAS) ||
          conf.hasKey(ESLINT_REPORT_PATHS)
      )
      .name("JavaScript/TypeScript module configuration");
  }

  @Override
  public void execute(SensorContext sensorContext) {
    moduleConfiguration.collect(sensorContext);
  }
}
