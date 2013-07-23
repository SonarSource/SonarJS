/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * dev@sonar.codehaus.org
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
package org.sonar.javascript.model;

import com.google.common.base.Preconditions;
import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.AstNodeType;

import javax.annotation.Nullable;
import java.util.List;

public abstract class TreeImpl {

  public final AstNode astNode;

  protected TreeImpl(AstNode astNode) {
    this.astNode = astNode;
  }

  public int getLine() {
    return astNode.getTokenLine();
  }

  public final <T extends Tree> boolean is(Class<T> cls) {
    return cls.isInstance(this);
  }

  public final <T extends Tree> T as(Class<T> cls) {
    return cls.cast(this);
  }

  protected abstract void accept(VisitorsDispatcher visitors);

  protected static final void scan(@Nullable List<? extends Tree> trees, VisitorsDispatcher visitors) {
    if (trees != null) {
      for (Tree tree : trees) {
        scan(tree, visitors);
      }
    }
  }

  protected static final void scan(@Nullable Tree tree, VisitorsDispatcher visitors) {
    if (tree != null) {
      ((TreeImpl) tree).accept(visitors);
    }
  }

  public static class IdentifierTreeImpl extends TreeImpl implements IdentifierTree {
    private final String name;

    public IdentifierTreeImpl(AstNode astNode, String name) {
      super(astNode);
      this.name = Preconditions.checkNotNull(name);
    }

    public String name() {
      return name;
    }

    @Override
    public void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, IdentifierTree.class);
      visitors.leave(this, IdentifierTree.class);
    }
  }

  public static class LiteralTreeImpl extends TreeImpl implements LiteralTree {
    protected LiteralTreeImpl(AstNode astNode) {
      super(astNode);
    }

    @Override
    protected void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, LiteralTree.class);
      visitors.leave(this, LiteralTree.class);
    }
  }

  // Expressions

  public static class ParenthesizedTreeImpl extends TreeImpl implements ParenthesizedTree {
    private final ExpressionTree expression;

    public ParenthesizedTreeImpl(AstNode astNode, ExpressionTree expression) {
      super(astNode);
      this.expression = Preconditions.checkNotNull(expression);
    }

    public ExpressionTree expression() {
      return expression;
    }

    @Override
    protected void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, ParenthesizedTree.class);
      scan(expression, visitors);
      visitors.leave(this, ParenthesizedTree.class);
    }
  }

  public static class ArrayLiteralTreeImpl extends TreeImpl implements ArrayLiteralTree {
    private final List<? extends ExpressionTree> expressions;

    protected ArrayLiteralTreeImpl(AstNode astNode, List<? extends ExpressionTree> expressions) {
      super(astNode);
      this.expressions = Preconditions.checkNotNull(expressions);
    }

    public List<? extends ExpressionTree> expressions() {
      return expressions;
    }

    @Override
    protected void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, ArrayLiteralTree.class);
      scan(expressions, visitors);
      visitors.leave(this, ArrayLiteralTree.class);
    }
  }

  public static class ObjectLiteralTreeImpl extends TreeImpl implements ObjectLiteralTree {
    private final List<PropertyAssignmentTree> propertyAssignments;

    protected ObjectLiteralTreeImpl(AstNode astNode, List<PropertyAssignmentTree> propertyAssignments) {
      super(astNode);
      this.propertyAssignments = Preconditions.checkNotNull(propertyAssignments);
    }

    public List<PropertyAssignmentTree> propertyAssignments() {
      return propertyAssignments;
    }

    @Override
    protected void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, ObjectLiteralTree.class);
      scan(propertyAssignments, visitors);
      visitors.leave(this, ObjectLiteralTree.class);
    }
  }

  public static class PropertyAssignmentTreeImpl extends TreeImpl implements PropertyAssignmentTree {
    private final Tree propertyName;
    private final ExpressionTree expression;
    private final List<IdentifierTree> propertySetParameters;
    private final List<? extends SourceElementTree> body;

    protected PropertyAssignmentTreeImpl(AstNode astNode, Tree propertyName, @Nullable ExpressionTree expression, @Nullable List<IdentifierTree> propertySetParameters, @Nullable List<? extends SourceElementTree> body) {
      super(astNode);
      this.propertyName = Preconditions.checkNotNull(propertyName);
      this.expression = expression;
      this.propertySetParameters = propertySetParameters;
      this.body = body;
    }

    public Tree propertyName() {
      return propertyName;
    }

    @Nullable
    public ExpressionTree expression() {
      return expression;
    }

    @Nullable
    public List<IdentifierTree> propertySetParameters() {
      return propertySetParameters;
    }

    @Nullable
    public List<? extends SourceElementTree> body() {
      return body;
    }

    @Override
    protected void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, PropertyAssignmentTree.class);
      scan(propertyName, visitors);
      scan(expression, visitors);
      scan(propertySetParameters, visitors);
      scan(body, visitors);
      visitors.leave(this, PropertyAssignmentTree.class);
    }
  }

  public static class IndexAccessTreeImpl extends TreeImpl implements IndexAccessTree {
    private final ExpressionTree expression;
    private final ExpressionTree index;

    protected IndexAccessTreeImpl(AstNode astNode, ExpressionTree expression, ExpressionTree index) {
      super(astNode);
      this.expression = expression;
      this.index = index;
    }

    public ExpressionTree expression() {
      return expression;
    }

    public ExpressionTree index() {
      return index;
    }

    @Override
    protected void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, IndexAccessTree.class);
      scan(expression, visitors);
      scan(index, visitors);
      visitors.leave(this, IndexAccessTree.class);
    }
  }

  public static class PropertyAccessTreeImpl extends TreeImpl implements PropertyAccessTree {
    private final ExpressionTree expression;
    private final IdentifierTree identifier;

    protected PropertyAccessTreeImpl(AstNode astNode, ExpressionTree expression, IdentifierTree identifier) {
      super(astNode);
      this.expression = expression;
      this.identifier = identifier;
    }

    public ExpressionTree expression() {
      return expression;
    }

    public IdentifierTree identifier() {
      return identifier;
    }

    @Override
    protected void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, PropertyAccessTree.class);
      scan(expression, visitors);
      scan(identifier, visitors);
      visitors.leave(this, PropertyAccessTree.class);
    }
  }

  public static class NewOperatorTreeImpl extends TreeImpl implements NewOperatorTree {
    private final ExpressionTree constructor;
    private final List<? extends ExpressionTree> arguments;

    protected NewOperatorTreeImpl(AstNode astNode, ExpressionTree constructor, List<? extends ExpressionTree> arguments) {
      super(astNode);
      this.constructor = constructor;
      this.arguments = arguments;
    }

    public ExpressionTree constructor() {
      return constructor;
    }

    public List<? extends ExpressionTree> arguments() {
      return arguments;
    }

    @Override
    protected void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, NewOperatorTree.class);
      scan(constructor, visitors);
      scan(arguments, visitors);
      visitors.leave(this, NewOperatorTree.class);
    }
  }

  public static class FunctionCallTreeImpl extends TreeImpl implements FunctionCallTree {
    private final ExpressionTree expression;
    private final List<? extends ExpressionTree> arguments;

    protected FunctionCallTreeImpl(AstNode astNode, ExpressionTree expression, List<? extends ExpressionTree> arguments) {
      super(astNode);
      this.expression = expression;
      this.arguments = arguments;
    }

    public ExpressionTree expression() {
      return expression;
    }

    public List<? extends ExpressionTree> arguments() {
      return arguments;
    }

    @Override
    protected void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, FunctionCallTree.class);
      scan(expression, visitors);
      scan(arguments, visitors);
      visitors.leave(this, FunctionCallTree.class);
    }
  }

  public static class BinaryOperatorTreeImpl extends TreeImpl implements BinaryOperatorTree {
    private final int index;
    private final ExpressionTree leftOperand;
    private final ExpressionTree rightOperand;

    public BinaryOperatorTreeImpl(AstNode astNode, int index, ExpressionTree leftOperand, ExpressionTree rightOperand) {
      super(astNode);
      this.index = index;
      this.leftOperand = Preconditions.checkNotNull(leftOperand);
      this.rightOperand = Preconditions.checkNotNull(rightOperand);
    }

    @Override
    public int getLine() {
      return astNode.getChild(index).getTokenLine();
    }

    public ExpressionTree leftOperand() {
      return leftOperand;
    }

    public AstNodeType operator() {
      return astNode.getChild(index + 1).getType();
    }

    public ExpressionTree rightOperand() {
      return rightOperand;
    }

    @Override
    protected void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, BinaryOperatorTree.class);
      scan(leftOperand, visitors);
      scan(rightOperand, visitors);
      visitors.leave(this, BinaryOperatorTree.class);
    }
  }

  public static class UnaryOperatorTreeImpl extends TreeImpl implements UnaryOperatorTree {
    private final AstNodeType operator;
    private final ExpressionTree operand;

    public UnaryOperatorTreeImpl(AstNode astNode, AstNodeType operator, ExpressionTree operand) {
      super(astNode);
      this.operator = Preconditions.checkNotNull(operator);
      this.operand = Preconditions.checkNotNull(operand);
    }

    public AstNodeType operator() {
      return operator;
    }

    public ExpressionTree operand() {
      return operand;
    }

    @Override
    protected void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, BinaryOperatorTree.class);
      scan(operand, visitors);
      visitors.leave(this, BinaryOperatorTree.class);
    }
  }

  public static class CommaOperatorTreeImpl extends TreeImpl implements CommaOperatorTree {
    private final List<? extends ExpressionTree> expressions;

    public CommaOperatorTreeImpl(AstNode astNode, List<? extends ExpressionTree> expressions) {
      super(astNode);
      this.expressions = Preconditions.checkNotNull(expressions);
    }

    public List<? extends ExpressionTree> expressions() {
      return expressions;
    }

    @Override
    protected void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, CommaOperatorTree.class);
      scan(expressions, visitors);
      visitors.leave(this, CommaOperatorTree.class);
    }
  }

  public static class ConditionalOperatorTreeImpl extends TreeImpl implements ConditionalOperatorTree {
    private final ExpressionTree condition;
    private final ExpressionTree thenExpression;
    private final ExpressionTree elseExpression;

    public ConditionalOperatorTreeImpl(AstNode astNode, ExpressionTree condition, ExpressionTree thenExpression, ExpressionTree elseExpression) {
      super(astNode);
      this.condition = Preconditions.checkNotNull(condition);
      this.thenExpression = Preconditions.checkNotNull(thenExpression);
      this.elseExpression = Preconditions.checkNotNull(elseExpression);
    }

    public ExpressionTree condition() {
      return condition;
    }

    public ExpressionTree thenExpression() {
      return thenExpression;
    }

    public ExpressionTree elseExpression() {
      return elseExpression;
    }

    @Override
    protected void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, ConditionalOperatorTree.class);
      scan(condition, visitors);
      scan(thenExpression, visitors);
      scan(elseExpression, visitors);
      visitors.leave(this, CommaOperatorTree.class);
    }
  }

  // Statements

  public static class BlockTreeImpl extends TreeImpl implements BlockTree {
    private final List<? extends StatementTree> statements;

    public BlockTreeImpl(AstNode astNode, List<? extends StatementTree> statements) {
      super(astNode);
      this.statements = Preconditions.checkNotNull(statements);
    }

    public List<? extends StatementTree> statements() {
      return statements;
    }

    @Override
    public void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, BlockTree.class);
      scan(statements, visitors);
      visitors.leave(this, BlockTree.class);
    }
  }

  public static class VariableStatementTreeImpl extends TreeImpl implements VariableStatementTree {
    private final List<VariableDeclarationTree> declarations;

    public VariableStatementTreeImpl(AstNode astNode, List<VariableDeclarationTree> declarations) {
      super(astNode);
      this.declarations = Preconditions.checkNotNull(declarations);
    }

    public List<VariableDeclarationTree> declarations() {
      return declarations;
    }

    @Override
    protected void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, VariableStatementTree.class);
      scan(declarations, visitors);
      visitors.leave(this, VariableStatementTree.class);
    }
  }

  public static class VariableDeclarationTreeImpl extends TreeImpl implements VariableDeclarationTree {
    private final IdentifierTree identifier;
    private final ExpressionTree initialiser;

    public VariableDeclarationTreeImpl(AstNode astNode, IdentifierTree identifier, @Nullable ExpressionTree initialiser) {
      super(astNode);
      this.identifier = Preconditions.checkNotNull(identifier);
      this.initialiser = initialiser;
    }

    public IdentifierTree identifier() {
      return identifier;
    }

    @Nullable
    public ExpressionTree initialiser() {
      return initialiser;
    }

    @Override
    protected void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, VariableDeclarationTree.class);
      scan(identifier, visitors);
      scan(initialiser, visitors);
      visitors.leave(this, VariableDeclarationTree.class);
    }
  }

  public static class BreakStatementTreeImpl extends TreeImpl implements BreakStatementTree {
    private final IdentifierTree label;

    public BreakStatementTreeImpl(AstNode astNode, @Nullable IdentifierTree label) {
      super(astNode);
      this.label = label;
    }

    @Nullable
    public IdentifierTree label() {
      return label;
    }

    @Override
    public void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, BreakStatementTree.class);
      scan(label, visitors);
      visitors.leave(this, BreakStatementTree.class);
    }
  }

  public static class ContinueStatementTreeImpl extends TreeImpl implements ContinueStatementTree {
    private final IdentifierTree label;

    public ContinueStatementTreeImpl(AstNode astNode, @Nullable IdentifierTree label) {
      super(astNode);
      this.label = label;
    }

    @Nullable
    public IdentifierTree label() {
      return label;
    }

    @Override
    public void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, ContinueStatementTree.class);
      scan(label, visitors);
      visitors.leave(this, ContinueStatementTree.class);
    }
  }

  public static class DebuggerStatementTreeImpl extends TreeImpl implements DebuggerStatementTree {
    public DebuggerStatementTreeImpl(AstNode astNode) {
      super(astNode);
    }

    @Override
    public void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, DebuggerStatementTree.class);
      visitors.leave(this, DebuggerStatementTree.class);
    }
  }

  public static class EmptyStatementTreeImpl extends TreeImpl implements EmptyStatementTree {
    public EmptyStatementTreeImpl(AstNode astNode) {
      super(astNode);
    }

    @Override
    public void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, EmptyStatementTree.class);
      visitors.leave(this, EmptyStatementTree.class);
    }
  }

  public static class ExpressionStatementTreeImpl extends TreeImpl implements ExpressionStatementTree {
    private final ExpressionTree expression;

    public ExpressionStatementTreeImpl(AstNode astNode, ExpressionTree expression) {
      super(astNode);
      this.expression = Preconditions.checkNotNull(expression);
    }

    public ExpressionTree expression() {
      return expression;
    }

    @Override
    public void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, ExpressionStatementTree.class);
      scan(expression, visitors);
      visitors.leave(this, ExpressionStatementTree.class);
    }
  }

  public static class IfStatementTreeImpl extends TreeImpl implements org.sonar.javascript.model.IfStatementTree {
    private final ExpressionTree condition;
    private final StatementTree thenStatement;
    private final StatementTree elseStatement;

    public IfStatementTreeImpl(AstNode astNode, ExpressionTree condition, StatementTree thenStatement, @Nullable StatementTree elseStatement) {
      super(astNode);
      this.condition = Preconditions.checkNotNull(condition);
      this.thenStatement = Preconditions.checkNotNull(thenStatement);
      this.elseStatement = elseStatement;
    }

    public ExpressionTree condition() {
      return condition;
    }

    public StatementTree thenStatement() {
      return thenStatement;
    }

    @Nullable
    public StatementTree elseStatement() {
      return elseStatement;
    }

    @Override
    public void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, IfStatementTree.class);
      scan(condition, visitors);
      scan(thenStatement, visitors);
      scan(elseStatement, visitors);
      visitors.leave(this, IfStatementTree.class);
    }
  }

  public static class LabelledStatementTreeImpl extends TreeImpl implements LabelledStatementTree {
    private final IdentifierTree label;
    private final StatementTree statement;

    public LabelledStatementTreeImpl(AstNode astNode, IdentifierTree label, StatementTree statement) {
      super(astNode);
      this.label = Preconditions.checkNotNull(label);
      this.statement = Preconditions.checkNotNull(statement);
    }

    public IdentifierTree label() {
      return label;
    }

    public StatementTree statement() {
      return statement;
    }

    @Override
    public void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, LabelledStatementTree.class);
      scan(label, visitors);
      scan(statement, visitors);
      visitors.leave(this, LabelledStatementTree.class);
    }
  }

  public static class ReturnStatementTreeImpl extends TreeImpl implements ReturnStatementTree {
    private final ExpressionTree expression;

    public ReturnStatementTreeImpl(AstNode astNode, @Nullable ExpressionTree expression) {
      super(astNode);
      this.expression = expression;
    }

    @Nullable
    public ExpressionTree expression() {
      return expression;
    }

    @Override
    public void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, ReturnStatementTree.class);
      scan(expression, visitors);
      visitors.leave(this, ReturnStatementTree.class);
    }
  }

  public static class ThrowStatementTreeImpl extends TreeImpl implements ThrowStatementTree {
    private final ExpressionTree expression;

    public ThrowStatementTreeImpl(AstNode astNode, ExpressionTree expression) {
      super(astNode);
      this.expression = Preconditions.checkNotNull(expression);
    }

    public ExpressionTree expression() {
      return expression;
    }

    @Override
    public void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, ThrowStatementTree.class);
      scan(expression, visitors);
      visitors.leave(this, ThrowStatementTree.class);
    }
  }

  public static class WhileStatementTreeImpl extends TreeImpl implements WhileStatementTree {
    private final ExpressionTree condition;
    private final StatementTree statement;

    public WhileStatementTreeImpl(AstNode astNode, ExpressionTree condition, StatementTree statement) {
      super(astNode);
      this.condition = Preconditions.checkNotNull(condition);
      this.statement = Preconditions.checkNotNull(statement);
    }

    public ExpressionTree condition() {
      return condition;
    }

    public StatementTree statement() {
      return statement;
    }

    @Override
    public void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, WhileStatementTree.class);
      scan(condition, visitors);
      scan(statement, visitors);
      visitors.leave(this, WhileStatementTree.class);
    }
  }

  public static class DoWhileStatementTreeImpl extends TreeImpl implements DoWhileStatementTree {
    private final StatementTree statement;
    private final ExpressionTree condition;

    public DoWhileStatementTreeImpl(AstNode astNode, StatementTree statement, ExpressionTree condition) {
      super(astNode);
      this.statement = Preconditions.checkNotNull(statement);
      this.condition = Preconditions.checkNotNull(condition);
    }

    public StatementTree statement() {
      return statement;
    }

    public ExpressionTree condition() {
      return condition;
    }

    @Override
    public void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, DoWhileStatementTree.class);
      scan(statement, visitors);
      scan(condition, visitors);
      visitors.leave(this, DoWhileStatementTree.class);
    }
  }

  public static class ForStatementTreeImpl extends TreeImpl implements ForStatementTree {
    private final List<VariableDeclarationTree> initVariables;
    private final ExpressionTree initExpression;
    private final ExpressionTree condition;
    private final ExpressionTree incrementExpression;
    private final StatementTree statement;

    public ForStatementTreeImpl(AstNode astNode, List<VariableDeclarationTree> initVariables, @Nullable ExpressionTree condition, @Nullable ExpressionTree incrementExpression, StatementTree statement) {
      super(astNode);
      this.initExpression = null;
      this.initVariables = Preconditions.checkNotNull(initVariables);
      this.condition = condition;
      this.incrementExpression = incrementExpression;
      this.statement = Preconditions.checkNotNull(statement);
    }

    public ForStatementTreeImpl(AstNode astNode, @Nullable ExpressionTree initExpression, @Nullable ExpressionTree condition, @Nullable ExpressionTree incrementExpression, StatementTree statement) {
      super(astNode);
      this.initVariables = null;
      this.initExpression = initExpression;
      this.condition = condition;
      this.incrementExpression = incrementExpression;
      this.statement = Preconditions.checkNotNull(statement);
    }

    @Nullable
    public List<VariableDeclarationTree> initVariables() {
      return initVariables;
    }

    @Nullable
    public ExpressionTree initExpression() {
      return initExpression;
    }

    @Nullable
    public ExpressionTree condition() {
      return condition;
    }

    @Nullable
    public ExpressionTree incrementExpression() {
      return incrementExpression;
    }

    public StatementTree statement() {
      return statement;
    }

    @Override
    public void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, ForStatementTree.class);
      scan(initVariables, visitors);
      scan(initExpression, visitors);
      scan(condition, visitors);
      scan(incrementExpression, visitors);
      scan(statement, visitors);
      visitors.leave(this, ForStatementTree.class);
    }
  }

  public static class ForInStatementTreeImpl extends TreeImpl implements ForInStatementTree {
    private final List<VariableDeclarationTree> initVariables;
    private final ExpressionTree leftHandSideExpression;
    private final ExpressionTree expression;
    private final StatementTree statement;

    public ForInStatementTreeImpl(AstNode astNode, List<VariableDeclarationTree> initVariables, ExpressionTree expression, StatementTree statement) {
      super(astNode);
      this.initVariables = Preconditions.checkNotNull(initVariables);
      this.leftHandSideExpression = null;
      this.expression = Preconditions.checkNotNull(expression);
      this.statement = Preconditions.checkNotNull(statement);
    }

    public ForInStatementTreeImpl(AstNode astNode, ExpressionTree leftHandSideExpression, ExpressionTree expression, StatementTree statement) {
      super(astNode);
      this.initVariables = null;
      this.leftHandSideExpression = Preconditions.checkNotNull(leftHandSideExpression);
      this.expression = Preconditions.checkNotNull(expression);
      this.statement = Preconditions.checkNotNull(statement);
    }

    @Nullable
    public List<VariableDeclarationTree> initVariables() {
      return initVariables;
    }

    @Nullable
    public ExpressionTree leftHandSideExpression() {
      return leftHandSideExpression;
    }

    public ExpressionTree expression() {
      return expression;
    }

    public StatementTree statement() {
      return statement;
    }

    @Override
    public void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, ForInStatementTree.class);
      scan(initVariables, visitors);
      scan(leftHandSideExpression, visitors);
      scan(expression, visitors);
      scan(statement, visitors);
      visitors.leave(this, ForInStatementTree.class);
    }
  }

  public static class WithStatementTreeImpl extends TreeImpl implements WithStatementTree {
    private final ExpressionTree expression;
    private final StatementTree statement;

    public WithStatementTreeImpl(AstNode astNode, ExpressionTree expression, StatementTree statement) {
      super(astNode);
      this.expression = Preconditions.checkNotNull(expression);
      this.statement = Preconditions.checkNotNull(statement);
    }

    public ExpressionTree expression() {
      return expression;
    }

    public StatementTree statement() {
      return statement;
    }

    @Override
    public void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, WithStatementTree.class);
      scan(expression, visitors);
      scan(statement, visitors);
      visitors.leave(this, WithStatementTree.class);
    }
  }

  public static class SwitchStatementTreeImpl extends TreeImpl implements SwitchStatementTree {
    private final ExpressionTree expression;
    private final List<CaseClauseTree> cases;

    public SwitchStatementTreeImpl(AstNode astNode, ExpressionTree expression, List<CaseClauseTree> cases) {
      super(astNode);
      this.expression = Preconditions.checkNotNull(expression);
      this.cases = Preconditions.checkNotNull(cases);
    }

    public ExpressionTree expression() {
      return expression;
    }

    public List<CaseClauseTree> cases() {
      return cases;
    }

    @Override
    public void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, SwitchStatementTree.class);
      scan(expression, visitors);
      scan(cases, visitors);
      visitors.leave(this, SwitchStatementTree.class);
    }
  }

  public static class CaseClauseTreeImpl extends TreeImpl implements CaseClauseTree {
    private final ExpressionTree expression;
    private List<? extends StatementTree> statements;

    public CaseClauseTreeImpl(AstNode astNode, @Nullable ExpressionTree expression, List<? extends StatementTree> statements) {
      super(astNode);
      this.expression = expression;
      this.statements = Preconditions.checkNotNull(statements);
    }

    @Nullable
    public ExpressionTree expression() {
      return expression;
    }

    public List<? extends StatementTree> statements() {
      return statements;
    }

    @Override
    public void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, CaseClauseTree.class);
      scan(expression, visitors);
      scan(statements, visitors);
      visitors.leave(this, CaseClauseTree.class);
    }
  }

  public static class TryStatementTreeImpl extends TreeImpl implements TryStatementTree {
    private final BlockTree block;
    private final CatchBlockTree catchBlock;
    private final BlockTree finallyBlock;

    public TryStatementTreeImpl(AstNode astNode, BlockTree block, @Nullable CatchBlockTree catchBlock, @Nullable BlockTree finallyBlock) {
      super(astNode);
      this.block = Preconditions.checkNotNull(block);
      this.catchBlock = catchBlock;
      this.finallyBlock = finallyBlock;
    }

    public BlockTree block() {
      return block;
    }

    @Nullable
    public CatchBlockTree catchBlock() {
      return catchBlock;
    }

    @Nullable
    public BlockTree finallyBlock() {
      return finallyBlock;
    }

    @Override
    public void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, TryStatementTree.class);
      scan(block, visitors);
      scan(catchBlock, visitors);
      scan(finallyBlock, visitors);
      visitors.leave(this, TryStatementTree.class);
    }
  }

  public static class CatchBlockTreeImpl extends TreeImpl implements CatchBlockTree {
    private final IdentifierTree identifier;
    private final BlockTree block;

    public CatchBlockTreeImpl(AstNode astNode, IdentifierTree identifier, BlockTree block) {
      super(astNode);
      this.identifier = Preconditions.checkNotNull(identifier);
      this.block = Preconditions.checkNotNull(block);
    }

    public IdentifierTree identifier() {
      return identifier;
    }

    public BlockTree block() {
      return block;
    }

    @Override
    public void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, CatchBlockTree.class);
      scan(identifier, visitors);
      scan(block, visitors);
      visitors.leave(this, CatchBlockTree.class);
    }
  }

  // Functions and Programs

  public static class ProgramTreeImpl extends TreeImpl implements ProgramTree {
    private final List<? extends SourceElementTree> sourceElements;

    public ProgramTreeImpl(AstNode astNode, List<? extends SourceElementTree> sourceElements) {
      super(astNode);
      this.sourceElements = Preconditions.checkNotNull(sourceElements);
    }

    public List<? extends SourceElementTree> sourceElements() {
      return sourceElements;
    }

    @Override
    protected void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, ProgramTree.class);
      scan(sourceElements, visitors);
      visitors.leave(this, ProgramTree.class);
    }
  }

  public static class FunctionTreeImpl extends TreeImpl implements FunctionTree {
    private final IdentifierTree identifier;
    private final List<IdentifierTree> formalParameterList;
    private final List<? extends SourceElementTree> body;

    public FunctionTreeImpl(AstNode astNode, @Nullable IdentifierTree identifier, List<IdentifierTree> formalParameterList, List<? extends SourceElementTree> body) {
      super(astNode);
      this.identifier = identifier;
      this.formalParameterList = Preconditions.checkNotNull(formalParameterList);
      this.body = Preconditions.checkNotNull(body);
    }

    @Nullable
    public IdentifierTree identifier() {
      return identifier;
    }

    public List<IdentifierTree> formalParameterList() {
      return formalParameterList;
    }

    public List<? extends SourceElementTree> body() {
      return body;
    }

    @Override
    protected void accept(VisitorsDispatcher visitors) {
      visitors.visit(this, FunctionTree.class);
      scan(identifier, visitors);
      scan(formalParameterList, visitors);
      scan(body, visitors);
      visitors.leave(this, FunctionTree.class);
    }
  }

}
