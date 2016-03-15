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

import com.google.common.collect.HashMultimap;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.SetMultimap;
import java.util.ArrayDeque;
import java.util.Collection;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Map.Entry;
import java.util.Set;
import javax.annotation.CheckForNull;
import org.sonar.api.server.rule.RulesDefinition.SubCharacteristics;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.cfg.CfgBlock;
import org.sonar.javascript.cfg.CfgBranchingBlock;
import org.sonar.javascript.cfg.ControlFlowGraph;
import org.sonar.javascript.se.BlockExecution;
import org.sonar.javascript.se.LocalVariables;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.SymbolicValue;
import org.sonar.javascript.se.Truthiness;
import org.sonar.javascript.tree.TreeKinds;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.ForObjectStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.VariableDeclarationTree;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "S2583",
  name = "Conditions should not unconditionally evaluate to \"true\" or to \"false\"",
  priority = Priority.BLOCKER,
  tags = {Tags.BUG, Tags.CERT, Tags.CWE, Tags.MISRA})
@SqaleSubCharacteristic(SubCharacteristics.LOGIC_RELIABILITY)
@SqaleConstantRemediation("15min")
@ActivatedByDefault
public class AlwaysTrueOrFalseConditionCheck extends SubscriptionVisitorCheck {

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.of(
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
    FunctionTree functionTree = (FunctionTree) tree;
    if (functionTree.body().is(Kind.BLOCK)) {
      checkCFG(ControlFlowGraph.build((BlockTree) functionTree.body()), functionTree);
    }
  }

  private void checkCFG(ControlFlowGraph cfg, FunctionTree functionTree) {
    Scope functionScope = getContext().getSymbolModel().getScope(functionTree);
    new SymbolicExecution(functionScope, cfg).visitCfg();
  }

  private class SymbolicExecution {

    private static final int MAX_BLOCK_EXECUTIONS = 1000;

    private final CfgBlock cfgStartBlock;
    private final Set<Symbol> trackedVariables;
    private final Set<Symbol> functionParameters;
    private final Scope functionScope;
    private final Deque<BlockExecution> workList = new ArrayDeque<>();
    private final SetMultimap<Tree, Truthiness> conditionResults = HashMultimap.create();
    private final Set<BlockExecution> alreadyProcessed = new HashSet<>();

    public SymbolicExecution(Scope functionScope, ControlFlowGraph cfg) {
      cfgStartBlock = cfg.start();
      LocalVariables localVariables = new LocalVariables(functionScope, cfg);
      this.trackedVariables = localVariables.trackableVariables();
      this.functionParameters = localVariables.functionParameters();
      this.functionScope = functionScope;
    }

    public void visitCfg() {
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
        reportIssues();
      }
    }

    private boolean hasTryBranchingTree(CfgBlock block) {
      if (block instanceof CfgBranchingBlock) {
        return ((CfgBranchingBlock) block).branchingTree().is(Kind.TRY_STATEMENT);
      }
      return false;
    }

    private ProgramState initialState() {
      ProgramState initialState = ProgramState.emptyState();

      for (Symbol localVar : trackedVariables) {
        SymbolicValue initialValue = functionParameters.contains(localVar) ? SymbolicValue.UNKNOWN : SymbolicValue.NULL_OR_UNDEFINED;
        initialState = initialState.copyAndAddValue(localVar, initialValue);
      }

      Symbol arguments = functionScope.getSymbol("arguments");
      initialState = initialState.copyAndAddValue(arguments, SymbolicValue.UNKNOWN);
      initialState = initialState.constrain(arguments, Truthiness.TRUTHY);

      return initialState;
    }

    private void reportIssues() {
      for (Entry<Tree, Collection<Truthiness>> entry : conditionResults.asMap().entrySet()) {
        Collection<Truthiness> results = entry.getValue();
        if (results.size() == 1 && !Truthiness.UNKNOWN.equals(results.iterator().next())) {
          String result = Truthiness.TRUTHY.equals(results.iterator().next()) ? "true" : "false";
          addIssue(entry.getKey(), String.format("Change this condition so that it does not always evaluate to \"%s\".", result));
        }
      }

    }

    private void execute(BlockExecution blockExecution) {
      CfgBlock block = blockExecution.block();
      ProgramState currentState = blockExecution.state();

      for (Tree element : block.elements()) {
        if (element.is(Kind.ASSIGNMENT)) {
          AssignmentExpressionTree assignment = (AssignmentExpressionTree) element;
          currentState = store(currentState, assignment.variable(), assignment.expression());

        } else if (TreeKinds.isAssignment(element)) {

          AssignmentExpressionTree assignment = (AssignmentExpressionTree) element;
          currentState = store(currentState, assignment.variable(), SymbolicValue.UNKNOWN);

        } else if (element.is(
          Kind.POSTFIX_DECREMENT,
          Kind.POSTFIX_INCREMENT,
          Kind.PREFIX_DECREMENT,
          Kind.PREFIX_INCREMENT)) {

          UnaryExpressionTree unary = (UnaryExpressionTree) element;
          currentState = store(currentState, unary.expression(), SymbolicValue.UNKNOWN);

        } else if (element.is(Kind.INITIALIZED_BINDING_ELEMENT)) {
          InitializedBindingElementTree initialized = (InitializedBindingElementTree) element;
          currentState = store(currentState, initialized.left(), initialized.right());
        }
      }

      handleSuccessors(block, currentState);
    }

    private void pushAllSuccessors(CfgBlock block, ProgramState currentState) {
      for (CfgBlock successor : block.successors()) {
        pushSuccessor(successor, currentState);
      }
    }

    private void pushSuccessor(CfgBlock successor, ProgramState currentState) {
      workList.addLast(new BlockExecution(successor, currentState));
    }

    private void handleSuccessors(CfgBlock block, ProgramState incomingState) {
      ProgramState currentState = incomingState;

      if (block instanceof CfgBranchingBlock) {
        CfgBranchingBlock branchingBlock = (CfgBranchingBlock) block;
        Tree branchingTree = branchingBlock.branchingTree();

        if (branchingTree.is(
          Kind.IF_STATEMENT,
          Kind.WHILE_STATEMENT,
          Kind.FOR_STATEMENT,
          Kind.DO_WHILE_STATEMENT,
          Kind.CONDITIONAL_AND,
          Kind.CONDITIONAL_OR)) {

          handleConditionSuccessors(branchingBlock, currentState);
          return;

        } else if (branchingTree.is(Kind.FOR_IN_STATEMENT, Kind.FOR_OF_STATEMENT)) {
          ForObjectStatementTree forTree = (ForObjectStatementTree) branchingTree;
          Tree variable = forTree.variableOrExpression();
          if (variable.is(Kind.VAR_DECLARATION)) {
            VariableDeclarationTree declaration = (VariableDeclarationTree) variable;
            variable = declaration.variables().get(0);
          }
          currentState = store(currentState, variable, SymbolicValue.UNKNOWN);
        }
      }

      pushAllSuccessors(block, currentState);
    }

    private void handleConditionSuccessors(CfgBranchingBlock block, ProgramState currentState) {
      Tree lastElement = block.elements().get(block.elements().size() - 1);

      if (lastElement.is(Kind.BOOLEAN_LITERAL)) {
        SymbolicValue conditionValue = SymbolicValue.get((LiteralTree) lastElement);
        Truthiness conditionTruthiness = conditionValue.truthiness();
        if (!block.branchingTree().is(Kind.FOR_STATEMENT, Kind.WHILE_STATEMENT, Kind.DO_WHILE_STATEMENT)) {
          conditionResults.put(lastElement, conditionTruthiness);
        }
        CfgBlock successor = conditionTruthiness == Truthiness.TRUTHY ? block.trueSuccessor() : block.falseSuccessor();
        pushSuccessor(successor, currentState);
        return;
      }

      Symbol conditionVariable;
      // Truthiness of the conditionVariable in the true successor of the condition block
      Truthiness trueSuccessorTruthiness;
      // Truthiness of the conditionVariable in the false successor of the condition block
      Truthiness falseSuccessorTruthiness;

      boolean isUnaryNot = lastElement.is(Kind.LOGICAL_COMPLEMENT);
      if (isUnaryNot) {
        UnaryExpressionTree unary = (UnaryExpressionTree) lastElement;
        conditionVariable = trackedVariable(unary.expression());
        trueSuccessorTruthiness = Truthiness.FALSY;
        falseSuccessorTruthiness = Truthiness.TRUTHY;
      } else {
        conditionVariable = trackedVariable(lastElement);
        trueSuccessorTruthiness = Truthiness.TRUTHY;
        falseSuccessorTruthiness = Truthiness.FALSY;
      }

      if (conditionVariable != null) {
        SymbolicValue currentValue = currentState.get(conditionVariable);
        Truthiness currentTruthiness = currentValue.truthiness();
        Truthiness conditionTruthiness = isUnaryNot ? currentTruthiness.not() : currentTruthiness;
        conditionResults.put(lastElement, conditionTruthiness);
        if (currentTruthiness != falseSuccessorTruthiness) {
          pushSuccessor(block.trueSuccessor(), currentState.constrain(conditionVariable, trueSuccessorTruthiness));
        }
        if (currentTruthiness != trueSuccessorTruthiness) {
          pushSuccessor(block.falseSuccessor(), currentState.constrain(conditionVariable, falseSuccessorTruthiness));
        }
      } else {
        pushAllSuccessors(block, currentState);
      }
    }

    private ProgramState store(ProgramState currentState, Tree left, ExpressionTree right) {
      SymbolicValue symbolicValue = SymbolicValue.get(right);
      return store(currentState, left, symbolicValue);
    }

    private ProgramState store(ProgramState currentState, Tree left, SymbolicValue symbolicValue) {
      Symbol trackedVariable = trackedVariable(left);
      if (trackedVariable != null) {
        return currentState.copyAndAddValue(trackedVariable, symbolicValue);
      }
      return currentState;
    }

    @CheckForNull
    private Symbol trackedVariable(Tree tree) {
      if (tree.is(Kind.IDENTIFIER_REFERENCE, Kind.BINDING_IDENTIFIER)) {
        IdentifierTree identifier = (IdentifierTree) tree;
        Symbol symbol = identifier.symbol();
        return trackedVariables.contains(symbol) ? symbol : null;
      }
      return null;
    }

  }

}
