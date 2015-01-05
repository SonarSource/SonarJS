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

import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.declaration.ParameterListTreeImpl;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.ParameterListTree;
import org.sonar.javascript.model.interfaces.expression.NewExpressionTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;

import javax.annotation.Nullable;
import java.util.Iterator;

public class NewExpressionTreeImpl extends JavaScriptTree implements NewExpressionTree {

  private final Kind kind;
  private final SyntaxToken newKeyword;
  private final ParameterListTree arguments;

  public NewExpressionTreeImpl(Kind kind, InternalSyntaxToken newKeyword, AstNode expression) {
    super(kind);
    this.kind = kind;
    this.newKeyword =  newKeyword;
    this.arguments = null;

    addChildren(newKeyword, expression);
  }

  public NewExpressionTreeImpl(Kind kind, InternalSyntaxToken newKeyword, AstNode expression, ParameterListTreeImpl arguments) {
    super(kind);
    this.kind = kind;
    this.newKeyword = newKeyword;
    this.arguments = arguments;

    addChildren(newKeyword, expression, arguments);
  }

  @Override
  public SyntaxToken newKeyword() {
    return newKeyword;
  }

  @Override
  public Tree expression() {
    throw new UnsupportedOperationException("Not supported yet in the strongly typed AST.");
  }

  @Nullable
  @Override
  public ParameterListTree arguments() {
    return arguments;
  }

  public Kind getKind() {
    return kind;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.emptyIterator();
  }

}
