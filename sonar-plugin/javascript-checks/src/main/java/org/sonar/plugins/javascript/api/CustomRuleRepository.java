/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
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
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
package org.sonar.plugins.javascript.api;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import org.sonar.api.scanner.ScannerSide;
import org.sonarsource.api.sonarlint.SonarLintSide;

/**
 * This interface should be implemented by custom rules plugins to register their rules with SonarJS
 *
 * @deprecated since 6.0. Consider using ESlint custom rules with external issue import instead.
 */
@ScannerSide
@SonarLintSide
@Deprecated
public interface CustomRuleRepository {
  enum Language {
    JAVASCRIPT,
    TYPESCRIPT,
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
