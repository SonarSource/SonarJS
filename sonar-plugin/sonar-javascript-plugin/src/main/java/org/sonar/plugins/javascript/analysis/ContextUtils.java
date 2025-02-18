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
import org.sonar.plugins.javascript.api.AnalysisMode;

public class ContextUtils {

  /**
   * Internal property to enable SonarArmor (disabled by default), now called Jasmin
   * @deprecated Kept for backwards compatibility until SonarArmor has been renamed to Jasmin, to allow for a smooth transition. Roadmap:
   * 1. Merge this
   * 2. Rename SonarArmor to Jasmin on SonarArmor repository, this includes renaming the flag
   * 3. Once Jasmin renaming is on master, change the flags in the Peachee jobs
   * 4. Finally, remove this flag here
   */
  @Deprecated(forRemoval = true)
  private static final String ARMOR_INTERNAL_ENABLED = "sonar.armor.internal.enabled";

  /* Internal property to enable Jasmin (disabled by default) */
  private static final String JASMIN_INTERNAL_ENABLED = "sonar.jasmin.internal.enabled";

  /* Internal property to enable JaRED (disabled by default) */
  private static final String JARED_INTERNAL_ENABLED = "sonar.jared.internal.enabled";

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

  @Deprecated(forRemoval = true)
  boolean isSonarArmorEnabled() {
    return context.config().getBoolean(ARMOR_INTERNAL_ENABLED).orElse(false);
  }

  boolean isSonarJasminEnabled() {
    return context.config().getBoolean(JASMIN_INTERNAL_ENABLED).orElse(false);
  }

  boolean isSonarJaredEnabled() {
    return context.config().getBoolean(JARED_INTERNAL_ENABLED).orElse(false);
  }

  AnalysisMode getAnalysisMode() {
    var canSkipUnchangedFiles = context.canSkipUnchangedFiles();
    if (!canSkipUnchangedFiles) {
      return AnalysisMode.DEFAULT;
    }

    return AnalysisMode.SKIP_UNCHANGED;
  }
}
