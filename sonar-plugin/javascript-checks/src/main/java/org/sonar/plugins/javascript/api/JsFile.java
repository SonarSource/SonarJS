package org.sonar.plugins.javascript.api;

import java.util.Map;
import org.sonar.api.batch.fs.InputFile;

public class JsFile {

  InputFile inputFile;
  Node program;

  public JsFile(InputFile inputFile, Node program) {
    this.inputFile = inputFile;
    this.program = program;
  }

  public InputFile getInputFile() {
    return inputFile;
  }

  public Node getProgram() {
    return program;
  }


  public record Node(String type, Map<String, Node> children, Location location) {

  }

  public record Location(int startLine, int startColumn, int endLine, int endColumn) {

  }
}
