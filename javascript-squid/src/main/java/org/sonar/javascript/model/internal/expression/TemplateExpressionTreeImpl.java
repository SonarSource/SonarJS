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
package org.sonar.javascript.model.internal.expression;

import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.javascript.model.internal.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

import java.util.Iterator;

public class TemplateExpressionTreeImpl extends JavaScriptTree implements TemplateExpressionTree {

  private final InternalSyntaxToken dollar;
  private final InternalSyntaxToken openCurlyBrace;
  private InternalSyntaxToken closeCurlyBrace;
  private final ExpressionTree expression;

  public TemplateExpressionTreeImpl(InternalSyntaxToken dollar, InternalSyntaxToken openCurlyBrace, ExpressionTree expression) {
    super(Kind.TEMPLATE_EXPRESSION);
    this.dollar = dollar;
    this.openCurlyBrace = openCurlyBrace;
    this.expression = expression;

    addChildren(dollar, openCurlyBrace, (AstNode) expression);
  }

  public TemplateExpressionTreeImpl complete(InternalSyntaxToken closeCurlyBrace) {
    this.closeCurlyBrace = closeCurlyBrace;

    addChild(closeCurlyBrace);
    return this;
  }

  @Override
  public SyntaxToken dollar() {
    return dollar;
  }

  @Override
  public SyntaxToken openCurlyBrace() {
    return openCurlyBrace;
  }

  @Override
  public ExpressionTree expression() {
    return expression;
  }

  @Override
  public SyntaxToken closeCurlyBrace() {
    return closeCurlyBrace;
  }

  @Override
  public Kind getKind() {
    return Kind.TEMPLATE_EXPRESSION;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.<Tree>singletonIterator(expression);
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitTemplateExpression(this);
  }
}
