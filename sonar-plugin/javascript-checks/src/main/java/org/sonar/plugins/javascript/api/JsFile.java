package org.sonar.plugins.javascript.api;

import java.util.Map;
import org.sonar.api.batch.fs.InputFile;

public record JsFile(InputFile inputFile, Node node, String jsonAst) {

  public record Node(String type, Map<String, Node> children, Location location) {

  }

  public record Location(int startLine, int startColumn, int endLine, int endColumn) {

  }
}
