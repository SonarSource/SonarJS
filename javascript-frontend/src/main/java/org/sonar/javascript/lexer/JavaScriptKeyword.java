/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
 * mailto:info AT sonarsource DOT com
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
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
package org.sonar.javascript.lexer;

import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.TokenType;
import org.sonar.sslr.grammar.GrammarRuleKey;

public enum JavaScriptKeyword implements TokenType, GrammarRuleKey {

  // Reserved words

  NULL("null"),
  TRUE("true"),
  FALSE("false"),

  // Keywords

  BREAK("break"),
  CASE("case"),
  CATCH("catch"),
  CLASS("class"),
  CONTINUE("continue"),
  DEBUGGER("debugger"),
  DEFAULT("default"),
  DELETE("delete"),
  DO("do"),
  EXTENDS("extends"),
  ELSE("else"),
  FINALLY("finally"),
  FOR("for"),
  FUNCTION("function"),
  IF("if"),
  IMPORT("import"),
  IN("in"),
  INSTANCEOF("instanceof"),
  NEW("new"),
  RETURN("return"),
  SUPER("super"),
  SWITCH("switch"),
  THIS("this"),
  THROW("throw"),
  TRY("try"),
  TYPEOF("typeof"),
  VAR("var"),
  VOID("void"),
  WHILE("while"),
  WITH("with"),
  YIELD("yield"),
  CONST("const"),
  EXPORT("export"),

  // Future reserved words (ES2015 spec)
  ENUM("enum"),
  AWAIT("await")

  ;

  private final String value;

  JavaScriptKeyword(String value) {
    this.value = value;
  }

  @Override
  public String getName() {
    return name();
  }

  @Override
  public String getValue() {
    return value;
  }

  @Override
  public boolean hasToBeSkippedFromAst(AstNode node) {
    throw new IllegalStateException("AST with AstNode should not be constructed");
  }

  public static String[] keywordValues() {
    JavaScriptKeyword[] keywordsEnum = JavaScriptKeyword.values();
    String[] keywords = new String[keywordsEnum.length];
    for (int i = 0; i < keywords.length; i++) {
      keywords[i] = keywordsEnum[i].getValue();
    }
    return keywords;
  }

}
