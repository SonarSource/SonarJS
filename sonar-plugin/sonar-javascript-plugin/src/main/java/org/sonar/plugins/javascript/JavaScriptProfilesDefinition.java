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
package org.sonar.plugins.javascript;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collection;
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
  public static final String PROFILES_JSON = RESOURCE_PATH + "/profiles.json";

  private static final List<ProfileDefinition> PROFILES = loadProfiles();
  static final String SONAR_JASMIN_RULES_CLASS_NAME = "com.sonar.plugins.jasmin.api.JsRules";
  public static final String SECURITY_RULE_KEYS_METHOD_NAME = "getSecurityRuleKeys";

  private static final Map<Language, String> REPO_BY_LANGUAGE = new EnumMap<>(Language.class);

  static {
    REPO_BY_LANGUAGE.put(Language.JAVASCRIPT, CheckList.JS_REPOSITORY_KEY);
    REPO_BY_LANGUAGE.put(Language.TYPESCRIPT, CheckList.TS_REPOSITORY_KEY);
  }

  private final Map<String, Map<Language, ArrayList<RuleKey>>> additionalRulesByProfileAndLanguage;

  /**
   * Constructor used by Pico container (SC) when no ProfileRegistrar are available
   */
  public JavaScriptProfilesDefinition() {
    this(new ProfileRegistrar[] {});
  }

  public JavaScriptProfilesDefinition(ProfileRegistrar[] profileRegistrars) {
    additionalRulesByProfileAndLanguage = new HashMap<>();
    for (var profileRegistrar : profileRegistrars) {
      profileRegistrar.register(
        new ProfileRegistrar.RegistrarContext() {
          @Override
          public void registerDefaultQualityProfileRules(
            Language language,
            Collection<RuleKey> ruleKeys
          ) {
            registerQualityProfileRules(SONAR_WAY, language, ruleKeys);
          }

          @Override
          public void registerQualityProfileRules(
            String qualityProfileName,
            Language language,
            Collection<RuleKey> ruleKeys
          ) {
            var rulesByLanguage = additionalRulesByProfileAndLanguage.computeIfAbsent(
              qualityProfileName,
              ignored -> new EnumMap<>(Language.class)
            );
            var additionalRules = rulesByLanguage.computeIfAbsent(language, ignored ->
              new ArrayList<>()
            );
            additionalRules.addAll(ruleKeys);
          }
        }
      );
    }
  }

  @Override
  public void define(Context context) {
    createProfiles(JavaScriptLanguage.KEY, context);
    createProfiles(TypeScriptLanguage.KEY, context);
  }

  private void createProfiles(String language, Context context) {
    PROFILES.forEach(profile -> createProfile(profile, language, context));
  }

  private void createProfile(ProfileDefinition profile, String language, Context context) {
    NewBuiltInQualityProfile newProfile = context.createBuiltInQualityProfile(
      profile.name(),
      language
    );
    activateBuiltInRules(newProfile, profile.path());
    activateAdditionalRules(newProfile, profile.name());
    if (SONAR_WAY.equals(profile.name())) {
      activateSecurityRules(newProfile, language);
    }
    newProfile.done();
  }

  /**
   * Activate rules whose implementation is built-in into the SonarJS plugin.
   *
   * @param profile profile to activate the rules for
   */
  private static void activateBuiltInRules(
    NewBuiltInQualityProfile profile,
    String jsonProfilePath
  ) {
    var language = Language.of(profile.language());
    String repositoryKey = REPO_BY_LANGUAGE.get(language);
    Set<String> activeKeys = BuiltInQualityProfileJsonLoader.loadActiveKeysFromJsonProfile(
      jsonProfilePath
    );

    ruleKeys(CheckList.getChecksForLanguage(language))
      .stream()
      .filter(activeKeys::contains)
      .forEach(key -> profile.activateRule(repositoryKey, key));
  }

  private static List<ProfileDefinition> loadProfiles() {
    try (
      InputStream inputStream =
        JavaScriptProfilesDefinition.class.getClassLoader().getResourceAsStream(PROFILES_JSON)
    ) {
      if (inputStream == null) {
        throw new IllegalStateException("Missing built-in quality profile index: " + PROFILES_JSON);
      }
      JsonArray profiles = JsonParser.parseReader(
        new InputStreamReader(inputStream, StandardCharsets.UTF_8)
      ).getAsJsonArray();
      List<ProfileDefinition> definitions = new ArrayList<>();
      profiles.forEach(profile -> {
        JsonObject profileJson = profile.getAsJsonObject();
        String name = profileJson.get("name").getAsString();
        String fileName = profileJson.get("fileName").getAsString();
        definitions.add(new ProfileDefinition(name, RESOURCE_PATH + "/" + fileName));
      });
      if (
        definitions
          .stream()
          .noneMatch(
            profile -> SONAR_WAY.equals(profile.name()) && SONAR_WAY_JSON.equals(profile.path())
          )
      ) {
        throw new IllegalStateException(
          "Missing required built-in quality profile in " + PROFILES_JSON + ": " + SONAR_WAY
        );
      }
      return definitions;
    } catch (IOException e) {
      throw new IllegalStateException("Failed to load built-in quality profile index", e);
    }
  }

  /**
   * Activate additional rules that are provided by other plugins.
   *
   * @param profile profile to activate the rules for
   * @param profileName quality profile name
   */
  void activateAdditionalRules(NewBuiltInQualityProfile profile, String profileName) {
    var rulesByLanguage = additionalRulesByProfileAndLanguage.get(profileName);
    if (rulesByLanguage == null) {
      return;
    }
    var language = Language.of(profile.language());
    var rules = rulesByLanguage.get(language);
    if (rules == null) {
      return;
    }
    rules.forEach(it -> profile.activateRule(it.repository(), it.rule()));
    LOG.debug("Adding extra {} ruleKeys {} to profile {}", language, rules, profileName);
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

  private static class ProfileDefinition {

    private final String name;
    private final String path;

    private ProfileDefinition(String name, String path) {
      this.name = name;
      this.path = path;
    }

    String name() {
      return name;
    }

    String path() {
      return path;
    }
  }
}
