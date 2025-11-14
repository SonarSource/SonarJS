/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.server.profile.BuiltInQualityProfilesDefinition;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.api.EslintHook;
import org.sonar.plugins.javascript.api.Language;
import org.sonar.plugins.javascript.api.ProfileRegistrar;
import org.sonarsource.analyzer.commons.BuiltInQualityProfileJsonLoader;

public class JavaScriptProfilesDefinition implements BuiltInQualityProfilesDefinition {

  private static final Logger LOG = LoggerFactory.getLogger(JavaScriptProfilesDefinition.class);

  static final String SONAR_WAY = "Sonar way";

  public static final String RESOURCE_PATH = "org/sonar/l10n/javascript/rules/javascript";
  public static final String SONAR_WAY_JSON = RESOURCE_PATH + "/Sonar_way_profile.json";

  private static final Map<String, String> PROFILES = new HashMap<>();
  static final String SONAR_JASMIN_RULES_CLASS_NAME = "com.sonar.plugins.jasmin.api.JsRules";
  public static final String SECURITY_RULE_KEYS_METHOD_NAME = "getSecurityRuleKeys";

  static {
    PROFILES.put(SONAR_WAY, SONAR_WAY_JSON);
  }

  private static final Map<Language, String> REPO_BY_LANGUAGE = new EnumMap<>(Language.class);

  static {
    REPO_BY_LANGUAGE.put(Language.JAVASCRIPT, CheckList.JS_REPOSITORY_KEY);
    REPO_BY_LANGUAGE.put(Language.TYPESCRIPT, CheckList.TS_REPOSITORY_KEY);
  }

  private final Map<Language, ArrayList<RuleKey>> additionalRulesByLanguage;

  /**
   * Constructor used by Pico container (SC) when no ProfileRegistrar are available
   */
  public JavaScriptProfilesDefinition() {
    this(new ProfileRegistrar[] {});
  }

  public JavaScriptProfilesDefinition(ProfileRegistrar[] profileRegistrars) {
    additionalRulesByLanguage = new EnumMap<>(Language.class);
    for (var profileRegistrar : profileRegistrars) {
      profileRegistrar.register((language, rules) -> {
        var additionalRules = additionalRulesByLanguage.computeIfAbsent(language, it ->
          new ArrayList<>()
        );
        additionalRules.addAll(rules);
      });
    }
  }

  @Override
  public void define(Context context) {
    createSonarWayProfile(JavaScriptLanguage.KEY, context);
    createSonarWayProfile(TypeScriptLanguage.KEY, context);
  }

  private void createSonarWayProfile(String language, Context context) {
    NewBuiltInQualityProfile newProfile = context.createBuiltInQualityProfile(SONAR_WAY, language);
    activateBuiltInRules(newProfile);
    activateAdditionalRules(newProfile);
    activateSecurityRules(newProfile, language);
    newProfile.done();
  }

  /**
   * Activate rules whose implementation is built-in into the SonarJS plugin.
   *
   * @param profile profile to activate the rules for
   */
  private static void activateBuiltInRules(NewBuiltInQualityProfile profile) {
    var language = Language.of(profile.language());
    String repositoryKey = REPO_BY_LANGUAGE.get(language);
    var jsonProfilePath = PROFILES.get(profile.name());

    Set<String> activeKeysForBothLanguages =
      BuiltInQualityProfileJsonLoader.loadActiveKeysFromJsonProfile(jsonProfilePath);
    ruleKeys(CheckList.getChecksForLanguage(language))
      .stream()
      .filter(activeKeysForBothLanguages::contains)
      .forEach(key -> profile.activateRule(repositoryKey, key));
  }

  /**
   * Activate additional rules that are provided by other plugins.
   *
   * @param profile profile to activate the rules for
   */
  void activateAdditionalRules(NewBuiltInQualityProfile profile) {
    var language = profile.language();
    var rules = additionalRulesByLanguage.get(Language.of(language));
    if (rules == null) {
      return;
    }
    rules.forEach(it -> profile.activateRule(it.repository(), it.rule()));
    LOG.debug("Adding extra {} ruleKeys {}", language, rules);
  }

  /**
   * Security rules are added by reflectively invoking specific classes from the Jasmin plugin, which provides
   * rule keys to add to the built-in profiles.
   * It is expected for the reflective calls to fail in case any plugin is not available, e.g., in SQ community edition.
   */
  private static void activateSecurityRules(NewBuiltInQualityProfile newProfile, String language) {
    Set<RuleKey> sonarJasminRuleKeys = getSecurityRuleKeys(
      SONAR_JASMIN_RULES_CLASS_NAME,
      SECURITY_RULE_KEYS_METHOD_NAME,
      language
    );
    LOG.debug("Adding security ruleKeys {}", sonarJasminRuleKeys);
    sonarJasminRuleKeys.forEach(r -> newProfile.activateRule(r.repository(), r.rule()));
  }

  // Visible for testing
  static Set<RuleKey> getSecurityRuleKeys(
    String className,
    String ruleKeysMethodName,
    String language
  ) {
    try {
      Class<?> rulesClass = Class.forName(className);
      Method getRuleKeysMethod = rulesClass.getMethod(ruleKeysMethodName, String.class);
      return (Set<RuleKey>) getRuleKeysMethod.invoke(null, language);
    } catch (ClassNotFoundException e) {
      LOG.debug("{} is not found, {}", className, securityRuleMessage(e));
    } catch (NoSuchMethodException e) {
      LOG.debug("Method not found on {}, {}", className, securityRuleMessage(e));
    } catch (IllegalAccessException | InvocationTargetException e) {
      LOG.debug("{}: {}", e.getClass().getSimpleName(), securityRuleMessage(e));
    }

    return Collections.emptySet();
  }

  private static Set<String> ruleKeys(List<Class<? extends EslintHook>> checks) {
    return checks
      .stream()
      .map(c -> c.getAnnotation(Rule.class).key())
      .collect(Collectors.toSet());
  }

  private static String securityRuleMessage(Exception e) {
    return "no security rules added to builtin profile: " + e.getMessage();
  }
}
