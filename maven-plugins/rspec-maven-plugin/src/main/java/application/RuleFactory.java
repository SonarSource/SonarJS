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
package application;

import com.google.gson.JsonElement;
import com.sonarsource.ruleapi.domain.Profile;
import com.sonarsource.ruleapi.domain.RuleFiles;
import domain.Code;
import domain.Parameter;
import domain.Remediation;
import domain.Rule;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class RuleFactory {

  static Rule create(String languageKey, RuleFiles ruleFile) {
    var manifest = ruleFile.getMetadata();
    var name = ruleFile.getKey();
    var htmlDocumentation = ruleFile.getDescription();

    var rawCompatibleLanguages = manifest.get("compatibleLanguages");
    var compatibleLanguages = rawCompatibleLanguages == null
      ? List.of(languageKey)
      : rawCompatibleLanguages
        .getAsJsonArray()
        .asList()
        .stream()
        .map(JsonElement::getAsString)
        .toList();

    var tags = manifest.get("tags");

    Map<String, String> impacts = new HashMap<>();

    var rawCode = manifest.get("code");

    Code code;

    if (rawCode != null) {
      var rawImpacts = rawCode.getAsJsonObject().get("impacts").getAsJsonObject();

      for (var impact : rawImpacts.entrySet()) {
        impacts.put(impact.getKey(), impact.getValue().getAsString());
      }

      code = new Code() {
        public Map<String, String> impacts() {
          return impacts;
        }

        public String attribute() {
          return rawCode.getAsJsonObject().get("attribute").getAsString();
        }
      };
    } else {
      code = null;
    }

    var rawScope = manifest.get("scope").getAsString();
    var rawParameters = manifest.get("parameters");

    var parameters = new ArrayList<Parameter>();

    if (rawParameters != null) {
      rawParameters
        .getAsJsonArray()
        .asList()
        .forEach(rawValue -> {
          // todo: add a factory
          var value = rawValue.getAsJsonObject();

          parameters.add(
            new Parameter() {
              public String name() {
                return value.get("name").getAsString();
              }

              public String description() {
                return value.get("description").getAsString();
              }

              public String type() {
                return value.get("type").getAsString();
              }

              public String defaultValue() {
                return value.get("defaultValue").getAsString();
              }
            }
          );
        });
    }

    return new Rule() {
      public String name() {
        return name;
      }

      public String htmlDocumentation() {
        return htmlDocumentation;
      }

      public String type() {
        return manifest.get("type").getAsString();
      }

      public String defaultSeverity() {
        return manifest.get("defaultSeverity").getAsString().toUpperCase();
      }

      public List<String> tags() {
        return tags != null
          ? tags.getAsJsonArray().asList().stream().map(JsonElement::getAsString).toList()
          : List.of();
      }

      public String scope() {
        return rawScope.equals("Tests") ? "TEST" : rawScope.toUpperCase();
      }

      public Remediation remediation() {
        var rawRemediation = manifest.get("remediation");

        if (rawRemediation != null) {
          var remediationAsJsonObject = rawRemediation.getAsJsonObject();
          var rawCost = remediationAsJsonObject.get("constantCost");
          var rawLinearFactor = remediationAsJsonObject.get("linearFactor");
          var rawLinearOffset = remediationAsJsonObject.get("linearOffset");
          var rawLinearDescription = remediationAsJsonObject.get("linearDesc");

          return new Remediation() {
            public String function() {
              return remediationAsJsonObject.get("func").getAsString();
            }

            public String cost() {
              return rawCost != null ? rawCost.getAsString() : null;
            }

            public String linearFactor() {
              return rawLinearFactor != null ? rawLinearFactor.getAsString() : null;
            }

            public String linearOffset() {
              return rawLinearOffset != null ? rawLinearOffset.getAsString() : null;
            }

            public String linearDescription() {
              return rawLinearDescription != null ? rawLinearDescription.getAsString() : null;
            }
          };
        }

        return null;
      }

      public String title() {
        return manifest.get("title").getAsString();
      }

      public List<Parameter> parameters() {
        return parameters;
      }

      public List<String> compatibleLanguages() {
        return compatibleLanguages;
      }

      public List<String> qualityProfiles() {
        return ruleFile.getQualityProfiles().stream().map(Profile::getName).toList();
      }

      public String status() {
        return manifest.get("status").getAsString();
      }

      public Code code() {
        return code;
      }
    };
  }
}
