/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.javascript.checks;

import java.lang.annotation.Annotation;
import java.util.List;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.plugins.javascript.api.TypeScriptRule;

public final class CheckList {

  public static final String JS_REPOSITORY_KEY = "javascript";
  public static final String TS_REPOSITORY_KEY = "typescript";

  public static final String REPOSITORY_NAME = "SonarAnalyzer";

  private CheckList() {}

  public static List<Class<? extends JavaScriptCheck>> getTypeScriptChecks() {
    return filterChecksByAnnotation(TypeScriptRule.class);
  }

  public static List<Class<? extends JavaScriptCheck>> getJavaScriptChecks() {
    return filterChecksByAnnotation(JavaScriptRule.class);
  }

  private static List<Class<? extends JavaScriptCheck>> filterChecksByAnnotation(
    Class<? extends Annotation> annotation
  ) {
    List<Class<? extends JavaScriptCheck>> allChecks = getAllChecks();
    return allChecks.stream().filter(c -> c.isAnnotationPresent(annotation)).toList();
  }

  public static List<Class<? extends JavaScriptCheck>> getAllChecks() {
    return AllChecks.rules;
  }
}
