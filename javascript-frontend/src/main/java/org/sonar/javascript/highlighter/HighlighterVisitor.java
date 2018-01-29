/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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
package org.sonar.javascript.highlighter;

import com.google.common.collect.ImmutableSet;
import java.util.Set;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.highlighting.NewHighlighting;
import org.sonar.api.batch.sensor.highlighting.TypeOfText;
import org.sonar.javascript.lexer.JavaScriptKeyword;
import org.sonar.javascript.tree.impl.expression.LiteralTreeImpl;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.javascript.visitors.JavaScriptFileImpl;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.AccessorMethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.FieldDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateCharactersTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateLiteralTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxTrivia;
import org.sonar.plugins.javascript.api.tree.statement.VariableDeclarationTree;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitor;

public class HighlighterVisitor extends SubscriptionVisitor {

  private final SensorContext sensorContext;
  private NewHighlighting highlighting;

  public HighlighterVisitor(SensorContext sensorContext) {
    this.sensorContext = sensorContext;
  }

  @Override
  public Set<Kind> nodesToVisit() {
    return ImmutableSet.<Kind>builder()
      .add(
        Kind.GENERATOR_METHOD,
        Kind.METHOD,

        Kind.GET_METHOD,
        Kind.SET_METHOD,

        Kind.FIELD,
        Kind.LET_DECLARATION,
        Kind.NUMERIC_LITERAL,
        Kind.TEMPLATE_LITERAL,
        Kind.STRING_LITERAL,
        Kind.TOKEN)
      .build();
  }

  @Override
  public void visitFile(Tree scriptTree) {
    InputFile inputFile = ((JavaScriptFileImpl) getContext().getJavaScriptFile()).inputFile();
    highlighting = sensorContext.newHighlighting().onFile(inputFile);
  }

  @Override
  public void leaveFile(Tree scriptTree) {
    highlighting.save();
  }

  @Override
  public void visitNode(Tree tree) {
    SyntaxToken token = null;
    TypeOfText code = null;

    if (tree.is(Kind.GENERATOR_METHOD,Kind.METHOD)) {
      token = ((MethodDeclarationTree) tree).staticToken();
      code = TypeOfText.KEYWORD;

    } else if (tree.is(Kind.GET_METHOD, Kind.SET_METHOD)) {
      token = ((AccessorMethodDeclarationTree) tree).staticToken();
      code = TypeOfText.KEYWORD;

    } else if (tree.is(Kind.FIELD)) {
      token = ((FieldDeclarationTree) tree).staticToken();
      code = TypeOfText.KEYWORD;

    } else if (tree.is(Kind.LET_DECLARATION)) {
      token = ((VariableDeclarationTree) tree).token();
      code = TypeOfText.KEYWORD;

    } else if (tree.is(Kind.TOKEN)) {
      highlightToken((InternalSyntaxToken) tree);

    } else if (tree.is(Kind.STRING_LITERAL)) {
      token = ((LiteralTreeImpl) tree).token();
      code = TypeOfText.STRING;

    } else if (tree.is(Kind.NUMERIC_LITERAL)) {
      token = ((LiteralTreeImpl) tree).token();
      code = TypeOfText.CONSTANT;

    } else if (tree.is(Kind.TEMPLATE_LITERAL)) {
      highlightTemplateLiteral((TemplateLiteralTree) tree);
    }

    if (token != null) {
      highlight(token, code);
    }
  }

  private void highlightTemplateLiteral(TemplateLiteralTree tree) {
    highlight(tree.openBacktickToken(), TypeOfText.STRING);
    highlight(tree.closeBacktickToken(), TypeOfText.STRING);

    for (TemplateCharactersTree templateCharactersTree : tree.strings()) {
      templateCharactersTree.characters().forEach(token -> highlight(token, TypeOfText.STRING));
    }
  }

  private void highlightToken(InternalSyntaxToken token) {
    if (isKeyword(token.text())) {
      highlight(token, TypeOfText.KEYWORD);
    }
    highlightComments(token);
  }

  private void highlightComments(InternalSyntaxToken token) {
    TypeOfText type;
    for (SyntaxTrivia trivia : token.trivias()) {
      if (trivia.text().startsWith("/**")) {
        type = TypeOfText.STRUCTURED_COMMENT;
      } else {
        type = TypeOfText.COMMENT;
      }
      highlight(trivia, type);
    }
  }

  private void highlight(SyntaxToken token, TypeOfText type) {
    highlighting.highlight(token.line(), token.column(), token.endLine(), token.endColumn(), type);
  }

  private static boolean isKeyword(String text) {
    for (String keyword : JavaScriptKeyword.keywordValues()) {
      if (keyword.equals(text)) {
        return true;
      }
    }
    return false;
  }

}
