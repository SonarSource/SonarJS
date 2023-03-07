/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
package org.sonar.plugins.javascript.utils;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import javax.annotation.Nullable;
import org.sonar.api.SonarEdition;
import org.sonar.api.SonarProduct;
import org.sonar.api.SonarQubeSide;
import org.sonar.api.SonarRuntime;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.rule.RuleScope;
import org.sonar.api.rule.RuleStatus;
import org.sonar.api.rule.Severity;
import org.sonar.api.rules.RuleType;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.api.utils.AnnotationUtils;
import org.sonar.api.utils.Version;
import org.sonar.css.CssProfileDefinition;
import org.sonar.css.CssRules;
import org.sonar.css.CssRulesDefinition;
import org.sonar.css.rules.CssRule;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.JavaScriptProfilesDefinition;
import org.sonar.plugins.javascript.api.EslintBasedCheck;
import org.sonar.plugins.javascript.rules.JavaScriptRulesDefinition;
import org.sonarsource.analyzer.commons.RuleMetadataLoader;

/**
 * This class is used to generate static json file with rule metadata used by SonarLint Visual Studio because
 * usual Java check classes can not be used. Metadata contain
 * <ul>
 *  <li>usual fields from static json files used by plugin</li>
 *  <li>rule parameter data from annotations on check classes</li>
 *  <li>eslint key</li>
 * </ul>
 * <p>
 * The file is packaged inside the jar artifact during the build
 */
public class RulesMetadataForSonarLint {

  private final List<Rule> rules = new ArrayList<>();

  RulesMetadataForSonarLint() {

  }

  void addRules(String repositoryKey, List<? extends Class<?>> ruleClasses, String metadataLocation, String profilePath) {
    RulesDefinition.Context context = new RulesDefinition.Context();
    RulesDefinition.NewRepository repository = context
      .createRepository(repositoryKey, JavaScriptLanguage.KEY)
      .setName("dummy");


    RuleMetadataLoader ruleMetadataLoader = new RuleMetadataLoader(metadataLocation, profilePath, getSonarlintRuntime());
    ruleMetadataLoader.addRulesByAnnotatedClass(repository, Collections.unmodifiableList(ruleClasses));
    repository.done();

    Map<String, Object> ruleKeyToCheck = ruleClasses.stream()
      .filter(c -> EslintBasedCheck.class.isAssignableFrom(c) || CssRule.class.isAssignableFrom(c))
      .collect(Collectors.toMap(RulesMetadataForSonarLint::ruleKeyFromRuleClass, RulesMetadataForSonarLint::checkInstance));

    context.repository(repositoryKey).rules().stream()
      .map(r -> {
        var check = ruleKeyToCheck.get(r.key());
        if (check != null) {
          return Rule.fromSqRule(repositoryKey, r, check);
        } else {
          return Rule.fromSqRule(repositoryKey, r, null);
        }
      })
      .forEach(rules::add);
  }

  static String ruleKeyFromRuleClass(Class<?> clazz) {
    org.sonar.check.Rule ruleAnnotation = AnnotationUtils.getAnnotation(clazz, org.sonar.check.Rule.class);
    return ruleAnnotation.key();
  }

  static <T> T checkInstance(Class<T> clazz) {
    try {
      return clazz.getDeclaredConstructor().newInstance();
    } catch (Exception e) {
      throw new IllegalStateException("failed to instantiate " + clazz.getSimpleName(), e);
    }
  }

  void save(Path path) throws IOException {
    Gson gson = new GsonBuilder().setPrettyPrinting().create();
    String json = gson.toJson(rules);
    Files.write(path, json.getBytes(StandardCharsets.UTF_8));
  }

  public static void main(String[] args) {
    if (args.length == 0) {
      throw new IllegalStateException("Missing argument - provide path where to save metadata");
    }
    try {
      var metadata = new RulesMetadataForSonarLint();
      metadata.addRules(CheckList.JS_REPOSITORY_KEY, CheckList.getJavaScriptChecks(),
        JavaScriptRulesDefinition.METADATA_LOCATION, JavaScriptProfilesDefinition.SONAR_WAY_JSON);
      metadata.addRules(CheckList.TS_REPOSITORY_KEY, CheckList.getTypeScriptChecks(),
        JavaScriptRulesDefinition.METADATA_LOCATION, JavaScriptProfilesDefinition.SONAR_WAY_JSON);
      metadata.addRules(CssRulesDefinition.REPOSITORY_KEY, CssRules.getRuleClasses(),
        CssRulesDefinition.RESOURCE_FOLDER + CssRulesDefinition.REPOSITORY_KEY, CssProfileDefinition.PROFILE_PATH);
      metadata.save(Paths.get(args[0]));
    } catch (IOException e) {
      e.printStackTrace();
      System.exit(1);
    }
  }

  private static SonarRuntime getSonarlintRuntime() {
    return new SonarRuntime() {
      @Override
      public Version getApiVersion() {
        // we need at least 9.3 to provide OWASP 2021 standards
        return Version.create(9, 3);
      }

      @Override
      public SonarProduct getProduct() {
        return SonarProduct.SONARLINT;
      }

      @Override
      public SonarQubeSide getSonarQubeSide() {
        throw new UnsupportedOperationException("Can only be called in SonarQube");
      }

      @Override
      public SonarEdition getEdition() {
        throw new UnsupportedOperationException("Can only be called in SonarQube");
      }
    };
  }

  static class Rule {
    private String ruleKey;
    private RuleType type;
    private String name;
    private String htmlDescription;
    private String severity = Severity.MAJOR;
    private RuleStatus status = RuleStatus.defaultStatus();
    private Set<String> tags;
    private List<RulesDefinition.Param> params;
    private List<Object> defaultParams = Collections.emptyList();
    private RuleScope scope;
    private String eslintKey;
    private boolean activatedByDefault;
    private String stylelintKey;

    static Rule fromSqRule(String repository, RulesDefinition.Rule sqRule, @Nullable Object check) {
      Rule rule = new Rule();
      rule.ruleKey = RuleKey.of(repository, sqRule.key()).toString();
      rule.type = sqRule.type();
      rule.name = sqRule.name();
      rule.htmlDescription = sqRule.htmlDescription();
      rule.severity = sqRule.severity();
      rule.status = sqRule.status();
      rule.tags = sqRule.tags();
      rule.params = sqRule.params();
      rule.scope = sqRule.scope();
      rule.activatedByDefault = sqRule.activatedByDefault();
      if (check instanceof EslintBasedCheck) {
        var eslintBasedCheck = (EslintBasedCheck) check;
        rule.eslintKey = eslintBasedCheck.eslintKey();
        rule.defaultParams = eslintBasedCheck.configurations();
      } else if (check instanceof CssRule) {
        var cssRule = (CssRule) check;
        rule.stylelintKey = cssRule.stylelintKey();
        rule.defaultParams = cssRule.stylelintOptions();
      }
      return rule;
    }
  }
}
