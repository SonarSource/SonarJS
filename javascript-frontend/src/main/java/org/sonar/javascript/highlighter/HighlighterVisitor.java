/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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

import com.google.common.collect.ImmutableList;
import java.util.List;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.highlighting.NewHighlighting;
import org.sonar.api.batch.sensor.highlighting.TypeOfText;
import org.sonar.javascript.lexer.JavaScriptKeyword;
import org.sonar.javascript.tree.impl.expression.LiteralTreeImpl;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FieldDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxTrivia;
import org.sonar.plugins.javascript.api.tree.statement.VariableDeclarationTree;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitor;

public class HighlighterVisitor extends SubscriptionVisitor {

  private final SensorContext sensorContext;
  private final FileSystem fileSystem;
  private NewHighlighting highlighting;

  private static final Kind[] METHODS = {
    Kind.GENERATOR_METHOD,
    Kind.METHOD,
    Kind.GET_METHOD,
    Kind.SET_METHOD
  };

  public HighlighterVisitor(SensorContext sensorContext, FileSystem fileSystem) {
    this.sensorContext = sensorContext;
    this.fileSystem = fileSystem;
  }

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.<Kind>builder()
      .add(METHODS)
      .add(
        Kind.FIELD,
        Kind.LET_DECLARATION,
        Kind.NUMERIC_LITERAL,
        Kind.STRING_LITERAL,
        Kind.TOKEN)
      .build();
  }

  @Override
  public void visitFile(Tree scriptTree) {
    highlighting = sensorContext.newHighlighting().onFile(fileSystem.inputFile(fileSystem.predicates().is(getContext().getFile())));
  }

  @Override
  public void leaveFile(Tree scriptTree) {
    highlighting.save();
  }

  @Override
  public void visitNode(Tree tree) {
    SyntaxToken token = null;
    TypeOfText code = null;

    if (tree.is(METHODS)) {
      token = ((MethodDeclarationTree) tree).staticToken();
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
    }

    if (token != null) {
      highlight(token, code);
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
