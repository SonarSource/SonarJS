/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
import java.util.List;
import java.util.Set;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.cfg.ControlFlowBlock;
import org.sonar.javascript.cfg.ControlFlowGraph;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "UnreachableCode",
  name = "Jump statements should not be followed by other statements",
  priority = Priority.MAJOR,
  tags = {Tags.CERT, Tags.CWE, Tags.MISRA, Tags.UNUSED})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.LOGIC_RELIABILITY)
@SqaleConstantRemediation("5 min")
public class UnreachableCodeCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "Remove this code after the \"%s\" statement.";
  private static final String MESSAGE_WITHOUT_KEYWORD = "Remove this unreachable code.";

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.of(
      Kind.SCRIPT,
      Kind.FUNCTION_DECLARATION,
      Kind.FUNCTION_EXPRESSION,
      Kind.GENERATOR_FUNCTION_EXPRESSION,
      Kind.GENERATOR_DECLARATION,
      Kind.METHOD,
      Kind.GENERATOR_METHOD,
      Kind.ARROW_FUNCTION);
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
    for (ControlFlowBlock unreachable : cfg.unreachableBlocks()) {
      Tree element = unreachableTree(unreachable.elements());
      if (element != null) {
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
    InternalSyntaxToken firstToken = (InternalSyntaxToken) ((JavaScriptTree) element).getFirstToken();
    return firstToken.startIndex();
  }

  private static int endIndex(Tree element) {
    InternalSyntaxToken lastToken = (InternalSyntaxToken) ((JavaScriptTree) element).getLastToken();
    return lastToken.toIndex();
  }

}
