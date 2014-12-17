/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
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
package org.sonar.javascript.model.implementations.expression;

import com.google.common.base.Preconditions;
import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.AstNodeType;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.SeparatedList;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.expression.FunctionExpressionTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;
import org.sonar.javascript.model.interfaces.statement.StatementTree;

import javax.annotation.Nullable;
import java.util.Iterator;
import java.util.List;

public class FunctionExpressionTreeImpl extends JavaScriptTree implements FunctionExpressionTree {

  private final SyntaxToken keyword;
  @Nullable
  private final SyntaxToken star;
  @Nullable
  private final IdentifierTree name;
  private final SyntaxToken openParenthesis;
  private final List<ExpressionTree> parameters;
  private final SyntaxToken closeParenthesis;
  private final SyntaxToken openCurlyBrace;
  private final List<StatementTree> statements;
  private final SyntaxToken closeCurlyBrace;
  private final Kind kind;

  /**
   * Constructor for function expression
   */
  public FunctionExpressionTreeImpl(InternalSyntaxToken keyword, @Nullable IdentifierTreeImpl name, InternalSyntaxToken openParenthesis, SeparatedList<ExpressionTree> parameters, InternalSyntaxToken closeParenthesis, InternalSyntaxToken openCurlyBrace, List<StatementTree> statements, InternalSyntaxToken closeCurlyBrace, List<AstNode> children) {
    super(Kind.FUNCTION_EXPRESSION);
    this.keyword = keyword;
    this.star = null;
    this.name = name;
    this.openParenthesis = openParenthesis;
    this.parameters = parameters;
    this.closeParenthesis = closeParenthesis;
    this.openCurlyBrace = openCurlyBrace;
    this.statements = statements;
    this.closeCurlyBrace = closeCurlyBrace;

    this.kind = Kind.FUNCTION_EXPRESSION;

    for (AstNode child : children) {
      addChild(child);
    }
  }

  public FunctionExpressionTreeImpl(InternalSyntaxToken keyword, InternalSyntaxToken star, @Nullable IdentifierTreeImpl name, InternalSyntaxToken openParenthesis, SeparatedList<ExpressionTree> parameters, InternalSyntaxToken closeParenthesis, InternalSyntaxToken openCurlyBrace, List<StatementTree> statements, InternalSyntaxToken closeCurlyBrace, List<AstNode> children) {
    super(Kind.GENERATOR_FUNCTION_EXPRESSION);
    this.keyword = keyword;
    this.star = star;
    this.name = name;
    this.openParenthesis = openParenthesis;
    this.parameters = parameters;
    this.closeParenthesis = closeParenthesis;
    this.openCurlyBrace = openCurlyBrace;
    this.statements = statements;
    this.closeCurlyBrace = closeCurlyBrace;

    this.kind = Kind.GENERATOR_FUNCTION_EXPRESSION;

    for (AstNode child : children) {
      addChild(child);
    }
  }

  @Override
  public SyntaxToken keyword() {
    return keyword;
  }

  @Nullable
  @Override
  public SyntaxToken star() {
    return star;
  }

  @Nullable
  @Override
  public IdentifierTree name() {
    return name;
  }

  @Override
  public SyntaxToken openParenthesis() {
    return openParenthesis;
  }

  @Override
  public SeparatedList<ExpressionTree> parameters() {
    return parameters();
  }

  @Override
  public SyntaxToken closeParenthesis() {
    return closeParenthesis;
  }

  @Override
  public SyntaxToken openCurlyBrace() {
    return openCurlyBrace;
  }

  @Override
  public List<StatementTree> statements() {
    return statements;
  }

  @Override
  public SyntaxToken closeCurlyBrace() {
    return closeCurlyBrace;
  }

  @Override
  public AstNodeType getKind() {
    return kind;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.concat(Iterators.singletonIterator(name), parameters.iterator(), statements.iterator());
  }
}
