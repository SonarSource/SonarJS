/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
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

import org.junit.Test;
import org.sonar.squidbridge.commonrules.api.CommonRulesRepository;
import org.sonar.squidbridge.commonrules.internal.CommonRulesConstants;

import static org.fest.assertions.Assertions.assertThat;

public class JavaScriptCommonRulesEngineTest {

  @Test
  public void provide_extensions() {
    JavaScriptCommonRulesEngine engine = new JavaScriptCommonRulesEngine();
    assertThat(engine.provide()).isNotEmpty();
  }

  @Test
  public void define_rules() {
    JavaScriptCommonRulesEngine engine = new JavaScriptCommonRulesEngine();
    CommonRulesRepository repo = engine.newRepository();
    assertThat(repo.enabledRuleKeys()).containsOnly(
      CommonRulesConstants.RULE_INSUFFICIENT_COMMENT_DENSITY,
      CommonRulesConstants.RULE_DUPLICATED_BLOCKS,
      CommonRulesConstants.RULE_INSUFFICIENT_LINE_COVERAGE,
      CommonRulesConstants.RULE_INSUFFICIENT_BRANCH_COVERAGE);
  }

}
