/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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
package org.sonar.javascript.tree.impl.statement;

import com.google.common.collect.Iterators;
import java.util.Iterator;
import java.util.List;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.SwitchClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class SwitchStatementTreeImpl extends JavaScriptTree implements SwitchStatementTree {

  private final SyntaxToken switchKeyword;

  private final SyntaxToken openParenthesis;
  private final ExpressionTree expression;
  private final SyntaxToken closeParenthesis;

  private final SyntaxToken openCurlyBrace;
  private final List<SwitchClauseTree> cases;
  private final SyntaxToken closeCurlyBrace;

  public SwitchStatementTreeImpl(
    SyntaxToken switchKeyword, SyntaxToken openParenthesis, ExpressionTree expression, SyntaxToken closeParenthesis,
    SyntaxToken openCurlyBrace, List<SwitchClauseTree> cases, SyntaxToken closeCurlyBrace
  ) {

    this.switchKeyword = switchKeyword;
    this.openParenthesis = openParenthesis;
    this.expression = expression;
    this.closeParenthesis = closeParenthesis;
    this.openCurlyBrace = openCurlyBrace;
    this.cases = cases;
    this.closeCurlyBrace = closeCurlyBrace;
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
  public Kind getKind() {
    return Kind.SWITCH_STATEMENT;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.concat(
      Iterators.forArray(switchKeyword, openParenthesis, expression, closeParenthesis, openCurlyBrace),
      cases.iterator(),
      Iterators.singletonIterator(closeCurlyBrace));
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitSwitchStatement(this);
  }
}
