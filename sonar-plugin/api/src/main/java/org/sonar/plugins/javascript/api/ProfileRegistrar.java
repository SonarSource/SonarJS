/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
 * This class can be extended to provide additional rule keys in built-in quality profiles.
 *
 * <pre>
 *   {@code
 *     public void register(RegistrarContext registrarContext) {
 *       registrarContext.registerQualityProfileRules("Sonar way", Language.JAVASCRIPT, jsRuleKeys);
 *       registrarContext.registerQualityProfileRules("Sonar way", Language.TYPESCRIPT, tsRuleKeys);
 *     }
 *   }
 * </pre>
 */
@ServerSide
public interface ProfileRegistrar {
  /**
   * This method is called on server side and during an analysis to modify built-in quality profiles.
   */
  void register(RegistrarContext registrarContext);

  interface RegistrarContext {
    String DEFAULT_QUALITY_PROFILE = "Sonar way";

    /**
     * Registers additional rules into the "Sonar Way" default quality profile for the given language.
     *
     * @param language profile language
     * @param ruleKeys additional rule keys
     */
    void registerDefaultQualityProfileRules(Language language, Collection<RuleKey> ruleKeys);

    /**
     * Registers additional rules into a built-in quality profile for the given language.
     * <p>
     * The profile name is expected to match the profile string coming from rspec metadata
     * ({@code defaultQualityProfiles}).
     * </p>
     *
     * @param qualityProfileName built-in quality profile name
     * @param language profile language
     * @param ruleKeys additional rule keys
     */
    default void registerQualityProfileRules(
      String qualityProfileName,
      Language language,
      Collection<RuleKey> ruleKeys
    ) {
      if (DEFAULT_QUALITY_PROFILE.equals(qualityProfileName)) {
        registerDefaultQualityProfileRules(language, ruleKeys);
      }
    }
  }
}
