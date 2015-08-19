/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
package org.sonar.javascript.metrics;

import com.google.common.collect.ImmutableList;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.javascript.tree.visitors.SubscriptionAstTreeVisitor;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;

import java.util.List;

public class ComplexityVisitor extends SubscriptionAstTreeVisitor {

  private int complexity;

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.of(
        // Functions
        Kind.FUNCTION_DECLARATION,
        Kind.FUNCTION_EXPRESSION,
        Kind.METHOD,
        Kind.GENERATOR_METHOD,
        Kind.GENERATOR_FUNCTION_EXPRESSION,
        Kind.GENERATOR_DECLARATION,
        // Branching nodes
        Kind.IF_STATEMENT,
        Kind.DO_WHILE_STATEMENT,
        Kind.WHILE_STATEMENT,
        Kind.FOR_IN_STATEMENT,
        Kind.FOR_OF_STATEMENT,
        Kind.FOR_STATEMENT,
        Kind.CASE_CLAUSE,
        Kind.CATCH_BLOCK,
        Kind.RETURN_STATEMENT,
        Kind.THROW_STATEMENT,
        // Expressions
        Kind.CONDITIONAL_EXPRESSION,
        Kind.CONDITIONAL_AND,
        Kind.CONDITIONAL_OR,

        // FOR EXCLUDING LAST RETURN
        Kind.SET_METHOD,
        Kind.GET_METHOD
    );
  }

  public int getComplexity(Tree tree) {
    this.complexity = 0;
    scanTree(tree);
    return complexity;
  }

  @Override
  public void visitNode(Tree tree) {
    if (isStatementWithLastReturn(tree)) {
      complexity--;
    }

    if (!tree.is(Kind.SET_METHOD, Kind.GET_METHOD)) {
      complexity++;
    }
  }

  /**
   * @param tree  some kind of function declaration (which can contain return as its last statement)
   * @return      <b>true</b> if last statement of <b>tree</b> body is return statement.
   */
  private static boolean isStatementWithLastReturn(Tree tree) {
    Kind kind = (Kind) ((JavaScriptTree) tree).getKind();
    boolean result = false;

    switch (kind) {
      case GET_METHOD:
      case SET_METHOD:
      case METHOD:
      case GENERATOR_METHOD:
        result = isLastReturn(((MethodDeclarationTree)tree).body().statements());
        break;
      case GENERATOR_FUNCTION_EXPRESSION:
      case FUNCTION_EXPRESSION:
      case FUNCTION_DECLARATION:
      case GENERATOR_DECLARATION:
        result = isLastReturn(((FunctionTree)tree).body().statements());
        break;
      default:
        break;
    }

    return result;
  }

  private static boolean isLastReturn(List<StatementTree> statements) {
    if (statements.isEmpty()) {
      return false;
    }
    StatementTree tree = statements.get(statements.size() - 1);
    return tree.is(Kind.RETURN_STATEMENT);
  }

}
