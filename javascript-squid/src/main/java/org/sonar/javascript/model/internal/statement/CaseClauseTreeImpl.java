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
import org.apache.commons.collections.ListUtils;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.javascript.model.internal.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.CaseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;

import java.util.Iterator;
import java.util.List;

public class CaseClauseTreeImpl extends JavaScriptTree implements CaseClauseTree {

  private final SyntaxToken caseKeyword;
  private final ExpressionTree expression;
  private final SyntaxToken colon;
  private final List<StatementTree> statements;

  public CaseClauseTreeImpl(InternalSyntaxToken caseKeyword, ExpressionTree expression, InternalSyntaxToken colon) {
    super(Kind.CASE_CLAUSE);
    this.caseKeyword = caseKeyword;
    this.expression = expression;
    this.colon = colon;
    this.statements = ListUtils.EMPTY_LIST;

    addChildren(caseKeyword, (AstNode) expression, colon);
  }

  public CaseClauseTreeImpl(InternalSyntaxToken caseKeyword, ExpressionTree expression, InternalSyntaxToken colon, List<StatementTree> statements) {
    super(Kind.CASE_CLAUSE);
    this.caseKeyword = caseKeyword;
    this.expression = expression;
    this.colon = colon;
    this.statements = statements;

    addChildren(caseKeyword, (AstNode) expression, colon);
    for (StatementTree child : statements) {
      addChild((AstNode) child);
    }
  }

  @Override
  public SyntaxToken keyword() {
    return caseKeyword;
  }

  @Override
  public ExpressionTree expression() {
    return expression;
  }

  @Override
  public SyntaxToken colon() {
    return colon;
  }

  @Override
  public List<StatementTree> statements() {
    return statements;
  }

  @Override
  public AstNodeType getKind() {
    return Kind.CASE_CLAUSE;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.concat(
      Iterators.singletonIterator(expression),
      statements.iterator()
    );
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitCaseClause(this);
  }
}
