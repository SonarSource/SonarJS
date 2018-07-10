/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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
package org.sonar.plugins.javascript.rules;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import com.google.gson.Gson;
import java.io.IOException;
import java.net.URL;
import java.util.Locale;
import java.util.Set;
import javax.annotation.Nullable;
import org.sonar.api.rule.RuleStatus;
import org.sonar.api.rules.RuleType;
import org.sonar.api.server.debt.DebtRemediationFunction;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.JsonProfileReader;
import org.sonar.plugins.javascript.SonarWayProfile;
import org.sonar.squidbridge.annotations.AnnotationBasedRulesDefinition;

public class JavaScriptRulesDefinition implements RulesDefinition {

  private final Gson gson = new Gson();

  @Override
  public void define(Context context) {
    NewRepository repository = context
      .createRepository(CheckList.REPOSITORY_KEY, JavaScriptLanguage.KEY)
      .setName(CheckList.REPOSITORY_NAME);

    new AnnotationBasedRulesDefinition(repository, JavaScriptLanguage.KEY)
      .addRuleClasses(/* don't fail if no SQALE annotations */ false, CheckList.getChecks());

    for (NewRule rule : repository.rules()) {
      String metadataKey = rule.key();
      // Setting internal key is essential for rule templates (see SONAR-6162), and it is not done by AnnotationBasedRulesDefinition from sslr-squid-bridge version 2.5.1:
      rule.setInternalKey(metadataKey);
      rule.setHtmlDescription(readRuleDefinitionResource(metadataKey + ".html"));
      addMetadata(rule, metadataKey);
    }

    Set<String> activatedRuleKeys = JsonProfileReader.ruleKeys(SonarWayProfile.PATH_TO_JSON);
    for (NewRule rule : repository.rules()) {
      rule.setActivatedByDefault(activatedRuleKeys.contains(rule.key()));
    }

    repository.done();
  }

  @Nullable
  private static String readRuleDefinitionResource(String fileName) {
    URL resource = JavaScriptRulesDefinition.class.getResource("/org/sonar/l10n/javascript/rules/javascript/" + fileName);
    if (resource == null) {
      return null;
    }
    try {
      return Resources.toString(resource, Charsets.UTF_8);
    } catch (IOException e) {
      throw new IllegalStateException("Failed to read: " + resource, e);
    }
  }


  private void addMetadata(NewRule rule, String metadataKey) {
    String json = readRuleDefinitionResource(metadataKey + ".json");
    if (json != null) {
      RuleMetadata metadata = gson.fromJson(json, RuleMetadata.class);
      rule.setSeverity(metadata.defaultSeverity.toUpperCase(Locale.US));
      rule.setName(metadata.title);
      rule.setTags(metadata.tags);
      rule.setType(RuleType.valueOf(metadata.type));
      rule.setStatus(RuleStatus.valueOf(metadata.status.toUpperCase(Locale.US)));

      if (metadata.remediation != null) {
        // metadata.remediation is null for template rules
        rule.setDebtRemediationFunction(metadata.remediation.remediationFunction(rule.debtRemediationFunctions()));
        rule.setGapDescription(metadata.remediation.linearDesc);
      }
    }
  }

  private static class RuleMetadata {
    String title;
    String status;
    String type;
    @Nullable
    Remediation remediation;

    String[] tags;
    String defaultSeverity;
  }

  private static class Remediation {
    String func;
    String constantCost;
    String linearDesc;
    String linearOffset;
    String linearFactor;

    private DebtRemediationFunction remediationFunction(DebtRemediationFunctions drf) {
      if (func.startsWith("Constant")) {
        return drf.constantPerIssue(constantCost.replace("mn", "min"));
      }
      if ("Linear".equals(func)) {
        return drf.linear(linearFactor.replace("mn", "min"));
      }
      return drf.linearWithOffset(linearFactor.replace("mn", "min"), linearOffset.replace("mn", "min"));
    }
  }
}
