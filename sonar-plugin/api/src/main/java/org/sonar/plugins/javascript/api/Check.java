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

import org.sonar.check.Rule;

/**
 * @deprecated since 11.6, use {@link EslintHook} instead
 */
@Deprecated(since = "11.6", forRemoval = true)
public class Check implements EslintBasedCheck {

  /**
   * This should be named `key()`, but we keep the compatibility with the legacy semantic.
   */
  @Override
  public String eslintKey() {
    return this.getClass().getAnnotation(Rule.class).key();
  }
}
