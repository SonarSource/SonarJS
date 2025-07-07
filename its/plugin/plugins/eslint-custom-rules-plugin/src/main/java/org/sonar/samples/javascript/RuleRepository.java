/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2025 SonarSource SA
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
package org.sonar.samples.javascript;

import static org.sonar.plugins.javascript.api.Language.JAVASCRIPT;
import static org.sonar.plugins.javascript.api.Language.TYPESCRIPT;

import java.util.Collections;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import org.sonar.plugins.javascript.api.CustomRuleRepository;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.Language;

public class RuleRepository implements CustomRuleRepository {

  public static final String REPOSITORY_KEY = "eslint-custom-rules";

  @Override
  public Set<Language> compatibleLanguages() {
    return EnumSet.of(JAVASCRIPT, TYPESCRIPT);
  }

  @Override
  public String repositoryKey() {
    return REPOSITORY_KEY;
  }

  @Override
  public List<Class<? extends JavaScriptCheck>> checkClasses() {
    return Collections.singletonList(CustomRule.class);
  }
}
