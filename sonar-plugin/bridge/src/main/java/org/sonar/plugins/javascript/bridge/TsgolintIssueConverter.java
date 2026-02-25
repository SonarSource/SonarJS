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
import org.sonar.plugins.javascript.bridge.grpc.Issue;
import org.sonar.plugins.javascript.bridge.grpc.SecondaryLocation;
import org.sonar.plugins.javascript.bridge.grpc.TextRange;

public class TsgolintIssueConverter {

  private TsgolintIssueConverter() {}

  public static BridgeServer.Issue convert(Issue protoIssue, String filePath) {
    TextRange range = protoIssue.getRange();

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
      protoIssue.getRuleName(),
      "ts",
      secondaryLocations,
      null,
      List.of(),
      List.of(),
      filePath
    );
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
