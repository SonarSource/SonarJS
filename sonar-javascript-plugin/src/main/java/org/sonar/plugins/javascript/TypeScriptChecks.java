/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
package org.sonar.plugins.javascript;

import javax.annotation.Nullable;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.api.CustomJavaScriptRulesDefinition;
import org.sonar.plugins.javascript.api.CustomRuleRepository;
import org.sonarsource.api.sonarlint.SonarLintSide;


/**
 * Wrapper around Checks Object to ease the manipulation of the different JavaScript rule repositories.
 */
@ScannerSide
@SonarLintSide
public class TypeScriptChecks extends AbstractChecks {

  public TypeScriptChecks(CheckFactory checkFactory) {
    this(checkFactory, null, null);
  }

  /**
   *  This constructor is necessary for Pico container to correctly instantiate sensor with custom rules loaded via {@link CustomJavaScriptRulesDefinition}
   *  See plugin integration tests
   */
  public TypeScriptChecks(CheckFactory checkFactory, @Nullable CustomJavaScriptRulesDefinition[] customRulesDefinition) {
    this(checkFactory, customRulesDefinition, null);
  }

  /**
   *  This constructor is necessary for Pico container to correctly instantiate sensor with custom rules loaded via {@link CustomRuleRepository}
   *  See plugin integration tests
   */
  public TypeScriptChecks(CheckFactory checkFactory, @Nullable CustomRuleRepository[] customRuleRepositories) {
    this(checkFactory, null, customRuleRepositories);
  }

  public TypeScriptChecks(CheckFactory checkFactory, @Nullable CustomJavaScriptRulesDefinition[] customRulesDefinitions,
                          @Nullable CustomRuleRepository[] customRuleRepositories) {
    super(checkFactory, customRulesDefinitions, customRuleRepositories);
    addChecks(CheckList.TS_REPOSITORY_KEY, CheckList.getTypeScriptChecks());
  }

}
