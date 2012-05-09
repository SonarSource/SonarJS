/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis and SonarSource
 * dev@sonar.codehaus.org
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.javascript.api;

import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.TokenType;

public enum EcmaScriptKeyword implements TokenType {

  // Reserved words

  NULL("null"),
  TRUE("true"),
  FALSE("false"),

  // Keywords

  BREAK("break"),
  CASE("case"),
  CATCH("catch"),
  CONTINUE("continue"),
  DEBUGGER("debugger"),
  DEFAULT("default"),
  DELETE("delete"),
  DO("do"),
  ELSE("else"),
  FINALLY("finally"),
  FOR("for"),
  FUNCTION("function"),
  IF("if"),
  IN("in"),
  INSTANCEOF("instanceof"),
  NEW("new"),
  RETURN("return"),
  SWITCH("switch"),
  THIS("this"),
  THROW("throw"),
  TRY("try"),
  TYPEOF("typeof"),
  VAR("var"),
  VOID("void"),
  WHILE("while"),
  WITH("with"),

  // Future reserved words

  CLASS("class"),
  CONST("const"),
  ENUM("enum"),
  EXPORT("export"),
  EXTENDS("extends"),
  SUPER("super"),

  // Also considered to be "future reserved words" when parsing strict mode

  IMPLEMENTS("implements"),
  INTERFACE("interface"),
  YIELD("yield"),
  LET("let"),
  PACKAGE("package"),
  PRIVATE("private"),
  PROTECTED("protected"),
  PUBLIC("public"),
  STATIC("static");

  private final String value;

  private EcmaScriptKeyword(String value) {
    this.value = value;
  }

  public String getName() {
    return name();
  }

  public String getValue() {
    return value;
  }

  public boolean hasToBeSkippedFromAst(AstNode node) {
    return false;
  }

  public static String[] keywordValues() {
    EcmaScriptKeyword[] keywordsEnum = EcmaScriptKeyword.values();
    String[] keywords = new String[keywordsEnum.length];
    for (int i = 0; i < keywords.length; i++) {
      keywords[i] = keywordsEnum[i].getValue();
    }
    return keywords;
  }

}
