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
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.ParameterListTree;
import org.sonar.javascript.model.interfaces.expression.CallExpressionTree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;

import java.util.Iterator;

public class CallExpressionTreeImpl extends JavaScriptTree implements CallExpressionTree {

  private final ExpressionTree callee;
  private final ParameterListTree arguments;

  public CallExpressionTreeImpl(ExpressionTree callee, ParameterListTree arguments) {
    super(Kind.CALL_EXPRESSION);
    this.callee = callee;
    this.arguments = arguments;

    addChildren((AstNode) callee, (AstNode) arguments);
  }

  @Override
  public ExpressionTree callee() {
    return callee;
  }

  @Override
  public ParameterListTree arguments() {
    return arguments;
  }

  @Override
  public Kind getKind() {
    return Kind.CALL_EXPRESSION;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.emptyIterator();
  }

}
