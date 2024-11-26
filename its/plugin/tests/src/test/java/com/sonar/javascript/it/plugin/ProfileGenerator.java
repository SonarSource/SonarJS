/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2024 SonarSource SA
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
package com.sonar.javascript.it.plugin;

import com.google.gson.Gson;
import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.locator.FileLocation;
import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.StringWriter;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import javax.xml.stream.XMLOutputFactory;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamWriter;

/**
 * This class is a copy of ProfileGenerator from sonar-analyzer-commons, but it uses Gson parser which is thread-safe
 * @see https://github.com/SonarSource/sonar-analyzer-commons/blob/master/commons/src/main/java/org/sonarsource/analyzer/commons/ProfileGenerator.java
 */
public class ProfileGenerator {

  private static final Gson gson = new Gson();
  private static final int QUERY_PAGE_SIZE = 500;

  private ProfileGenerator() {}

  public static String generateProfile(
    Orchestrator orchestrator,
    String language,
    String repository,
    RulesConfiguration rulesConfiguration,
    Set<String> excludedRules
  ) {
    try {
      Set<String> ruleKeys = getRuleKeys(orchestrator.getServer().getUrl(), language, repository);
      ruleKeys.removeAll(excludedRules);
      var name = "rules-" + UUID.randomUUID();
      var profileFile = generateProfile(name, language, repository, rulesConfiguration, ruleKeys);
      orchestrator.getServer().restoreProfile(FileLocation.of(profileFile));
      return name;
    } catch (IOException | XMLStreamException e) {
      throw new RuntimeException(e);
    }
  }

  private static File generateProfile(
    String name,
    String language,
    String repository,
    RulesConfiguration rulesConfiguration,
    Set<String> ruleKeys
  ) throws XMLStreamException, IOException {
    XMLOutputFactory output = XMLOutputFactory.newInstance();
    StringWriter stringWriter = new StringWriter();
    XMLStreamWriter xml = output.createXMLStreamWriter(stringWriter);

    xml.writeStartDocument("UTF-8", "1.0");
    xml.writeStartElement("profile");
    el(xml, "name", name);
    el(xml, "language", language);

    xml.writeStartElement("rules");
    for (String key : ruleKeys) {
      xml.writeStartElement("rule");
      el(xml, "repositoryKey", repository);
      el(xml, "key", key);
      el(xml, "priority", "INFO");
      Collection<Parameter> parameters = rulesConfiguration.config.getOrDefault(
        key,
        Collections.emptyList()
      );
      if (!parameters.isEmpty()) {
        xml.writeStartElement("parameters");
        for (Parameter parameter : parameters) {
          xml.writeStartElement("parameter");
          el(xml, "key", parameter.parameterKey);
          el(xml, "value", parameter.parameterValue);
          xml.writeEndElement();
        }
        xml.writeEndElement();
      }
      xml.writeEndElement();
    }
    xml.writeEndElement();
    xml.writeEndElement();
    xml.writeEndDocument();

    File file = File.createTempFile("profile", ".xml");
    Files.write(file.toPath(), stringWriter.toString().getBytes(StandardCharsets.UTF_8));
    file.deleteOnExit();
    return file;
  }

  private static void el(XMLStreamWriter xml, String name, String text) throws XMLStreamException {
    xml.writeStartElement(name);
    xml.writeCharacters(text);
    xml.writeEndElement();
  }

  private static Set<String> getRuleKeys(String serverUrl, String language, String repository)
    throws IOException {
    Set<String> ruleKeys = new HashSet<>();
    long total;
    int processed = 0;
    int page = 1;
    do {
      Map<String, Object> response = queryRules(serverUrl, language, repository, page);
      total = ((Double) response.get("total")).longValue();
      @SuppressWarnings("unchecked")
      List<Map<String, String>> jsonRules = (List<Map<String, String>>) response.get("rules");
      for (Map<String, String> jsonRule : jsonRules) {
        String key = jsonRule.get("key").split(":")[1];
        ruleKeys.add(key);
        processed++;
      }
      page++;
    } while (processed < total);

    return ruleKeys;
  }

  private static Map<String, Object> queryRules(
    String serverUrl,
    String language,
    String repository,
    int page
  ) throws IOException {
    Map<String, Object> queryParams = new HashMap<>();
    queryParams.put("languages", language);
    queryParams.put("repositories", repository);
    queryParams.put("ps", QUERY_PAGE_SIZE);
    queryParams.put("p", page);
    String params = queryParams
      .entrySet()
      .stream()
      .map(e -> e.getKey() + "=" + e.getValue())
      .collect(Collectors.joining("&"));

    URL url = new URL(serverUrl + "/api/rules/search?" + params);
    HttpURLConnection con = (HttpURLConnection) url.openConnection();
    con.setRequestMethod("GET");
    con.connect();
    String response = new BufferedReader(new InputStreamReader(con.getInputStream()))
      .lines()
      .collect(Collectors.joining("\n"));
    con.disconnect();
    return gson.fromJson(response, Map.class);
  }

  public static class RulesConfiguration {

    private Map<String, List<Parameter>> config = new HashMap<>();

    public RulesConfiguration add(String ruleKey, String parameterKey, String parameterValue) {
      List<Parameter> ruleConfiguration =
        this.config.computeIfAbsent(ruleKey, k -> new ArrayList<>());
      ruleConfiguration.add(new Parameter(parameterKey, parameterValue));
      return this;
    }
  }

  private static class Parameter {

    String parameterKey;
    String parameterValue;

    Parameter(String parameterKey, String parameterValue) {
      this.parameterKey = parameterKey;
      this.parameterValue = parameterValue;
    }
  }
}
