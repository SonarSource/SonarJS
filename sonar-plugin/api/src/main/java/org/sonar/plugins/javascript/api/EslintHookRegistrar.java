package org.sonar.plugins.javascript.api;

import org.sonar.api.server.ServerSide;

/**
 * This class can be extended to provide ES linter hooks to be executed on the JS side during analysis.
 *
 * <pre>
 *   {@code
 *     public void register(RegistrarContext registrarContext) {
 *       registrarContext.registerEslintHook(jsRuleKeys, Language.JAVASCRIPT);
 *       registrarContext.registerDefaultQualityProfileRules(tsRuleKeys, Language.TYPESCRIPT);
 *     }
 *   }
 * </pre>
 */
@ServerSide
public interface EslintHookRegistrar {
  /**
   * This method is called on the server side and during an analysis to register ES linter hooks.
   */
  void register(RegistrarContext registrarContext);

  interface RegistrarContext {
    /**
     * Registers an ES linter hook to be executed on the JS side if enabled.
     *
     * @param language lamguage for which to execute the hook
     * @param hook ES linter hook
     */
    void registerEslintHook(Language language, EslintHook hook);
  }
}
