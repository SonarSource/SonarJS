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
import org.sonar.api.profiles.RulesProfile;
import org.sonar.api.resources.ProjectFileSystem;
import org.sonar.commonrules.api.CommonRulesRepository;

import static org.fest.assertions.Assertions.assertThat;
import static org.mockito.Mockito.mock;

public class JavaScriptCommonRulesEngineTest {

  @Test
  public void provide_batch_extensions() {
    JavaScriptCommonRulesEngine engine = new JavaScriptCommonRulesEngine(mock(RulesProfile.class), mock(ProjectFileSystem.class));
    assertThat(engine.provide().size()).isGreaterThan(0);
  }

  @Test
  public void provide_server_extensions() {
    JavaScriptCommonRulesEngine engine = new JavaScriptCommonRulesEngine();
    assertThat(engine.provide().size()).isGreaterThan(0);
  }

  @Test
  public void define_rules() {
    JavaScriptCommonRulesEngine engine = new JavaScriptCommonRulesEngine();
    CommonRulesRepository repo = engine.newRepository();
    assertThat(repo.rules()).hasSize(4);
    assertThat(repo.rule(CommonRulesRepository.RULE_INSUFFICIENT_COMMENT_DENSITY)).isNotNull();
    assertThat(repo.rule(CommonRulesRepository.RULE_DUPLICATED_BLOCKS)).isNotNull();
    assertThat(repo.rule(CommonRulesRepository.RULE_INSUFFICIENT_LINE_COVERAGE)).isNotNull();
    assertThat(repo.rule(CommonRulesRepository.RULE_INSUFFICIENT_BRANCH_COVERAGE)).isNotNull();
  }

}
