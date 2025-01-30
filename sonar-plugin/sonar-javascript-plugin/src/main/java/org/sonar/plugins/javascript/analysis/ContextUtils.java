/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
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

import java.nio.charset.StandardCharsets;
import org.sonar.api.SonarProduct;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.plugins.javascript.JavaScriptPlugin;

public class ContextUtils {

  private final SensorContext context;

  ContextUtils(SensorContext context) {
    this.context = context;
  }

  boolean isSonarLint() {
    return context.runtime().getProduct() == SonarProduct.SONARLINT;
  }

  boolean isSonarQube() {
    return context.runtime().getProduct() == SonarProduct.SONARQUBE;
  }

  boolean ignoreHeaderComments() {
    return context
      .config()
      .getBoolean(JavaScriptPlugin.IGNORE_HEADER_COMMENTS)
      .orElse(JavaScriptPlugin.IGNORE_HEADER_COMMENTS_DEFAULT_VALUE);
  }

  boolean shouldSendFileContent(InputFile file) {
    return isSonarLint() || !StandardCharsets.UTF_8.equals(file.charset());
  }

  boolean failFast() {
    return context.config().getBoolean("sonar.internal.analysis.failFast").orElse(false);
  }

  SensorContext context() {
    return context;
  }
}
