package org.sonar.plugins.javascript.bridge;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class ParserTest {

  @Test
  void parse() {
    var parser = new Parser();
    var ast = parser.parse("var x = 1");
    System.out.println(ast);
  }
}
