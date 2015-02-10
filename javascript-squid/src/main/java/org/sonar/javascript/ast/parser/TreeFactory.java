/*
 * SonarQube JavaScript Plugin
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
package org.sonar.javascript.ast.parser;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.apache.commons.collections.ListUtils;
import org.sonar.javascript.api.EcmaScriptKeyword;
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.model.implementations.SeparatedList;
import org.sonar.javascript.model.implementations.declaration.ArrayBindingPatternTreeImpl;
import org.sonar.javascript.model.implementations.declaration.BindingPropertyTreeImpl;
import org.sonar.javascript.model.implementations.declaration.DefaultExportDeclarationTreeImpl;
import org.sonar.javascript.model.implementations.declaration.ExportClauseTreeImpl;
import org.sonar.javascript.model.implementations.declaration.FromClauseTreeImpl;
import org.sonar.javascript.model.implementations.declaration.FunctionDeclarationTreeImpl;
import org.sonar.javascript.model.implementations.declaration.ImportClauseTreeImpl;
import org.sonar.javascript.model.implementations.declaration.ImportDeclarationTreeImpl;
import org.sonar.javascript.model.implementations.declaration.ImportModuleDeclarationTreeImpl;
import org.sonar.javascript.model.implementations.declaration.InitializedBindingElementTreeImpl;
import org.sonar.javascript.model.implementations.declaration.MethodDeclarationTreeImpl;
import org.sonar.javascript.model.implementations.declaration.ModuleTreeImpl;
import org.sonar.javascript.model.implementations.declaration.NameSpaceExportDeclarationTreeImpl;
import org.sonar.javascript.model.implementations.declaration.NameSpaceSpecifierTreeImpl;
import org.sonar.javascript.model.implementations.declaration.NamedExportDeclarationTreeImpl;
import org.sonar.javascript.model.implementations.declaration.ObjectBindingPatternTreeImpl;
import org.sonar.javascript.model.implementations.declaration.ParameterListTreeImpl;
import org.sonar.javascript.model.implementations.declaration.ScriptTreeImpl;
import org.sonar.javascript.model.implementations.declaration.SpecifierListTreeImpl;
import org.sonar.javascript.model.implementations.declaration.SpecifierTreeImpl;
import org.sonar.javascript.model.implementations.expression.ArrayLiteralTreeImpl;
import org.sonar.javascript.model.implementations.expression.ArrowFunctionTreeImpl;
import org.sonar.javascript.model.implementations.expression.AssignmentExpressionTreeImpl;
import org.sonar.javascript.model.implementations.expression.BinaryExpressionTreeImpl;
import org.sonar.javascript.model.implementations.expression.BracketMemberExpressionTreeImpl;
import org.sonar.javascript.model.implementations.expression.CallExpressionTreeImpl;
import org.sonar.javascript.model.implementations.expression.ClassTreeImpl;
import org.sonar.javascript.model.implementations.expression.ComputedPropertyNameTreeImpl;
import org.sonar.javascript.model.implementations.expression.ConditionalExpressionTreeImpl;
import org.sonar.javascript.model.implementations.expression.DotMemberExpressionTreeImpl;
import org.sonar.javascript.model.implementations.expression.FunctionExpressionTreeImpl;
import org.sonar.javascript.model.implementations.expression.IdentifierTreeImpl;
import org.sonar.javascript.model.implementations.expression.LiteralTreeImpl;
import org.sonar.javascript.model.implementations.expression.NewExpressionTreeImpl;
import org.sonar.javascript.model.implementations.expression.ObjectLiteralTreeImpl;
import org.sonar.javascript.model.implementations.expression.PairPropertyTreeImpl;
import org.sonar.javascript.model.implementations.expression.ParenthesisedExpressionTreeImpl;
import org.sonar.javascript.model.implementations.expression.PostfixExpressionTreeImpl;
import org.sonar.javascript.model.implementations.expression.PrefixExpressionTreeImpl;
import org.sonar.javascript.model.implementations.expression.RestElementTreeImpl;
import org.sonar.javascript.model.implementations.expression.SuperTreeImpl;
import org.sonar.javascript.model.implementations.expression.TaggedTemplateTreeImpl;
import org.sonar.javascript.model.implementations.expression.TemplateCharactersTreeImpl;
import org.sonar.javascript.model.implementations.expression.TemplateExpressionTreeImpl;
import org.sonar.javascript.model.implementations.expression.TemplateLiteralTreeImpl;
import org.sonar.javascript.model.implementations.expression.ThisTreeImpl;
import org.sonar.javascript.model.implementations.expression.UndefinedTreeImpl;
import org.sonar.javascript.model.implementations.expression.YieldExpressionTreeImpl;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.implementations.statement.BlockTreeImpl;
import org.sonar.javascript.model.implementations.statement.BreakStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.CaseClauseTreeImpl;
import org.sonar.javascript.model.implementations.statement.CatchBlockTreeImpl;
import org.sonar.javascript.model.implementations.statement.ContinueStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.DebuggerStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.DefaultClauseTreeImpl;
import org.sonar.javascript.model.implementations.statement.DoWhileStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.ElseClauseTreeImpl;
import org.sonar.javascript.model.implementations.statement.EmptyStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.ExpressionStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.ForInStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.ForOfStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.ForStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.IfStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.LabelledStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.ReturnStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.SwitchStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.ThrowStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.TryStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.VariableDeclarationTreeImpl;
import org.sonar.javascript.model.implementations.statement.VariableStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.WhileStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.WithStatementTreeImpl;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.declaration.BindingElementTree;
import org.sonar.javascript.model.interfaces.declaration.DeclarationTree;
import org.sonar.javascript.model.interfaces.declaration.ImportClauseTree;
import org.sonar.javascript.model.interfaces.declaration.ImportModuleDeclarationTree;
import org.sonar.javascript.model.interfaces.declaration.MethodDeclarationTree;
import org.sonar.javascript.model.interfaces.declaration.NameSpaceExportDeclarationTree;
import org.sonar.javascript.model.interfaces.declaration.ParameterListTree;
import org.sonar.javascript.model.interfaces.declaration.SpecifierTree;
import org.sonar.javascript.model.interfaces.expression.BracketMemberExpressionTree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.expression.MemberExpressionTree;
import org.sonar.javascript.model.interfaces.expression.TemplateCharactersTree;
import org.sonar.javascript.model.interfaces.expression.TemplateExpressionTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;
import org.sonar.javascript.model.interfaces.statement.StatementTree;
import org.sonar.javascript.model.interfaces.statement.SwitchClauseTree;
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.javascript.parser.sslr.Optional;

import com.google.common.base.Preconditions;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.AstNodeType;

public class TreeFactory {

  private static final Map<EcmaScriptPunctuator, Kind> EXPRESSION_KIND_BY_PUNCTUATORS = Maps.newEnumMap(EcmaScriptPunctuator.class);

  static {
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.OROR, Kind.CONDITIONAL_OR);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.ANDAND, Kind.CONDITIONAL_AND);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.OR, Kind.BITWISE_OR);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.XOR, Kind.BITWISE_XOR);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.AND, Kind.BITWISE_AND);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.EQUAL, Kind.EQUAL_TO);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.NOTEQUAL, Kind.NOT_EQUAL_TO);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.EQUAL2, Kind.STRICT_EQUAL_TO);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.NOTEQUAL2, Kind.STRICT_NOT_EQUAL_TO);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.LT, Kind.LESS_THAN);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.GT, Kind.GREATER_THAN);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.LE, Kind.LESS_THAN_OR_EQUAL_TO);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.GE, Kind.GREATER_THAN_OR_EQUAL_TO);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.SL, Kind.LEFT_SHIFT);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.SR, Kind.RIGHT_SHIFT);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.SR2, Kind.UNSIGNED_RIGHT_SHIFT);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.PLUS, Kind.PLUS);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.MINUS, Kind.MINUS);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.STAR, Kind.MULTIPLY);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.DIV, Kind.DIVIDE);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.MOD, Kind.REMAINDER);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.EQU, Kind.ASSIGNMENT);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.STAR_EQU, Kind.MULTIPLY_ASSIGNMENT);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.DIV_EQU, Kind.DIVIDE_ASSIGNMENT);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.MOD_EQU, Kind.REMAINDER_ASSIGNMENT);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.PLUS_EQU, Kind.PLUS_ASSIGNMENT);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.MINUS_EQU, Kind.MINUS_ASSIGNMENT);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.SL_EQU, Kind.LEFT_SHIFT_ASSIGNMENT);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.SR_EQU, Kind.RIGHT_SHIFT_ASSIGNMENT);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.SR_EQU2, Kind.UNSIGNED_RIGHT_SHIFT_ASSIGNMENT);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.AND_EQU, Kind.AND_ASSIGNMENT);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.XOR_EQU, Kind.XOR_ASSIGNMENT);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.OR_EQU, Kind.OR_ASSIGNMENT);
    EXPRESSION_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.COMMA, Kind.COMMA_OPERATOR);
  }

  private static final Map<EcmaScriptKeyword, Kind> EXPRESSION_KIND_BY_KEYWORDS = Maps.newEnumMap(EcmaScriptKeyword.class);

  static {
    EXPRESSION_KIND_BY_KEYWORDS.put(EcmaScriptKeyword.INSTANCEOF, Kind.INSTANCE_OF);
    EXPRESSION_KIND_BY_KEYWORDS.put(EcmaScriptKeyword.IN, Kind.RELATIONAL_IN);
  }

  private static final Map<EcmaScriptPunctuator, Kind> PREFIX_KIND_BY_PUNCTUATORS = Maps.newEnumMap(EcmaScriptPunctuator.class);

  static {
    PREFIX_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.INC, Kind.PREFIX_INCREMENT);
    PREFIX_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.DEC, Kind.PREFIX_DECREMENT);
    PREFIX_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.PLUS, Kind.UNARY_PLUS);
    PREFIX_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.MINUS, Kind.UNARY_MINUS);
    PREFIX_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.TILDA, Kind.BITWISE_COMPLEMENT);
    PREFIX_KIND_BY_PUNCTUATORS.put(EcmaScriptPunctuator.BANG, Kind.LOGICAL_COMPLEMENT);
  }

  private static final Map<EcmaScriptKeyword, Kind> PREFIX_KIND_BY_KEYWORDS = Maps.newEnumMap(EcmaScriptKeyword.class);

  static {
    PREFIX_KIND_BY_KEYWORDS.put(EcmaScriptKeyword.DELETE, Kind.DELETE);
    PREFIX_KIND_BY_KEYWORDS.put(EcmaScriptKeyword.VOID, Kind.VOID);
    PREFIX_KIND_BY_KEYWORDS.put(EcmaScriptKeyword.TYPEOF, Kind.TYPEOF);
  }

  private Kind getBinaryOperator(AstNodeType punctuator) {
    Kind kind = EXPRESSION_KIND_BY_PUNCTUATORS.get(punctuator);
    if (kind == null) {
      kind = EXPRESSION_KIND_BY_KEYWORDS.get(punctuator);
      if (kind == null) {
        throw new IllegalArgumentException("Mapping not found for binary operator " + punctuator);
      }
    }
    return kind;
  }

  private Kind getPrefixOperator(AstNodeType punctuator) {
    Kind kind = PREFIX_KIND_BY_PUNCTUATORS.get(punctuator);
    if (kind == null) {
      kind = PREFIX_KIND_BY_KEYWORDS.get(punctuator);
      if (kind == null) {
        throw new IllegalArgumentException("Mapping not found for unary operator " + punctuator);
      }
    }
    return kind;
  }

  // Statements

  public EmptyStatementTreeImpl emptyStatement(AstNode semicolon) {
    return new EmptyStatementTreeImpl(InternalSyntaxToken.create(semicolon));
  }

  public DebuggerStatementTreeImpl debuggerStatement(AstNode debuggerWord, AstNode eos) {
    return new DebuggerStatementTreeImpl(InternalSyntaxToken.create(debuggerWord), eos);
  }

  public VariableStatementTreeImpl variableStatement(VariableDeclarationTreeImpl declaration, AstNode eosToken) {
    return new VariableStatementTreeImpl(declaration, eosToken);
  }

  private VariableDeclarationTreeImpl variableDeclaration(AstNode token, SeparatedList<BindingElementTree> variables) {
    Kind kind;
    if (token.is(EcmaScriptKeyword.VAR)) {
      kind = Kind.VAR_DECLARATION;
    } else if (token.is(EcmaScriptGrammar.LET)) {
      kind = Kind.LET_DECLARATION;
    } else if (token.is(EcmaScriptKeyword.CONST)) {
      kind = Kind.CONST_DECLARATION;
    } else {
      throw new UnsupportedOperationException("Unsupported type: " + token.getType() + ", " + token);
    }
    return new VariableDeclarationTreeImpl(kind, InternalSyntaxToken.create(token), variables, variables.getChildren());
  }

  public VariableDeclarationTreeImpl variableDeclaration1(AstNode token, SeparatedList<BindingElementTree> variables) {
    return variableDeclaration(token, variables);
  }

  public VariableDeclarationTreeImpl variableDeclaration2(AstNode token, SeparatedList<BindingElementTree> variables) {
    return variableDeclaration(token, variables);
  }

  private SeparatedList<BindingElementTree> bindingElementList(BindingElementTree element, Optional<List<Tuple<AstNode, BindingElementTree>>> rest) {
    List<AstNode> children = Lists.newArrayList();

    ImmutableList.Builder<BindingElementTree> elements = ImmutableList.builder();
    ImmutableList.Builder<InternalSyntaxToken> commas = ImmutableList.builder();

    children.add((AstNode) element);
    elements.add(element);

    if (rest.isPresent()) {
      for (Tuple<AstNode, BindingElementTree> pair : rest.get()) {
        InternalSyntaxToken commaToken = InternalSyntaxToken.create(pair.first());
        children.add(commaToken);
        children.add((AstNode) pair.second());

        commas.add(commaToken);
        elements.add(pair.second());
      }
    }

    return new SeparatedList<BindingElementTree>(elements.build(), commas.build(), children);
  }

  public SeparatedList<BindingElementTree> bindingElementList1(BindingElementTree element, Optional<List<Tuple<AstNode, BindingElementTree>>> rest) {
    return bindingElementList(element, rest);
  }

  public SeparatedList<BindingElementTree> bindingElementList2(BindingElementTree element, Optional<List<Tuple<AstNode, BindingElementTree>>> rest) {
    return bindingElementList(element, rest);
  }

  public LabelledStatementTreeImpl labelledStatement(IdentifierTreeImpl identifier, AstNode colon, StatementTree statement) {
    return new LabelledStatementTreeImpl(identifier, InternalSyntaxToken.create(colon), statement);
  }

  public ContinueStatementTreeImpl completeContinueStatement(AstNode continueToken, ContinueStatementTreeImpl labelOrEndOfStatement) {
    return labelOrEndOfStatement.complete(InternalSyntaxToken.create(continueToken));
  }

  public ContinueStatementTreeImpl newContinueWithLabel(AstNode identifier, AstNode eos) {
    return new ContinueStatementTreeImpl((IdentifierTreeImpl) identifier, eos);
  }

  public ContinueStatementTreeImpl newContinueWithoutLabel(AstNode eos) {
    return new ContinueStatementTreeImpl(eos);
  }

  public BreakStatementTreeImpl completeBreakStatement(AstNode breakToken, BreakStatementTreeImpl labelOrEndOfStatement) {
    return labelOrEndOfStatement.complete(InternalSyntaxToken.create(breakToken));
  }

  public BreakStatementTreeImpl newBreakWithLabel(AstNode identifier, AstNode eos) {
    return new BreakStatementTreeImpl((IdentifierTreeImpl) identifier, eos);
  }

  public BreakStatementTreeImpl newBreakWithoutLabel(AstNode eos) {
    return new BreakStatementTreeImpl(eos);
  }

  public ReturnStatementTreeImpl completeReturnStatement(AstNode returnToken, ReturnStatementTreeImpl expressionOrEndOfStatement) {
    return expressionOrEndOfStatement.complete(InternalSyntaxToken.create(returnToken));
  }

  public ReturnStatementTreeImpl newReturnWithExpression(ExpressionTree expression, AstNode eos) {
    return new ReturnStatementTreeImpl(expression, eos);
  }

  public ReturnStatementTreeImpl newReturnWithoutExpression(AstNode eos) {
    return new ReturnStatementTreeImpl(eos);
  }

  public ThrowStatementTreeImpl newThrowStatement(AstNode throwToken, ExpressionTree expression, AstNode eos) {
    return new ThrowStatementTreeImpl(InternalSyntaxToken.create(throwToken), expression, eos);
  }

  public WithStatementTreeImpl newWithStatement(AstNode withToken, AstNode openingParen, ExpressionTree expression, AstNode closingParen, StatementTree statement) {
    return new WithStatementTreeImpl(InternalSyntaxToken.create(withToken), InternalSyntaxToken.create(openingParen), expression, InternalSyntaxToken.create(closingParen),
      statement);
  }

  public BlockTreeImpl newBlock(AstNode openingCurlyBrace, Optional<List<StatementTree>> statements, AstNode closingCurlyBrace) {
    if (statements.isPresent()) {
      return new BlockTreeImpl(InternalSyntaxToken.create(openingCurlyBrace), statements.get(), InternalSyntaxToken.create(closingCurlyBrace));
    }
    return new BlockTreeImpl(InternalSyntaxToken.create(openingCurlyBrace), InternalSyntaxToken.create(closingCurlyBrace));
  }

  public TryStatementTreeImpl newTryStatementWithCatch(CatchBlockTreeImpl catchBlock, Optional<TryStatementTreeImpl> partial) {
    if (partial.isPresent()) {
      return partial.get().complete(catchBlock);
    }
    return new TryStatementTreeImpl(catchBlock);
  }

  public TryStatementTreeImpl newTryStatementWithFinally(AstNode finallyKeyword, BlockTreeImpl block) {
    return new TryStatementTreeImpl(InternalSyntaxToken.create(finallyKeyword), block);
  }

  public TryStatementTreeImpl completeTryStatement(AstNode tryToken, BlockTreeImpl block, TryStatementTreeImpl catchFinallyBlock) {
    return catchFinallyBlock.complete(InternalSyntaxToken.create(tryToken), block);
  }

  public CatchBlockTreeImpl newCatchBlock(AstNode catchToken, AstNode lparenToken, BindingElementTree catchParameter, AstNode rparenToken, BlockTreeImpl block) {
    return new CatchBlockTreeImpl(
      InternalSyntaxToken.create(catchToken),
      InternalSyntaxToken.create(lparenToken),
      catchParameter,
      InternalSyntaxToken.create(rparenToken),
      block);
  }

  public SwitchStatementTreeImpl newSwitchStatement(AstNode openCurlyBrace, Optional<List<CaseClauseTreeImpl>> caseClauseList,
    Optional<Tuple<DefaultClauseTreeImpl, Optional<List<CaseClauseTreeImpl>>>> defaultAndRestCases, AstNode closeCurlyBrace) {
    List<SwitchClauseTree> cases = Lists.newArrayList();

    // First case list
    if (caseClauseList.isPresent()) {
      cases.addAll(caseClauseList.get());
    }

    // default case
    if (defaultAndRestCases.isPresent()) {
      cases.add(defaultAndRestCases.get().first());

      // case list following default
      if (defaultAndRestCases.get().second().isPresent()) {
        cases.addAll(defaultAndRestCases.get().second().get());
      }
    }

    return new SwitchStatementTreeImpl(InternalSyntaxToken.create(openCurlyBrace), cases, InternalSyntaxToken.create(closeCurlyBrace));
  }

  public SwitchStatementTreeImpl completeSwitchStatement(AstNode switchToken, AstNode openParenthesis, ExpressionTree expression, AstNode closeParenthesis,
    SwitchStatementTreeImpl caseBlock) {

    return caseBlock.complete(
      InternalSyntaxToken.create(switchToken),
      InternalSyntaxToken.create(openParenthesis),
      expression,
      InternalSyntaxToken.create(closeParenthesis));
  }

  public DefaultClauseTreeImpl defaultClause(AstNode defaultToken, AstNode colonToken, Optional<List<StatementTree>> statements) {
    if (statements.isPresent()) {
      return new DefaultClauseTreeImpl(InternalSyntaxToken.create(defaultToken), InternalSyntaxToken.create(colonToken), statements.get());
    }
    return new DefaultClauseTreeImpl(InternalSyntaxToken.create(defaultToken), InternalSyntaxToken.create(colonToken));
  }

  public CaseClauseTreeImpl caseClause(AstNode caseToken, ExpressionTree expression, AstNode colonToken, Optional<List<StatementTree>> statements) {
    if (statements.isPresent()) {
      return new CaseClauseTreeImpl(InternalSyntaxToken.create(caseToken), expression, InternalSyntaxToken.create(colonToken), statements.get());
    }
    return new CaseClauseTreeImpl(InternalSyntaxToken.create(caseToken), expression, InternalSyntaxToken.create(colonToken));
  }

  public ElseClauseTreeImpl elseClause(AstNode elseToken, StatementTree statement) {
    return new ElseClauseTreeImpl(InternalSyntaxToken.create(elseToken), statement);
  }

  public IfStatementTreeImpl ifStatement(AstNode ifToken, AstNode openParenToken, ExpressionTree condition, AstNode closeParenToken, StatementTree statement,
    Optional<ElseClauseTreeImpl> elseClause) {
    if (elseClause.isPresent()) {
      return new IfStatementTreeImpl(
        InternalSyntaxToken.create(ifToken),
        InternalSyntaxToken.create(openParenToken),
        condition,
        InternalSyntaxToken.create(closeParenToken),
        statement,
        elseClause.get());
    }
    return new IfStatementTreeImpl(
      InternalSyntaxToken.create(ifToken),
      InternalSyntaxToken.create(openParenToken),
      condition,
      InternalSyntaxToken.create(closeParenToken),
      statement);
  }

  public WhileStatementTreeImpl whileStatement(AstNode whileToken, AstNode openParenthesis, ExpressionTree condition, AstNode closeParenthesis, StatementTree statetment) {
    return new WhileStatementTreeImpl(
      InternalSyntaxToken.create(whileToken),
      InternalSyntaxToken.create(openParenthesis),
      condition,
      InternalSyntaxToken.create(closeParenthesis),
      statetment);
  }

  public DoWhileStatementTreeImpl doWhileStatement(AstNode doToken, StatementTree statement, AstNode whileToken, AstNode openParenthesis, ExpressionTree condition,
    AstNode closeParenthesis, AstNode eos) {
    return new DoWhileStatementTreeImpl(
      InternalSyntaxToken.create(doToken),
      statement,
      InternalSyntaxToken.create(whileToken),
      InternalSyntaxToken.create(openParenthesis),
      condition,
      InternalSyntaxToken.create(closeParenthesis),
      eos);
  }

  public ExpressionStatementTreeImpl expressionStatement(AstNode lookahead, ExpressionTree expression, AstNode eos) {
    return new ExpressionStatementTreeImpl(expression, eos);
  }

  public ForOfStatementTreeImpl forOfStatement(AstNode forToken, AstNode openParenthesis, Tree variableOrExpression, AstNode ofToken, ExpressionTree expression,
    AstNode closeParenthesis, StatementTree statement) {
    return new ForOfStatementTreeImpl(
      InternalSyntaxToken.create(forToken),
      InternalSyntaxToken.create(openParenthesis),
      variableOrExpression,
      InternalSyntaxToken.create(ofToken),
      expression, InternalSyntaxToken.create(closeParenthesis),
      statement);
  }

  public ForInStatementTreeImpl forInStatement(AstNode forToken, AstNode openParenthesis, Tree variableOrExpression, AstNode inToken, ExpressionTree expression,
    AstNode closeParenthesis, StatementTree statement) {

    return new ForInStatementTreeImpl(
      InternalSyntaxToken.create(forToken),
      InternalSyntaxToken.create(openParenthesis),
      variableOrExpression,
      InternalSyntaxToken.create(inToken),
      expression, InternalSyntaxToken.create(closeParenthesis),
      statement);
  }

  public ForStatementTreeImpl forStatement(AstNode forToken, AstNode openParenthesis, Optional<Tree> init, AstNode firstSemiToken, Optional<ExpressionTree> condition,
    AstNode secondSemiToken, Optional<ExpressionTree> update, AstNode closeParenthesis, StatementTree statement) {
    List<AstNode> children = Lists.newArrayList();

    children.add(forToken);
    children.add(openParenthesis);
    if (init.isPresent()) {
      children.add((AstNode) init.get());
    }
    children.add(firstSemiToken);
    if (condition.isPresent()) {
      children.add((AstNode) condition.get());
    }
    children.add(secondSemiToken);
    if (update.isPresent()) {
      children.add((AstNode) update.get());
    }
    children.add(closeParenthesis);
    children.add((AstNode) statement);

    return new ForStatementTreeImpl(
      InternalSyntaxToken.create(forToken),
      InternalSyntaxToken.create(openParenthesis),
      init.orNull(),
      InternalSyntaxToken.create(firstSemiToken),
      condition.orNull(),
      InternalSyntaxToken.create(secondSemiToken),
      update.orNull(),
      InternalSyntaxToken.create(closeParenthesis),
      statement,
      children);
  }

  // End of statements

  // Expressions

  public ExpressionTree arrayInitialiserElement(Optional<AstNode> spreadOperatorToken, ExpressionTree expression) {
    if (spreadOperatorToken.isPresent()) {
      return new RestElementTreeImpl(InternalSyntaxToken.create(spreadOperatorToken.get()), expression);
    }
    return expression;
  }

  /**
   * Creates a new array literal. Undefined element is added to the array elements list when array element is elided.
   * <p/>
   * <p/>
   * From ECMAScript 6 draft:
   * <blockquote>
   * Whenever a comma in the element list is not preceded by an AssignmentExpression i.e., a comma at the beginning
   * or after another comma), the missing array element contributes to the length of the Array and increases the
   * index of subsequent elements.
   * </blockquote>
   */
  public ArrayLiteralTreeImpl newArrayLiteralWithElements(Optional<List<AstNode>> commaTokens, ExpressionTree element, Optional<List<Tuple<AstNode, ExpressionTree>>> restElements,
    Optional<List<AstNode>> restCommas) {
    List<AstNode> children = Lists.newArrayList();
    List<ExpressionTree> elements = Lists.newArrayList();
    List<InternalSyntaxToken> commas = Lists.newArrayList();

    // Elided array element at the beginning, e.g [ ,a]
    if (commaTokens.isPresent()) {
      for (AstNode comma : commaTokens.get()) {
        elements.add(new UndefinedTreeImpl());
        commas.add(InternalSyntaxToken.create(comma));
        children.add(comma);
      }
    }

    // First element
    elements.add(element);
    children.add((AstNode) element);

    // Other elements
    if (restElements.isPresent()) {
      for (Tuple<AstNode, ExpressionTree> t : restElements.get()) {

        // First comma
        commas.add(InternalSyntaxToken.create(t.first().getFirstChild()));
        children.add(t.first().getFirstChild());

        // Elided array element in the middle, e.g [ a , , a ]
        int nbCommas = t.first().getNumberOfChildren();

        if (nbCommas > 1) {
          for (AstNode comma : t.first().getChildren().subList(1, nbCommas)) {
            elements.add(new UndefinedTreeImpl());
            commas.add(InternalSyntaxToken.create(comma));
            children.add(comma);
          }
        }
        // Add element
        elements.add(t.second());
        children.add((AstNode) t.second());
      }
    }

    // Trailing comma and/or elided array element at the end, e.g resp [ a ,] / [ a , ,]
    if (restCommas.isPresent()) {
      int nbEndingComma = restCommas.get().size();

      // Trailing comma after the last element
      commas.add(InternalSyntaxToken.create(restCommas.get().get(0)));
      children.add(restCommas.get().get(0));

      // Elided array element at the end
      if (nbEndingComma > 1) {
        for (AstNode comma : restCommas.get().subList(1, nbEndingComma)) {
          elements.add(new UndefinedTreeImpl());
          commas.add(InternalSyntaxToken.create(comma));
          children.add(comma);
        }

      }
    }
    return new ArrayLiteralTreeImpl(elements, commas, children);
  }

  public ArrayLiteralTreeImpl completeArrayLiteral(AstNode openBracketToken, Optional<ArrayLiteralTreeImpl> elements, AstNode closeBracket) {
    if (elements.isPresent()) {
      return elements.get().complete(InternalSyntaxToken.create(openBracketToken), InternalSyntaxToken.create(closeBracket));
    }
    return new ArrayLiteralTreeImpl(InternalSyntaxToken.create(openBracketToken), InternalSyntaxToken.create(closeBracket));
  }

  public ArrayLiteralTreeImpl newArrayLiteralWithElidedElements(List<AstNode> commaTokens) {
    List<AstNode> children = Lists.newArrayList();
    List<ExpressionTree> elements = Lists.newArrayList();
    List<InternalSyntaxToken> commas = Lists.newArrayList();

    for (AstNode comma : commaTokens) {
      elements.add(new UndefinedTreeImpl());
      commas.add(InternalSyntaxToken.create(comma));
      children.add(comma);
    }

    return new ArrayLiteralTreeImpl(elements, commas, children);
  }

  // End of expressions

  // Helpers

  public static final AstNodeType WRAPPER_AST_NODE = new AstNodeType() {
    @Override
    public String toString() {
      return "WRAPPER_AST_NODE";
    }
  };

  public AstNode newWrapperAstNode(List<AstNode> e1) {
    AstNode astNode = new AstNode(WRAPPER_AST_NODE, WRAPPER_AST_NODE.toString(), null);
    for (AstNode child : e1) {
      astNode.addChild(child);
    }
    return astNode;
  }

  public AstNode newWrapperAstNode2(AstNode e1, Optional<TemplateCharactersTreeImpl> e2, TemplateExpressionTreeImpl e3) {
    AstNode astNode = new AstNode(WRAPPER_AST_NODE, WRAPPER_AST_NODE.toString(), null);
    astNode.addChild(e1);
    if (e2.isPresent()) {
      astNode.addChild(e2.get());
    }
    astNode.addChild(e3);

    return astNode;
  }

  public FunctionExpressionTreeImpl generatorExpression(AstNode functionKeyword, AstNode starOperator, Optional<IdentifierTreeImpl> functionName, ParameterListTreeImpl parameters,
    BlockTreeImpl body) {

    ImmutableList.Builder<AstNode> children = ImmutableList.builder();
    InternalSyntaxToken functionToken = InternalSyntaxToken.create(functionKeyword);
    InternalSyntaxToken starToken = InternalSyntaxToken.create(starOperator);

    if (functionName.isPresent()) {
      children.add(functionToken, starToken, functionName.get(), parameters, body);

      return new FunctionExpressionTreeImpl(Kind.GENERATOR_FUNCTION_EXPRESSION,
        functionToken, starToken, functionName.get(), parameters, body, children.build());
    }

    children.add(functionToken, starToken, parameters, body);

    return new FunctionExpressionTreeImpl(Kind.GENERATOR_FUNCTION_EXPRESSION,
      functionToken, starToken, parameters, body, children.build());
  }

  public LiteralTreeImpl nullLiteral(AstNode nullToken) {
    return new LiteralTreeImpl(Kind.NULL_LITERAL, InternalSyntaxToken.create(nullToken));
  }

  public LiteralTreeImpl booleanLiteral(AstNode trueFalseToken) {
    return new LiteralTreeImpl(Kind.BOOLEAN_LITERAL, InternalSyntaxToken.create(trueFalseToken));
  }

  public LiteralTreeImpl numericLiteral(AstNode numericToken) {
    return new LiteralTreeImpl(Kind.NUMERIC_LITERAL, InternalSyntaxToken.create(numericToken));
  }

  public LiteralTreeImpl stringLiteral(AstNode stringToken) {
    return new LiteralTreeImpl(Kind.STRING_LITERAL, InternalSyntaxToken.create(stringToken));
  }

  public LiteralTreeImpl regexpLiteral(AstNode regexpToken) {
    return new LiteralTreeImpl(Kind.REGULAR_EXPRESSION_LITERAL, InternalSyntaxToken.create(regexpToken));
  }

  public FunctionExpressionTreeImpl functionExpression(AstNode functionKeyword, Optional<AstNode> functionName, ParameterListTreeImpl parameters, BlockTreeImpl body) {
    ImmutableList.Builder<AstNode> children = ImmutableList.builder();
    InternalSyntaxToken functionToken = InternalSyntaxToken.create(functionKeyword);

    if (functionName.isPresent()) {
      IdentifierTreeImpl name = new IdentifierTreeImpl(Kind.BINDING_IDENTIFIER, InternalSyntaxToken.create(functionName.get()));
      children.add(functionToken, name, parameters, body);

      return new FunctionExpressionTreeImpl(Kind.FUNCTION_EXPRESSION, functionToken, name, parameters, body, children.build());
    }

    children.add(functionToken, parameters, body);

    return new FunctionExpressionTreeImpl(Kind.FUNCTION_EXPRESSION, functionToken, parameters, body, children.build());
  }

  public ParameterListTreeImpl newFormalRestParameterList(RestElementTreeImpl restParameter) {
    return new ParameterListTreeImpl(
      Kind.FORMAL_PARAMETER_LIST,
      new SeparatedList<Tree>(Lists.newArrayList((Tree) restParameter), ListUtils.EMPTY_LIST, ImmutableList.of((AstNode) restParameter)));
  }

  public ParameterListTreeImpl newFormalParameterList(BindingElementTree formalParameter, Optional<List<Tuple<AstNode, BindingElementTree>>> formalParameters,
    Optional<Tuple<AstNode, RestElementTreeImpl>> restElement) {
    List<AstNode> children = Lists.newArrayList();
    List<Tree> parameters = Lists.newArrayList();
    List<InternalSyntaxToken> commas = Lists.newArrayList();

    parameters.add(formalParameter);
    children.add((AstNode) formalParameter);

    if (formalParameters.isPresent()) {
      for (Tuple<AstNode, BindingElementTree> t : formalParameters.get()) {
        commas.add(InternalSyntaxToken.create(t.first()));
        children.add(t.first());
        parameters.add(t.second());
        children.add((AstNode) t.second());
      }
    }

    if (restElement.isPresent()) {
      commas.add(InternalSyntaxToken.create(restElement.get().first()));
      children.add(restElement.get().first());
      parameters.add(restElement.get().second());
      children.add(restElement.get().second());
    }

    return new ParameterListTreeImpl(Kind.FORMAL_PARAMETER_LIST, new SeparatedList<Tree>(parameters, commas, children));
  }

  public RestElementTreeImpl bindingRestElement(AstNode ellipsis, IdentifierTreeImpl identifier) {
    return new RestElementTreeImpl(InternalSyntaxToken.create(ellipsis), identifier);
  }

  public ParameterListTreeImpl completeFormalParameterList(AstNode openParenthesis, Optional<ParameterListTreeImpl> parameters, AstNode closeParenthesis) {
    if (parameters.isPresent()) {
      return parameters.get().complete(InternalSyntaxToken.create(openParenthesis), InternalSyntaxToken.create(closeParenthesis));
    }
    return new ParameterListTreeImpl(Kind.FORMAL_PARAMETER_LIST, InternalSyntaxToken.create(openParenthesis), InternalSyntaxToken.create(closeParenthesis));
  }

  public ConditionalExpressionTreeImpl newConditionalExpression(AstNode queryToken, ExpressionTree trueExpression, AstNode colonToken, ExpressionTree falseExpression) {
    return new ConditionalExpressionTreeImpl(InternalSyntaxToken.create(queryToken), trueExpression, InternalSyntaxToken.create(colonToken), falseExpression);
  }

  public ConditionalExpressionTreeImpl newConditionalExpressionNoIn(AstNode queryToken, ExpressionTree trueExpression, AstNode colonToken, ExpressionTree falseExpression) {
    return new ConditionalExpressionTreeImpl(InternalSyntaxToken.create(queryToken), trueExpression, InternalSyntaxToken.create(colonToken), falseExpression);
  }

  public ExpressionTree completeConditionalExpression(ExpressionTree expression, Optional<ConditionalExpressionTreeImpl> partial) {
    return partial.isPresent() ? partial.get().complete(expression) : expression;
  }

  public ExpressionTree completeConditionalExpressionNoIn(ExpressionTree expression, Optional<ConditionalExpressionTreeImpl> partial) {
    return partial.isPresent() ? partial.get().complete(expression) : expression;
  }

  public ExpressionTree newConditionalOr(ExpressionTree expression, Optional<List<Tuple<AstNode, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newConditionalOrNoIn(ExpressionTree expression, Optional<List<Tuple<AstNode, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newConditionalAnd(ExpressionTree expression, Optional<List<Tuple<AstNode, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newConditionalAndNoIn(ExpressionTree expression, Optional<List<Tuple<AstNode, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newBitwiseOr(ExpressionTree expression, Optional<List<Tuple<AstNode, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newBitwiseOrNoIn(ExpressionTree expression, Optional<List<Tuple<AstNode, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newBitwiseXor(ExpressionTree expression, Optional<List<Tuple<AstNode, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newBitwiseXorNoIn(ExpressionTree expression, Optional<List<Tuple<AstNode, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newBitwiseAnd(ExpressionTree expression, Optional<List<Tuple<AstNode, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newBitwiseAndNoIn(ExpressionTree expression, Optional<List<Tuple<AstNode, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newEquality(ExpressionTree expression, Optional<List<Tuple<AstNode, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newEqualityNoIn(ExpressionTree expression, Optional<List<Tuple<AstNode, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newRelational(ExpressionTree expression, Optional<List<Tuple<AstNode, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newRelationalNoIn(ExpressionTree expression, Optional<List<Tuple<AstNode, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newShift(ExpressionTree expression, Optional<List<Tuple<AstNode, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newAdditive(ExpressionTree expression, Optional<List<Tuple<AstNode, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newMultiplicative(ExpressionTree expression, Optional<List<Tuple<AstNode, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  private ExpressionTree buildBinaryExpression(ExpressionTree expression, Optional<List<Tuple<AstNode, ExpressionTree>>> operatorAndOperands) {
    if (!operatorAndOperands.isPresent()) {
      return expression;
    }

    ExpressionTree result = expression;

    for (Tuple<AstNode, ExpressionTree> t : operatorAndOperands.get()) {
      result = new BinaryExpressionTreeImpl(
        getBinaryOperator(t.first().getType()),
        result,
        InternalSyntaxToken.create(t.first()),
        t.second());
    }
    return result;
  }

  public ExpressionTree prefixExpression(AstNode operator, ExpressionTree expression) {
    return new PrefixExpressionTreeImpl(getPrefixOperator(operator.getType()), InternalSyntaxToken.create(operator), expression);
  }

  public ExpressionTree postfixExpression(ExpressionTree expression, Optional<Tuple<AstNode, AstNode>> operatorNoLB) {
    if (!operatorNoLB.isPresent()) {
      return expression;
    }
    Kind kind = operatorNoLB.get().second().is(EcmaScriptPunctuator.INC) ? Kind.POSTFIX_INCREMENT : Kind.POSTFIX_DECREMENT;
    return new PostfixExpressionTreeImpl(kind, expression, InternalSyntaxToken.create(operatorNoLB.get().second()));
  }

  public YieldExpressionTreeImpl completeYieldExpression(AstNode yieldToken, Optional<YieldExpressionTreeImpl> partial) {
    if (partial.isPresent()) {
      return partial.get().complete(InternalSyntaxToken.create(yieldToken));
    }
    return new YieldExpressionTreeImpl(InternalSyntaxToken.create(yieldToken));
  }

  public YieldExpressionTreeImpl completeYieldExpressionNoIn(AstNode yieldToken, Optional<YieldExpressionTreeImpl> partial) {
    if (partial.isPresent()) {
      return partial.get().complete(InternalSyntaxToken.create(yieldToken));
    }
    return new YieldExpressionTreeImpl(InternalSyntaxToken.create(yieldToken));
  }

  public YieldExpressionTreeImpl newYieldExpression(AstNode spacingNoLB, Optional<AstNode> starToken, ExpressionTree expression) {
    if (starToken.isPresent()) {
      return new YieldExpressionTreeImpl(InternalSyntaxToken.create(starToken.get()), expression);
    }
    return new YieldExpressionTreeImpl(expression);
  }

  public YieldExpressionTreeImpl newYieldExpressionNoIn(AstNode spacingNoLB, Optional<AstNode> starToken, ExpressionTree expression) {
    if (starToken.isPresent()) {
      return new YieldExpressionTreeImpl(InternalSyntaxToken.create(starToken.get()), expression);
    }
    return new YieldExpressionTreeImpl(expression);
  }

  public IdentifierTreeImpl identifierReference(AstNode identifier) {
    return new IdentifierTreeImpl(Kind.IDENTIFIER_REFERENCE, InternalSyntaxToken.create(identifier));
  }

  public IdentifierTreeImpl bindingIdentifier(AstNode identifier) {
    return new IdentifierTreeImpl(Kind.BINDING_IDENTIFIER, InternalSyntaxToken.create(identifier));
  }

  public ArrowFunctionTreeImpl arrowFunction(Tree parameters, AstNode spacingNoLB, AstNode doubleArrow, Tree body) {
    return new ArrowFunctionTreeImpl(parameters, InternalSyntaxToken.create(doubleArrow), body);
  }

  public ArrowFunctionTreeImpl arrowFunctionNoIn(Tree parameters, AstNode spacingNoLB, AstNode doubleArrow, Tree body) {
    return new ArrowFunctionTreeImpl(parameters, InternalSyntaxToken.create(doubleArrow), body);
  }

  public IdentifierTreeImpl identifierName(AstNode identifier) {
    return new IdentifierTreeImpl(Kind.IDENTIFIER_NAME, InternalSyntaxToken.create(identifier));
  }

  public DotMemberExpressionTreeImpl newDotMemberExpression(AstNode dotToken, IdentifierTreeImpl identifier) {
    return new DotMemberExpressionTreeImpl(InternalSyntaxToken.create(dotToken), identifier);
  }

  public BracketMemberExpressionTreeImpl newBracketMemberExpression(AstNode openBracket, ExpressionTree expression, AstNode closeBracket) {
    return new BracketMemberExpressionTreeImpl(InternalSyntaxToken.create(openBracket), expression, InternalSyntaxToken.create(closeBracket));
  }

  public MemberExpressionTree completeSuperMemberExpression(SuperTreeImpl superExpression, MemberExpressionTree partial) {
    if (partial.is(Kind.DOT_MEMBER_EXPRESSION)) {
      return ((DotMemberExpressionTreeImpl) partial).complete(superExpression);
    }
    return ((BracketMemberExpressionTreeImpl) partial).complete(superExpression);
  }

  public SuperTreeImpl superExpression(AstNode superToken) {
    return new SuperTreeImpl(InternalSyntaxToken.create(superToken));
  }

  public TaggedTemplateTreeImpl newTaggedTemplate(TemplateLiteralTreeImpl template) {
    return new TaggedTemplateTreeImpl(template);
  }

  public ExpressionTree completeMemberExpression(ExpressionTree object, Optional<List<ExpressionTree>> properties) {
    if (!properties.isPresent()) {
      return object;
    }

    ExpressionTree result = object;
    for (ExpressionTree property : properties.get()) {
      if (property.is(Kind.DOT_MEMBER_EXPRESSION)) {
        result = ((DotMemberExpressionTreeImpl) property).complete(result);

      } else if (property.is(Kind.BRACKET_MEMBER_EXPRESSION)) {
        result = ((BracketMemberExpressionTreeImpl) property).complete(result);

      } else {
        result = ((TaggedTemplateTreeImpl) property).complete(result);
      }
    }
    return result;
  }

  public ExpressionTree argument(Optional<AstNode> ellipsisToken, ExpressionTree expression) {
    return ellipsisToken.isPresent() ?
      new RestElementTreeImpl(InternalSyntaxToken.create(ellipsisToken.get()), expression) : expression;
  }

  public ParameterListTreeImpl newArgumentList(ExpressionTree argument, Optional<List<Tuple<AstNode, ExpressionTree>>> restArguments) {
    List<AstNode> children = Lists.newArrayList();
    List<Tree> arguments = Lists.newArrayList();
    List<InternalSyntaxToken> commas = Lists.newArrayList();

    arguments.add(argument);
    children.add((AstNode) argument);

    if (restArguments.isPresent()) {
      for (Tuple<AstNode, ExpressionTree> t : restArguments.get()) {
        commas.add(InternalSyntaxToken.create(t.first()));
        children.add(t.first());
        arguments.add(t.second());
        children.add((AstNode) t.second());
      }
    }

    return new ParameterListTreeImpl(Kind.ARGUMENTS, new SeparatedList<Tree>(arguments, commas, children));
  }

  public ParameterListTreeImpl completeArguments(AstNode openParenToken, Optional<ParameterListTreeImpl> arguments, AstNode closeParenToken) {
    if (arguments.isPresent()) {
      return arguments.get().complete(InternalSyntaxToken.create(openParenToken), InternalSyntaxToken.create(closeParenToken));
    }
    return new ParameterListTreeImpl(Kind.ARGUMENTS, InternalSyntaxToken.create(openParenToken), InternalSyntaxToken.create(closeParenToken));
  }

  public CallExpressionTreeImpl simpleCallExpression(ExpressionTree expression, ParameterListTree arguments) {
    return new CallExpressionTreeImpl(expression, arguments);
  }

  public ExpressionTree callExpression(CallExpressionTreeImpl callExpression, Optional<List<ExpressionTree>> arguments) {

    if (!arguments.isPresent()) {
      return callExpression;
    }

    ExpressionTree callee = callExpression;

    for (ExpressionTree arg : arguments.get()) {
      if (arg instanceof BracketMemberExpressionTree) {
        callee = ((BracketMemberExpressionTreeImpl) arg).complete(callee);
      } else if (arg instanceof DotMemberExpressionTreeImpl) {
        callee = ((DotMemberExpressionTreeImpl) arg).complete(callee);
      } else if (arg instanceof TaggedTemplateTreeImpl) {
        callee = ((TaggedTemplateTreeImpl) arg).complete(callee);
      } else {
        callee = new CallExpressionTreeImpl(callee, (ParameterListTreeImpl) arg);
      }
    }
    return callee;
  }

  public ParenthesisedExpressionTreeImpl parenthesisedExpression(AstNode openParenToken, ExpressionTree expression, AstNode closeParenToken) {
    return new ParenthesisedExpressionTreeImpl(InternalSyntaxToken.create(openParenToken), expression, InternalSyntaxToken.create(closeParenToken));
  }

  public ClassTreeImpl classExpression(AstNode classToken, Optional<IdentifierTreeImpl> name, Optional<Tuple<AstNode, ExpressionTree>> extendsClause,
    AstNode openCurlyBraceToken, Optional<List<AstNode>> members, AstNode closeCurlyBraceToken) {

    List<MethodDeclarationTree> elements = Lists.newArrayList();
    List<SyntaxToken> semicolon = Lists.newArrayList();
    List<AstNode> children = Lists.newArrayList();

    if (members.isPresent()) {
      for (AstNode member : members.get()) {
        if (member instanceof MethodDeclarationTree) {
          elements.add((MethodDeclarationTree) member);
        } else {
          semicolon.add(InternalSyntaxToken.create(member));
        }
        children.add(member);
      }
    }

    if (extendsClause.isPresent()) {
      return ClassTreeImpl.newClassExpression(
        InternalSyntaxToken.create(classToken), name.orNull(),
        InternalSyntaxToken.create(extendsClause.get().first()), extendsClause.get().second(),
        InternalSyntaxToken.create(openCurlyBraceToken),
        elements, semicolon,
        InternalSyntaxToken.create(closeCurlyBraceToken), children);
    }

    return ClassTreeImpl.newClassExpression(
      InternalSyntaxToken.create(classToken), name.orNull(),
      null, null,
      InternalSyntaxToken.create(openCurlyBraceToken),
      elements, semicolon,
      InternalSyntaxToken.create(closeCurlyBraceToken), children);
  }

  public ComputedPropertyNameTreeImpl computedPropertyName(AstNode openBracketToken, ExpressionTree expression, AstNode closeBracketToken) {
    return new ComputedPropertyNameTreeImpl(InternalSyntaxToken.create(openBracketToken), expression, InternalSyntaxToken.create(closeBracketToken));
  }

  public PairPropertyTreeImpl pairProperty(ExpressionTree name, AstNode colonToken, ExpressionTree value) {
    return new PairPropertyTreeImpl(name, InternalSyntaxToken.create(colonToken), value);
  }

  public ObjectLiteralTreeImpl newObjectLiteral(Tree property, Optional<List<Tuple<AstNode, Tree>>> restProperties, Optional<AstNode> trailingComma) {
    List<AstNode> children = Lists.newArrayList();
    List<InternalSyntaxToken> commas = Lists.newArrayList();
    List<Tree> properties = Lists.newArrayList();

    children.add((AstNode) property);
    properties.add(property);

    if (restProperties.isPresent()) {
      for (Tuple<AstNode, Tree> t : restProperties.get()) {
        commas.add(InternalSyntaxToken.create(t.first()));
        children.add(t.first());

        properties.add(t.second());
        children.add((AstNode) t.second());
      }
    }

    if (trailingComma.isPresent()) {
      commas.add(InternalSyntaxToken.create(trailingComma.get()));
      children.add(trailingComma.get());
    }

    return new ObjectLiteralTreeImpl(new SeparatedList<Tree>(properties, commas, children));
  }

  public ObjectLiteralTreeImpl completeObjectLiteral(AstNode openCurlyToken, Optional<ObjectLiteralTreeImpl> partial, AstNode closeCurlyToken) {
    if (partial.isPresent()) {
      return partial.get().complete(InternalSyntaxToken.create(openCurlyToken), InternalSyntaxToken.create(closeCurlyToken));
    }
    return new ObjectLiteralTreeImpl(InternalSyntaxToken.create(openCurlyToken), InternalSyntaxToken.create(closeCurlyToken));
  }

  public NewExpressionTreeImpl newExpressionWithArgument(AstNode newToken, ExpressionTree expression, ParameterListTreeImpl arguments) {
    return new NewExpressionTreeImpl(
      expression.is(Kind.SUPER) ? Kind.NEW_SUPER : Kind.NEW_EXPRESSION,
      InternalSyntaxToken.create(newToken),
      expression,
      arguments);
  }

  public ExpressionTree newExpression(AstNode newToken, ExpressionTree expression) {
    return new NewExpressionTreeImpl(
      expression.is(Kind.SUPER) ? Kind.NEW_SUPER : Kind.NEW_EXPRESSION,
      InternalSyntaxToken.create(newToken),
      expression);
  }

  public TemplateLiteralTreeImpl noSubstitutionTemplate(AstNode openBacktickToken, Optional<TemplateCharactersTreeImpl> templateCharacters, AstNode closeBacktickToken) {
    return new TemplateLiteralTreeImpl(
      InternalSyntaxToken.create(openBacktickToken),
      templateCharacters.isPresent() ? Lists.newArrayList(templateCharacters.get()) : ListUtils.EMPTY_LIST,
      InternalSyntaxToken.create(closeBacktickToken));
  }

  public TemplateExpressionTreeImpl newTemplateExpressionHead(AstNode dollar, AstNode openCurlyBrace, ExpressionTree expression) {
    return new TemplateExpressionTreeImpl(InternalSyntaxToken.create(dollar), InternalSyntaxToken.create(openCurlyBrace), expression);
  }

  public TemplateLiteralTreeImpl substitutionTemplate(AstNode openBacktick, Optional<TemplateCharactersTreeImpl> headCharacters,
    TemplateExpressionTreeImpl firstTemplateExpressionHead, Optional<List<AstNode>> middleTemplateExpression, AstNode tailCloseCurlyBrace,
    Optional<TemplateCharactersTreeImpl> tailCharacters, AstNode closeBacktick) {
    List<AstNode> children = Lists.newArrayList();
    List<TemplateCharactersTree> strings = Lists.newArrayList();
    List<TemplateExpressionTree> expressions = Lists.newArrayList();

    // TEMPLATE HEAD
    children.add(openBacktick);
    if (headCharacters.isPresent()) {
      strings.add(headCharacters.get());
      children.add(headCharacters.get());
    }

    TemplateExpressionTreeImpl expressionHead = firstTemplateExpressionHead;

    // TEMPLATE MIDDLE
    if (middleTemplateExpression.isPresent()) {

      for (AstNode middle : middleTemplateExpression.get()) {
        for (AstNode node : middle.getChildren()) {

          if (node.is(EcmaScriptPunctuator.RCURLYBRACE)) {
            expressionHead.complete(InternalSyntaxToken.create(node));
            expressions.add(expressionHead);
            children.add(expressionHead);

          } else if (node instanceof TemplateExpressionTreeImpl) {
            expressionHead = (TemplateExpressionTreeImpl) node;

          } else {
            // Template characters
            strings.add((TemplateCharactersTree) node);
            children.add(node);
          }
        }
      }
    }

    // TEMPLATE TAIL
    expressionHead.complete(InternalSyntaxToken.create(tailCloseCurlyBrace));
    expressions.add(expressionHead);
    children.add(expressionHead);
    if (tailCharacters.isPresent()) {
      strings.add(tailCharacters.get());
      children.add(tailCharacters.get());
    }

    children.add(closeBacktick);

    return new TemplateLiteralTreeImpl(InternalSyntaxToken.create(openBacktick), strings, expressions, InternalSyntaxToken.create(closeBacktick), children);
  }

  public TemplateCharactersTreeImpl templateCharacters(List<AstNode> characters) {
    return new TemplateCharactersTreeImpl(characters);
  }

  public ThisTreeImpl thisExpression(AstNode thisKeyword) {
    return new ThisTreeImpl(InternalSyntaxToken.create(thisKeyword));
  }

  public IdentifierTreeImpl labelIdentifier(AstNode identifier) {
    return new IdentifierTreeImpl(Kind.LABEL_IDENTIFIER, InternalSyntaxToken.create(identifier));
  }

  public IdentifierTreeImpl identifierReferenceWithoutYield(AstNode identifier) {
    return new IdentifierTreeImpl(Kind.IDENTIFIER_REFERENCE, InternalSyntaxToken.create(identifier));
  }

  public ExpressionTree assignmentExpression(ExpressionTree variable, AstNode operator, ExpressionTree expression) {
    return new AssignmentExpressionTreeImpl(EXPRESSION_KIND_BY_PUNCTUATORS.get(operator.getType()), variable, InternalSyntaxToken.create(operator), expression);
  }

  public ExpressionTree assignmentExpressionNoIn(ExpressionTree variable, AstNode operator, ExpressionTree expression) {
    return new AssignmentExpressionTreeImpl(EXPRESSION_KIND_BY_PUNCTUATORS.get(operator.getType()), variable, InternalSyntaxToken.create(operator), expression);
  }

  public ExpressionTree expression(ExpressionTree expression, Optional<List<Tuple<AstNode, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree expressionNoIn(ExpressionTree expression, Optional<List<Tuple<AstNode, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree expressionNoLineBreak(AstNode spacingNoLineBreak, ExpressionTree expression) {
    return expression;
  }

  public FromClauseTreeImpl fromClause(AstNode fromToken, LiteralTreeImpl module) {
    return new FromClauseTreeImpl(InternalSyntaxToken.create(fromToken), module);
  }

  public DefaultExportDeclarationTreeImpl defaultExportDeclaration(AstNode exportToken, AstNode defaultToken, Tree declaration) {
    return new DefaultExportDeclarationTreeImpl(
      InternalSyntaxToken.create(exportToken),
      InternalSyntaxToken.create(defaultToken),
      declaration);
  }

  public ExpressionStatementTreeImpl exportedExpressionStatement(AstNode lookahead, ExpressionTree expression, AstNode eos) {
    return new ExpressionStatementTreeImpl(expression, eos);
  }

  public NamedExportDeclarationTreeImpl namedExportDeclaration(AstNode exportToken, Tree object) {
    return new NamedExportDeclarationTreeImpl(InternalSyntaxToken.create(exportToken), object);
  }

  public SpecifierTreeImpl newExportSpecifier(AstNode asToken, IdentifierTreeImpl identifier) {
    return new SpecifierTreeImpl(Kind.EXPORT_SPECIFIER, InternalSyntaxToken.create(asToken), identifier);
  }

  public SpecifierTreeImpl completeExportSpecifier(IdentifierTreeImpl name, Optional<SpecifierTreeImpl> localName) {
    if (localName.isPresent()) {
      return localName.get().complete(name);
    }
    return new SpecifierTreeImpl(Kind.EXPORT_SPECIFIER, name);
  }

  public SpecifierListTreeImpl newExportSpecifierList(SpecifierTreeImpl specifier, Optional<List<Tuple<AstNode, SpecifierTreeImpl>>> restSpecifier,
    Optional<AstNode> trailingComma) {
    List<InternalSyntaxToken> commas = Lists.newArrayList();
    List<SpecifierTree> specifiers = Lists.newArrayList();
    List<AstNode> children = Lists.newArrayList();

    specifiers.add(specifier);
    children.add(specifier);

    if (restSpecifier.isPresent()) {
      for (Tuple<AstNode, SpecifierTreeImpl> t : restSpecifier.get()) {
        commas.add(InternalSyntaxToken.create(t.first()));
        specifiers.add(t.second());
        children.add(t.first());
        children.add(t.second());
      }
    }

    if (trailingComma.isPresent()) {
      commas.add(InternalSyntaxToken.create(trailingComma.get()));
      children.add(trailingComma.get());
    }

    return new SpecifierListTreeImpl(Kind.EXPORT_LIST, new SeparatedList<SpecifierTree>(specifiers, commas), children);
  }

  public SpecifierListTreeImpl exportList(AstNode openCurlyBraceToken, Optional<SpecifierListTreeImpl> specifierList, AstNode closeCurlyBraceToken) {
    if (specifierList.isPresent()) {
      return specifierList.get().complete(InternalSyntaxToken.create(openCurlyBraceToken), InternalSyntaxToken.create(closeCurlyBraceToken));
    }
    return new SpecifierListTreeImpl(Kind.EXPORT_LIST, InternalSyntaxToken.create(openCurlyBraceToken), InternalSyntaxToken.create(closeCurlyBraceToken));
  }

  public NameSpaceExportDeclarationTree namespaceExportDeclaration(AstNode exportToken, AstNode starToken, FromClauseTreeImpl fromClause, AstNode eos) {
    return new NameSpaceExportDeclarationTreeImpl(InternalSyntaxToken.create(exportToken), InternalSyntaxToken.create(starToken), fromClause, eos);
  }

  public ExportClauseTreeImpl exportClause(SpecifierListTreeImpl exportList, Optional<FromClauseTreeImpl> fromClause, AstNode eos) {
    if (fromClause.isPresent()) {
      return new ExportClauseTreeImpl(exportList, fromClause.get(), eos);
    }
    return new ExportClauseTreeImpl(exportList, eos);
  }

  public ImportModuleDeclarationTree importModuleDeclaration(AstNode importToken, LiteralTreeImpl moduleName, AstNode eos) {
    return new ImportModuleDeclarationTreeImpl(InternalSyntaxToken.create(importToken), moduleName, eos);
  }

  public SpecifierTreeImpl newImportSpecifier(AstNode asToken, IdentifierTreeImpl identifier) {
    return new SpecifierTreeImpl(Kind.IMPORT_SPECIFIER, InternalSyntaxToken.create(asToken), identifier);
  }

  public SpecifierTreeImpl completeImportSpecifier(IdentifierTreeImpl name, Optional<SpecifierTreeImpl> localName) {
    if (localName.isPresent()) {
      return localName.get().complete(name);
    }
    return new SpecifierTreeImpl(Kind.IMPORT_SPECIFIER, name);
  }

  public SpecifierListTreeImpl newImportSpecifierList(SpecifierTreeImpl specifier, Optional<List<Tuple<AstNode, SpecifierTreeImpl>>> restSpecifier,
                                                      Optional<AstNode> trailingComma) {
    List<InternalSyntaxToken> commas = Lists.newArrayList();
    List<SpecifierTree> specifiers = Lists.newArrayList();
    List<AstNode> children = Lists.newArrayList();

    specifiers.add(specifier);
    children.add(specifier);

    if (restSpecifier.isPresent()) {
      for (Tuple<AstNode, SpecifierTreeImpl> t : restSpecifier.get()) {
        commas.add(InternalSyntaxToken.create(t.first()));
        specifiers.add(t.second());
        children.add(t.first());
        children.add(t.second());
      }
    }

    if (trailingComma.isPresent()) {
      commas.add(InternalSyntaxToken.create(trailingComma.get()));
      children.add(trailingComma.get());
    }

    return new SpecifierListTreeImpl(Kind.IMPORT_LIST, new SeparatedList<SpecifierTree>(specifiers, commas), children);
  }

  public SpecifierListTreeImpl importList(AstNode openCurlyBraceToken, Optional<SpecifierListTreeImpl> specifierList, AstNode closeCurlyBraceToken) {
    if (specifierList.isPresent()) {
      return specifierList.get().complete(InternalSyntaxToken.create(openCurlyBraceToken), InternalSyntaxToken.create(closeCurlyBraceToken));
    }
    return new SpecifierListTreeImpl(Kind.IMPORT_LIST, InternalSyntaxToken.create(openCurlyBraceToken), InternalSyntaxToken.create(closeCurlyBraceToken));
  }

  public NameSpaceSpecifierTreeImpl nameSpaceImport(AstNode starToken, AstNode asToken, IdentifierTreeImpl localName) {
    return new NameSpaceSpecifierTreeImpl(InternalSyntaxToken.create(starToken), InternalSyntaxToken.create(asToken), localName);
  }

  public ImportClauseTreeImpl defaultImport(IdentifierTreeImpl identifierTree, Optional<Tuple<AstNode, DeclarationTree>> namedImport) {
    if (namedImport.isPresent()) {
      return new ImportClauseTreeImpl(identifierTree, InternalSyntaxToken.create(namedImport.get().first()), namedImport.get().second());
    }
    return new ImportClauseTreeImpl(identifierTree);
  }

  public ImportClauseTreeImpl importClause(DeclarationTree importTree) {
    if (importTree instanceof ImportClauseTree) {
      return (ImportClauseTreeImpl) importTree;
    }
    return new ImportClauseTreeImpl(importTree);
  }

  public ImportDeclarationTreeImpl importDeclaration(AstNode importToken, ImportClauseTreeImpl importClause, FromClauseTreeImpl fromClause, AstNode eos) {
    return new ImportDeclarationTreeImpl(InternalSyntaxToken.create(importToken), importClause, fromClause, eos);
  }

  public ModuleTreeImpl module(List<Tree> items) {
    return new ModuleTreeImpl(items);
  }

  // [START] Classes, methods, functions & generators

  public ClassTreeImpl classDeclaration(AstNode classToken, IdentifierTreeImpl name,
    Optional<Tuple<AstNode, ExpressionTree>> extendsClause,
    AstNode openCurlyBraceToken, Optional<List<AstNode>> members, AstNode closeCurlyBraceToken) {

    List<MethodDeclarationTree> elements = Lists.newArrayList();
    List<SyntaxToken> semicolon = Lists.newArrayList();
    List<AstNode> children = Lists.newArrayList();

    if (members.isPresent()) {
      for (AstNode member : members.get()) {
        if (member instanceof MethodDeclarationTree) {
          elements.add((MethodDeclarationTree) member);
        } else {
          semicolon.add(InternalSyntaxToken.create(member));
        }
        children.add(member);
      }
    }

    if (extendsClause.isPresent()) {
      return ClassTreeImpl.newClassDeclaration(
        InternalSyntaxToken.create(classToken), name,
        InternalSyntaxToken.create(extendsClause.get().first()), extendsClause.get().second(),
        InternalSyntaxToken.create(openCurlyBraceToken),
        elements, semicolon,
        InternalSyntaxToken.create(closeCurlyBraceToken), children);
    }

    return ClassTreeImpl.newClassDeclaration(
      InternalSyntaxToken.create(classToken), name,
      null, null,
      InternalSyntaxToken.create(openCurlyBraceToken),
      elements, semicolon,
      InternalSyntaxToken.create(closeCurlyBraceToken), children);
  }

  public MethodDeclarationTreeImpl completeStaticMethod(AstNode staticToken, MethodDeclarationTreeImpl method) {
    return method.completeWithStaticToken(InternalSyntaxToken.create(staticToken));
  }

  public MethodDeclarationTreeImpl methodOrGenerator(
    Optional<AstNode> starToken,
    ExpressionTree name, ParameterListTreeImpl parameters,
    BlockTreeImpl body) {

    return MethodDeclarationTreeImpl.newMethodOrGenerator(starToken.isPresent() ? InternalSyntaxToken.create(starToken.get()) : null, name, parameters, body);
  }

  public MethodDeclarationTreeImpl accessor(
    AstNode accessorToken, ExpressionTree name,
    ParameterListTreeImpl parameters,
    BlockTreeImpl body) {

    return MethodDeclarationTreeImpl.newAccessor(InternalSyntaxToken.create(accessorToken), name, parameters, body);
  }

  public FunctionDeclarationTreeImpl functionAndGeneratorDeclaration(
    AstNode functionToken, Optional<AstNode> starToken, IdentifierTreeImpl name, ParameterListTreeImpl parameters, BlockTreeImpl body) {

    return starToken.isPresent() ?
      new FunctionDeclarationTreeImpl(InternalSyntaxToken.create(functionToken), InternalSyntaxToken.create(starToken.get()), name, parameters, body) :
      new FunctionDeclarationTreeImpl(InternalSyntaxToken.create(functionToken), name, parameters, body);
  }

  // [START] Destructuring pattern

  public InitializedBindingElementTreeImpl newInitializedBindingElement1(AstNode equalToken, ExpressionTree expression) {
    return new InitializedBindingElementTreeImpl(InternalSyntaxToken.create(equalToken), expression);
  }

  public InitializedBindingElementTreeImpl newInitializedBindingElement2(AstNode equalToken, ExpressionTree expression) {
    return new InitializedBindingElementTreeImpl(InternalSyntaxToken.create(equalToken), expression);
  }

  private BindingElementTree completeBindingElement(BindingElementTree left, Optional<InitializedBindingElementTreeImpl> initializer) {
    if (!initializer.isPresent()) {
      return left;
    }
    return initializer.get().completeWithLeft(left);
  }

  public BindingElementTree completeBindingElement1(BindingElementTree left, Optional<InitializedBindingElementTreeImpl> initializer) {
    return completeBindingElement(left, initializer);
  }

  public BindingElementTree completeBindingElement2(BindingElementTree left, Optional<InitializedBindingElementTreeImpl> initializer) {
    return completeBindingElement(left, initializer);
  }

  public BindingPropertyTreeImpl bindingProperty(ExpressionTree propertyName, AstNode colonToken, BindingElementTree bindingElement) {
    return new BindingPropertyTreeImpl(propertyName, InternalSyntaxToken.create(colonToken), bindingElement);
  }

  public ObjectBindingPatternTreeImpl newObjectBindingPattern(Tree bindingProperty, Optional<List<Tuple<AstNode, BindingElementTree>>> restProperties,
    Optional<AstNode> trailingComma) {

    List<Tree> properties = Lists.newArrayList();
    List<InternalSyntaxToken> commas = Lists.newArrayList();
    List<AstNode> children = Lists.newArrayList();

    properties.add(bindingProperty);
    children.add((AstNode) bindingProperty);

    if (restProperties.isPresent()) {
      for (Tuple<AstNode, BindingElementTree> t : restProperties.get()) {
        // Comma
        commas.add(InternalSyntaxToken.create(t.first()));
        children.add(t.first());

        // Property
        properties.add(t.second());
        children.add((AstNode) t.second());
      }
    }

    if (trailingComma.isPresent()) {
      commas.add(InternalSyntaxToken.create(trailingComma.get()));
      children.add(trailingComma.get());
    }

    return new ObjectBindingPatternTreeImpl(new SeparatedList<Tree>(properties, commas, children));
  }

  public ObjectBindingPatternTreeImpl completeObjectBindingPattern(AstNode openCurlyBraceToken, Optional<ObjectBindingPatternTreeImpl> partial, AstNode closeCurlyBraceToken) {
    if (partial.isPresent()) {
      return partial.get().complete(InternalSyntaxToken.create(openCurlyBraceToken), InternalSyntaxToken.create(closeCurlyBraceToken));
    }
    return new ObjectBindingPatternTreeImpl(InternalSyntaxToken.create(openCurlyBraceToken), InternalSyntaxToken.create(closeCurlyBraceToken));
  }

  public ArrayBindingPatternTreeImpl arrayBindingPattern(
    AstNode openBracketToken, Optional<BindingElementTree> firstElement, Optional<List<Tuple<AstNode, Optional<BindingElementTree>>>> rest, AstNode closeBracketToken) {

    List<AstNode> children = Lists.newArrayList();
    ImmutableList.Builder<Optional<BindingElementTree>> elements = ImmutableList.builder();
    ImmutableList.Builder<InternalSyntaxToken> separators = ImmutableList.builder();

    boolean skipComma = false;

    if (firstElement.isPresent()) {
      children.add((AstNode) firstElement.get());
      elements.add(firstElement);
      skipComma = true;
    }

    if (rest.isPresent()) {
      List<Tuple<AstNode, Optional<BindingElementTree>>> list = rest.get();
      for (Tuple<AstNode, Optional<BindingElementTree>> pair : list) {
        if (!skipComma) {
          elements.add(Optional.<BindingElementTree>absent());
        }

        InternalSyntaxToken commaToken = InternalSyntaxToken.create(pair.first());
        children.add(commaToken);
        separators.add(commaToken);

        if (pair.second().isPresent()) {
          children.add((AstNode) pair.second().get());
          elements.add(pair.second());
          skipComma = true;
        } else {
          skipComma = false;
        }
      }
    }

    return new ArrayBindingPatternTreeImpl(
      InternalSyntaxToken.create(openBracketToken),
      new SeparatedList<Optional<BindingElementTree>>(elements.build(), separators.build()), children,
      InternalSyntaxToken.create(closeBracketToken));
  }

  public ExpressionTree assignmentNoCurly(AstNode lookahead, ExpressionTree expression) {
    return expression;
  }

  public ExpressionTree assignmentNoCurlyNoIn(AstNode lookahead, ExpressionTree expressionNoIn) {
    return expressionNoIn;
  }

  public ExpressionTree skipLookahead1(AstNode lookahead, ExpressionTree expression) {
    return expression;
  }

  public ExpressionTree skipLookahead2(AstNode lookahead, ExpressionTree expression) {
    return expression;
  }

  public ExpressionTree skipLookahead3(AstNode lookahead, ExpressionTree expression) {
    return expression;
  }

  public ExpressionTree skipLookahead4(ExpressionTree expression, AstNode lookahead) {
    return expression;
  }

  // [END] Destructuring pattern

  // [END] Classes, methods, functions & generators

  public ScriptTreeImpl script(Optional<AstNode> shebangToken, Optional<ModuleTreeImpl> items, AstNode spacing, AstNode eof) {
    return new ScriptTreeImpl(
      shebangToken.isPresent() ? InternalSyntaxToken.create(shebangToken.get()) : null,
      items.isPresent() ? items.get() : new ModuleTreeImpl(Collections.<Tree>emptyList()),
      spacing, eof);
  }

  public static class Tuple<T, U> extends AstNode {

    private final T first;
    private final U second;

    public Tuple(T first, U second) {
      super(WRAPPER_AST_NODE, WRAPPER_AST_NODE
        .toString(), null);

      this.first = first;
      this.second = second;

      add(first);
      add(second);
    }

    public T first() {
      return first;
    }

    public U second() {
      return second;
    }

    private void add(Object o) {
      if (o instanceof AstNode) {
        addChild((AstNode) o);
      } else if (o instanceof Optional) {
        Optional opt = (Optional) o;
        if (opt.isPresent()) {
          Object o2 = opt.get();
          if (o2 instanceof AstNode) {
            addChild((AstNode) o2);
          } else if (o2 instanceof List) {
            for (Object o3 : (List) o2) {
              Preconditions.checkArgument(o3 instanceof AstNode, "Unsupported type: " + o3.getClass().getSimpleName());
              addChild((AstNode) o3);
            }
          } else {
            throw new IllegalArgumentException("Unsupported type: " + o2.getClass().getSimpleName());
          }
        }
      } else {
        throw new IllegalStateException("Unsupported argument type: " + o.getClass().getSimpleName());
      }
    }

  }

  private <T, U> Tuple<T, U> newTuple(T first, U second) {
    return new Tuple<T, U>(first, second);
  }

  public <T, U> Tuple<T, U> newTuple1(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple2(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple3(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple4(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple5(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple6(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple7(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple8(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple9(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple10(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple11(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple12(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple13(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple14(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple15(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple16(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple17(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple18(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple19(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple20(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple21(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple22(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple23(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple24(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple25(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple26(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple27(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple28(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple29(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple30(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple50(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple51(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple52(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple53(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple54(T first, U second) {
    return newTuple(first, second);
  }

}
