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

import static org.assertj.core.api.Assertions.assertThat;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.sonar.css.CssProfileDefinition;
import org.sonar.css.CssRulesDefinition;
import org.sonar.css.rules.AtRuleNoUnknown;
import org.sonar.javascript.checks.StringLiteralsQuotesCheck;
import org.sonar.plugins.javascript.JavaScriptProfilesDefinition;
import org.sonar.plugins.javascript.rules.JavaScriptRulesDefinition;

class RulesMetadataForSonarLintTest {

  @TempDir
  Path tempDir;

  @Test
  void test() throws Exception {
    Path path = tempDir.resolve("sonarlint.json");
    var metadata = new RulesMetadataForSonarLint();
    metadata.addRules(
      "repo",
      List.of(StringLiteralsQuotesCheck.class),
      JavaScriptRulesDefinition.METADATA_LOCATION,
      JavaScriptProfilesDefinition.SONAR_WAY_JSON
    );
    metadata.addRules(
      CssRulesDefinition.REPOSITORY_KEY,
      List.of(AtRuleNoUnknown.class),
      CssRulesDefinition.RESOURCE_FOLDER + CssRulesDefinition.REPOSITORY_KEY,
      CssProfileDefinition.PROFILE_PATH
    );
    metadata.save(path);
    assertThat(path)
      .hasContent(
        "[\n" +
        "  {\n" +
        "    \"ruleKey\": \"repo:S1441\",\n" +
        "    \"type\": \"CODE_SMELL\",\n" +
        "    \"name\": \"Quotes for string literals should be used consistently\",\n" +
        "    \"htmlDescription\": \"\\u003cp\\u003eThis rule checks that all string literals use the same kind of quotes.\\u003c/p\\u003e\\n\\u003ch2\\u003eNoncompliant Code Example\\u003c/h2\\u003e\\n\\u003cp\\u003eUsing the parameter default (forcing single quotes):\\u003c/p\\u003e\\n\\u003cpre\\u003e\\nvar firstParameter \\u003d \\\"something\\\"; // Noncompliant\\n\\u003c/pre\\u003e\\n\\u003ch2\\u003eCompliant Solution\\u003c/h2\\u003e\\n\\u003cpre\\u003e\\nvar firstParameter \\u003d \\u0027something\\u0027;\\n\\u003c/pre\\u003e\\n\\u003ch2\\u003eExceptions\\u003c/h2\\u003e\\n\\u003cp\\u003eStrings that contain quotes are ignored.\\u003c/p\\u003e\\n\\u003cpre\\u003e\\nlet heSaid \\u003d \\\"Then he said \\u0027What?\\u0027.\\\"  // ignored\\nlet sheSaid \\u003d \\u0027\\\"Whatever!\\\" she replied.\\u0027  // ignored\\n\\u003c/pre\\u003e\\n\\u003ch2\\u003eDeprecated\\u003c/h2\\u003e\\n\\u003cp\\u003eThis rule is deprecated, and will eventually be removed.\\u003c/p\\u003e\",\n" +
        "    \"severity\": \"MINOR\",\n" +
        "    \"status\": \"DEPRECATED\",\n" +
        "    \"tags\": [],\n" +
        "    \"params\": [\n" +
        "      {\n" +
        "        \"key\": \"singleQuotes\",\n" +
        "        \"name\": \"singleQuotes\",\n" +
        "        \"description\": \"Set to true to require single quotes, false for double quotes.\",\n" +
        "        \"defaultValue\": \"true\",\n" +
        "        \"type\": {\n" +
        "          \"type\": \"BOOLEAN\",\n" +
        "          \"values\": [],\n" +
        "          \"multiple\": false,\n" +
        "          \"key\": \"BOOLEAN\"\n" +
        "        }\n" +
        "      }\n" +
        "    ],\n" +
        "    \"defaultParams\": [\n" +
        "      \"single\",\n" +
        "      {\n" +
        "        \"avoidEscape\": true,\n" +
        "        \"allowTemplateLiterals\": true\n" +
        "      }\n" +
        "    ],\n" +
        "    \"scope\": \"MAIN\",\n" +
        "    \"eslintKey\": \"quotes\",\n" +
        "    \"activatedByDefault\": false\n" +
        "  },\n" +
        "  {\n" +
        "    \"ruleKey\": \"css:S4662\",\n" +
        "    \"type\": \"BUG\",\n" +
        "    \"name\": \"\\\"at-rules\\\" should be valid\",\n" +
        "    \"htmlDescription\": \"\\u003cp\\u003eThe W3C specifications define the valid \\u003ccode\\u003eat-rules\\u003c/code\\u003e. Only the official and browser-specific \\u003ccode\\u003eat-rules\\u003c/code\\u003e should be used to get\\nthe expected impact in the final rendering.\\u003c/p\\u003e\\n\\u003ch2\\u003eNoncompliant Code Example\\u003c/h2\\u003e\\n\\u003cpre\\u003e\\n@encoding \\\"utf-8\\\";\\n\\u003c/pre\\u003e\\n\\u003ch2\\u003eCompliant Solution\\u003c/h2\\u003e\\n\\u003cpre\\u003e\\n@charset \\\"utf-8\\\";\\n\\u003c/pre\\u003e\",\n" +
        "    \"severity\": \"MAJOR\",\n" +
        "    \"status\": \"READY\",\n" +
        "    \"tags\": [],\n" +
        "    \"params\": [\n" +
        "      {\n" +
        "        \"key\": \"ignoreAtRules\",\n" +
        "        \"name\": \"ignoreAtRules\",\n" +
        "        \"description\": \"Comma-separated list of \\\"at-rules\\\" to consider as valid.\",\n" +
        "        \"defaultValue\": \"value,at-root,content,debug,each,else,error,for,function,if,include,mixin,return,warn,while,extend,use,forward,tailwind,apply,layer,/^@.*/\",\n" +
        "        \"type\": {\n" +
        "          \"type\": \"STRING\",\n" +
        "          \"values\": [],\n" +
        "          \"multiple\": false,\n" +
        "          \"key\": \"STRING\"\n" +
        "        }\n" +
        "      }\n" +
        "    ],\n" +
        "    \"defaultParams\": [\n" +
        "      true,\n" +
        "      {\n" +
        "        \"ignoreAtRules\": [\n" +
        "          \"value\",\n" +
        "          \"at-root\",\n" +
        "          \"content\",\n" +
        "          \"debug\",\n" +
        "          \"each\",\n" +
        "          \"else\",\n" +
        "          \"error\",\n" +
        "          \"for\",\n" +
        "          \"function\",\n" +
        "          \"if\",\n" +
        "          \"include\",\n" +
        "          \"mixin\",\n" +
        "          \"return\",\n" +
        "          \"warn\",\n" +
        "          \"while\",\n" +
        "          \"extend\",\n" +
        "          \"use\",\n" +
        "          \"forward\",\n" +
        "          \"tailwind\",\n" +
        "          \"apply\",\n" +
        "          \"layer\",\n" +
        "          \"/^@.*/\"\n" +
        "        ]\n" +
        "      }\n" +
        "    ],\n" +
        "    \"scope\": \"MAIN\",\n" +
        "    \"activatedByDefault\": true,\n" +
        "    \"stylelintKey\": \"at-rule-no-unknown\"\n" +
        "  }\n" +
        "]"
      );
  }

  @Test
  void test_all() throws Exception {
    Path path = tempDir.resolve("sonarlint.json");
    RulesMetadataForSonarLint.main(new String[] { path.toString() });
    JsonArray jsonArray = new Gson().fromJson(Files.newBufferedReader(path), JsonArray.class);
    assertThat(jsonArray.size()).isGreaterThan(470);

    var scopes = StreamSupport
      .stream(jsonArray.spliterator(), false)
      .map(element -> element.getAsJsonObject().get("scope").getAsString())
      .collect(Collectors.toSet());
    assertThat(scopes).isEqualTo(Set.of("ALL", "MAIN", "TEST"));

    assertThat(jsonArray)
      .extracting(j -> j.getAsJsonObject().get("defaultParams"))
      .doesNotContainNull();
  }
}
