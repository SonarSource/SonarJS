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
package org.sonar.plugins.javascript;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.server.profile.BuiltInQualityProfilesDefinition;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.ProfileRegistrar;
import org.sonarsource.analyzer.commons.BuiltInQualityProfileJsonLoader;

public class JavaScriptProfilesDefinition implements BuiltInQualityProfilesDefinition {

  private final ProfileRegistrar[] profileRegistrars;

  private static final Logger LOG = LoggerFactory.getLogger(JavaScriptProfilesDefinition.class);

  static final String SONAR_WAY = "Sonar way";

  public static final String RESOURCE_PATH = "org/sonar/l10n/javascript/rules/javascript";
  public static final String SONAR_WAY_JSON = RESOURCE_PATH + "/Sonar_way_profile.json";

  private static final Map<String, String> PROFILES = new HashMap<>();

  static final String SONAR_SECURITY_RULES_CLASS_NAME = "com.sonar.plugins.security.api.JsRules";
  static final String SONAR_JASMIN_RULES_CLASS_NAME = "com.sonar.plugins.jasmin.api.JsRules";
  public static final String SECURITY_RULE_KEYS_METHOD_NAME = "getSecurityRuleKeys";

  private static final String SONAR_ARCHITECTURE_RULES_CLASS_NAME =
    "com.sonarsource.architecture.JsRulesList";
  private static final String ARCHITECTURE_RULE_KEYS_METHOD_NAME = "getRuleKeys";

  static {
    PROFILES.put(SONAR_WAY, SONAR_WAY_JSON);
  }

  private static final Map<String, String> REPO_BY_LANGUAGE = new HashMap<>();

  static {
    REPO_BY_LANGUAGE.put(JavaScriptLanguage.KEY, CheckList.JS_REPOSITORY_KEY);
    REPO_BY_LANGUAGE.put(TypeScriptLanguage.KEY, CheckList.TS_REPOSITORY_KEY);
  }

  private static Logger logger = LoggerFactory.getLogger(JavaScriptProfilesDefinition.class);

  public JavaScriptProfilesDefinition() {
    this(null);
    logger.info("hello from the NULL constructor.");
  }

  public JavaScriptProfilesDefinition(@Nullable ProfileRegistrar[] profileRegistrars) {
    logger.info("hello from the non-null constructor. Are we null? " + (profileRegistrars == null));
    this.profileRegistrars = profileRegistrars;
  }

  @Override
  public void define(Context context) {
    // what happens if we call this in another plugin?
    Set<String> javaScriptRuleKeys = ruleKeys(CheckList.getJavaScriptChecks());
    createProfile(SONAR_WAY, JavaScriptLanguage.KEY, javaScriptRuleKeys, context);

    Set<String> typeScriptRuleKeys = ruleKeys(CheckList.getTypeScriptChecks());
    createProfile(SONAR_WAY, TypeScriptLanguage.KEY, typeScriptRuleKeys, context);
  }

  private void createProfile(
    String profileName,
    String language,
    Set<String> keys,
    Context context
  ) {
    NewBuiltInQualityProfile newProfile = context.createBuiltInQualityProfile(
      profileName,
      language
    );
    String jsonProfilePath = PROFILES.get(profileName);
    String repositoryKey = REPO_BY_LANGUAGE.get(language);
    Set<String> activeKeysForBothLanguages =
      BuiltInQualityProfileJsonLoader.loadActiveKeysFromJsonProfile(jsonProfilePath);

    keys
      .stream()
      .filter(activeKeysForBothLanguages::contains)
      .forEach(key -> newProfile.activateRule(repositoryKey, key));

    addExternalRules(
      newProfile,
      language,
      SONAR_SECURITY_RULES_CLASS_NAME,
      SECURITY_RULE_KEYS_METHOD_NAME,
      "security"
    );
    addExternalRules(
      newProfile,
      language,
      SONAR_JASMIN_RULES_CLASS_NAME,
      SECURITY_RULE_KEYS_METHOD_NAME,
      "security"
    );
    addExternalRules(
      newProfile,
      language,
      SONAR_ARCHITECTURE_RULES_CLASS_NAME,
      ARCHITECTURE_RULE_KEYS_METHOD_NAME,
      "architecture"
    );

    newProfile.done();
  }

  /**
   * Security rules are added by reflectively invoking specific classes from the SonarSecurity and Jasmin plugins, which provides
   * rule keys to add to the built-in profiles.
   * It is expected for the reflective calls to fail in case any plugin is not available, e.g., in SQ community edition.
   */
  private static void addExternalRules(
    NewBuiltInQualityProfile newProfile,
    String language,
    String className,
    String methodName,
    String topic
  ) {
    Set<RuleKey> externalRuleKeys = getExternalRules(className, methodName, language, topic);
    LOG.debug("Adding " + topic + " ruleKeys {}", externalRuleKeys);
    externalRuleKeys.forEach(r -> newProfile.activateRule(r.repository(), r.rule()));
  }

  // Visible for testing
  static Set<RuleKey> getExternalRules(
    String className,
    String ruleKeysMethodName,
    String language,
    String topic
  ) {
    try {
      Class<?> rulesClass = Class.forName(className);
      Method getRuleKeysMethod = rulesClass.getMethod(ruleKeysMethodName, String.class);
      LOG.info("loaded rule keys from {}", className);
      return (Set<RuleKey>) getRuleKeysMethod.invoke(null, language);
    } catch (ClassNotFoundException e) {
      LOG.info("{} is not found, {}", className, detailedMessage(topic, e));
    } catch (NoSuchMethodException e) {
      LOG.info("Method not found on {}, {}", className, detailedMessage(topic, e));
    } catch (IllegalAccessException | InvocationTargetException e) {
      LOG.info("{}: {}", e.getClass().getSimpleName(), detailedMessage(topic, e));
    }

    return Collections.emptySet();
  }

  private static Set<String> ruleKeys(List<Class<? extends JavaScriptCheck>> checks) {
    return checks.stream().map(c -> c.getAnnotation(Rule.class).key()).collect(Collectors.toSet());
  }

  private static String detailedMessage(String topic, Exception e) {
    return "no " + topic + " rules added to builtin profile: " + e.getMessage();
  }
}
