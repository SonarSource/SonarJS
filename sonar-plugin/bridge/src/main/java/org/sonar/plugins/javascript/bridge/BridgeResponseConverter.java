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

import com.google.protobuf.ByteString;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeCssResponse;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeHtmlResponse;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeJsTsResponse;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeProjectResponse;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeYamlResponse;
import org.sonar.plugins.javascript.bridge.grpc.FileAnalysisResult;
import org.sonar.plugins.javascript.bridge.protobuf.Node;

/**
 * Converts gRPC response messages to Java domain objects.
 */
public final class BridgeResponseConverter {

  private BridgeResponseConverter() {
    // Utility class
  }

  /**
   * Converts gRPC AnalyzeJsTsResponse to AnalysisResponse.
   */
  public static BridgeServer.AnalysisResponse fromAnalyzeJsTsResponse(
    AnalyzeJsTsResponse response
  ) {
    BridgeServer.ParsingError parsingError = null;
    if (response.hasParsingError()) {
      parsingError = fromParsingError(response.getParsingError());
    }

    List<BridgeServer.Issue> issues = new ArrayList<>();
    for (var issue : response.getIssuesList()) {
      issues.add(fromIssue(issue));
    }

    List<BridgeServer.Highlight> highlights = new ArrayList<>();
    for (var highlight : response.getHighlightsList()) {
      highlights.add(fromHighlight(highlight));
    }

    List<BridgeServer.HighlightedSymbol> highlightedSymbols = new ArrayList<>();
    for (var symbol : response.getHighlightedSymbolsList()) {
      highlightedSymbols.add(fromHighlightedSymbol(symbol));
    }

    BridgeServer.Metrics metrics = null;
    if (response.hasMetrics()) {
      metrics = fromMetrics(response.getMetrics());
    }

    List<BridgeServer.CpdToken> cpdTokens = new ArrayList<>();
    for (var token : response.getCpdTokensList()) {
      cpdTokens.add(fromCpdToken(token));
    }

    Node ast = null;
    if (!response.getAst().isEmpty()) {
      try {
        ast = Node.parseFrom(response.getAst());
      } catch (IOException e) {
        throw new IllegalStateException("Failed to parse protobuf AST", e);
      }
    }

    return new BridgeServer.AnalysisResponse(
      parsingError,
      issues,
      highlights,
      highlightedSymbols,
      metrics,
      cpdTokens,
      ast
    );
  }

  /**
   * Converts gRPC AnalyzeCssResponse to AnalysisResponse.
   */
  public static BridgeServer.AnalysisResponse fromAnalyzeCssResponse(AnalyzeCssResponse response) {
    BridgeServer.ParsingError parsingError = null;
    if (response.hasParsingError()) {
      parsingError = fromParsingError(response.getParsingError());
    }

    List<BridgeServer.Issue> issues = new ArrayList<>();
    for (var cssIssue : response.getIssuesList()) {
      issues.add(
        new BridgeServer.Issue(
          cssIssue.getLine(),
          cssIssue.getColumn(),
          cssIssue.hasEndLine() ? cssIssue.getEndLine() : null,
          cssIssue.hasEndColumn() ? cssIssue.getEndColumn() : null,
          cssIssue.getMessage(),
          cssIssue.getRuleId(),
          null, // CSS doesn't have language
          List.of(),
          null,
          List.of(),
          List.of(),
          null
        )
      );
    }

    return new BridgeServer.AnalysisResponse(
      parsingError,
      issues,
      List.of(),
      List.of(),
      null,
      List.of(),
      null
    );
  }

  /**
   * Converts gRPC AnalyzeYamlResponse to AnalysisResponse.
   */
  public static BridgeServer.AnalysisResponse fromAnalyzeYamlResponse(
    AnalyzeYamlResponse response
  ) {
    BridgeServer.ParsingError parsingError = null;
    if (response.hasParsingError()) {
      parsingError = fromParsingError(response.getParsingError());
    }

    List<BridgeServer.Issue> issues = new ArrayList<>();
    for (var issue : response.getIssuesList()) {
      issues.add(fromIssue(issue));
    }

    BridgeServer.Metrics metrics = null;
    if (response.hasMetrics()) {
      metrics = new BridgeServer.Metrics(
        response.getMetrics().getNclocList(),
        List.of(),
        List.of(),
        List.of(),
        0,
        0,
        0,
        0,
        0
      );
    }

    return new BridgeServer.AnalysisResponse(
      parsingError,
      issues,
      List.of(),
      List.of(),
      metrics,
      List.of(),
      null
    );
  }

  /**
   * Converts gRPC AnalyzeHtmlResponse to AnalysisResponse.
   */
  public static BridgeServer.AnalysisResponse fromAnalyzeHtmlResponse(
    AnalyzeHtmlResponse response
  ) {
    BridgeServer.ParsingError parsingError = null;
    if (response.hasParsingError()) {
      parsingError = fromParsingError(response.getParsingError());
    }

    List<BridgeServer.Issue> issues = new ArrayList<>();
    for (var issue : response.getIssuesList()) {
      issues.add(fromIssue(issue));
    }

    BridgeServer.Metrics metrics = null;
    if (response.hasMetrics()) {
      metrics = new BridgeServer.Metrics(
        response.getMetrics().getNclocList(),
        List.of(),
        List.of(),
        List.of(),
        0,
        0,
        0,
        0,
        0
      );
    }

    return new BridgeServer.AnalysisResponse(
      parsingError,
      issues,
      List.of(),
      List.of(),
      metrics,
      List.of(),
      null
    );
  }

  /**
   * Converts gRPC FileAnalysisResult to AnalysisResponse.
   */
  public static BridgeServer.AnalysisResponse fromFileAnalysisResult(FileAnalysisResult result) {
    if (result.hasAnalysis()) {
      return fromAnalyzeJsTsResponse(result.getAnalysis());
    }
    return new BridgeServer.AnalysisResponse();
  }

  private static BridgeServer.ParsingError fromParsingError(
    org.sonar.plugins.javascript.bridge.grpc.ParsingError error
  ) {
    BridgeServer.ParsingErrorCode code = BridgeServer.ParsingErrorCode.GENERAL_ERROR;
    try {
      code = BridgeServer.ParsingErrorCode.valueOf(error.getCode());
    } catch (IllegalArgumentException e) {
      // Use default
    }
    return new BridgeServer.ParsingError(
      error.getMessage(),
      error.hasLine() ? error.getLine() : null,
      code
    );
  }

  private static BridgeServer.Issue fromIssue(
    org.sonar.plugins.javascript.bridge.grpc.Issue issue
  ) {
    List<BridgeServer.IssueLocation> secondaryLocations = new ArrayList<>();
    for (var loc : issue.getSecondaryLocationsList()) {
      secondaryLocations.add(
        new BridgeServer.IssueLocation(
          loc.getLine(),
          loc.getColumn(),
          loc.getEndLine(),
          loc.getEndColumn(),
          loc.hasMessage() ? loc.getMessage() : null
        )
      );
    }

    List<BridgeServer.QuickFix> quickFixes = new ArrayList<>();
    for (var qf : issue.getQuickFixesList()) {
      List<BridgeServer.QuickFixEdit> edits = new ArrayList<>();
      for (var edit : qf.getEditsList()) {
        edits.add(
          new BridgeServer.QuickFixEdit(
            edit.getText(),
            new BridgeServer.IssueLocation(
              edit.getLoc().getLine(),
              edit.getLoc().getColumn(),
              edit.getLoc().getEndLine(),
              edit.getLoc().getEndColumn(),
              edit.getLoc().hasMessage() ? edit.getLoc().getMessage() : null
            )
          )
        );
      }
      quickFixes.add(new BridgeServer.QuickFix(qf.getMessage(), edits));
    }

    return new BridgeServer.Issue(
      issue.getLine(),
      issue.getColumn(),
      issue.hasEndLine() ? issue.getEndLine() : null,
      issue.hasEndColumn() ? issue.getEndColumn() : null,
      issue.getMessage(),
      issue.getRuleId(),
      issue.getLanguage(),
      secondaryLocations,
      issue.hasCost() ? issue.getCost() : null,
      quickFixes,
      issue.getRuleEslintKeysList(),
      issue.getFilePath()
    );
  }

  private static BridgeServer.Highlight fromHighlight(
    org.sonar.plugins.javascript.bridge.grpc.Highlight highlight
  ) {
    return new BridgeServer.Highlight(
      fromLocation(highlight.getLocation()),
      highlight.getTextType()
    );
  }

  private static BridgeServer.HighlightedSymbol fromHighlightedSymbol(
    org.sonar.plugins.javascript.bridge.grpc.HighlightedSymbol symbol
  ) {
    List<BridgeServer.Location> references = new ArrayList<>();
    for (var ref : symbol.getReferencesList()) {
      references.add(fromLocation(ref));
    }
    return new BridgeServer.HighlightedSymbol(fromLocation(symbol.getDeclaration()), references);
  }

  private static BridgeServer.Metrics fromMetrics(
    org.sonar.plugins.javascript.bridge.grpc.Metrics metrics
  ) {
    return new BridgeServer.Metrics(
      metrics.getNclocList(),
      metrics.getCommentLinesList(),
      metrics.getNosonarLinesList(),
      metrics.getExecutableLinesList(),
      metrics.getFunctions(),
      metrics.getStatements(),
      metrics.getClasses(),
      metrics.getComplexity(),
      metrics.getCognitiveComplexity()
    );
  }

  private static BridgeServer.CpdToken fromCpdToken(
    org.sonar.plugins.javascript.bridge.grpc.CpdToken token
  ) {
    return new BridgeServer.CpdToken(fromLocation(token.getLocation()), token.getImage());
  }

  private static BridgeServer.Location fromLocation(
    org.sonar.plugins.javascript.bridge.grpc.Location location
  ) {
    return new BridgeServer.Location(
      location.getStartLine(),
      location.getStartCol(),
      location.getEndLine(),
      location.getEndCol()
    );
  }
}
