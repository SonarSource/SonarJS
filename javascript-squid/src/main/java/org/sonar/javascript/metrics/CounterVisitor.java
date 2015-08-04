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

import org.sonar.javascript.ast.visitors.SubscriptionAstTreeVisitor;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class CounterVisitor extends SubscriptionAstTreeVisitor {

  private int functionCounter = 0;
  private int statementCounter = 0;
  private int accessorCounter = 0;
  private int classCounter = 0;

  private static final Kind[] ACCESSOR_NODES = {
      Kind.GET_METHOD,
      Kind.SET_METHOD
  };

  private static final Kind[] STATEMENT_NODES = {
      Kind.VARIABLE_STATEMENT,
      Kind.EMPTY_STATEMENT,
      Kind.EXPRESSION_STATEMENT,
      Kind.IF_STATEMENT,
      Kind.DO_WHILE_STATEMENT,
      Kind.WHILE_STATEMENT,
      Kind.FOR_IN_STATEMENT,
      Kind.FOR_OF_STATEMENT,
      Kind.FOR_STATEMENT,
      Kind.CONTINUE_STATEMENT,
      Kind.BREAK_STATEMENT,
      Kind.RETURN_STATEMENT,
      Kind.WITH_STATEMENT,
      Kind.SWITCH_STATEMENT,
      Kind.THROW_STATEMENT,
      Kind.TRY_STATEMENT,
      Kind.DEBUGGER_STATEMENT
  };

  @Override
  public List<Kind> nodesToVisit() {
    List<Kind> result = new ArrayList<>(Arrays.asList(MetricsVisitor.getFunctionNodes()));
    result.addAll(Arrays.asList(STATEMENT_NODES));
    result.addAll(Arrays.asList(ACCESSOR_NODES));
    result.addAll(Arrays.asList(MetricsVisitor.getClassNodes()));
    return result;
  }

  public CounterVisitor(Tree tree) {
    scanTree(tree);
  }

  public int getFunctionNumber() {
    return functionCounter;
  }

  public int getStatementsNumber() {
    return statementCounter;
  }

  public int getAccessorsNumber() {
    return accessorCounter;
  }

  public int getClassNumber() {
    return classCounter;
  }

  @Override
  public void visitNode(Tree tree) {
    if (tree.is(MetricsVisitor.getFunctionNodes())) {
      functionCounter++;

    } else if (tree.is(STATEMENT_NODES)) {
      statementCounter++;

    } else if (tree.is(ACCESSOR_NODES)) {
      accessorCounter++;

    } else if (tree.is(MetricsVisitor.getClassNodes())) {
      classCounter++;
    }
  }
}
