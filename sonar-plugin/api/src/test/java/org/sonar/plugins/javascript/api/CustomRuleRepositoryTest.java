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
package org.sonar.plugins.javascript.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.sonar.check.Rule;

class CustomRuleRepositoryTest {

  @Test
  void test() {
    MyRepository repo = new MyRepository();
    assertThat(repo.languages()).containsExactly(CustomRuleRepository.Language.JAVASCRIPT);
  }

  static class MyRepository implements CustomRuleRepository {

    @Override
    public String repositoryKey() {
      return "key";
    }

    @Override
    public List<Class<? extends JavaScriptCheck>> checkClasses() {
      return Collections.singletonList(CustomCheck.class);
    }
  }

  @Rule(key="key")
  static class CustomCheck extends Check {
  }
}
