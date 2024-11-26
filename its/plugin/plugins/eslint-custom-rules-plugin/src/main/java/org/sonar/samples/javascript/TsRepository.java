/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2024 SonarSource SA
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

import java.util.Collections;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import org.sonar.plugins.javascript.api.CustomRuleRepository;
import org.sonar.plugins.javascript.api.JavaScriptCheck;

/**
 * This repository will register rule only for TypeScript. We reuse same rule implementation
 */
public class TsRepository implements CustomRuleRepository {

  public static final String REPOSITORY_KEY = "ts-custom-rules";

  @Override
  public Set<Language> languages() {
    return EnumSet.of(Language.TYPESCRIPT);
  }

  @Override
  public String repositoryKey() {
    return REPOSITORY_KEY;
  }

  @Override
  public List<Class<? extends JavaScriptCheck>> checkClasses() {
    return Collections.singletonList(TsRule.class);
  }
}
