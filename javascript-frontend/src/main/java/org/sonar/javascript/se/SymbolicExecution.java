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
package org.sonar.javascript.se;

import com.google.common.collect.HashMultimap;
import com.google.common.collect.SetMultimap;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import javax.annotation.CheckForNull;
import javax.annotation.Nullable;
import org.sonar.javascript.cfg.CfgBlock;
import org.sonar.javascript.cfg.CfgBranchingBlock;
import org.sonar.javascript.cfg.ControlFlowGraph;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.tree.TreeKinds;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.MemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ParenthesisedExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.ForObjectStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.tree.statement.VariableDeclarationTree;

import static org.sonar.plugins.javascript.api.symbols.Symbol.Kind.CLASS;
import static org.sonar.plugins.javascript.api.symbols.Symbol.Kind.FUNCTION;
import static org.sonar.plugins.javascript.api.symbols.Symbol.Kind.IMPORT;

public class SymbolicExecution {

  private static final int MAX_BLOCK_EXECUTIONS = 1000;

  private final CfgBlock cfgStartBlock;
  private final Set<Symbol> trackedVariables;
  private final Set<Symbol> functionParameters;
  private final Scope functionScope;
  private final Deque<BlockExecution> workList = new ArrayDeque<>();
  private final SetMultimap<Tree, Truthiness> conditionResults = HashMultimap.create();
  private final Set<BlockExecution> alreadyProcessed = new HashSet<>();
  private final List<SeCheck> checks;
  private final LiveVariableAnalysis liveVariableAnalysis;

  public SymbolicExecution(Scope functionScope, ControlFlowGraph cfg, List<SeCheck> checks) {
    cfgStartBlock = cfg.start();
    LocalVariables localVariables = new LocalVariables(functionScope, cfg);
    this.trackedVariables = localVariables.trackableVariables();
    this.functionParameters = localVariables.functionParameters();
    this.liveVariableAnalysis = LiveVariableAnalysis.create(cfg, functionScope);
    this.functionScope = functionScope;
    this.checks = checks;
  }

  public void visitCfg() {
    for (SeCheck check : checks) {
      check.startOfExecution(functionScope);
    }

    workList.addLast(new BlockExecution(cfgStartBlock, initialState()));

    for (int i = 0; i < MAX_BLOCK_EXECUTIONS && !workList.isEmpty(); i++) {
      BlockExecution blockExecution = workList.removeFirst();

      if (!alreadyProcessed.contains(blockExecution)) {
        if (hasTryBranchingTree(blockExecution.block())) {
          return;
        }
        execute(blockExecution);
        alreadyProcessed.add(blockExecution);
      }
    }

    if (workList.isEmpty()) {
      for (SeCheck check : checks) {
        check.checkConditions(conditionResults.asMap());
        check.endOfExecution(functionScope);
      }
    }
  }

  private static boolean hasTryBranchingTree(CfgBlock block) {
    if (block instanceof CfgBranchingBlock) {
      return ((CfgBranchingBlock) block).branchingTree().is(Kind.TRY_STATEMENT);
    }
    return false;
  }

  private ProgramState initialState() {
    ProgramState initialState = ProgramState.emptyState();

    for (Symbol localVar : trackedVariables) {
      Constraint initialConstraint = null;
      if (!symbolIs(localVar, FUNCTION, IMPORT, CLASS) && !functionParameters.contains(localVar)) {
        initialConstraint = Constraint.UNDEFINED;
      }
      initialState = initialState.newSymbolicValue(localVar, initialConstraint);
    }

    Symbol arguments = functionScope.getSymbol("arguments");
    if (arguments != null) {
      // there is no arguments for arrow function scope
      // fixme change constraint on OTHER_OBJECT
      initialState = initialState.newSymbolicValue(arguments, Constraint.TRUTHY);
    }
    return initialState;
  }

  private static boolean symbolIs(Symbol symbol, Symbol.Kind ... kinds) {
    for (Symbol.Kind kind : kinds) {
      if (symbol.kind().equals(kind)) {
        return true;
      }
    }

    return false;
  }

  private void execute(BlockExecution blockExecution) {
    CfgBlock block = blockExecution.block();
    ProgramState currentState = blockExecution.state();
    boolean stopExploring = false;

    for (Tree element : block.elements()) {
      beforeBlockElement(currentState, element);

      if (element.is(Kind.BRACKET_MEMBER_EXPRESSION, Kind.DOT_MEMBER_EXPRESSION)) {
        ExpressionTree object = ((MemberExpressionTree) element).object();
        if (object.is(Kind.IDENTIFIER_REFERENCE)) {
          SymbolicValue symbolicValue = currentState.getSymbolicValue(((IdentifierTree) object).symbol());
          Nullability nullability = currentState.getNullability(symbolicValue);
          if (nullability == Nullability.UNKNOWN) {
            currentState = currentState.constrain(symbolicValue, Constraint.NOT_NULLY);
          } else if (nullability == Nullability.NULL) {
            stopExploring = true;
            break;
          }

        }
      }

      if (element.is(Kind.EXPRESSION_STATEMENT)) {
        currentState = currentState.clearStack();

      } else if (element.is(Kind.IDENTIFIER_REFERENCE) && !isUndefined((IdentifierTree) element)) {
        SymbolicValue symbolicValue = currentState.getSymbolicValue(((IdentifierTree) element).symbol());
        currentState = currentState.pushToStack(symbolicValue);

      } else if (element instanceof ExpressionTree && !element.is(Kind.CLASS_DECLARATION)) {
        currentState = currentState.execute((ExpressionTree) element);
      }

      if (TreeKinds.isAssignment(element)) {

        AssignmentExpressionTree assignment = (AssignmentExpressionTree) element;
        currentState = assignment(currentState, assignment.variable());

      } else if (element.is(
        Kind.POSTFIX_DECREMENT,
        Kind.POSTFIX_INCREMENT,
        Kind.PREFIX_DECREMENT,
        Kind.PREFIX_INCREMENT)) {

        UnaryExpressionTree unary = (UnaryExpressionTree) element;
        currentState = assignment(currentState, unary.expression());

      } else if (element.is(Kind.INITIALIZED_BINDING_ELEMENT)) {
        InitializedBindingElementTree initialized = (InitializedBindingElementTree) element;
        BindingElementTree variable = initialized.left();
        if (variable.is(Kind.BINDING_IDENTIFIER)) {
          currentState = assignment(currentState, variable);
        }
        currentState = currentState.clearStack();

      }

      afterBlockElement(currentState, element);
    }

    if (!stopExploring) {
      handleSuccessors(block, currentState);
    }
  }

  public static boolean isUndefined(IdentifierTree tree) {
    return "undefined".equals(tree.name());
  }

  private void beforeBlockElement(ProgramState currentState, Tree element) {
    for (SeCheck check : checks) {
      check.beforeBlockElement(currentState, element);
    }
  }

  private void afterBlockElement(ProgramState currentState, Tree element) {
    for (SeCheck check : checks) {
      check.afterBlockElement(currentState, element);
    }
  }

  private void pushAllSuccessors(CfgBlock block, ProgramState currentState) {
    for (CfgBlock successor : block.successors()) {
      pushSuccessor(successor, currentState);
    }
  }

  private void pushSuccessor(CfgBlock successor, @Nullable ProgramState currentState) {
    if (currentState != null) {
      Set<Symbol> liveInSymbols = liveVariableAnalysis.getLiveInSymbols(successor);
      workList.addLast(new BlockExecution(successor, currentState.removeSymbols(liveInSymbols)));
    }
  }

  private void handleSuccessors(CfgBlock block, ProgramState incomingState) {
    ProgramState currentState = incomingState;
    boolean shouldPushAllSuccessors = true;

    if (block instanceof CfgBranchingBlock) {
      CfgBranchingBlock branchingBlock = (CfgBranchingBlock) block;
      Tree branchingTree = branchingBlock.branchingTree();

      SymbolicValue conditionSymbolicValue = currentState.peekStack();

      if (branchingTree instanceof StatementTree) {
        currentState = currentState.clearStack();
      }

      if (branchingTree.is(
        Kind.CONDITIONAL_EXPRESSION,
        Kind.IF_STATEMENT,
        Kind.WHILE_STATEMENT,
        Kind.FOR_STATEMENT,
        Kind.DO_WHILE_STATEMENT,
        Kind.CONDITIONAL_AND,
        Kind.CONDITIONAL_OR)) {

        pushConditionSuccessors(branchingBlock, currentState, conditionSymbolicValue);
        shouldPushAllSuccessors = false;

      } else if (branchingTree.is(Kind.FOR_IN_STATEMENT, Kind.FOR_OF_STATEMENT)) {
        ForObjectStatementTree forTree = (ForObjectStatementTree) branchingTree;
        Tree variable = forTree.variableOrExpression();
        if (variable.is(Kind.VAR_DECLARATION)) {
          VariableDeclarationTree declaration = (VariableDeclarationTree) variable;
          variable = declaration.variables().get(0);
        }
        currentState = newSymbolicValue(currentState, variable);

        if (currentState.getNullability(getSymbolicValue(forTree.expression(), currentState)) == Nullability.NULL) {
          pushSuccessor(branchingBlock.falseSuccessor(), currentState);
          shouldPushAllSuccessors = false;
        }
      }


    }

    if (shouldPushAllSuccessors) {
      pushAllSuccessors(block, currentState);
    }
  }

  private void pushConditionSuccessors(CfgBranchingBlock block, ProgramState currentState, SymbolicValue conditionSymbolicValue) {
    Tree lastElement = block.elements().get(block.elements().size() - 1);
    for (ProgramState newState : conditionSymbolicValue.constrain(currentState, Constraint.TRUTHY)) {
      pushSuccessor(block.trueSuccessor(), newState);
      conditionResults.put(lastElement, Truthiness.TRUTHY);
    }
    for (ProgramState newState : conditionSymbolicValue.constrain(currentState, Constraint.FALSY)) {
      pushSuccessor(block.falseSuccessor(), newState);
      conditionResults.put(lastElement, Truthiness.FALSY);
    }
  }

  private ProgramState newSymbolicValue(ProgramState currentState, Tree left) {
    Symbol trackedVariable = trackedVariable(left);
    if (trackedVariable != null) {
      return currentState.newSymbolicValue(trackedVariable, null);
    }
    return currentState;
  }

  private ProgramState assignment(ProgramState currentState, Tree variable) {
    Symbol trackedVariable = trackedVariable(variable);
    if (trackedVariable != null) {
      return currentState.assignment(trackedVariable);
    }
    return currentState;
  }

  @CheckForNull
  private Symbol trackedVariable(Tree tree) {
    if (tree.is(Kind.PARENTHESISED_EXPRESSION)) {
      return trackedVariable(((ParenthesisedExpressionTree) tree).expression());
    }
    if (tree.is(Kind.IDENTIFIER_REFERENCE, Kind.BINDING_IDENTIFIER)) {
      IdentifierTree identifier = (IdentifierTree) tree;
      Symbol symbol = identifier.symbol();
      return trackedVariables.contains(symbol) ? symbol : null;
    }
    return null;
  }

  @CheckForNull
  private SymbolicValue getSymbolicValue(@Nullable Tree tree, ProgramState currentState) {
    if (tree != null) {
      Symbol symbol = trackedVariable(tree);
      if (symbol != null) {
        return currentState.getSymbolicValue(symbol);
      }
    }
    return null;
  }
}
