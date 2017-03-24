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
package org.sonar.javascript.cfg;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.Lists;
import com.sonar.sslr.api.RecognitionException;
import com.sonar.sslr.api.typed.Optional;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.annotation.CheckForNull;
import javax.annotation.Nullable;
import org.sonar.javascript.tree.KindSet;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.ArrayBindingPatternTree;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.BindingPropertyTree;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.ObjectBindingPatternTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrayLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ComputedPropertyNameTree;
import org.sonar.plugins.javascript.api.tree.expression.ConditionalExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.MemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.NewExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.PairPropertyTree;
import org.sonar.plugins.javascript.api.tree.expression.ParenthesisedExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.RestElementTree;
import org.sonar.plugins.javascript.api.tree.expression.SpreadElementTree;
import org.sonar.plugins.javascript.api.tree.expression.TaggedTemplateTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.YieldExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.BreakStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.CaseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.ContinueStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.DoWhileStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ExpressionStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForObjectStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.IfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.LabelledStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ReturnStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ThrowStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.TryStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.VariableDeclarationTree;
import org.sonar.plugins.javascript.api.tree.statement.VariableStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.WhileStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.WithStatementTree;

/**
 * Builder of a {@link ControlFlowGraph} for a given {@link ScriptTree} or for the body of a function.
 * Implementation note: this class starts from the end and goes backward because it's easier to implement.
 */
class ControlFlowGraphBuilder {

  private final Set<JsCfgBlock> blocks = new HashSet<>();
  private final JsCfgEndBlock end = new JsCfgEndBlock();
  private JsCfgBlock currentBlock = createSimpleBlock(end);
  private JsCfgBlock start;
  private final Deque<Breakable> breakables = new ArrayDeque<>();
  private final Deque<JsCfgBlock> throwTargets = new ArrayDeque<>();
  private String currentLabel = null;

  private static final Kind[] SIMPLE_BINARY_KINDS = {
    Kind.MULTIPLY,
    Kind.EXPONENT,
    Kind.DIVIDE,
    Kind.REMAINDER,
    Kind.PLUS,
    Kind.MINUS,
    Kind.LEFT_SHIFT,
    Kind.RIGHT_SHIFT,
    Kind.UNSIGNED_RIGHT_SHIFT,
    Kind.RELATIONAL_IN,
    Kind.INSTANCE_OF,
    Kind.LESS_THAN,
    Kind.GREATER_THAN,
    Kind.LESS_THAN_OR_EQUAL_TO,
    Kind.GREATER_THAN_OR_EQUAL_TO,
    Kind.EQUAL_TO,
    Kind.STRICT_EQUAL_TO,
    Kind.NOT_EQUAL_TO,
    Kind.STRICT_NOT_EQUAL_TO,
    Kind.BITWISE_AND,
    Kind.BITWISE_XOR,
    Kind.BITWISE_OR,
    Kind.COMMA_OPERATOR
  };

  private static final Kind[] UNARY_KINDS = {
    Kind.POSTFIX_INCREMENT,
    Kind.POSTFIX_DECREMENT,
    Kind.PREFIX_INCREMENT,
    Kind.PREFIX_DECREMENT,
    Kind.DELETE,
    Kind.VOID,
    Kind.TYPEOF,
    Kind.UNARY_PLUS,
    Kind.UNARY_MINUS,
    Kind.BITWISE_COMPLEMENT,
    Kind.LOGICAL_COMPLEMENT,
    Kind.AWAIT
  };

  ControlFlowGraph createGraph(ScriptTree tree) {
    List<Tree> items = ImmutableList.of();
    if (tree.items() != null) {
      items = tree.items().items();
    }
    return createGraph(items);
  }

  ControlFlowGraph createGraph(BlockTree body) {
    return createGraph(body.statements());
  }

  private ControlFlowGraph createGraph(List<? extends Tree> items) {
    throwTargets.push(end);
    build(items);
    start = currentBlock;
    removeEmptyBlocks();
    blocks.add(end);
    return new ControlFlowGraph(blocks, start, end);
  }

  private void removeEmptyBlocks() {
    Map<JsCfgBlock, JsCfgBlock> emptyBlockReplacements = new HashMap<>();
    for (JsCfgBlock block : blocks) {
      if (block.elements().isEmpty()) {
        JsCfgBlock firstNonEmptySuccessor = block.skipEmptyBlocks();
        emptyBlockReplacements.put(block, firstNonEmptySuccessor);
        for (SyntaxToken jump : block.disconnectingJumps()) {
          firstNonEmptySuccessor.addDisconnectingJump(jump);
        }
      }
    }

    blocks.removeAll(emptyBlockReplacements.keySet());

    for (JsCfgBlock block : blocks) {
      block.replaceSuccessors(emptyBlockReplacements);
    }

    if (emptyBlockReplacements.containsKey(start)) {
      start = emptyBlockReplacements.get(start);
    }
  }

  private void build(List<? extends Tree> trees) {
    for (Tree tree : Lists.reverse(trees)) {
      build(tree);
    }
  }

  private void build(Tree tree) {
    if (tree.is(Kind.EXPRESSION_STATEMENT)) {
      buildExpression(((ExpressionStatementTree) tree).expression());
    } else if (tree.is(Kind.VARIABLE_STATEMENT)) {
      buildExpression(((VariableStatementTree) tree).declaration());
    } else if (tree.is(Kind.IF_STATEMENT)) {
      visitIfStatement((IfStatementTree) tree);
    } else if (tree.is(Kind.FOR_STATEMENT)) {
      visitForStatement((ForStatementTree) tree);
    } else if (tree.is(Kind.FOR_IN_STATEMENT, Kind.FOR_OF_STATEMENT)) {
      visitForObjectStatement((ForObjectStatementTree) tree);
    } else if (tree.is(Kind.WHILE_STATEMENT)) {
      visitWhileStatement((WhileStatementTree) tree);
    } else if (tree.is(Kind.DO_WHILE_STATEMENT)) {
      visitDoWhileStatement((DoWhileStatementTree) tree);
    } else if (tree.is(Kind.CONTINUE_STATEMENT)) {
      visitContinueStatement((ContinueStatementTree) tree);
    } else if (tree.is(Kind.BREAK_STATEMENT)) {
      visitBreakStatement((BreakStatementTree) tree);
    } else if (tree.is(Kind.RETURN_STATEMENT)) {
      visitReturnStatement((ReturnStatementTree) tree);
    } else if (tree.is(Kind.BLOCK)) {
      visitBlock((BlockTree) tree);
    } else if (tree.is(Kind.LABELLED_STATEMENT)) {
      visitLabelledStatement((LabelledStatementTree) tree);
    } else if (tree.is(Kind.TRY_STATEMENT)) {
      visitTryStatement((TryStatementTree) tree);
    } else if (tree.is(Kind.THROW_STATEMENT)) {
      visitThrowStatement((ThrowStatementTree) tree);
    } else if (tree.is(Kind.SWITCH_STATEMENT)) {
      visitSwitchStatement((SwitchStatementTree) tree);
    } else if (tree.is(Kind.WITH_STATEMENT)) {
      WithStatementTree with = (WithStatementTree) tree;
      build(with.statement());
      buildExpression(with.expression());
    } else if (tree.is(
      Kind.DEBUGGER_STATEMENT,
      Kind.FUNCTION_DECLARATION,
      Kind.GENERATOR_DECLARATION,
      Kind.CLASS_DECLARATION,
      Kind.IMPORT_DECLARATION,
      Kind.IMPORT_MODULE_DECLARATION,
      Kind.DEFAULT_EXPORT_DECLARATION,
      Kind.NAMED_EXPORT_DECLARATION,
      Kind.NAMESPACE_EXPORT_DECLARATION)) {
      currentBlock.addElement(tree);
    } else if (tree.is(Kind.EMPTY_STATEMENT)) {
      // Nothing to do
    } else {
      throw new IllegalArgumentException("Cannot build CFG for " + tree);
    }
  }

  private void buildExpressions(List<? extends Tree> expressions) {
    for (Tree expression : Lists.reverse(expressions)) {
      buildExpression(expression);
    }
  }

  private void buildExpression(Tree tree) {
    if (!tree.is(Kind.PARENTHESISED_EXPRESSION)) {
      currentBlock.addElement(tree);
    }

    if (tree.is(SIMPLE_BINARY_KINDS)) {
      BinaryExpressionTree binary = (BinaryExpressionTree) tree;
      buildExpression(binary.rightOperand());
      buildExpression(binary.leftOperand());

    } else if (tree.is(KindSet.ASSIGNMENT_KINDS)) {
      AssignmentExpressionTree assignment = (AssignmentExpressionTree) tree;
      buildExpression(assignment.expression());
      buildExpression(assignment.variable());

    } else if (tree.is(UNARY_KINDS)) {
      UnaryExpressionTree unary = (UnaryExpressionTree) tree;
      buildExpression(unary.expression());

    } else if (tree.is(Kind.ARRAY_LITERAL)) {
      ArrayLiteralTree arrayLiteral = (ArrayLiteralTree) tree;
      buildExpressions(arrayLiteral.elements());

    } else if (tree.is(Kind.OBJECT_LITERAL)) {
      ObjectLiteralTree objectLiteral = (ObjectLiteralTree) tree;
      buildExpressions(objectLiteral.properties());

    } else if (tree.is(Kind.DOT_MEMBER_EXPRESSION)) {
      MemberExpressionTree memberExpression = (MemberExpressionTree) tree;
      buildExpression(memberExpression.object());

    } else if (tree.is(Kind.BRACKET_MEMBER_EXPRESSION)) {
      MemberExpressionTree memberExpression = (MemberExpressionTree) tree;
      buildExpression(memberExpression.property());
      buildExpression(memberExpression.object());

    } else if (tree.is(Kind.CALL_EXPRESSION)) {
      CallExpressionTree callExpression = (CallExpressionTree) tree;
      buildExpressions(callExpression.arguments().parameters());
      buildExpression(callExpression.callee());

    } else if (tree.is(Kind.VAR_DECLARATION, Kind.LET_DECLARATION, Kind.CONST_DECLARATION)) {
      VariableDeclarationTree declaration = (VariableDeclarationTree) tree;
      buildExpressions(declaration.variables());

    } else if (tree.is(Kind.INITIALIZED_BINDING_ELEMENT)) {
      InitializedBindingElementTree initializedBindingElementTree = (InitializedBindingElementTree) tree;
      buildExpression(initializedBindingElementTree.left());
      buildExpression(initializedBindingElementTree.right());

    } else if (tree.is(Kind.PAIR_PROPERTY)) {
      PairPropertyTree pairProperty = (PairPropertyTree) tree;
      buildExpression(pairProperty.value());
      buildExpression(pairProperty.key());

    } else if (tree.is(Kind.COMPUTED_PROPERTY_NAME)) {
      ComputedPropertyNameTree computedPropertyName = (ComputedPropertyNameTree) tree;
      buildExpression(computedPropertyName.expression());

    } else if (tree.is(Kind.NEW_EXPRESSION)) {
      NewExpressionTree newExpression = (NewExpressionTree) tree;
      if (newExpression.arguments() != null) {
        buildExpressions(newExpression.arguments().parameters());
      }
      buildExpression(newExpression.expression());

    } else if (tree.is(Kind.CONDITIONAL_AND)) {
      BinaryExpressionTree binary = (BinaryExpressionTree) tree;
      JsCfgBlock falseSuccessor = (JsCfgBlock) ControlFlowGraph.falseSuccessorFor(currentBlock);
      if (!currentBlock.elements().isEmpty()) {
        falseSuccessor = currentBlock;
        currentBlock = createSimpleBlock(currentBlock);
      }
      buildExpression(binary.rightOperand());
      JsCfgBlock trueSuccessor = currentBlock;
      currentBlock = createBranchingBlock(tree, currentBlock, falseSuccessor);
      buildCondition(binary.leftOperand(), trueSuccessor, falseSuccessor);

    } else if (tree.is(Kind.CONDITIONAL_OR)) {
      BinaryExpressionTree binary = (BinaryExpressionTree) tree;
      JsCfgBlock trueSuccessor = (JsCfgBlock) ControlFlowGraph.trueSuccessorFor(currentBlock);
      if (!currentBlock.elements().isEmpty()) {
        trueSuccessor = currentBlock;
        currentBlock = createSimpleBlock(currentBlock);
      }
      buildExpression(binary.rightOperand());
      JsCfgBlock falseSuccessor = currentBlock;
      currentBlock = createBranchingBlock(tree, trueSuccessor, currentBlock);
      buildCondition(binary.leftOperand(), trueSuccessor, falseSuccessor);

    } else if (tree.is(Kind.CONDITIONAL_EXPRESSION)) {
      ConditionalExpressionTree conditionalExpression = (ConditionalExpressionTree) tree;
      JsCfgBlock successor = currentBlock;
      currentBlock = createSimpleBlock(successor);
      buildExpression(conditionalExpression.falseExpression());
      JsCfgBlock falseBlock = currentBlock;
      currentBlock = createSimpleBlock(successor);
      buildExpression(conditionalExpression.trueExpression());
      JsCfgBlock trueBlock = currentBlock;
      currentBlock = createBranchingBlock(tree, trueBlock, falseBlock);
      buildCondition(conditionalExpression.condition(), trueBlock, falseBlock);

    } else if (tree.is(Kind.SPREAD_ELEMENT)) {
      SpreadElementTree spreadElement = (SpreadElementTree) tree;
      buildExpression(spreadElement.element());

    } else if (tree.is(Kind.PARENTHESISED_EXPRESSION)) {
      ParenthesisedExpressionTree parenthesisedExpression = (ParenthesisedExpressionTree) tree;
      buildExpression(parenthesisedExpression.expression());

    } else if (tree.is(Kind.TEMPLATE_LITERAL)) {
      TemplateLiteralTree templateLiteral = (TemplateLiteralTree) tree;
      buildExpressions(templateLiteral.expressions());

    } else if (tree.is(Kind.TEMPLATE_EXPRESSION)) {
      TemplateExpressionTree templateExpression = (TemplateExpressionTree) tree;
      buildExpression(templateExpression.expression());

    } else if (tree.is(Kind.TAGGED_TEMPLATE)) {
      TaggedTemplateTree taggedTemplate = (TaggedTemplateTree) tree;
      buildExpression(taggedTemplate.template());
      buildExpression(taggedTemplate.callee());

    } else if (tree.is(Kind.YIELD_EXPRESSION)) {
      YieldExpressionTree yieldExpression = (YieldExpressionTree) tree;
      if (yieldExpression.argument() != null) {
        buildExpression(yieldExpression.argument());
      }

    } else if (tree.is(Kind.OBJECT_BINDING_PATTERN)) {
      ObjectBindingPatternTree objectBindingPattern = (ObjectBindingPatternTree) tree;
      buildExpressions(objectBindingPattern.elements());

    } else if (tree.is(Kind.BINDING_PROPERTY)) {
      BindingPropertyTree bindingProperty = (BindingPropertyTree) tree;
      buildExpression(bindingProperty.value());

    } else if (tree.is(Kind.REST_ELEMENT)) {
      RestElementTree restElement = (RestElementTree) tree;
      buildExpression(restElement.element());

    } else if (tree.is(Kind.ARRAY_BINDING_PATTERN)) {
      ArrayBindingPatternTree arrayBindingPattern = (ArrayBindingPatternTree) tree;
      for (Optional<BindingElementTree> element : Lists.reverse(arrayBindingPattern.elements())) {
        if (element.isPresent()) {
          buildExpression(element.get());
        }
      }
    }

  }

  private void buildCondition(ExpressionTree expression, JsCfgBlock trueBlock, JsCfgBlock falseBlock) {
    JsCfgBlock trueSuccessor = trueBlock;
    JsCfgBlock falseSuccessor = falseBlock;
    if (expression.is(Kind.CONDITIONAL_AND)) {
      BinaryExpressionTree binary = (BinaryExpressionTree) expression;
      buildCondition(binary.rightOperand(), trueSuccessor, falseSuccessor);
      trueSuccessor = currentBlock;
      currentBlock = createBranchingBlock(expression, trueSuccessor, falseSuccessor);
      buildCondition(binary.leftOperand(), trueSuccessor, falseSuccessor);

    } else if (expression.is(Kind.CONDITIONAL_OR)) {
      BinaryExpressionTree binary = (BinaryExpressionTree) expression;
      buildCondition(binary.rightOperand(), trueSuccessor, falseSuccessor);
      falseSuccessor = currentBlock;
      currentBlock = createBranchingBlock(expression, trueSuccessor, falseSuccessor);
      buildCondition(binary.leftOperand(), trueSuccessor, falseSuccessor);

    } else if (expression.is(Kind.PARENTHESISED_EXPRESSION)) {
      buildCondition(((ParenthesisedExpressionTree) expression).expression(), trueSuccessor, falseSuccessor);

    } else {
      buildExpression(expression);
    }
  }

  private void visitBlock(BlockTree block) {
    build(block.statements());
  }

  private void addBreakable(JsCfgBlock breakTarget, @Nullable JsCfgBlock continueTarget, @Nullable String label) {
    breakables.addFirst(new Breakable(continueTarget, breakTarget, label));
  }

  private void removeBreakable() {
    breakables.removeFirst();
  }

  private void visitReturnStatement(ReturnStatementTree tree) {
    currentBlock.addDisconnectingJump(tree.returnKeyword());
    currentBlock = createSimpleBlock(tree, end);
    if (tree.expression() != null) {
      buildExpression(tree.expression());
    }
  }

  private void visitContinueStatement(ContinueStatementTree tree) {
    JsCfgBlock target = null;
    String label = tree.label() == null ? null : tree.label().name();
    for (Breakable breakable : breakables) {
      if (breakable.continueTarget != null && (label == null || label.equals(breakable.label))) {
        target = breakable.continueTarget;
        break;
      }
    }
    if (target == null) {
      raiseRecognitionException(tree, "continue", label);
    }
    currentBlock.addDisconnectingJump(tree.continueKeyword());
    currentBlock = createSimpleBlock(tree, target);
  }

  private void visitBreakStatement(BreakStatementTree tree) {
    JsCfgBlock target = null;
    String label = tree.label() == null ? null : tree.label().name();
    for (Breakable breakable : breakables) {
      if (label == null || label.equals(breakable.label)) {
        target = breakable.breakTarget;
        break;
      }
    }
    if (target == null) {
      raiseRecognitionException(tree, "break", label);
    }
    currentBlock.addDisconnectingJump(tree.breakKeyword());
    currentBlock = createSimpleBlock(tree, target);
  }

  private static void raiseRecognitionException(Tree tree, String type, @Nullable String label) {
    int line = ((JavaScriptTree) tree).getLine();
    String message = "No \'" + type + "\' target can be found at line " + line;
    if (label != null) {
      message += " (label '" + label + "')";
    }
    throw new RecognitionException(line, message);
  }

  private void visitIfStatement(IfStatementTree tree) {
    JsCfgBlock successor = currentBlock;
    if (tree.elseClause() != null) {
      buildSubFlow(tree.elseClause().statement(), successor);
    }
    JsCfgBlock elseBlock = currentBlock;
    buildSubFlow(tree.statement(), successor);
    JsCfgBlock thenBlock = currentBlock;
    JsCfgBranchingBlock branchingBlock = createBranchingBlock(tree, thenBlock, elseBlock);
    currentBlock = branchingBlock;
    buildCondition(tree.condition(), thenBlock, elseBlock);
  }

  private void visitForStatement(ForStatementTree tree) {
    JsCfgBlock forStatementSuccessor = currentBlock;
    JsCfgForwardingBlock linkToCondition = createForwardingBlock();
    JsCfgForwardingBlock linkToUpdate = createForwardingBlock();

    JsCfgBlock loopBodyBlock = buildLoopBody(tree.statement(), linkToUpdate, currentBlock);

    if (tree.update() != null) {
      currentBlock = createSimpleBlock(linkToCondition);
      buildExpression(tree.update());
      linkToUpdate.setSuccessor(currentBlock);
    } else {
      linkToUpdate.setSuccessor(linkToCondition);
    }

    if (tree.condition() != null) {
      currentBlock = createBranchingBlock(tree, loopBodyBlock, forStatementSuccessor);
      buildCondition(tree.condition(), loopBodyBlock, forStatementSuccessor);
      linkToCondition.setSuccessor(currentBlock);
    } else {
      linkToCondition.setSuccessor(loopBodyBlock);
    }

    currentBlock = createSimpleBlock(linkToCondition);
    if (tree.init() != null) {
      buildExpression(tree.init());
    } else if (tree.condition() == null && loopBodyBlock.elements().isEmpty()) {
      loopBodyBlock.addElement(tree.forKeyword());
    }
  }

  private void visitForObjectStatement(ForObjectStatementTree tree) {
    JsCfgBlock successor = currentBlock;
    JsCfgForwardingBlock linkToAssignment = createForwardingBlock();
    JsCfgBlock loopBodyBlock = buildLoopBody(tree.statement(), linkToAssignment, currentBlock);
    JsCfgBranchingBlock assignmentBlock = createBranchingBlock(tree, loopBodyBlock, successor);
    currentBlock = assignmentBlock;
    buildExpression(tree.variableOrExpression());
    buildExpression(tree.expression());
    linkToAssignment.setSuccessor(currentBlock);
    currentBlock = createSimpleBlock(currentBlock);
  }

  private void visitWhileStatement(WhileStatementTree tree) {
    JsCfgBlock successor = currentBlock;
    JsCfgForwardingBlock linkToCondition = createForwardingBlock();
    JsCfgBlock loopBodyBlock = buildLoopBody(tree.statement(), linkToCondition, successor);
    currentBlock = createBranchingBlock(tree, loopBodyBlock, successor);
    buildCondition(tree.condition(), loopBodyBlock, successor);
    linkToCondition.setSuccessor(currentBlock);
    currentBlock = createSimpleBlock(currentBlock);
  }

  private void visitDoWhileStatement(DoWhileStatementTree tree) {
    JsCfgBlock successor = currentBlock;
    JsCfgForwardingBlock linkToBody = createForwardingBlock();
    currentBlock = createBranchingBlock(tree, linkToBody, successor);
    buildCondition(tree.condition(), linkToBody, successor);
    JsCfgBlock loopBodyBlock = buildLoopBody(tree.statement(), currentBlock, successor);
    linkToBody.setSuccessor(loopBodyBlock);
    currentBlock = createSimpleBlock(loopBodyBlock);
  }

  private void visitLabelledStatement(LabelledStatementTree tree) {
    String label = tree.label().name();

    boolean isLoopStatement = tree.statement().is(KindSet.LOOP_KINDS);

    if (!isLoopStatement) {
      addBreakable(currentBlock, null, label);
      currentBlock = createSimpleBlock(currentBlock);
    } else {
      // Loop statements manage breakables themselves to set the target for "continue"
      currentLabel = label;
    }

    build(tree.statement());

    if (!isLoopStatement) {
      removeBreakable();
    }
  }

  private void visitTryStatement(TryStatementTree tree) {
    JsCfgBlock catchOrFinallyBlock = null;

    if (tree.finallyBlock() != null) {
      currentBlock = createSimpleBlock(currentBlock);
      build(tree.finallyBlock().block());
      throwTargets.push(currentBlock);
      catchOrFinallyBlock = currentBlock;
    }

    if (tree.catchBlock() != null) {
      JsCfgBlock catchSuccessor = currentBlock;
      buildSubFlow(tree.catchBlock().block(), currentBlock);
      JsCfgBranchingBlock catchBlock = createBranchingBlock(tree.catchBlock(), currentBlock, catchSuccessor);
      currentBlock = catchBlock;
      buildExpression(tree.catchBlock().parameter());
      catchOrFinallyBlock = catchBlock;
      currentBlock = catchBlock;
    }

    if (tree.finallyBlock() != null) {
      throwTargets.pop();
    }

    throwTargets.push(currentBlock);
    currentBlock = createSimpleBlock(currentBlock);
    build(tree.block());
    throwTargets.pop();

    currentBlock = createBranchingBlock(tree, currentBlock, catchOrFinallyBlock);
    currentBlock.addElement(tree.tryKeyword());
  }

  private void visitThrowStatement(ThrowStatementTree tree) {
    currentBlock.addDisconnectingJump(tree.throwKeyword());
    currentBlock = createSimpleBlock(throwTargets.peek());
    buildExpression(tree.expression());
  }

  private void visitSwitchStatement(SwitchStatementTree tree) {
    addBreakable(currentBlock, null, null);
    JsCfgBlock nextStatementBlock = currentBlock;
    JsCfgForwardingBlock defaultForwardingBlock = createForwardingBlock();
    defaultForwardingBlock.setSuccessor(currentBlock);
    JsCfgBlock nextCase = defaultForwardingBlock;

    for (SwitchClauseTree switchCaseClause : Lists.reverse(tree.cases())) {
      if (switchCaseClause.is(Kind.CASE_CLAUSE)) {

        currentBlock = createSimpleBlock(nextStatementBlock);
        build(switchCaseClause.statements());
        if (!switchCaseClause.statements().isEmpty()) {
          nextStatementBlock = currentBlock;
        }

        CaseClauseTree caseClause = (CaseClauseTree) switchCaseClause;
        currentBlock = createBranchingBlock(caseClause, nextStatementBlock, nextCase);
        buildExpression(caseClause.expression());
        nextCase = currentBlock;

      } else {

        currentBlock = createSimpleBlock(nextStatementBlock);
        build(switchCaseClause.statements());
        defaultForwardingBlock.setSuccessor(currentBlock);

        if (!switchCaseClause.statements().isEmpty()) {
          nextStatementBlock = currentBlock;
        }

      }
    }

    removeBreakable();
    currentBlock = createSimpleBlock(nextCase);
    buildExpression(tree.expression());
  }

  private JsCfgBlock buildLoopBody(StatementTree body, JsCfgBlock conditionBlock, JsCfgBlock breakTarget) {
    addBreakable(breakTarget, conditionBlock, currentLabel);
    currentLabel = null;
    buildSubFlow(body, conditionBlock);
    JsCfgBlock loopBodyBlock = currentBlock;
    removeBreakable();
    return loopBodyBlock;
  }

  private void buildSubFlow(StatementTree subFlowTree, JsCfgBlock successor) {
    currentBlock = createSimpleBlock(successor);
    build(subFlowTree);
  }

  private JsCfgBranchingBlock createBranchingBlock(Tree branchingTree, JsCfgBlock trueSuccessor, JsCfgBlock falseSuccessor) {
    JsCfgBranchingBlock block = new JsCfgBranchingBlock(branchingTree, trueSuccessor, falseSuccessor);
    blocks.add(block);
    return block;
  }

  private JsCfgBlock createSimpleBlock(Tree element, JsCfgBlock successor) {
    JsCfgBlock block = createSimpleBlock(successor);
    block.addElement(element);
    return block;
  }

  private JsCfgBlock createSimpleBlock(JsCfgBlock successor) {
    JsCfgBlock block = new JsCfgBlock(successor);
    blocks.add(block);
    return block;
  }

  private JsCfgForwardingBlock createForwardingBlock() {
    JsCfgForwardingBlock block = new JsCfgForwardingBlock();
    blocks.add(block);
    return block;
  }

  private static class Breakable {

    @CheckForNull
    final JsCfgBlock continueTarget;

    final JsCfgBlock breakTarget;

    @CheckForNull
    final String label;

    Breakable(@Nullable JsCfgBlock continueTarget, JsCfgBlock breakTarget, @Nullable String label) {
      this.continueTarget = continueTarget;
      this.breakTarget = breakTarget;
      this.label = label;
    }

  }

}
