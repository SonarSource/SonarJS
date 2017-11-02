/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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

import com.google.common.collect.HashMultimap;
import com.google.common.collect.SetMultimap;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import javax.annotation.CheckForNull;
import javax.annotation.Nullable;
import org.sonar.javascript.cfg.CfgBlock;
import org.sonar.javascript.cfg.CfgBranchingBlock;
import org.sonar.javascript.cfg.ControlFlowGraph;
import org.sonar.javascript.se.limitations.CrossProceduralLimitation;
import org.sonar.javascript.se.points.ProgramPoint;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValueWithConstraint;
import org.sonar.javascript.se.sv.UnknownSymbolicValue;
import org.sonar.javascript.tree.KindSet;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.ArrayBindingPatternTree;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.BindingPropertyTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.ObjectBindingPatternTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrayAssignmentPatternTree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentPatternRestElementTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.InitializedAssignmentPatternElementTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectAssignmentPatternPairElementTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectAssignmentPatternTree;
import org.sonar.plugins.javascript.api.tree.expression.ParenthesisedExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.RestElementTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForObjectStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ReturnStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.VariableDeclarationTree;

import static org.sonar.javascript.se.Constraint.ANY_VALUE;
import static org.sonar.javascript.se.Constraint.NULL_OR_UNDEFINED;
import static org.sonar.javascript.se.Constraint.UNDEFINED;
import static org.sonar.plugins.javascript.api.symbols.Symbol.Kind.CLASS;
import static org.sonar.plugins.javascript.api.symbols.Symbol.Kind.FUNCTION;
import static org.sonar.plugins.javascript.api.symbols.Symbol.Kind.IMPORT;

public class SymbolicExecution {

  private static final int MAX_BLOCK_EXECUTIONS = 10000;

  private final CfgBlock cfgStartBlock;
  private final ControlFlowGraph cfg;
  private final Set<Symbol> trackedVariables;
  private final Set<Symbol> functionParameters;
  private final Scope functionScope;
  private final Deque<BlockExecution> workList = new ArrayDeque<>();
  private final SetMultimap<Tree, Constraint> conditionResults = HashMultimap.create();
  private final Set<BlockExecution> alreadyProcessed = new HashSet<>();
  private final List<SeCheck> checks;
  private final LiveVariableAnalysis liveVariableAnalysis;

  private Constraint returnConstraint = null;
  private boolean executionInterrupted = false;

  public SymbolicExecution(Scope functionScope, ControlFlowGraph cfg, List<SeCheck> checks) {
    this.cfgStartBlock = cfg.start();
    this.cfg = cfg;
    LocalVariables localVariables = new LocalVariables(functionScope, cfg);
    this.trackedVariables = localVariables.trackableVariables();
    this.functionParameters = localVariables.functionParameters();
    this.liveVariableAnalysis = LiveVariableAnalysis.create(cfg, functionScope);
    this.functionScope = functionScope;
    this.checks = checks;
  }

  public void visitCfg(ProgramState initialStateWithParameters) {
    for (SeCheck check : checks) {
      check.startOfExecution(functionScope);
    }

    workList.addLast(new BlockExecution(cfgStartBlock, initialState(initialStateWithParameters)));

    for (int i = 0; i < MAX_BLOCK_EXECUTIONS && !workList.isEmpty(); i++) {
      BlockExecution blockExecution = workList.removeFirst();

      if (!alreadyProcessed.contains(blockExecution)) {
        if (hasTryBranchingTree(blockExecution.block())) {
          executionInterrupted = true;
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

    } else {
      executionInterrupted = true;
    }
  }

  public Constraint getReturnConstraint() {
    if (executionInterrupted) {
      return Constraint.ANY_VALUE;

    } else if (returnConstraint == null) {
      return Constraint.UNDEFINED;

    } else {
      return returnConstraint;
    }
  }

  private void addReturnConstraint(Constraint constraint) {
    if (returnConstraint == null) {
      returnConstraint = constraint;
    } else {
      returnConstraint = returnConstraint.or(constraint);
    }
  }

  private static boolean hasTryBranchingTree(CfgBlock block) {
    if (block instanceof CfgBranchingBlock) {
      return ((CfgBranchingBlock) block).branchingTree().is(Kind.TRY_STATEMENT);
    }
    return false;
  }

  private ProgramState initialState(ProgramState initialStateWithParameters) {
    ProgramState initialState = initialStateWithParameters;

    for (Symbol localVar : trackedVariables) {
      Constraint initialConstraint = null;
      if (!symbolIs(localVar, FUNCTION, IMPORT, CLASS) && !functionParameters.contains(localVar)) {
        initialConstraint = Constraint.UNDEFINED;

      } else if (symbolIs(localVar, FUNCTION)) {
        initialConstraint = Constraint.FUNCTION;

      } else if (symbolIs(localVar, CLASS)) {
        initialConstraint = Constraint.OTHER_OBJECT;
      }

      if (initialState.getSymbolicValue(localVar) == null) {
        initialState = initialState.newSymbolicValue(localVar, initialConstraint);
      }
    }

    Symbol arguments = functionScope.getSymbol("arguments");
    if (arguments != null) {
      // there is no arguments for arrow function scope
      initialState = initialState.newSymbolicValue(arguments, Constraint.OBJECT);
    }

    initialState = initiateFunctionDeclarationSymbols(initialState);

    return initialState;
  }

  /**
   *   This method's logic is approximation: we assume that symbol used in function declaration has value of last function declaration.
   *   It's not true when function declaration is nested in control flow structure:
   *   <pre>
   *     if (condition) {
   *       function foo() { console.log(1); }
   *     } else {
   *       function foo() { console.log(2); }
   *     }
   *   </pre>
   *   In this example value of "foo" depends on value of "condition"
   */
  private ProgramState initiateFunctionDeclarationSymbols(ProgramState initialState) {
    ProgramState programStateWithFunctions = initialState;
    for (CfgBlock cfgBlock : cfg.blocks()) {
      for (Tree element : cfgBlock.elements()) {
        if (element.is(Kind.FUNCTION_DECLARATION, Kind.GENERATOR_DECLARATION)) {
          FunctionDeclarationTree functionDeclaration = (FunctionDeclarationTree) element;
          // Kind.BINDING_IDENTIFIER always has symbol
          Symbol symbol = functionDeclaration.name().symbol().get();
          programStateWithFunctions = programStateWithFunctions.newFunctionSymbolicValue(symbol, functionDeclaration);
        }
      }
    }

    return programStateWithFunctions;
  }

  private static boolean symbolIs(Symbol symbol, Symbol.Kind... kinds) {
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
      final ProgramPoint programPoint = ProgramPoint.create(element, this);
      beforeBlockElement(currentState, element, programPoint);

      if (element.is(Kind.RETURN_STATEMENT)) {
        ReturnStatementTree returnStatement = (ReturnStatementTree) element;
        if (returnStatement.expression() != null) {
          addReturnConstraint(currentState.getConstraint(currentState.peekStack()));

        } else {
          addReturnConstraint(UNDEFINED);
        }
      }

      final Optional<ProgramState> executionResult = programPoint.execute(currentState);
      if (executionResult.isPresent()) {
        currentState = executionResult.get();
      } else {
        stopExploring = true;
        break;
      }

      if (element instanceof ExpressionTree && !element.is(Kind.CLASS_DECLARATION)) {
        currentState = currentState.execute((ExpressionTree) element);
      }

      currentState = executeAssignment(currentState, element);

      afterBlockElement(currentState, element);

      if (isProducingUnconsumedValue(element)) {
        currentState = currentState.clearStack(element);
      }
    }

    checkForImplicitReturn(block);

    if (!stopExploring) {
      handleSuccessors(block, currentState);
    }
  }

  private ProgramState executeAssignment(ProgramState state, Tree element) {
    ProgramState currentState = state;

    if (element.is(KindSet.ASSIGNMENT_KINDS)) {
      AssignmentExpressionTree assignment = (AssignmentExpressionTree) element;
      currentState = assignment(currentState, assignment.variable());

    } else if (element.is(Kind.INITIALIZED_BINDING_ELEMENT)) {
      currentState = executeInitializedBinding((InitializedBindingElementTree) element, currentState);

    } else if (element.is(Kind.ARRAY_ASSIGNMENT_PATTERN)) {
      ArrayAssignmentPatternTree arrayAssignmentPatternTree = (ArrayAssignmentPatternTree) element;
      List<Tree> assignedElements = presentsOf(arrayAssignmentPatternTree.elements());
      currentState = createSymbolicValuesForTrackedVariables(assignedElements, currentState);

    } else if (element.is(Kind.OBJECT_ASSIGNMENT_PATTERN)) {
      ObjectAssignmentPatternTree objectAssignmentPatternTree = (ObjectAssignmentPatternTree) element;
      List<Tree> assignedElements = objectAssignmentPatternTree.elements();
      currentState = createSymbolicValuesForTrackedVariables(assignedElements, currentState);

    } else if (element.is(Kind.ARRAY_BINDING_PATTERN)) {
      ArrayBindingPatternTree arrayBindingPatternTree = (ArrayBindingPatternTree) element;
      List<BindingElementTree> assignedElements = presentsOf(arrayBindingPatternTree.elements());
      currentState = createSymbolicValuesForTrackedVariables(assignedElements, currentState);

    } else if (element.is(Kind.OBJECT_BINDING_PATTERN)) {
      ObjectBindingPatternTree objectBindingPatternTree = (ObjectBindingPatternTree) element;
      List<BindingElementTree> assignedElements = objectBindingPatternTree.elements();
      currentState = createSymbolicValuesForTrackedVariables(assignedElements, currentState);
    }

    return currentState;
  }

  /**
   * Returns a new list containing the present (in the sense of Optional#isPresent) elements in <code>list</code>.
   */
  private static <T extends Tree> List<T> presentsOf(List<Optional<T>> list) {
    List<T> newList = new LinkedList<>();
    for (Optional<T> element : list) {
      if (element.isPresent()) {
        newList.add(element.get());
      }
    }
    return newList;
  }

  private void checkForImplicitReturn(CfgBlock block) {
    boolean blockLeadsToEnd = block.successors().contains(cfg.end());
    if (blockLeadsToEnd) {
      List<Tree> elements = block.elements();
      Tree lastElement = elements.get(elements.size() - 1);

      if (!lastElement.is(Kind.RETURN_STATEMENT)) {
        addReturnConstraint(Constraint.UNDEFINED);
      }
    }
  }

  private ProgramState executeInitializedBinding(InitializedBindingElementTree initializedBindingElementTree, ProgramState programState) {
    ProgramState newProgramState;
    if (initializedBindingElementTree.parent().is(Kind.OBJECT_BINDING_PATTERN, Kind.ARRAY_BINDING_PATTERN, Kind.BINDING_PROPERTY)) {
      newProgramState = programState.removeLastValue();
    } else {
      BindingElementTree variable = initializedBindingElementTree.left();
      newProgramState = executeInitializer(programState, variable);
      newProgramState = newProgramState.clearStack(initializedBindingElementTree);
    }

    return newProgramState;
  }

  private ProgramState executeInitializer(ProgramState programState, BindingElementTree variable) {
    if (variable.is(Kind.BINDING_IDENTIFIER)) {
      return assignment(programState, variable);
    } else if (variable.is(Kind.FLOW_TYPED_BINDING_ELEMENT)) {
      return executeInitializer(programState, ((FlowTypedBindingElementTree) variable).bindingElement());
    }

    return programState;
  }

  private static boolean isProducingUnconsumedValue(Tree element) {
    if (element instanceof ExpressionTree) {
      Tree tree = syntaxTree(element);
      Tree parent = getParent(tree);
      if (parent.is(
        Kind.EXPRESSION_STATEMENT,
        Kind.FOR_IN_STATEMENT,
        Kind.FOR_OF_STATEMENT,
        Kind.SWITCH_STATEMENT,
        Kind.CASE_CLAUSE,
        Kind.WITH_STATEMENT)) {
        return true;
      } else if (parent.is(Kind.FOR_STATEMENT)) {
        ForStatementTree forStatementTree = (ForStatementTree) parent;
        return tree.equals(forStatementTree.init()) || tree.equals(forStatementTree.update());
      }
    }
    return false;
  }

  private static Tree getParent(Tree tree) {
    return syntaxTree(tree.parent());
  }

  private static Tree syntaxTree(Tree tree) {
    Tree syntaxTree = tree;
    while (syntaxTree.is(Kind.PARENTHESISED_EXPRESSION)) {
      syntaxTree = syntaxTree.parent();
    }
    return syntaxTree;
  }

  private ProgramState createSymbolicValuesForTrackedVariables(List<? extends Tree> trees, ProgramState state) {
    ProgramState newState = state;
    for (Tree tree : trees) {
      Symbol trackedVariable = trackedVariable(tree);
      if (trackedVariable != null) {
        newState = newState.newSymbolicValue(trackedVariable, null);
      }
    }
    return newState;
  }

  private void beforeBlockElement(ProgramState currentState, Tree element, ProgramPoint programPoint) {
    for (SeCheck check : checks) {
      check.beforeBlockElement(currentState, element, programPoint);
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

      if (branchingTree.is(
        Kind.CONDITIONAL_EXPRESSION,
        Kind.IF_STATEMENT,
        Kind.WHILE_STATEMENT,
        Kind.FOR_STATEMENT,
        Kind.DO_WHILE_STATEMENT,
        Kind.CONDITIONAL_AND,
        Kind.CONDITIONAL_OR)) {

        pushConditionSuccessors(branchingBlock, currentState);
        shouldPushAllSuccessors = false;

      } else if (branchingTree.is(Kind.FOR_IN_STATEMENT, Kind.FOR_OF_STATEMENT)) {
        ForObjectStatementTree forTree = (ForObjectStatementTree) branchingTree;
        Tree variable = forTree.variableOrExpression();
        if (variable.is(Kind.VAR_DECLARATION, Kind.LET_DECLARATION, Kind.CONST_DECLARATION)) {
          VariableDeclarationTree declaration = (VariableDeclarationTree) variable;
          variable = declaration.variables().get(0);
        }
        currentState = newSymbolicValue(currentState, variable);

        Constraint expressionConstraint = ANY_VALUE;
        if (forTree.expression().is(Kind.IDENTIFIER_REFERENCE)) {
          SymbolicValue expressionSV = currentState.getSymbolicValue((IdentifierTree) forTree.expression(), this);
          expressionConstraint = currentState.getConstraint(expressionSV);
        }

        // FIXME "for-of" iteration over "null" or "undefined" value will raise "TypeError"
        // so this logic should be applied to "for-in" loop only
        if (expressionConstraint.isStricterOrEqualTo(NULL_OR_UNDEFINED)) {
          pushSuccessor(branchingBlock.falseSuccessor(), currentState);
          shouldPushAllSuccessors = false;
        }
      }

    }

    if (shouldPushAllSuccessors) {
      pushAllSuccessors(block, currentState);
    }
  }

  private void pushConditionSuccessors(CfgBranchingBlock block, ProgramState currentState) {
    SymbolicValue conditionSymbolicValue = currentState.peekStack();

    Tree lastElement = block.elements().get(block.elements().size() - 1);
    ProgramState programStateForBranching = new CrossProceduralLimitation().prepareForBranching(lastElement, currentState);

    Optional<ProgramState> constrainedTruePS = programStateForBranching.constrain(conditionSymbolicValue, Constraint.TRUTHY);
    if (constrainedTruePS.isPresent()) {
      pushConditionSuccessor(block.trueSuccessor(), constrainedTruePS.get(), conditionSymbolicValue, Constraint.TRUTHY, block.branchingTree());
      conditionResults.put(lastElement, Constraint.TRUTHY);
    }

    Optional<ProgramState> constrainedFalsePS = programStateForBranching.constrain(conditionSymbolicValue, Constraint.FALSY);
    if (constrainedFalsePS.isPresent()) {
      pushConditionSuccessor(block.falseSuccessor(), constrainedFalsePS.get(), conditionSymbolicValue, Constraint.FALSY, block.branchingTree());
      conditionResults.put(lastElement, Constraint.FALSY);
    }

    if (!constrainedTruePS.isPresent() && !constrainedFalsePS.isPresent()) {
      throw new IllegalStateException("At least one branch of condition should be executed (condition on line " + lastElement.firstToken().line() + ").");
    }
  }

  private void pushConditionSuccessor(
    CfgBlock successor, ProgramState programState, SymbolicValue conditionSymbolicValue, Constraint constraint, Tree branchingTree) {

    ProgramState state = programState;
    if (!successor.elements().isEmpty() && successor.elements().get(0).is(Kind.CONDITIONAL_AND, Kind.CONDITIONAL_OR)) {
      if (UnknownSymbolicValue.UNKNOWN.equals(conditionSymbolicValue)) {
        state = state.removeLastValue();
        state = state.pushToStack(new SymbolicValueWithConstraint(constraint));
      }
    } else {
      state = state.removeLastValue();
      if (branchingTree.is(Kind.IF_STATEMENT, Kind.WHILE_STATEMENT, Kind.DO_WHILE_STATEMENT, Kind.FOR_STATEMENT)) {
        state.assertEmptyStack(branchingTree);
      }
    }
    pushSuccessor(successor, state);
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
  public Symbol trackedVariable(Tree tree) {
    Symbol var = null;

    if (tree.is(Kind.PARENTHESISED_EXPRESSION)) {
      var = trackedVariable(((ParenthesisedExpressionTree) tree).expression());

    } else if (tree.is(Kind.IDENTIFIER_REFERENCE, Kind.BINDING_IDENTIFIER)) {
      IdentifierTree identifier = (IdentifierTree) tree;
      Symbol symbol = identifier.symbol().orElse(null);
      var = trackedVariables.contains(symbol) ? symbol : null;

    } else if (tree.is(Kind.ASSIGNMENT_PATTERN_REST_ELEMENT)) {
      var = trackedVariable(((AssignmentPatternRestElementTree) tree).element());

    } else if (tree.is(Kind.INITIALIZED_ASSIGNMENT_PATTERN_ELEMENT)) {
      var = trackedVariable(((InitializedAssignmentPatternElementTree) tree).left());

    } else if (tree.is(Kind.OBJECT_ASSIGNMENT_PATTERN_PAIR_ELEMENT)) {
      var = trackedVariable(((ObjectAssignmentPatternPairElementTree) tree).element());

    } else if (tree.is(Kind.REST_ELEMENT)) {
      var = trackedVariable(((RestElementTree) tree).element());

    } else if (tree.is(Kind.BINDING_PROPERTY)) {
      var = trackedVariable(((BindingPropertyTree) tree).value());

    } else if (tree.is(Kind.INITIALIZED_BINDING_ELEMENT)) {
      var = trackedVariable(((InitializedBindingElementTree) tree).left());
    }

    return var;
  }
}
