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
 *       registrarContext.registerDefaultQualityProfileRules(Language.JAVASCRIPT, jsRuleKeys);
 *       registrarContext.registerDefaultQualityProfileRules(Language.TYPESCRIPT, tsRuleKeys);
 *     }
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
     * Registers additional rules into the "Sonar Way" default quality profile for the given language.
     *
     * @param language profile language
     * @param ruleKeys additional rule keys
     */
    void registerDefaultQualityProfileRules(Language language, Collection<RuleKey> ruleKeys);
  }
}
