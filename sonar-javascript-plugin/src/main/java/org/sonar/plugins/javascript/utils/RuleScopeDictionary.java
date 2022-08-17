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
