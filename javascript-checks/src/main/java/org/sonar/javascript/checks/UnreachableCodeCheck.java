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
package org.sonar.javascript.checks;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableSet;
import java.util.List;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.cfg.CfgBlock;
import org.sonar.javascript.cfg.ControlFlowGraph;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.javascript.tree.KindSet;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.SeparatedList;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.VariableDeclarationTree;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

@JavaScriptRule
@Rule(key = "UnreachableCode")
public class UnreachableCodeCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "Remove this code after the \"%s\" statement.";
  private static final String MESSAGE_WITHOUT_KEYWORD = "Remove this unreachable code.";

  @Override
  public Set<Kind> nodesToVisit() {
    return ImmutableSet.<Kind>builder()
      .addAll(KindSet.FUNCTION_KINDS.getSubKinds())
      .add(Kind.SCRIPT)
      .build();
  }

  @Override
  public void visitNode(Tree tree) {
    if (tree.is(Kind.SCRIPT)) {
      check(ControlFlowGraph.build((ScriptTree) tree));
    } else {
      FunctionTree functionTree = (FunctionTree) tree;
      if (functionTree.body().is(Kind.BLOCK)) {
        check(ControlFlowGraph.build((BlockTree) functionTree.body()));
      }
    }
  }

  private void check(ControlFlowGraph cfg) {
    for (CfgBlock unreachable : cfg.unreachableBlocks()) {
      Tree element = unreachableTree(unreachable.elements());
      if (element != null) {
        if (isLastBreakInSwitchCase(element) || isDeclarationWithoutInit(element)) {
          continue;
        }

        Set<SyntaxToken> disconnectingJumps = cfg.disconnectingJumps(unreachable);
        String message = MESSAGE_WITHOUT_KEYWORD;
        if (disconnectingJumps.size() == 1) {
          SyntaxToken keyword = disconnectingJumps.iterator().next();
          message = String.format(MESSAGE, keyword.text());
        }
        PreciseIssue issue = addIssue(element, message);
        for (SyntaxToken jump : disconnectingJumps) {
          issue.secondary(jump);
        }
      }
    }
  }

  private static boolean isDeclarationWithoutInit(Tree tree) {
    if (tree.is(Kind.VAR_DECLARATION)) {
      SeparatedList<BindingElementTree> bindingElements = ((VariableDeclarationTree) tree).variables();
      for (BindingElementTree bindingElement : bindingElements) {
        if (bindingElement.is(Kind.INITIALIZED_BINDING_ELEMENT)) {
          return false;
        }
      }

      return true;
    }
    return false;
  }

  private static boolean isLastBreakInSwitchCase(Tree tree) {
    if (tree.is(Kind.BREAK_STATEMENT)) {
      Tree parent = tree.parent();

      if (parent.is(Kind.CASE_CLAUSE, Kind.DEFAULT_CLAUSE)) {
        SwitchClauseTree switchClause = (SwitchClauseTree) parent;
        return switchClause.statements().get(switchClause.statements().size() - 1).equals(tree);
      }
    }
    return false;
  }

  private static Tree unreachableTree(List<Tree> elements) {
    List<Tree> unreachableElements = skipDeclarations(elements);
    if (unreachableElements.isEmpty()) {
      return null;
    }

    Tree biggestUnreachableElement = unreachableElements.get(0);
    for (Tree element : unreachableElements) {
      if (startIndex(element) <= startIndex(biggestUnreachableElement)
        && endIndex(element) >= endIndex(biggestUnreachableElement)) {
        biggestUnreachableElement = element;
      }
    }
    return biggestUnreachableElement;
  }

  private static List<Tree> skipDeclarations(List<Tree> elements) {
    int i = 0;
    for (Tree element : elements) {
      if (!element.is(Kind.FUNCTION_DECLARATION, Kind.GENERATOR_DECLARATION, Kind.CLASS_DECLARATION)) {
        return elements.subList(i, elements.size());
      }
      i++;
    }
    return ImmutableList.of();
  }

  private static int startIndex(Tree element) {
    InternalSyntaxToken firstToken = (InternalSyntaxToken) element.firstToken();
    return firstToken.startIndex();
  }

  private static int endIndex(Tree element) {
    InternalSyntaxToken lastToken = (InternalSyntaxToken) element.lastToken();
    return lastToken.toIndex();
  }

}
