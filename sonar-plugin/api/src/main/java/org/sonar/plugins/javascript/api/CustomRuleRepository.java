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
package org.sonar.plugins.javascript.api;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.sonar.api.scanner.ScannerSide;
import org.sonarsource.api.sonarlint.SonarLintSide;

/**
 * This interface should be implemented by custom rules plugins to register their rules with SonarJS
 *
 * @deprecated since 6.0. Consider using ESlint custom rules with external issue import instead.
 */
@ScannerSide
@SonarLintSide
@Deprecated(since = "6.0")
public interface CustomRuleRepository {
  enum Language {
    JAVASCRIPT("js"),
    TYPESCRIPT("ts");

    private static final Map<String, Language> stringMap = Arrays.stream(values()).collect(
      Collectors.toMap(Enum::toString, Function.identity())
    );

    public static Language of(String value) {
      return stringMap.get(value);
    }

    private final String lang;

    Language(String language) {
      this.lang = language;
    }

    @Override
    public String toString() {
      return lang;
    }
  }

  default Set<Language> languages() {
    return EnumSet.of(Language.JAVASCRIPT);
  }

  /**
   * Key of the custom rule repository.
   */
  String repositoryKey();

  /**
   * List of the custom rules classes.
   *
   * @return
   */
  List<Class<? extends JavaScriptCheck>> checkClasses();
}
