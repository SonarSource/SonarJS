/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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

import java.nio.file.Path;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import org.sonar.javascript.checks.StringLiteralsQuotesCheck;

import static java.util.Arrays.asList;
import static org.assertj.core.api.Assertions.assertThat;

public class RulesMetadataForSonarLintTest {

  @Rule
  public TemporaryFolder folder= new TemporaryFolder();

  @Test
  public void test() throws Exception {
    Path path = folder.newFile().toPath();
    new RulesMetadataForSonarLint("repo", asList(StringLiteralsQuotesCheck.class)).save(path);
    assertThat(path).hasContent("[\n" +
      "  {\n" +
      "    \"ruleKey\": \"repo:S1441\",\n" +
      "    \"type\": \"CODE_SMELL\",\n" +
      "    \"name\": \"Quotes for string literals should be used consistently\",\n" +
      "    \"htmlDescription\": \"\\u003cp\\u003eThis rule checks that all string literals use the same kind of quotes.\\u003c/p\\u003e\\n\\u003ch2\\u003eNoncompliant Code Example\\u003c/h2\\u003e\\n\\u003cp\\u003eUsing the parameter default (forcing single quotes):\\u003c/p\\u003e\\n\\u003cpre\\u003e\\nvar firstParameter \\u003d \\\"something\\\"; // Noncompliant\\n\\u003c/pre\\u003e\\n\\u003ch2\\u003eCompliant Solution\\u003c/h2\\u003e\\n\\u003cpre\\u003e\\nvar firstParameter \\u003d \\u0027something\\u0027;\\n\\u003c/pre\\u003e\\n\\u003ch2\\u003eExceptions\\u003c/h2\\u003e\\n\\u003cp\\u003eStrings that contain quotes are ignored.\\u003c/p\\u003e\\n\\u003cpre\\u003e\\nlet heSaid \\u003d \\\"Then he said \\u0027What?\\u0027.\\\"  // ignored\\nlet sheSaid \\u003d \\u0027\\\"Whatever!\\\" she replied.\\u0027  // ignored\\n\\u003c/pre\\u003e\",\n" +
      "    \"severity\": \"MINOR\",\n" +
      "    \"status\": \"READY\",\n" +
      "    \"tags\": [\n" +
      "      \"convention\"\n" +
      "    ],\n" +
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
      "    \"scope\": \"MAIN\",\n" +
      "    \"eslintKey\": \"quotes\",\n" +
      "    \"activatedByDefault\": false\n" +
      "  }\n" +
      "]");
  }

}
