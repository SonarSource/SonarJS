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
package org.sonar.javascript.model.internal.statement;

import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.AstNodeType;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.javascript.model.internal.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.SwitchClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchStatementTree;

import java.util.Iterator;
import java.util.List;

public class SwitchStatementTreeImpl extends JavaScriptTree implements SwitchStatementTree {

  private SyntaxToken switchKeyword;

  private SyntaxToken openParenthesis;
  private ExpressionTree expression;
  private SyntaxToken closeParenthesis;

  private final SyntaxToken openCurlyBrace;
  private final List<SwitchClauseTree> cases;
  private final SyntaxToken closeCurlyBrace;

  public SwitchStatementTreeImpl(InternalSyntaxToken openCurlyBrace, List<SwitchClauseTree> cases, InternalSyntaxToken closeCurlyBrace) {
    super(Kind.SWITCH_STATEMENT);
    this.openCurlyBrace = openCurlyBrace;
    this.cases = cases;
    this.closeCurlyBrace = closeCurlyBrace;

    addChild(openCurlyBrace);
    for (SwitchClauseTree c : cases) {
      addChild((AstNode) c);
    }
    addChild(closeCurlyBrace);
  }

  public SwitchStatementTreeImpl complete(InternalSyntaxToken switchKeyword, InternalSyntaxToken openParenthesis, ExpressionTree expression, InternalSyntaxToken closeParenthesis) {
    this.switchKeyword = switchKeyword;
    this.openParenthesis = openParenthesis;
    this.expression = expression;
    this.closeParenthesis = closeParenthesis;

    prependChildren(switchKeyword, openParenthesis, (AstNode) expression, closeParenthesis);
    return this;
  }

  @Override
  public SyntaxToken switchKeyword() {
    return switchKeyword;
  }

  @Override
  public SyntaxToken openParenthesis() {
    return openParenthesis;
  }

  @Override
  public ExpressionTree expression() {
    return expression;
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
  public List<SwitchClauseTree> cases() {
    return cases;
  }

  @Override
  public SyntaxToken closeCurlyBrace() {
    return closeCurlyBrace;
  }

  @Override
  public AstNodeType getKind() {
    return Kind.SWITCH_STATEMENT;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.concat(
      Iterators.singletonIterator(expression),
      cases.iterator());
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitSwitchStatement(this);
  }
}
