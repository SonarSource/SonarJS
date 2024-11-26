/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.css.metrics;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.apache.commons.lang.StringUtils;
import org.junit.jupiter.api.Test;

class TokenizerTest {

  private static final Tokenizer tokenizer = new Tokenizer();

  @Test
  void identifier() {
    assertToken("bar { }", 0, "bar", CssTokenType.IDENTIFIER);
    assertToken("bar: foo { }", 0, "bar", CssTokenType.IDENTIFIER);
    assertToken("bar: foo-baz { }", 2, "foo-baz", CssTokenType.IDENTIFIER);
    assertToken("foo bar { }", 1, "bar", CssTokenType.IDENTIFIER);
    assertToken("foo.bar { }", 0, "foo", CssTokenType.IDENTIFIER);
    assertToken(".bar { }", 1, "bar", CssTokenType.IDENTIFIER);
    assertToken("bar { foo: 42; }", 2, "foo", CssTokenType.IDENTIFIER);
    assertToken("bar { foo: baz; }", 4, "baz", CssTokenType.IDENTIFIER);
    assertToken("foo , bar { }", 2, "bar", CssTokenType.IDENTIFIER);

    // support unicode characters
    assertToken("\u03A9 { }", 0, "\u03A9", CssTokenType.IDENTIFIER);
  }

  @Test
  void at_identifier() {
    assertToken("@bar { }", 0, "@bar", CssTokenType.AT_IDENTIFIER);
  }

  @Test
  void hash_identifier() {
    assertToken("#bar { }", 0, "#bar", CssTokenType.HASH_IDENTIFIER);
    assertToken("bar { color: #333; }", 4, "#333", CssTokenType.HASH_IDENTIFIER);
    assertToken("bar { color: #e535ab; }", 4, "#e535ab", CssTokenType.HASH_IDENTIFIER);
  }

  @Test
  void semi_colon() {
    assertToken("bar { foo; }", 3, ";", CssTokenType.PUNCTUATOR);
  }

  @Test
  void colon() {
    assertToken("bar { foo: 2px; }", 3, ":", CssTokenType.PUNCTUATOR);
  }

  @Test
  void comma() {
    assertToken("foo , bar { }", 1, ",", CssTokenType.PUNCTUATOR);
    assertToken("foo, bar { }", 1, ",", CssTokenType.PUNCTUATOR);
  }

  @Test
  void number() {
    assertToken("1.15", 0, "1.15", CssTokenType.NUMBER);
    assertToken("1", 0, "1", CssTokenType.NUMBER);
    assertToken(".1", 0, ".1", CssTokenType.NUMBER);
    assertToken("1.15px", 0, "1.15px", CssTokenType.NUMBER);
    assertToken("1.15%", 0, "1.15%", CssTokenType.NUMBER);
    assertToken("1px", 0, "1px", CssTokenType.NUMBER);
    assertToken("1em/150%", 0, "1em", CssTokenType.NUMBER);
    assertToken("1T1", 0, "1", CssTokenType.NUMBER);
  }

  @Test
  void parenthesis() {
    assertToken("bar { foo: (1.15); }", 4, "(", CssTokenType.PUNCTUATOR);
    assertToken("bar { foo: (1.15); }", 6, ")", CssTokenType.PUNCTUATOR);
    assertToken("bar { foo: ( 1.15 ); }", 4, "(", CssTokenType.PUNCTUATOR);
    assertToken("bar { foo: (1.15 1 0px); }", 4, "(", CssTokenType.PUNCTUATOR);
    assertToken("bar { foo: (1.15, 1, 0px); }", 4, "(", CssTokenType.PUNCTUATOR);
    assertToken("bar { content: string(doctitle); }", 5, "(", CssTokenType.PUNCTUATOR);
    assertToken("bar { string-set: booktitle content(); }", 6, "(", CssTokenType.PUNCTUATOR);
    assertToken("bar { a: b(attr(href, url), c) \")\"; }", 7, "(", CssTokenType.PUNCTUATOR);
  }

  @Test
  void strings() {
    assertToken("bar { foo: \"text\"; }", 4, "\"text\"", CssTokenType.STRING);
    assertToken("bar { foo: \"hello, world\"; }", 4, "\"hello, world\"", CssTokenType.STRING);
    assertToken("bar { foo: \"\"; }", 4, "\"\"", CssTokenType.STRING);
    assertToken("\"foo\\\nbar\"", 0, "\"foo\\\nbar\"", CssTokenType.STRING);
    assertToken(
      "@min768: ~\"(min-width: 768px)\"",
      2,
      "~\"(min-width: 768px)\"",
      CssTokenType.STRING
    );

    int numberOfChars = 1000000;
    String seedCode = StringUtils.repeat("a", numberOfChars);

    String testCode = "\"" + seedCode + "\"";
    assertToken(testCode, 0, testCode, CssTokenType.STRING, 1, 0, 1, testCode.length());
    testCode = "'" + seedCode + "'";
    assertToken(testCode, 0, testCode, CssTokenType.STRING, 1, 0, 1, testCode.length());
  }

  @Test
  void comment() {
    assertToken("/* foo */", 0, "/* foo */", CssTokenType.COMMENT);
    assertToken("foo { a: /* foo */ 42; }", 4, "/* foo */", CssTokenType.COMMENT);
    assertToken(
      "foo { a: /* foo\nbar*/ 42; }",
      4,
      "/* foo\nbar*/",
      CssTokenType.COMMENT,
      1,
      9,
      2,
      5
    );
    assertToken(
      "foo { a: /* foo\r\nbar*/ 42; }",
      4,
      "/* foo\r\nbar*/",
      CssTokenType.COMMENT,
      1,
      9,
      2,
      5
    );
    assertToken(
      "foo { a: /* foo\fbar*/ 42; }",
      4,
      "/* foo\fbar*/",
      CssTokenType.COMMENT,
      1,
      9,
      1,
      21
    );
    String code =
      "/* \n" +
      "  this is a comment\n" +
      "  and it is awesome because\n" +
      "  it is multiline!\n" +
      "*/";
    assertToken(code, 0, code, CssTokenType.COMMENT, 1, 0, 5, 2);

    int numberOfLineReturn = 1000000;
    code = "/*" + StringUtils.repeat(" *\n", numberOfLineReturn) + " */";
    assertToken(code, 0, code, CssTokenType.COMMENT, 1, 0, numberOfLineReturn + 1, 3);
  }

  @Test
  void scss_variable() {
    assertToken("$font-stack: Helvetica;", 0, "$font-stack", CssTokenType.DOLLAR_IDENTIFIER);
    assertToken("$message-color: blue !default;", 4, "default", CssTokenType.IDENTIFIER);

    List<CssToken> tokenList = tokenizer.tokenize("p.message-#{$alertClass} { color: red; }");
    assertThat(tokenList.size()).isEqualTo(13);
    assertToken(tokenList, 0, "p", CssTokenType.IDENTIFIER);
    assertToken(tokenList, 1, ".", CssTokenType.PUNCTUATOR);
    assertToken(tokenList, 2, "message-", CssTokenType.IDENTIFIER);
    assertToken(tokenList, 3, "#", CssTokenType.PUNCTUATOR);
    assertToken(tokenList, 4, "{", CssTokenType.PUNCTUATOR);
    assertToken(tokenList, 5, "$alertClass", CssTokenType.DOLLAR_IDENTIFIER);
    assertToken(tokenList, 6, "}", CssTokenType.PUNCTUATOR);
    assertToken(tokenList, 7, "{", CssTokenType.PUNCTUATOR);
    assertToken(tokenList, 8, "color", CssTokenType.IDENTIFIER);
    assertToken(tokenList, 9, ":", CssTokenType.PUNCTUATOR);
    assertToken(tokenList, 10, "red", CssTokenType.IDENTIFIER);
    assertToken(tokenList, 11, ";", CssTokenType.PUNCTUATOR);
    assertToken(tokenList, 12, "}", CssTokenType.PUNCTUATOR);
  }

  @Test
  void scss_import() {
    List<CssToken> tokenList = tokenizer.tokenize("@import 'base';");

    assertThat(tokenList.size()).isEqualTo(3);
    assertToken(tokenList, 0, "@import", CssTokenType.AT_IDENTIFIER);
    assertToken(tokenList, 1, "'base'", CssTokenType.STRING);
    assertToken(tokenList, 2, ";", CssTokenType.PUNCTUATOR);
  }

  @Test
  void scss_role() {
    List<CssToken> tokenList = tokenizer.tokenize("article[role=\"main\"] { width: 1px; }");

    assertThat(tokenList.size()).isEqualTo(12);
    assertToken(tokenList, 0, "article", CssTokenType.IDENTIFIER);
    assertToken(tokenList, 1, "[", CssTokenType.PUNCTUATOR);
    assertToken(tokenList, 2, "role", CssTokenType.IDENTIFIER);
    assertToken(tokenList, 3, "=", CssTokenType.PUNCTUATOR);
    assertToken(tokenList, 4, "\"main\"", CssTokenType.STRING);
    assertToken(tokenList, 5, "]", CssTokenType.PUNCTUATOR);
  }

  @Test
  void scss_less_operators() {
    assertToken("foo { width: 300px + 960px; }", 5, "+", CssTokenType.PUNCTUATOR);
    assertToken("foo { width: 300px - 960px; }", 5, "-", CssTokenType.PUNCTUATOR);
    assertToken("foo { width: 300px * 960px; }", 5, "*", CssTokenType.PUNCTUATOR);
    assertToken("foo { width: 300px / 960px; }", 5, "/", CssTokenType.PUNCTUATOR);
  }

  @Test
  void scss_parent_selector() {
    assertToken("a { &:hover { color: red; } }", 2, "&", CssTokenType.PUNCTUATOR);
    assertToken("p { body.no-touch & { display: none; } }", 5, "&", CssTokenType.PUNCTUATOR);
  }

  @Test
  void scss_control_directives() {
    assertToken("@if ($debug) { }", 0, "@if", CssTokenType.AT_IDENTIFIER);
    assertToken("@each $name in 'save' 'cancel' { }", 0, "@each", CssTokenType.AT_IDENTIFIER);
  }

  @Test
  void less_variable() {
    assertToken("@nice-blue: #5B83AD;", 0, "@nice-blue", CssTokenType.AT_IDENTIFIER);
    assertToken("foo { color: @@color; }", 4, "@@color", CssTokenType.AT_IDENTIFIER);
  }

  @Test
  void less_comment() {
    assertToken("// Get in line!", 0, "// Get in line!", CssTokenType.COMMENT);
    assertToken(
      "// body font size = 62.5%\n\n/* some comment */",
      0,
      "// body font size = 62.5%",
      CssTokenType.COMMENT
    );
    assertToken(
      "/* One heck of a block\n * style comment! */",
      0,
      "/* One heck of a block\n * style comment! */",
      CssTokenType.COMMENT
    );
  }

  @Test
  void unrecognized() {
    assertToken("$$a", 0, "$a", CssTokenType.DOLLAR_IDENTIFIER);
  }

  private static void assertToken(
    String input,
    int index,
    String value,
    CssTokenType CssTokenType
  ) {
    List<CssToken> tokenList = tokenizer.tokenize(input);
    assertToken(tokenList, index, value, CssTokenType);
  }

  private static void assertToken(
    String input,
    int index,
    String value,
    CssTokenType CssTokenType,
    int line,
    int column,
    int endLine,
    int endColumn
  ) {
    List<CssToken> tokenList = tokenizer.tokenize(input);
    assertToken(tokenList, index, value, CssTokenType, line, column, endLine, endColumn);
  }

  private static void assertToken(
    List<CssToken> tokenList,
    int index,
    String value,
    CssTokenType CssTokenType
  ) {
    assertThat(tokenList.get(index).type).isEqualTo(CssTokenType);
    assertThat(tokenList.get(index).text).isEqualTo(value);
  }

  private static void assertToken(
    List<CssToken> tokenList,
    int index,
    String value,
    CssTokenType CssTokenType,
    int line,
    int column,
    int endLine,
    int endColumn
  ) {
    assertToken(tokenList, index, value, CssTokenType);
    assertThat(tokenList.get(index).startLine).isEqualTo(line);
    assertThat(tokenList.get(index).startColumn).isEqualTo(column);
    assertThat(tokenList.get(index).endLine).isEqualTo(endLine);
    assertThat(tokenList.get(index).endColumn).isEqualTo(endColumn);
  }
}
