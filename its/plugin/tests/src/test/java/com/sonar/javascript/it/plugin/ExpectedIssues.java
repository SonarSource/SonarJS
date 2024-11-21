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
import com.google.gson.GsonBuilder;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.regex.Pattern;

public class ExpectedIssues {

  private Map<String, List<Integer>> expectedLinesPerFile = new TreeMap<>();

  private static final Pattern NON_COMPLIANT_PATTERN = Pattern.compile(
    "//\\s*Noncompliant",
    Pattern.CASE_INSENSITIVE
  );
  private static final String GENERATED_EXPECTATIONS_DIR = "target/expected/ts";

  public static void parseForExpectedIssues(String projectKey, Path projectDir) throws IOException {
    Map<String, ExpectedIssues> expectedIssuesByRule = new HashMap<>();

    Arrays
      .stream(projectDir.toFile().listFiles())
      .filter(file -> file.toString().endsWith(".ts") || file.toString().endsWith(".tsx"))
      .forEach(file -> parseFile(projectKey, projectDir, expectedIssuesByRule, file.toPath()));

    Gson gson = new GsonBuilder().setPrettyPrinting().create();
    Path expectationsDirectory = prepareExpectationsDir(projectKey);
    expectedIssuesByRule.forEach((rule, expectedIssues) -> {
      try {
        Path expectationsFile = expectationsDirectory.resolve("typescript" + "-" + rule + ".json");
        String asJson = gson.toJson(expectedIssues.expectedLinesPerFile);
        Files.createFile(expectationsFile);
        Files.write(expectationsFile, asJson.getBytes());
      } catch (IOException e) {
        throw new RuntimeException(e);
      }
    });
  }

  private static void parseFile(
    String projectKey,
    Path projectDirPath,
    Map<String, ExpectedIssues> expectedIssuesByRule,
    Path file
  ) {
    String ruleKey = file.toFile().getName().split("\\.")[0];
    String fileKey =
      projectKey +
      ":" +
      projectDirPath.relativize(file).toString().replaceAll(Pattern.quote(File.separator), "/");
    List<String> lines = getLines(file);
    for (int lineNumber = 1; lineNumber <= lines.size(); lineNumber++) {
      String currentLine = lines.get(lineNumber - 1);

      if (
        NON_COMPLIANT_PATTERN.matcher(currentLine).find() && !currentLine.trim().startsWith("//")
      ) {
        addLineWithIssue(expectedIssuesByRule, ruleKey, fileKey, lineNumber);
      }
      // continue if no "// Noncompliant" in the line or the entire line is commented (to not consider commented out code)
    }
  }

  private static List<String> getLines(Path file) {
    try {
      return Files.readAllLines(file);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  private static Path prepareExpectationsDir(String projectKey) throws IOException {
    Path topExpectationsDir = Paths.get(GENERATED_EXPECTATIONS_DIR);
    if (!topExpectationsDir.toFile().exists()) {
      Files.createDirectories(topExpectationsDir);
    }
    Path projectExpectationsDir = Paths.get(GENERATED_EXPECTATIONS_DIR, projectKey);
    File[] files = projectExpectationsDir.toFile().listFiles();
    if (files != null) {
      Arrays.stream(files).forEach(File::delete);
    }
    Files.deleteIfExists(projectExpectationsDir);
    return Files.createDirectory(projectExpectationsDir);
  }

  private static void addLineWithIssue(
    Map<String, ExpectedIssues> expectedIssuesByRule,
    String currentRuleKey,
    String fileKey,
    int lineNumber
  ) {
    expectedIssuesByRule
      .computeIfAbsent(currentRuleKey, key -> new ExpectedIssues())
      .expectedLinesPerFile.computeIfAbsent(fileKey, key -> new ArrayList<>())
      .add(lineNumber);
  }
}
