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
