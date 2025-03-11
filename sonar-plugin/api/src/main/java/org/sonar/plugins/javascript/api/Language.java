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
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

public enum Language {
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
