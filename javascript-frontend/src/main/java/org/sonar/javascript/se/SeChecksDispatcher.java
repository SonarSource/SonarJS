/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
package org.sonar.javascript.se;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableList.Builder;
import com.google.common.collect.ImmutableSet;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.sonar.javascript.cfg.ControlFlowGraph;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.visitors.Issue;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;

/**
 * This class is in charge of initializing of symbolic execution and notifying {@link SeCheck} of the events in symbolic execution (like start, end etc.)
 */
public class SeChecksDispatcher extends SubscriptionVisitorCheck {

  private List<SeCheck> checks;

  public SeChecksDispatcher(List<SeCheck> checks) {
    this.checks = checks;
  }

  @Override
  public Set<Kind> nodesToVisit() {
    return ImmutableSet.of(
      Kind.SCRIPT,
      Kind.FUNCTION_DECLARATION,
      Kind.GENERATOR_DECLARATION,
      Kind.FUNCTION_EXPRESSION,
      Kind.GENERATOR_FUNCTION_EXPRESSION,
      Kind.METHOD,
      Kind.GENERATOR_METHOD,
      Kind.ARROW_FUNCTION);
  }

  @Override
  public void visitNode(Tree tree) {
    if (tree.is(Kind.SCRIPT)) {
      checks.forEach(seCheck -> seCheck.cleanupAndStartFileAnalysis((ScriptTree) tree));
      return;
    }

    FunctionTree functionTree = (FunctionTree) tree;
    if (functionTree.body().is(Kind.BLOCK)) {
      ControlFlowGraph cfg = ControlFlowGraph.build((BlockTree) functionTree.body());
      Scope functionScope = getContext().getSymbolModel().getScope(functionTree);
      new SymbolicExecution(functionScope, cfg, checks, functionTree.asyncToken() != null).visitCfg(ProgramState.emptyState());
    }
  }

  @Override
  public void leaveNode(Tree tree) {
    if (tree.is(Kind.SCRIPT)) {
      checks.forEach(seCheck -> seCheck.endOfFile((ScriptTree) tree));
    }
  }

  @Override
  public List<Issue> scanFile(TreeVisitorContext context) {
    if (checks.isEmpty()) {
      return new ArrayList<>();
    }

    for (SeCheck check : checks) {
      check.setContext(context);
    }

    super.scanFile(context);

    Builder<Issue> builder = ImmutableList.builder();

    for (SeCheck check : checks) {
      builder.addAll(check.scanFile(getContext()));
    }

    return builder.build();
  }
}
