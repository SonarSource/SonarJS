/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.sonar.api.rule.RuleScope;
import org.sonarsource.analyzer.commons.internal.json.simple.parser.JSONParser;
import org.sonarsource.analyzer.commons.internal.json.simple.parser.ParseException;

class RuleScopeDictionary {

  private static final char RESOURCE_SEP = '/';
  private final JSONParser parser;
  private final String resourceFolder;

  RuleScopeDictionary(String resourceFolder) {
    this.resourceFolder = resourceFolder;
    this.parser = new JSONParser();
  }

  static RuleScope getScopeFromString(String value) {
    var normalized = value.toUpperCase();
    if ("TESTS".equals(normalized)) {
      normalized = "TEST";
    }
    return RuleScope.valueOf(normalized);
  }

  RuleScope getScopeFor(String ruleKey) {
    var jsonPath = resourceFolder + RESOURCE_SEP + ruleKey + ".json";
    var metadata = getMetadataFromJsonAt(jsonPath);

    if (!(metadata instanceof Map)) {
      throw new IllegalStateException(String.format("The JSON for rule %s at %s doesn't contain an object", ruleKey, jsonPath));
    }

    var object = (Map<String, Object>) metadata;
    if (!(object.get("scope") instanceof String)) {
      throw new IllegalStateException(String.format("The JSON for rule %s at %s doesn't contain a valid scope property", ruleKey, jsonPath));
    }

    return getScopeFromString((String) object.get("scope"));
  }

  private Object getMetadataFromJsonAt(String jsonPath) {
    try (var input = getClass().getClassLoader().getResourceAsStream(jsonPath)) {
      if (input == null) {
        throw new IllegalStateException("The JSON doesn't exist at path " + jsonPath);
      }

      try (var reader = new InputStreamReader(input, StandardCharsets.UTF_8)) {
        return parser.parse(reader);
      }
    } catch (ParseException e) {
      throw new IllegalStateException("Can't read resource at " + jsonPath, e);
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

}
