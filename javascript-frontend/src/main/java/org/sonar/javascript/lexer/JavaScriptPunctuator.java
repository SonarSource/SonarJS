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

public enum JavaScriptPunctuator implements TokenType, GrammarRuleKey {
  AT("@"),
  LCURLYBRACE("{"),
  RCURLYBRACE("}"),
  LPARENTHESIS("("),
  RPARENTHESIS(")"),
  LBRACKET("["),
  RBRACKET("]"),
  DOT("."),
  DOUBLEARROW("=>"),
  ELLIPSIS("..."),
  SEMI(";"),
  COMMA(","),
  LT("<"),
  GT(">"),
  LE("<="),
  GE(">="),
  EQUAL("=="),
  NOTEQUAL("!="),
  EQUAL2("==="),
  NOTEQUAL2("!=="),
  PLUS("+"),
  MINUS("-"),
  STAR("*"),
  EXP("**"),
  MOD("%"),
  DIV("/"),
  INC("++"),
  DEC("--"),
  SL("<<"),
  SR(">>"),
  SR2(">>>"),
  AND("&"),
  OR("|"),
  XOR("^"),
  BANG("!"),
  TILDA("~"),
  ANDAND("&&"),
  OROR("||"),
  QUERY("?"),
  COLON(":"),
  EQU("="),
  PLUS_EQU("+="),
  MINUS_EQU("-="),
  DIV_EQU("/="),
  STAR_EQU("*="),
  EXP_EQU("**="),
  MOD_EQU("%="),
  SL_EQU("<<="),
  SR_EQU(">>="),
  SR_EQU2(">>>="),
  AND_EQU("&="),
  OR_EQU("|="),
  XOR_EQU("^=");

  private final String value;

  JavaScriptPunctuator(String word) {
    this.value = word;
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

}
