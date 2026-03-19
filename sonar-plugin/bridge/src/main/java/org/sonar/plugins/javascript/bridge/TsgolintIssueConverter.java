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
package org.sonar.plugins.javascript.bridge;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.sonar.plugins.javascript.bridge.grpc.Issue;
import org.sonar.plugins.javascript.bridge.grpc.SecondaryLocation;
import org.sonar.plugins.javascript.bridge.grpc.TextRange;

public class TsgolintIssueConverter {

  /**
   * Reverse mapping: tsgolint rule name (eslint ID) → Sonar rule key.
   * The Java side uses Sonar keys as eslintKey() (e.g., "S4123"),
   * while tsgolint uses eslint names (e.g., "await-thenable").
   */
  private static final Map<String, String> ESLINT_TO_SONAR_KEY = Map.of(
    "await-thenable",
    "S4123",
    "prefer-readonly",
    "S2933",
    "no-unnecessary-type-arguments",
    "S4157",
    "no-unnecessary-type-assertion",
    "S4325",
    "prefer-return-this-type",
    "S6565",
    "no-mixed-enums",
    "S6583",
    "prefer-promise-reject-errors",
    "S6671",
    "no-array-delete",
    "S2870"
  );

  private TsgolintIssueConverter() {}

  public static BridgeServer.Issue convert(Issue protoIssue, String filePath) {
    TextRange range = protoIssue.getRange();
    String ruleId = ESLINT_TO_SONAR_KEY.getOrDefault(
      protoIssue.getRuleName(),
      protoIssue.getRuleName()
    );

    List<BridgeServer.IssueLocation> secondaryLocations = protoIssue
      .getSecondaryLocationsList()
      .stream()
      .map(TsgolintIssueConverter::convertSecondaryLocation)
      .toList();

    return new BridgeServer.Issue(
      range.getStartLine(),
      range.getStartColumn(),
      range.getEndLine(),
      range.getEndColumn(),
      protoIssue.getMessage(),
      ruleId,
      issueLanguage(filePath),
      secondaryLocations,
      null,
      List.of(),
      List.of(),
      filePath
    );
  }

  private static String issueLanguage(String filePath) {
    String lowerCasePath = filePath.toLowerCase(Locale.ROOT);
    if (
      lowerCasePath.endsWith(".js") ||
      lowerCasePath.endsWith(".jsx") ||
      lowerCasePath.endsWith(".cjs") ||
      lowerCasePath.endsWith(".mjs")
    ) {
      return "js";
    }
    return "ts";
  }

  private static BridgeServer.IssueLocation convertSecondaryLocation(SecondaryLocation loc) {
    TextRange range = loc.getRange();
    return new BridgeServer.IssueLocation(
      range.getStartLine(),
      range.getStartColumn(),
      range.getEndLine(),
      range.getEndColumn(),
      loc.getMessage()
    );
  }
}
