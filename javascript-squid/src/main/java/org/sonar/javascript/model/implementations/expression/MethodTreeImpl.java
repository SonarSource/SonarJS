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
import org.sonar.javascript.model.interfaces.declaration.FunctionTree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;
import org.sonar.javascript.model.interfaces.statement.StatementTree;

import javax.annotation.Nullable;
import java.util.Iterator;
import java.util.List;

public class MethodTreeImpl extends JavaScriptTree implements FunctionTree, ExpressionTree {

  @Nullable
  private final SyntaxToken keyword;
  @Nullable
  private final SyntaxToken star;
  private final IdentifierTree name;
  private final SyntaxToken openParenthesis;
  private final SeparatedList<ExpressionTree> parameters;
  private final SyntaxToken closeParenthesis;
  private final SyntaxToken openCurlyBrace;
  private final List<StatementTree> statements;
  private final SyntaxToken closeCurlyBrace;
  private final Kind kind;

  /**
   * Constructor for classic method - {@link Kind#METHOD}
   */
  public MethodTreeImpl(IdentifierTreeImpl name, InternalSyntaxToken openParenthesis, SeparatedList<ExpressionTree> parameters, InternalSyntaxToken closeParenthesis, InternalSyntaxToken openCurlyBrace, List<StatementTree> statements, InternalSyntaxToken closeCurlyBrace, List<AstNode> children) {
    super(Kind.METHOD);
    this.keyword = null;
    this.star = null;
    this.name = name;
    this.openParenthesis = openParenthesis;
    this.parameters = parameters;
    this.closeParenthesis = closeParenthesis;
    this.openCurlyBrace = openCurlyBrace;
    this.statements = statements;
    this.closeCurlyBrace = closeCurlyBrace;

    this.kind = Kind.METHOD;

    for (AstNode child : children) {
      addChild(child);
    }
  }

  /**
   * Constructor for generator method - {@link Kind#METHOD_GENERATOR}
   */
  public MethodTreeImpl(InternalSyntaxToken star, IdentifierTreeImpl name, InternalSyntaxToken openParenthesis, SeparatedList<ExpressionTree> parameters, InternalSyntaxToken closeParenthesis, InternalSyntaxToken openCurlyBrace, List<StatementTree> statements, InternalSyntaxToken closeCurlyBrace, List<AstNode> children) {
    super(Kind.METHOD_GENERATOR);
    this.keyword = null;
    this.star = Preconditions.checkNotNull(star);
    this.name = name;
    this.openParenthesis = openParenthesis;
    this.parameters = parameters;
    this.closeParenthesis = closeParenthesis;
    this.openCurlyBrace = openCurlyBrace;
    this.statements = statements;
    this.closeCurlyBrace = closeCurlyBrace;

    this.kind = Kind.METHOD_GENERATOR;

    for (AstNode child : children) {
      addChild(child);
    }
  }

  /**
   * Constructor for getter and setter
   *
   * @param kind    {@link Kind#METHOD_GETTER} or {@link Kind#METHOD_SETTER}
   * @param keyword "set" or "get" keyword
   */
  public MethodTreeImpl(Kind kind, InternalSyntaxToken keyword, IdentifierTreeImpl name, InternalSyntaxToken openParenthesis, SeparatedList<ExpressionTree> parameters, InternalSyntaxToken closeParenthesis, InternalSyntaxToken openCurlyBrace, List<StatementTree> statements, InternalSyntaxToken closeCurlyBrace, List<AstNode> children) {
    super(kind);
    Preconditions.checkArgument(kind.equals(Kind.METHOD_SETTER) || kind.equals(Kind.METHOD_GETTER), "Expecting kind METHOD_SETTER or METHOD_GETTER");
    this.keyword = Preconditions.checkNotNull(keyword);
    this.star = null;
    this.name = name;
    this.openParenthesis = openParenthesis;
    this.parameters = parameters;
    this.closeParenthesis = closeParenthesis;
    this.openCurlyBrace = openCurlyBrace;
    this.statements = statements;
    this.closeCurlyBrace = closeCurlyBrace;

    this.kind = kind;

    for (AstNode child : children) {
      addChild(child);
    }
  }

  /**
   * @return "set", "get" or null if method is a generator
   */
  @Nullable
  @Override
  public SyntaxToken keyword() {
    return keyword;
  }

  @Nullable
  @Override
  public SyntaxToken star() {
    return star;
  }

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
    return parameters;
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
    return Iterators.<Tree>singletonIterator(name);
  }

}
