/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
package org.sonar.javascript.tree.impl.expression;

import com.google.common.collect.Iterators;
import java.util.Iterator;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class TemplateExpressionTreeImpl extends JavaScriptTree implements TemplateExpressionTree {

  private final InternalSyntaxToken dollar;
  private final InternalSyntaxToken openCurlyBrace;
  private InternalSyntaxToken closeCurlyBrace;
  private final ExpressionTree expression;

  public TemplateExpressionTreeImpl(InternalSyntaxToken dollar, InternalSyntaxToken openCurlyBrace, ExpressionTree expression, InternalSyntaxToken closeCurlyBrace) {
    this.dollar = dollar;
    this.openCurlyBrace = openCurlyBrace;
    this.expression = expression;
    this.closeCurlyBrace = closeCurlyBrace;
  }

  @Override
  public SyntaxToken dollarToken() {
    return dollar;
  }

  @Override
  public SyntaxToken openCurlyBraceToken() {
    return openCurlyBrace;
  }

  @Override
  public ExpressionTree expression() {
    return expression;
  }

  @Override
  public SyntaxToken closeCurlyBraceToken() {
    return closeCurlyBrace;
  }

  @Override
  public Kind getKind() {
    return Kind.TEMPLATE_EXPRESSION;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(dollar, openCurlyBrace, expression, closeCurlyBrace);
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitTemplateExpression(this);
  }
}
