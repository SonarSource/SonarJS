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

import com.google.common.collect.ImmutableList;
import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.AstNodeType;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.declaration.ParameterListTreeImpl;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.ParameterListTree;
import org.sonar.javascript.model.interfaces.expression.FunctionExpressionTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;

import javax.annotation.Nullable;
import java.util.Iterator;
import java.util.List;

public class FunctionExpressionTreeImpl extends JavaScriptTree implements FunctionExpressionTree {

  private final SyntaxToken functionKeyword;
  @Nullable
  private final SyntaxToken star;
  @Nullable
  private final IdentifierTree name;
  private final ParameterListTree parameters;
  private final SyntaxToken openCurlyBrace;
  private final SyntaxToken closeCurlyBrace;
  private final Kind kind;

  /**
   * Constructor for named generator expression and  generator declaration
   */
  public FunctionExpressionTreeImpl(Kind kind, InternalSyntaxToken functionKeyword, InternalSyntaxToken star, IdentifierTreeImpl name,
    ParameterListTreeImpl parameters, InternalSyntaxToken openCurlyBrace, InternalSyntaxToken closeCurlyBrace,
    List<AstNode> children) {

    super(kind);
    this.functionKeyword = functionKeyword;
    this.star = star;
    this.name = name;
    this.parameters = parameters;
    this.openCurlyBrace = openCurlyBrace;
    this.closeCurlyBrace = closeCurlyBrace;

    this.kind = kind;

    for (AstNode child : children) {
      addChild(child);
    }
  }

  /**
   * Constructor for NOT named generator expression
   */
  public FunctionExpressionTreeImpl(Kind kind, InternalSyntaxToken functionKeyword, InternalSyntaxToken star,
    ParameterListTreeImpl parameters, InternalSyntaxToken openCurlyBrace, InternalSyntaxToken closeCurlyBrace,
    ImmutableList<AstNode> children) {

    super(kind);
    this.functionKeyword = functionKeyword;
    this.star = star;
    this.name = null;
    this.parameters = parameters;
    this.openCurlyBrace = openCurlyBrace;
    this.closeCurlyBrace = closeCurlyBrace;

    this.kind = kind;

    for (AstNode child : children) {
      addChild(child);
    }
  }

  /**
   * Constructor for named function expression and function declaration
   */
  public FunctionExpressionTreeImpl(Kind kind, InternalSyntaxToken functionKeyword, IdentifierTreeImpl name,
    ParameterListTreeImpl parameters, InternalSyntaxToken openCurlyBrace, InternalSyntaxToken closeCurlyBrace,
    ImmutableList<AstNode> children) {

    super(kind);
    this.functionKeyword = functionKeyword;
    this.star = null;
    this.name = name;
    this.parameters = parameters;
    this.openCurlyBrace = openCurlyBrace;
    this.closeCurlyBrace = closeCurlyBrace;

    this.kind = kind;

    for (AstNode child : children) {
      addChild(child);
    }
  }

  /**
   * Constructor for NOT named function expression
   */
  public FunctionExpressionTreeImpl(Kind kind, InternalSyntaxToken functionKeyword, ParameterListTreeImpl parameters,
    InternalSyntaxToken openCurlyBrace, InternalSyntaxToken closeCurlyBrace, ImmutableList<AstNode> children) {

    super(kind);
    this.functionKeyword = functionKeyword;
    this.star = null;
    this.name = null;
    this.parameters = parameters;
    this.openCurlyBrace = openCurlyBrace;
    this.closeCurlyBrace = closeCurlyBrace;

    this.kind = kind;

    for (AstNode child : children) {
      addChild(child);
    }
  }

  @Override
  public SyntaxToken functionKeyword() {
    return functionKeyword;
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
  public ParameterListTree parameters() {
    return parameters;
  }

  @Override
  public SyntaxToken openCurlyBrace() {
    return openCurlyBrace;
  }

  @Override
  public List<Tree> statements() {
    throw new UnsupportedOperationException("Not supported yet in the strongly typed AST.");
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
