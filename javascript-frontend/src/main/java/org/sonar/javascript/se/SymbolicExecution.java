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

  private boolean hasTryBranchingTree(CfgBlock block) {
    if (block instanceof CfgBranchingBlock) {
      return ((CfgBranchingBlock) block).branchingTree().is(Kind.TRY_STATEMENT);
    }
    return false;
  }

  private ProgramState initialState() {
    ProgramState initialState = ProgramState.emptyState();

    for (Symbol localVar : trackedVariables) {
      SymbolicValue initialValue;
      if (symbolIs(localVar, FUNCTION, IMPORT, CLASS)) {
        initialValue = SymbolicValue.UNKNOWN;
      } else {
        initialValue = functionParameters.contains(localVar) ? SymbolicValue.UNKNOWN : SymbolicValue.UNDEFINED;
      }
      initialState = initialState.copyAndAddValue(localVar, initialValue);
    }

    Symbol arguments = functionScope.getSymbol("arguments");
    initialState = initialState.copyAndAddValue(arguments, SymbolicValue.UNKNOWN);
    initialState = initialState.constrain(arguments, Truthiness.TRUTHY);

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

      } else if (element.is(Kind.BRACKET_MEMBER_EXPRESSION, Kind.DOT_MEMBER_EXPRESSION)) {
        ExpressionTree object = ((MemberExpressionTree) element).object();
        if (object.is(Kind.IDENTIFIER_REFERENCE)) {
          Symbol symbol = ((IdentifierTree) object).symbol();
          if (symbol != null) {
            SymbolicValue symbolicValue = currentState.get(symbol);

            if (symbolicValue != null && symbolicValue.nullability().equals(Nullability.UNKNOWN)) {
              currentState = currentState.constrain(symbol, Nullability.NOT_NULLY);

            } else if (symbolicValue != null && symbolicValue.nullability().isNullOrUndefined()) {
              stopExploring = true;
              break;
            }
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

  private void pushSuccessor(CfgBlock successor, ProgramState currentState) {
    workList.addLast(new BlockExecution(successor, currentState));
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
        currentState = store(currentState, variable, SymbolicValue.UNKNOWN);

        Symbol symbol = trackedVariable(forTree.expression());
        if (symbol != null && currentState.get(symbol) != null && currentState.get(symbol).nullability().isNullOrUndefined()) {
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

      Nullability trueSuccessorNullability = null;
      Nullability falseSuccessorNullability = null;

      Symbol conditionVariable = trackedVariable(typeOfOperand);

      if (conditionVariable != null) {
        Truthiness conditionTruthiness = getTypeOfConditionTruthiness(lastElement, value, currentState, conditionVariable);
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
          pushSuccessor(block.trueSuccessor(), currentState.constrain(conditionVariable, trueSuccessorNullability));
        }
        if (conditionTruthiness != Truthiness.TRUTHY) {
          pushSuccessor(block.falseSuccessor(), currentState.constrain(conditionVariable, falseSuccessorNullability));
        }
        return true;
      }

    }

    return false;
  }

  private Truthiness getTypeOfConditionTruthiness(Tree expression, String typeValue, ProgramState currentState, Symbol conditionVariable) {
    Truthiness conditionTruthiness = Truthiness.UNKNOWN;

    Truthiness truthiness = expression.is(Kind.EQUAL_TO, Kind.STRICT_EQUAL_TO)
      ? Truthiness.TRUTHY
      : Truthiness.FALSY;

    if (!TypeOf.isValidType(typeValue)) {
      conditionTruthiness = truthiness.not();

    } else if (currentState.get(conditionVariable) != null){
      String typeOf = TypeOf.typeOf(currentState.get(conditionVariable));

      if (typeOf != null) {
        conditionTruthiness = typeValue.equals(typeOf) ? truthiness : truthiness.not();
      }
    }

    return conditionTruthiness;
  }

  private boolean handleConditionEqualNull(CfgBranchingBlock block, ProgramState currentState, Tree lastElement) {
    if (isNullyComparison(lastElement)) {

      Nullability trueSuccessorNullability;
      Nullability falseSuccessorNullability;


      if (lastElement.is(Kind.EQUAL_TO)) {
        // x == null
        trueSuccessorNullability = Nullability.NULLY;
        falseSuccessorNullability = Nullability.NOT_NULLY;

      } else {
        // x != null
        trueSuccessorNullability = Nullability.NOT_NULLY;
        falseSuccessorNullability = Nullability.NULLY;
      }

      Symbol conditionVariable = trackedOperand((BinaryExpressionTree) lastElement);

      if (conditionVariable != null) {
        Nullability currentNullability = currentState.get(conditionVariable).nullability();
        Truthiness truthinessIfVariableNull = lastElement.is(Kind.EQUAL_TO) ? Truthiness.TRUTHY : Truthiness.FALSY;
        Truthiness conditionTruthiness = Truthiness.UNKNOWN;

        if (currentNullability.isNullOrUndefined()) {
          conditionTruthiness = truthinessIfVariableNull;
        } else if (currentNullability.isNeitherNullNorUndefined()) {
          conditionTruthiness = truthinessIfVariableNull.not();
        }

        conditionResults.put(lastElement, conditionTruthiness);

        if (conditionTruthiness != Truthiness.FALSY) {
          pushSuccessor(block.trueSuccessor(), currentState.constrain(conditionVariable, trueSuccessorNullability));
        }
        if (conditionTruthiness != Truthiness.TRUTHY) {
          pushSuccessor(block.falseSuccessor(), currentState.constrain(conditionVariable, falseSuccessorNullability));
        }
        return true;
      }

    }

    return false;
  }

  // x === null
  // x === undefined
  private boolean handleConditionStrictEqual(CfgBranchingBlock block, ProgramState currentState, Tree lastElement) {
    return handleConditionStrictEqual(block, currentState, lastElement, SymbolicValue.NULL, SymbolicValue.NOT_NULL)
      || handleConditionStrictEqual(block, currentState, lastElement, SymbolicValue.UNDEFINED, SymbolicValue.NOT_UNDEFINED);
  }

  private boolean handleConditionStrictEqual(CfgBranchingBlock block, ProgramState currentState, Tree lastElement, SymbolicValue value, SymbolicValue valueNot) {
    if (isStrictComparison(lastElement, value)) {

      Nullability trueSuccessorNullability;
      Nullability falseSuccessorNullability;

      if (lastElement.is(Kind.STRICT_EQUAL_TO)) {
        // x === null
        trueSuccessorNullability = value.nullability();
        falseSuccessorNullability = valueNot.nullability();

      } else {
        // x !== null
        trueSuccessorNullability = valueNot.nullability();
        falseSuccessorNullability = value.nullability();
      }

      Symbol conditionVariable = trackedOperand((BinaryExpressionTree) lastElement);

      if (conditionVariable != null) {
        Nullability currentNullability = currentState.get(conditionVariable).nullability();
        Truthiness truthinessIfVariableNull = lastElement.is(Kind.STRICT_EQUAL_TO) ? Truthiness.TRUTHY : Truthiness.FALSY;
        Truthiness conditionTruthiness = Truthiness.UNKNOWN;

        if (currentNullability.equals(value.nullability())) {
          conditionTruthiness = truthinessIfVariableNull;
        } else if (currentNullability.canNotBeEqual(value.nullability())) {
          conditionTruthiness = truthinessIfVariableNull.not();
        }

        conditionResults.put(lastElement, conditionTruthiness);

        if (conditionTruthiness != Truthiness.FALSY) {
          pushSuccessor(block.trueSuccessor(), currentState.constrain(conditionVariable, trueSuccessorNullability));
        }
        if (conditionTruthiness != Truthiness.TRUTHY) {
          pushSuccessor(block.falseSuccessor(), currentState.constrain(conditionVariable, falseSuccessorNullability));
        }
        return true;
      }

    }

    return false;
  }

  private boolean handleConditionVariableOrUnaryNot(CfgBranchingBlock block, ProgramState currentState, Tree lastElement) {
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
      return true;

    }

    return false;
  }

  private boolean handleConditionBooleanLiteral(CfgBranchingBlock block, ProgramState currentState, Tree lastElement) {
    if (lastElement.is(Kind.BOOLEAN_LITERAL)) {
      SymbolicValue conditionValue = SymbolicValue.get((LiteralTree) lastElement);
      Truthiness conditionTruthiness = conditionValue.truthiness();
      if (!block.branchingTree().is(Kind.FOR_STATEMENT, Kind.WHILE_STATEMENT, Kind.DO_WHILE_STATEMENT)) {
        conditionResults.put(lastElement, conditionTruthiness);
      }
      CfgBlock successor = conditionTruthiness == Truthiness.TRUTHY ? block.trueSuccessor() : block.falseSuccessor();
      pushSuccessor(successor, currentState);
      return true;
    }
    return false;
  }

  private boolean isNullyComparison(Tree lastElement) {
    if (lastElement.is(Kind.NOT_EQUAL_TO, Kind.EQUAL_TO)) {
      BinaryExpressionTree comparison = (BinaryExpressionTree) lastElement;
      return SymbolicValue.get(comparison.leftOperand()).nullability().isNullOrUndefined()
        || SymbolicValue.get(comparison.rightOperand()).nullability().isNullOrUndefined();
    }
    return false;
  }

  private boolean isStrictComparison(Tree lastElement, SymbolicValue value) {
    if (lastElement.is(Kind.STRICT_NOT_EQUAL_TO, Kind.STRICT_EQUAL_TO)) {
      BinaryExpressionTree comparison = (BinaryExpressionTree) lastElement;
      return SymbolicValue.get(comparison.leftOperand()).equals(value)
        || SymbolicValue.get(comparison.rightOperand()).equals(value);
    }
    return false;
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
