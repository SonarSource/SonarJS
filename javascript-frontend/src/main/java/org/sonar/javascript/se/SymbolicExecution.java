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
import org.sonar.javascript.tree.TreeKinds;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.MemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ParenthesisedExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.ForObjectStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.VariableDeclarationTree;

import static org.sonar.javascript.se.TypeOf.typeOfEqualNullability;
import static org.sonar.javascript.se.TypeOf.typeOfNotEqualNullability;
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

  public SymbolicExecution(Scope functionScope, ControlFlowGraph cfg, List<SeCheck> checks) {
    cfgStartBlock = cfg.start();
    LocalVariables localVariables = new LocalVariables(functionScope, cfg);
    this.trackedVariables = localVariables.trackableVariables();
    this.functionParameters = localVariables.functionParameters();
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
    initialState = initialState.newSymbolicValue(arguments, Constraint.TRUTHY);
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
      if (element.is(Kind.ASSIGNMENT)) {
        AssignmentExpressionTree assignment = (AssignmentExpressionTree) element;
        currentState = store(currentState, assignment.variable(), assignment.expression());

      } else if (TreeKinds.isAssignment(element)) {

        AssignmentExpressionTree assignment = (AssignmentExpressionTree) element;
        currentState = storeConstraint(currentState, assignment.variable(), null);

      } else if (element.is(
        Kind.POSTFIX_DECREMENT,
        Kind.POSTFIX_INCREMENT,
        Kind.PREFIX_DECREMENT,
        Kind.PREFIX_INCREMENT)) {

        UnaryExpressionTree unary = (UnaryExpressionTree) element;
        currentState = storeConstraint(currentState, unary.expression(), null);

      } else if (element.is(Kind.INITIALIZED_BINDING_ELEMENT)) {
        InitializedBindingElementTree initialized = (InitializedBindingElementTree) element;
        currentState = store(currentState, initialized.left(), initialized.right());

      } else if (element.is(Kind.BRACKET_MEMBER_EXPRESSION, Kind.DOT_MEMBER_EXPRESSION)) {
        ExpressionTree object = ((MemberExpressionTree) element).object();
        if (object.is(Kind.IDENTIFIER_REFERENCE)) {
          SymbolicValue symbolicValue = currentState.getSymbolicValue(((IdentifierTree) object).symbol());
          Nullability nullability = currentState.getNullability(symbolicValue);
          if (nullability == Nullability.UNKNOWN) {
            currentState = currentState.constrain(symbolicValue, Constraint.NULL_OR_UNDEFINED.not());
          } else if (nullability == Nullability.NULL) {
            stopExploring = true;
            break;
          }
        }
      }

      afterBlockElement(currentState, element);
    }

    if (!stopExploring) {
      handleSuccessors(block, currentState);
    }
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
      workList.addLast(new BlockExecution(successor, currentState));
    }
  }

  private void handleSuccessors(CfgBlock block, ProgramState incomingState) {
    ProgramState currentState = incomingState;

    if (block instanceof CfgBranchingBlock) {
      CfgBranchingBlock branchingBlock = (CfgBranchingBlock) block;
      Tree branchingTree = branchingBlock.branchingTree();

      if (branchingTree.is(
        Kind.CONDITIONAL_EXPRESSION,
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
        currentState = storeConstraint(currentState, variable, null);

        Symbol symbol = trackedVariable(forTree.expression());
        if (currentState.getNullability(currentState.getSymbolicValue(symbol)) == Nullability.NULL) {
          pushSuccessor(branchingBlock.falseSuccessor(), currentState);
          return;
        }
      }
    }

    pushAllSuccessors(block, currentState);
  }

  private void handleConditionSuccessors(CfgBranchingBlock block, ProgramState currentState) {
    Tree lastElement = block.elements().get(block.elements().size() - 1);
    if (!handleConditionBooleanLiteral(block, currentState, lastElement)
       && !handleConditionTypeOf(block, currentState, lastElement)
       && !handleConditionVariableOrUnaryNot(block, currentState, lastElement)
       && !handleConditionStrictEqual(block, currentState, lastElement)
       && !handleConditionEqualNull(block, currentState, lastElement)) {
      pushAllSuccessors(block, currentState);
    }
  }

  private boolean handleConditionTypeOf(CfgBranchingBlock block, ProgramState currentState, Tree lastElement) {
    ExpressionTree typeOfOperand = null;
    LiteralTree literal = null;

    if (lastElement.is(Kind.STRICT_EQUAL_TO, Kind.STRICT_NOT_EQUAL_TO, Kind.EQUAL_TO, Kind.NOT_EQUAL_TO)) {
      BinaryExpressionTree expression = (BinaryExpressionTree) lastElement;
      ExpressionTree left = expression.leftOperand();
      ExpressionTree right = expression.rightOperand();
      if (left.is(Kind.TYPEOF) && right.is(Kind.STRING_LITERAL)) {
        typeOfOperand = ((UnaryExpressionTree) left).expression();
        literal = (LiteralTree) right;

      } else if (right.is(Kind.TYPEOF) && left.is(Kind.STRING_LITERAL)) {
        typeOfOperand = ((UnaryExpressionTree) right).expression();
        literal = (LiteralTree) left;
      }
    }

    if (typeOfOperand != null) {
      String value = literal.value().substring(1, literal.value().length() - 1);

      Constraint trueSuccessorNullability = null;
      Constraint falseSuccessorNullability = null;

      SymbolicValue conditionVariableSymbolicValue = currentState.getSymbolicValue(trackedVariable(typeOfOperand));

      if (conditionVariableSymbolicValue != null) {
        Truthiness conditionTruthiness = getTypeOfConditionTruthiness(lastElement, value, currentState, conditionVariableSymbolicValue);
        conditionResults.put(lastElement, conditionTruthiness);

        if (conditionTruthiness.equals(Truthiness.UNKNOWN)) {
          if (lastElement.is(Kind.EQUAL_TO, Kind.STRICT_EQUAL_TO)) {
            trueSuccessorNullability = typeOfEqualNullability.get(value);
            falseSuccessorNullability = typeOfNotEqualNullability.get(value);

          } else {
            trueSuccessorNullability = typeOfNotEqualNullability.get(value);
            falseSuccessorNullability = typeOfEqualNullability.get(value);
          }
        }

        if (conditionTruthiness != Truthiness.FALSY) {
          pushSuccessor(block.trueSuccessor(), currentState.constrain(conditionVariableSymbolicValue, trueSuccessorNullability));
        }
        if (conditionTruthiness != Truthiness.TRUTHY) {
          pushSuccessor(block.falseSuccessor(), currentState.constrain(conditionVariableSymbolicValue, falseSuccessorNullability));
        }
        return true;
      }

    }

    return false;
  }

  private static Truthiness getTypeOfConditionTruthiness(Tree expression, String typeValue, ProgramState currentState, SymbolicValue symbolicValue) {
    Truthiness conditionTruthiness = Truthiness.UNKNOWN;

    Truthiness truthiness = expression.is(Kind.EQUAL_TO, Kind.STRICT_EQUAL_TO)
      ? Truthiness.TRUTHY
      : Truthiness.FALSY;

    if (!TypeOf.isValidType(typeValue)) {
      conditionTruthiness = truthiness.not();

    } else if (currentState.getConstraint(symbolicValue) != null){
      String typeOf = TypeOf.typeOf(currentState.getConstraint(symbolicValue));

      if (typeOf != null) {
        conditionTruthiness = typeValue.equals(typeOf) ? truthiness : truthiness.not();
      }
    }

    return conditionTruthiness;
  }

  private boolean handleConditionEqualNull(CfgBranchingBlock block, ProgramState currentState, Tree lastElement) {
    if (isNullyComparison(lastElement)) {

      Constraint trueSuccessorNullability;
      Constraint falseSuccessorNullability;


      if (lastElement.is(Kind.EQUAL_TO)) {
        // x == null
        trueSuccessorNullability = Constraint.NULL_OR_UNDEFINED;
        falseSuccessorNullability = Constraint.NULL_OR_UNDEFINED.not();

      } else {
        // x != null
        trueSuccessorNullability = Constraint.NULL_OR_UNDEFINED.not();
        falseSuccessorNullability = Constraint.NULL_OR_UNDEFINED;
      }

      SymbolicValue conditionVariableSymbolicValue = currentState.getSymbolicValue(trackedOperand((BinaryExpressionTree) lastElement));

      if (conditionVariableSymbolicValue != null) {
        Nullability currentNullability = currentState.getNullability(conditionVariableSymbolicValue);
        Truthiness truthinessIfVariableNull = lastElement.is(Kind.EQUAL_TO) ? Truthiness.TRUTHY : Truthiness.FALSY;
        Truthiness conditionTruthiness = Truthiness.UNKNOWN;

        if (currentNullability == Nullability.NULL) {
          conditionTruthiness = truthinessIfVariableNull;
        } else if (currentNullability == Nullability.NOT_NULL) {
          conditionTruthiness = truthinessIfVariableNull.not();
        }

        conditionResults.put(lastElement, conditionTruthiness);

        if (conditionTruthiness != Truthiness.FALSY) {
          pushSuccessor(block.trueSuccessor(), currentState.constrain(conditionVariableSymbolicValue, trueSuccessorNullability));
        }
        if (conditionTruthiness != Truthiness.TRUTHY) {
          pushSuccessor(block.falseSuccessor(), currentState.constrain(conditionVariableSymbolicValue, falseSuccessorNullability));
        }
        return true;
      }

    }

    return false;
  }

  // x === null
  // x === undefined
  private boolean handleConditionStrictEqual(CfgBranchingBlock block, ProgramState currentState, Tree lastElement) {
    return handleConditionStrictEqual(block, currentState, lastElement, Constraint.NULL)
      || handleConditionStrictEqual(block, currentState, lastElement, Constraint.UNDEFINED);
  }

  private boolean handleConditionStrictEqual(CfgBranchingBlock block, ProgramState currentState, Tree lastElement, Constraint constraint) {
    if (isStrictComparison(lastElement, constraint)) {

      Constraint trueSuccessorNullability;
      Constraint falseSuccessorNullability;

      if (lastElement.is(Kind.STRICT_EQUAL_TO)) {
        // x === null
        trueSuccessorNullability = constraint;
        falseSuccessorNullability = constraint.not();

      } else {
        // x !== null
        trueSuccessorNullability = constraint.not();
        falseSuccessorNullability = constraint;
      }

      SymbolicValue conditionVariableSymbolicValue = currentState.getSymbolicValue(trackedOperand((BinaryExpressionTree) lastElement));

      if (conditionVariableSymbolicValue != null) {
        Constraint currentConstraint = currentState.getConstraint(conditionVariableSymbolicValue);
        Truthiness truthinessIfVariableNull = lastElement.is(Kind.STRICT_EQUAL_TO) ? Truthiness.TRUTHY : Truthiness.FALSY;
        Truthiness conditionTruthiness = Truthiness.UNKNOWN;

        if (currentConstraint.and(constraint).equals(currentConstraint)) {
          conditionTruthiness = truthinessIfVariableNull;
        } else if (currentConstraint.and(constraint).equals(Constraint.NO_POSSIBLE_VALUE)) {
          conditionTruthiness = truthinessIfVariableNull.not();
        }

        conditionResults.put(lastElement, conditionTruthiness);

        if (conditionTruthiness != Truthiness.FALSY) {
          pushSuccessor(block.trueSuccessor(), currentState.constrain(conditionVariableSymbolicValue, trueSuccessorNullability));
        }
        if (conditionTruthiness != Truthiness.TRUTHY) {
          pushSuccessor(block.falseSuccessor(), currentState.constrain(conditionVariableSymbolicValue, falseSuccessorNullability));
        }
        return true;
      }

    }

    return false;
  }

  private boolean handleConditionVariableOrUnaryNot(CfgBranchingBlock block, ProgramState currentState, Tree lastElement) {
    SymbolicValue symbolicValue = null;

    if (lastElement.is(Kind.LOGICAL_COMPLEMENT)) {
      UnaryExpressionTree unary = (UnaryExpressionTree) lastElement;
      Symbol conditionVariable = trackedVariable(unary.expression());
      SymbolicValue negatedValue = currentState.getSymbolicValue(conditionVariable);
      if (negatedValue != null) {
        symbolicValue = new LogicalNotSymbolicValue(negatedValue);
      }
    } else {
      Symbol conditionVariable = trackedVariable(lastElement);
      symbolicValue = currentState.getSymbolicValue(conditionVariable);
    }

    if (symbolicValue != null) {
      pushConditionSuccessors(block, currentState, symbolicValue);
      return true;
    }

    return false;
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

  private boolean handleConditionBooleanLiteral(CfgBranchingBlock block, ProgramState currentState, Tree lastElement) {
    if (lastElement.is(Kind.BOOLEAN_LITERAL)) {
      Truthiness conditionTruthiness = Constraint.get((LiteralTree) lastElement).truthiness();
      if (!block.branchingTree().is(Kind.FOR_STATEMENT, Kind.WHILE_STATEMENT, Kind.DO_WHILE_STATEMENT)) {
        conditionResults.put(lastElement, conditionTruthiness);
      }
      CfgBlock successor = conditionTruthiness == Truthiness.TRUTHY ? block.trueSuccessor() : block.falseSuccessor();
      pushSuccessor(successor, currentState);
      return true;
    }
    return false;
  }

  private static boolean isNullyComparison(Tree lastElement) {
    if (lastElement.is(Kind.NOT_EQUAL_TO, Kind.EQUAL_TO)) {
      BinaryExpressionTree comparison = (BinaryExpressionTree) lastElement;
      return (Constraint.get(comparison.leftOperand()) != null && Constraint.get(comparison.leftOperand()).nullability() == Nullability.NULL)
        || (Constraint.get(comparison.rightOperand()) != null && Constraint.get(comparison.rightOperand()).nullability() == Nullability.NULL);
    }
    return false;
  }

  private static boolean isStrictComparison(Tree lastElement, Constraint constraint) {
    if (lastElement.is(Kind.STRICT_NOT_EQUAL_TO, Kind.STRICT_EQUAL_TO)) {
      BinaryExpressionTree comparison = (BinaryExpressionTree) lastElement;
      return constraint.equals(Constraint.get(comparison.leftOperand()))
        || constraint.equals(Constraint.get(comparison.rightOperand()));
    }
    return false;
  }

  private ProgramState store(ProgramState currentState, Tree left, ExpressionTree right) {
    Constraint constraint = Constraint.get(right);
    return storeConstraint(currentState, left, constraint);
  }

  private ProgramState storeConstraint(ProgramState currentState, Tree left, @Nullable Constraint constraint) {
    Symbol trackedVariable = trackedVariable(left);
    if (trackedVariable != null) {
      return currentState.newSymbolicValue(trackedVariable, constraint);
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
  private Symbol trackedOperand(BinaryExpressionTree tree) {
    Symbol left = trackedVariable(tree.leftOperand());
    if (left != null) {
      return left;
    } else {
      return trackedVariable(tree.rightOperand());
    }
  }

}
