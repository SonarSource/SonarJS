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

import java.util.Collection;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.server.ServerSide;

/**
 * This class can be extended to provide additional rule keys in the builtin default quality profile.
 *
 * <pre>
 *   {@code
 *     public void register(RegistrarContext registrarContext) {
 *       registrarContext.registerDefaultQualityProfileRules(ruleKeys);
 *     }
 *   }
 * </pre>
 *
 *  Note: It's possible to convert checkClass to RuleKey using:
 * <pre>
 *   {@code
 *     RuleKey.of(repositoryKey, RuleAnnotationUtils.getRuleKey(checkClass))
 *   }
 * </pre>
 */
@ServerSide
public interface ProfileRegistrar {
  /**
   * This method is called on server side and during an analysis to modify the builtin default quality profile for java.
   */
  void register(RegistrarContext registrarContext);

  interface RegistrarContext {
    /**
     * Registers additional rules into the "Sonar Way" default quality profile for the language "java".
     */
    void registerDefaultQualityProfileRules(Collection<RuleKey> ruleKeys);
  }
}
