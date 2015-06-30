/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
package org.sonar.javascript.parser.sslr;

import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.Rule;
import com.sonar.sslr.api.Token;
import com.sonar.sslr.api.TokenType;
import com.sonar.sslr.api.Trivia;
import org.sonar.sslr.grammar.GrammarRuleKey;

import java.util.List;

public class AstNodeBuilder implements NodeBuilder {

  @Override
  public AstNode createNonTerminal(GrammarRuleKey ruleKey, Rule rule, List<Object> children, int startIndex, int endIndex) {
    Token token = null;

    for (Object child : children) {
      if (child instanceof AstNode && ((AstNode) child).hasToken()) {
        token = ((AstNode) child).getToken();
        break;
      }
    }
    AstNode astNode = new AstNode(rule, ruleKey.toString(), token);
    for (Object child : children) {
      astNode.addChild((AstNode) child);
    }

    astNode.setFromIndex(startIndex);
    astNode.setToIndex(endIndex);

    return astNode;
  }

  @Override
  public AstNode createTerminal(Input input, int startIndex, int endIndex, List<Trivia> trivias, TokenType type) {
    int[] lineAndColumn = input.lineAndColumnAt(startIndex);
    Token token = Token.builder()
      .setType(type == null ? UNDEFINED_TOKEN_TYPE : type)
      .setLine(lineAndColumn[0])
      .setColumn(lineAndColumn[1] - 1)
      .setValueAndOriginalValue(input.substring(startIndex, endIndex))
      .setURI(input.uri())
      .setGeneratedCode(false)
      .setTrivia(trivias)
      .build();
    AstNode astNode = new AstNode(token);
    astNode.setFromIndex(startIndex);
    astNode.setToIndex(endIndex);
    return astNode;
  }

  private static final TokenType UNDEFINED_TOKEN_TYPE = new TokenType() {

    @Override
    public String getName() {
      return "TOKEN";
    }

    @Override
    public String getValue() {
      return getName();
    }

    @Override
    public boolean hasToBeSkippedFromAst(AstNode node) {
      return false;
    }

    @Override
    public String toString() {
      return SyntaxTreeCreator.class.getSimpleName();
    }

  };

}
