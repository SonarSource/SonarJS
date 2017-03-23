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
package org.sonar.javascript.parser;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableList.Builder;
import com.google.common.collect.ImmutableMap;
import com.google.common.collect.Lists;
import com.sonar.sslr.api.typed.Optional;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.annotation.Nullable;
import org.sonar.javascript.lexer.JavaScriptKeyword;
import org.sonar.javascript.lexer.JavaScriptPunctuator;
import org.sonar.javascript.tree.impl.SeparatedList;
import org.sonar.javascript.tree.impl.declaration.AccessorMethodDeclarationTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ArrayBindingPatternTreeImpl;
import org.sonar.javascript.tree.impl.declaration.BindingPropertyTreeImpl;
import org.sonar.javascript.tree.impl.declaration.DecoratorTreeImpl;
import org.sonar.javascript.tree.impl.declaration.DefaultExportDeclarationTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ExportClauseTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ExportDefaultBindingImpl;
import org.sonar.javascript.tree.impl.declaration.ExportDefaultBindingWithExportListImpl;
import org.sonar.javascript.tree.impl.declaration.ExportDefaultBindingWithNameSpaceExportImpl;
import org.sonar.javascript.tree.impl.declaration.FieldDeclarationTreeImpl;
import org.sonar.javascript.tree.impl.declaration.FromClauseTreeImpl;
import org.sonar.javascript.tree.impl.declaration.FunctionDeclarationTreeImpl;
import org.sonar.javascript.tree.impl.declaration.GeneratorMethodDeclarationTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ImportClauseTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ImportDeclarationTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ImportModuleDeclarationTreeImpl;
import org.sonar.javascript.tree.impl.declaration.InitializedBindingElementTreeImpl;
import org.sonar.javascript.tree.impl.declaration.MethodDeclarationTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ModuleTreeImpl;
import org.sonar.javascript.tree.impl.declaration.NameSpaceExportDeclarationTreeImpl;
import org.sonar.javascript.tree.impl.declaration.NameSpaceSpecifierTreeImpl;
import org.sonar.javascript.tree.impl.declaration.NamedExportDeclarationTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ObjectBindingPatternTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ParameterListTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ScriptTreeImpl;
import org.sonar.javascript.tree.impl.declaration.SpecifierListTreeImpl;
import org.sonar.javascript.tree.impl.declaration.SpecifierTreeImpl;
import org.sonar.javascript.tree.impl.expression.ArrayAssignmentPatternTreeImpl;
import org.sonar.javascript.tree.impl.expression.ArrayLiteralTreeImpl;
import org.sonar.javascript.tree.impl.expression.ArrowFunctionTreeImpl;
import org.sonar.javascript.tree.impl.expression.AssignmentExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.AssignmentPatternRestElementTreeImpl;
import org.sonar.javascript.tree.impl.expression.BinaryExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.BracketMemberExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.CallExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.ClassTreeImpl;
import org.sonar.javascript.tree.impl.expression.ComputedPropertyNameTreeImpl;
import org.sonar.javascript.tree.impl.expression.ConditionalExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.DotMemberExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.FunctionExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.IdentifierTreeImpl;
import org.sonar.javascript.tree.impl.expression.InitializedAssignmentPatternElementTreeImpl;
import org.sonar.javascript.tree.impl.expression.LiteralTreeImpl;
import org.sonar.javascript.tree.impl.expression.NewExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.NewTargetTreeImpl;
import org.sonar.javascript.tree.impl.expression.ObjectAssignmentPatternPairElementTreeImpl;
import org.sonar.javascript.tree.impl.expression.ObjectAssignmentPatternTreeImpl;
import org.sonar.javascript.tree.impl.expression.ObjectLiteralTreeImpl;
import org.sonar.javascript.tree.impl.expression.PairPropertyTreeImpl;
import org.sonar.javascript.tree.impl.expression.ParenthesisedExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.PostfixExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.PrefixExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.RestElementTreeImpl;
import org.sonar.javascript.tree.impl.expression.SpreadElementTreeImpl;
import org.sonar.javascript.tree.impl.expression.SuperTreeImpl;
import org.sonar.javascript.tree.impl.expression.TaggedTemplateTreeImpl;
import org.sonar.javascript.tree.impl.expression.TemplateCharactersTreeImpl;
import org.sonar.javascript.tree.impl.expression.TemplateExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.TemplateLiteralTreeImpl;
import org.sonar.javascript.tree.impl.expression.YieldExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.jsx.JsxClosingElementTreeImpl;
import org.sonar.javascript.tree.impl.expression.jsx.JsxIdentifierTreeImpl;
import org.sonar.javascript.tree.impl.expression.jsx.JsxJavaScriptExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.jsx.JsxOpeningElementTreeImpl;
import org.sonar.javascript.tree.impl.expression.jsx.JsxSelfClosingElementTreeImpl;
import org.sonar.javascript.tree.impl.expression.jsx.JsxSpreadAttributeTreeImpl;
import org.sonar.javascript.tree.impl.expression.jsx.JsxStandardAttributeTreeImpl;
import org.sonar.javascript.tree.impl.expression.jsx.JsxStandardElementTreeImpl;
import org.sonar.javascript.tree.impl.expression.jsx.JsxTextTreeImpl;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.javascript.tree.impl.statement.BlockTreeImpl;
import org.sonar.javascript.tree.impl.statement.BreakStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.CaseClauseTreeImpl;
import org.sonar.javascript.tree.impl.statement.CatchBlockTreeImpl;
import org.sonar.javascript.tree.impl.statement.ContinueStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.DebuggerStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.DefaultClauseTreeImpl;
import org.sonar.javascript.tree.impl.statement.DoWhileStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.ElseClauseTreeImpl;
import org.sonar.javascript.tree.impl.statement.EmptyStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.ExpressionStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.ForObjectStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.ForStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.IfStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.LabelledStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.ReturnStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.SwitchStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.ThrowStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.TryStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.VariableDeclarationTreeImpl;
import org.sonar.javascript.tree.impl.statement.VariableStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.WhileStatementTreeImpl;
import org.sonar.javascript.tree.impl.statement.WithStatementTreeImpl;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.AccessorMethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.DeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.DecoratorTree;
import org.sonar.plugins.javascript.api.tree.declaration.ExportDefaultBinding;
import org.sonar.plugins.javascript.api.tree.declaration.ExportDefaultBindingWithExportList;
import org.sonar.plugins.javascript.api.tree.declaration.ExportDefaultBindingWithNameSpaceExport;
import org.sonar.plugins.javascript.api.tree.declaration.FieldDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.GeneratorMethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ImportClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.ImportModuleDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.NameSpaceExportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ParameterListTree;
import org.sonar.plugins.javascript.api.tree.declaration.SpecifierTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrayAssignmentPatternTree;
import org.sonar.plugins.javascript.api.tree.expression.BracketMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.InitializedAssignmentPatternElementTree;
import org.sonar.plugins.javascript.api.tree.expression.MemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectAssignmentPatternPairElementTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectAssignmentPatternTree;
import org.sonar.plugins.javascript.api.tree.expression.RestElementTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateCharactersTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxAttributeTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxAttributeValueTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxChildTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxClosingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxElementNameTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxIdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxJavaScriptExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxOpeningElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxSelfClosingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxSpreadAttributeTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxStandardAttributeTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxStandardElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxTextTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchClauseTree;

public class TreeFactory {

  private static final Map<String, Kind> EXPRESSION_KIND_BY_VALUE = new HashMap<>();

  static {
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.OROR.getValue(), Kind.CONDITIONAL_OR);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.ANDAND.getValue(), Kind.CONDITIONAL_AND);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.OR.getValue(), Kind.BITWISE_OR);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.XOR.getValue(), Kind.BITWISE_XOR);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.AND.getValue(), Kind.BITWISE_AND);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.EQUAL.getValue(), Kind.EQUAL_TO);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.NOTEQUAL.getValue(), Kind.NOT_EQUAL_TO);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.EQUAL2.getValue(), Kind.STRICT_EQUAL_TO);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.NOTEQUAL2.getValue(), Kind.STRICT_NOT_EQUAL_TO);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.LT.getValue(), Kind.LESS_THAN);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.GT.getValue(), Kind.GREATER_THAN);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.LE.getValue(), Kind.LESS_THAN_OR_EQUAL_TO);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.GE.getValue(), Kind.GREATER_THAN_OR_EQUAL_TO);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.SL.getValue(), Kind.LEFT_SHIFT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.SR.getValue(), Kind.RIGHT_SHIFT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.SR2.getValue(), Kind.UNSIGNED_RIGHT_SHIFT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.PLUS.getValue(), Kind.PLUS);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.MINUS.getValue(), Kind.MINUS);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.STAR.getValue(), Kind.MULTIPLY);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.EXP.getValue(), Kind.EXPONENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.DIV.getValue(), Kind.DIVIDE);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.MOD.getValue(), Kind.REMAINDER);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.EQU.getValue(), Kind.ASSIGNMENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.STAR_EQU.getValue(), Kind.MULTIPLY_ASSIGNMENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.EXP_EQU.getValue(), Kind.EXPONENT_ASSIGNMENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.DIV_EQU.getValue(), Kind.DIVIDE_ASSIGNMENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.MOD_EQU.getValue(), Kind.REMAINDER_ASSIGNMENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.PLUS_EQU.getValue(), Kind.PLUS_ASSIGNMENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.MINUS_EQU.getValue(), Kind.MINUS_ASSIGNMENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.SL_EQU.getValue(), Kind.LEFT_SHIFT_ASSIGNMENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.SR_EQU.getValue(), Kind.RIGHT_SHIFT_ASSIGNMENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.SR_EQU2.getValue(), Kind.UNSIGNED_RIGHT_SHIFT_ASSIGNMENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.AND_EQU.getValue(), Kind.AND_ASSIGNMENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.XOR_EQU.getValue(), Kind.XOR_ASSIGNMENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.OR_EQU.getValue(), Kind.OR_ASSIGNMENT);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptPunctuator.COMMA.getValue(), Kind.COMMA_OPERATOR);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptKeyword.INSTANCEOF.getValue(), Kind.INSTANCE_OF);
    EXPRESSION_KIND_BY_VALUE.put(JavaScriptKeyword.IN.getValue(), Kind.RELATIONAL_IN);
  }

  private static final Map<String, Kind> PREFIX_KIND_BY_VALUE = ImmutableMap.<String, Tree.Kind>builder()
    .put(JavaScriptPunctuator.INC.getValue(), Kind.PREFIX_INCREMENT)
    .put(JavaScriptPunctuator.DEC.getValue(), Kind.PREFIX_DECREMENT)
    .put(JavaScriptPunctuator.PLUS.getValue(), Kind.UNARY_PLUS)
    .put(JavaScriptPunctuator.MINUS.getValue(), Kind.UNARY_MINUS)
    .put(JavaScriptPunctuator.TILDA.getValue(), Kind.BITWISE_COMPLEMENT)
    .put(JavaScriptPunctuator.BANG.getValue(), Kind.LOGICAL_COMPLEMENT)
    .put(JavaScriptKeyword.DELETE.getValue(), Kind.DELETE)
    .put(JavaScriptKeyword.VOID.getValue(), Kind.VOID)
    .put(JavaScriptKeyword.TYPEOF.getValue(), Kind.TYPEOF)
    .put(JavaScriptKeyword.AWAIT.getValue(), Kind.AWAIT)
    .build();

  private static Kind getBinaryOperator(InternalSyntaxToken token) {
    Kind kind = EXPRESSION_KIND_BY_VALUE.get(token.text());
    if (kind == null) {
      throw new IllegalArgumentException("Mapping not found for binary operator " + token.text());
    }
    return kind;
  }

  private static Kind getPrefixOperator(InternalSyntaxToken token) {
    Kind kind = PREFIX_KIND_BY_VALUE.get(token.text());
    if (kind == null) {
      throw new IllegalArgumentException("Mapping not found for unary operator " + token.text());
    }
    return kind;
  }

  // Statements

  public EmptyStatementTreeImpl emptyStatement(InternalSyntaxToken semicolon) {
    return new EmptyStatementTreeImpl(semicolon);
  }

  public DebuggerStatementTreeImpl debuggerStatement(InternalSyntaxToken debuggerWord, Tree semicolonToken) {
    return new DebuggerStatementTreeImpl(debuggerWord, nullableSemicolonToken(semicolonToken));
  }

  public VariableStatementTreeImpl variableStatement(VariableDeclarationTreeImpl declaration, Tree semicolonToken) {
    return new VariableStatementTreeImpl(declaration, nullableSemicolonToken(semicolonToken));
  }

  private static VariableDeclarationTreeImpl variableDeclaration(InternalSyntaxToken token, SeparatedList<BindingElementTree> variables) {
    Kind kind;
    if (token.is(JavaScriptKeyword.VAR)) {
      kind = Kind.VAR_DECLARATION;

    } else if ("let".equals(token.text())) {
      kind = Kind.LET_DECLARATION;

    } else if (token.is(JavaScriptKeyword.CONST)) {
      kind = Kind.CONST_DECLARATION;

    } else {
      throw new UnsupportedOperationException("Unsupported token, " + token.text());
    }
    return new VariableDeclarationTreeImpl(kind, token, variables);
  }

  public VariableDeclarationTreeImpl variableDeclaration1(InternalSyntaxToken token, SeparatedList<BindingElementTree> variables) {
    return variableDeclaration(token, variables);
  }

  private static SeparatedList<BindingElementTree> bindingElementList(BindingElementTree element, Optional<List<Tuple<InternalSyntaxToken, BindingElementTree>>> rest) {

    ImmutableList.Builder<BindingElementTree> elements = ImmutableList.builder();
    ImmutableList.Builder<InternalSyntaxToken> commas = ImmutableList.builder();

    elements.add(element);

    if (rest.isPresent()) {
      for (Tuple<InternalSyntaxToken, BindingElementTree> pair : rest.get()) {
        InternalSyntaxToken commaToken = pair.first();

        commas.add(commaToken);
        elements.add(pair.second());
      }
    }

    return new SeparatedList<>(elements.build(), commas.build());
  }

  public SeparatedList<BindingElementTree> bindingElementList1(BindingElementTree element, Optional<List<Tuple<InternalSyntaxToken, BindingElementTree>>> rest) {
    return bindingElementList(element, rest);
  }

  public LabelledStatementTreeImpl labelledStatement(IdentifierTreeImpl identifier, InternalSyntaxToken colon, StatementTree statement) {
    return new LabelledStatementTreeImpl(identifier, colon, statement);
  }

  public ContinueStatementTreeImpl completeContinueStatement(InternalSyntaxToken continueToken, ContinueStatementTreeImpl labelOrEndOfStatement) {
    return labelOrEndOfStatement.complete(continueToken);
  }

  public ContinueStatementTreeImpl newContinueWithLabel(IdentifierTreeImpl identifier, Tree semicolonToken) {
    return new ContinueStatementTreeImpl(identifier, nullableSemicolonToken(semicolonToken));
  }

  public ContinueStatementTreeImpl newContinueWithoutLabel(Tree semicolonToken) {
    return new ContinueStatementTreeImpl(nullableSemicolonToken(semicolonToken));
  }

  public BreakStatementTreeImpl completeBreakStatement(InternalSyntaxToken breakToken, BreakStatementTreeImpl labelOrEndOfStatement) {
    return labelOrEndOfStatement.complete(breakToken);
  }

  public BreakStatementTreeImpl newBreakWithLabel(IdentifierTreeImpl identifier, Tree semicolonToken) {
    return new BreakStatementTreeImpl(identifier, nullableSemicolonToken(semicolonToken));
  }

  public BreakStatementTreeImpl newBreakWithoutLabel(Tree semicolonToken) {
    return new BreakStatementTreeImpl(nullableSemicolonToken(semicolonToken));
  }

  public ReturnStatementTreeImpl completeReturnStatement(InternalSyntaxToken returnToken, ReturnStatementTreeImpl expressionOrEndOfStatement) {
    return expressionOrEndOfStatement.complete(returnToken);
  }

  public ReturnStatementTreeImpl newReturnWithExpression(ExpressionTree expression, Tree semicolonToken) {
    return new ReturnStatementTreeImpl(expression, nullableSemicolonToken(semicolonToken));
  }

  public ReturnStatementTreeImpl newReturnWithoutExpression(Tree semicolonToken) {
    return new ReturnStatementTreeImpl(nullableSemicolonToken(semicolonToken));
  }

  public ThrowStatementTreeImpl newThrowStatement(InternalSyntaxToken throwToken, ExpressionTree expression, Tree semicolonToken) {
    return new ThrowStatementTreeImpl(throwToken, expression, nullableSemicolonToken(semicolonToken));
  }

  public WithStatementTreeImpl newWithStatement(
    InternalSyntaxToken withToken, InternalSyntaxToken openingParen,
    ExpressionTree expression, InternalSyntaxToken closingParen, StatementTree statement
  ) {
    return new WithStatementTreeImpl(withToken, openingParen, expression, closingParen, statement);
  }

  public BlockTreeImpl newBlock(InternalSyntaxToken openingCurlyBrace, Optional<List<StatementTree>> statements, InternalSyntaxToken closingCurlyBrace) {
    if (statements.isPresent()) {
      return new BlockTreeImpl(openingCurlyBrace, statements.get(), closingCurlyBrace);
    }
    return new BlockTreeImpl(openingCurlyBrace, closingCurlyBrace);
  }

  public TryStatementTreeImpl newTryStatementWithCatch(CatchBlockTreeImpl catchBlock, Optional<TryStatementTreeImpl> partial) {
    if (partial.isPresent()) {
      return partial.get().complete(catchBlock);
    }
    return new TryStatementTreeImpl(catchBlock);
  }

  public TryStatementTreeImpl newTryStatementWithFinally(InternalSyntaxToken finallyKeyword, BlockTreeImpl block) {
    return new TryStatementTreeImpl(finallyKeyword, block);
  }

  public TryStatementTreeImpl completeTryStatement(InternalSyntaxToken tryToken, BlockTreeImpl block, TryStatementTreeImpl catchFinallyBlock) {
    return catchFinallyBlock.complete(tryToken, block);
  }

  public CatchBlockTreeImpl newCatchBlock(
    InternalSyntaxToken catchToken, InternalSyntaxToken lparenToken,
    BindingElementTree catchParameter, InternalSyntaxToken rparenToken, BlockTreeImpl block
  ) {
    return new CatchBlockTreeImpl(
      catchToken,
      lparenToken,
      catchParameter,
      rparenToken,
      block);
  }

  public SwitchStatementTreeImpl newSwitchStatement(
    InternalSyntaxToken openCurlyBrace, Optional<List<CaseClauseTreeImpl>> caseClauseList,
    Optional<Tuple<DefaultClauseTreeImpl, Optional<List<CaseClauseTreeImpl>>>> defaultAndRestCases, InternalSyntaxToken closeCurlyBrace
  ) {
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

    return new SwitchStatementTreeImpl(openCurlyBrace, cases, closeCurlyBrace);
  }

  public SwitchStatementTreeImpl completeSwitchStatement(
    InternalSyntaxToken switchToken, InternalSyntaxToken openParenthesis,
    ExpressionTree expression, InternalSyntaxToken closeParenthesis, SwitchStatementTreeImpl caseBlock
  ) {

    return caseBlock.complete(
      switchToken,
      openParenthesis,
      expression,
      closeParenthesis);
  }

  public DefaultClauseTreeImpl defaultClause(InternalSyntaxToken defaultToken, InternalSyntaxToken colonToken, Optional<List<StatementTree>> statements) {
    if (statements.isPresent()) {
      return new DefaultClauseTreeImpl(defaultToken, colonToken, statements.get());
    }
    return new DefaultClauseTreeImpl(defaultToken, colonToken);
  }

  public CaseClauseTreeImpl caseClause(InternalSyntaxToken caseToken, ExpressionTree expression, InternalSyntaxToken colonToken, Optional<List<StatementTree>> statements) {
    if (statements.isPresent()) {
      return new CaseClauseTreeImpl(caseToken, expression, colonToken, statements.get());
    }
    return new CaseClauseTreeImpl(caseToken, expression, colonToken);
  }

  public ElseClauseTreeImpl elseClause(InternalSyntaxToken elseToken, StatementTree statement) {
    return new ElseClauseTreeImpl(elseToken, statement);
  }

  public IfStatementTreeImpl ifStatement(
    InternalSyntaxToken ifToken, InternalSyntaxToken openParenToken, ExpressionTree condition,
    InternalSyntaxToken closeParenToken, StatementTree statement, Optional<ElseClauseTreeImpl> elseClause
  ) {
    if (elseClause.isPresent()) {
      return new IfStatementTreeImpl(
        ifToken,
        openParenToken,
        condition,
        closeParenToken,
        statement,
        elseClause.get());
    }
    return new IfStatementTreeImpl(
      ifToken,
      openParenToken,
      condition,
      closeParenToken,
      statement);
  }

  public WhileStatementTreeImpl whileStatement(
    InternalSyntaxToken whileToken, InternalSyntaxToken openParenthesis,
    ExpressionTree condition, InternalSyntaxToken closeParenthesis, StatementTree statetment
  ) {
    return new WhileStatementTreeImpl(
      whileToken,
      openParenthesis,
      condition,
      closeParenthesis,
      statetment);
  }

  public DoWhileStatementTreeImpl doWhileStatement(
    InternalSyntaxToken doToken, StatementTree statement, InternalSyntaxToken whileToken,
    InternalSyntaxToken openParenthesis, ExpressionTree condition, InternalSyntaxToken closeParenthesis, Tree semicolonToken
  ) {
    return new DoWhileStatementTreeImpl(
      doToken,
      statement,
      whileToken,
      openParenthesis,
      condition,
      closeParenthesis,
      nullableSemicolonToken(semicolonToken));
  }

  public ExpressionStatementTreeImpl expressionStatement(Tree lookahead, ExpressionTree expression, Tree semicolonToken) {
    return new ExpressionStatementTreeImpl(expression, nullableSemicolonToken(semicolonToken));
  }

  @Nullable
  private static InternalSyntaxToken nullableSemicolonToken(Tree semicolonToken) {
    if (semicolonToken instanceof InternalSyntaxToken) {
      return (InternalSyntaxToken) semicolonToken;
    } else {
      return null;
    }
  }

  public ForObjectStatementTreeImpl forOfStatement(
    InternalSyntaxToken forToken, Optional<InternalSyntaxToken> awaitToken, InternalSyntaxToken openParenthesis, Tree variableOrExpression, InternalSyntaxToken ofToken,
    ExpressionTree expression, InternalSyntaxToken closeParenthesis, StatementTree statement
  ) {
    return new ForObjectStatementTreeImpl(
      forToken,
      awaitToken.orNull(),
      openParenthesis,
      variableOrExpression,
      ofToken,
      expression, closeParenthesis,
      statement);
  }

  public ForObjectStatementTreeImpl forInStatement(
    InternalSyntaxToken forToken, InternalSyntaxToken openParenthesis, Tree variableOrExpression, InternalSyntaxToken inToken,
    ExpressionTree expression, InternalSyntaxToken closeParenthesis, StatementTree statement
  ) {

    return new ForObjectStatementTreeImpl(
      forToken,
      null,
      openParenthesis,
      variableOrExpression,
      inToken,
      expression, closeParenthesis,
      statement);
  }

  public ForStatementTreeImpl forStatement(
    InternalSyntaxToken forToken, InternalSyntaxToken openParenthesis, Optional<Tree> init, InternalSyntaxToken firstSemiToken,
    Optional<ExpressionTree> condition, InternalSyntaxToken secondSemiToken, Optional<ExpressionTree> update,
    InternalSyntaxToken closeParenthesis, StatementTree statement
  ) {
    return new ForStatementTreeImpl(
      forToken,
      openParenthesis,
      init.orNull(),
      firstSemiToken,
      condition.orNull(),
      secondSemiToken,
      update.orNull(),
      closeParenthesis,
      statement);
  }

  // End of statements

  // Expressions

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
  public ArrayLiteralTreeImpl newArrayLiteralWithElements(
    Optional<List<InternalSyntaxToken>> commaTokens, ExpressionTree element,
    Optional<List<Tuple<List<InternalSyntaxToken>, ExpressionTree>>> restElements,
    Optional<List<InternalSyntaxToken>> restCommas
  ) {
    List<Tree> elementsAndCommas = Lists.newArrayList();

    // Elided array element at the beginning, e.g [ ,a]
    if (commaTokens.isPresent()) {
      elementsAndCommas.addAll(commaTokens.get());
    }

    // First element
    elementsAndCommas.add(element);

    // Other elements
    if (restElements.isPresent()) {
      for (Tuple<List<InternalSyntaxToken>, ExpressionTree> t : restElements.get()) {
        elementsAndCommas.addAll(t.first());
        elementsAndCommas.add(t.second());
      }
    }

    // Trailing comma and/or elided array element at the end, e.g resp [ a ,] / [ a , ,]
    if (restCommas.isPresent()) {
      elementsAndCommas.addAll(restCommas.get());
    }

    return new ArrayLiteralTreeImpl(elementsAndCommas);
  }

  public ArrayLiteralTreeImpl completeArrayLiteral(InternalSyntaxToken openBracketToken, Optional<ArrayLiteralTreeImpl> elements, InternalSyntaxToken closeBracket) {
    if (elements.isPresent()) {
      return elements.get().complete(openBracketToken, closeBracket);
    }
    return new ArrayLiteralTreeImpl(openBracketToken, closeBracket);
  }

  public ArrayLiteralTreeImpl newArrayLiteralWithElidedElements(List<InternalSyntaxToken> commaTokens) {
    return new ArrayLiteralTreeImpl(new ArrayList<Tree>(commaTokens));
  }

  // End of expressions

  public FunctionExpressionTree generatorExpression(
    InternalSyntaxToken functionKeyword, InternalSyntaxToken starOperator,
    Optional<IdentifierTreeImpl> functionName, ParameterListTreeImpl parameters, BlockTreeImpl body
  ) {

    return FunctionExpressionTreeImpl.createGenerator(functionKeyword, starOperator, functionName.orNull(), parameters, body);
  }

  public LiteralTreeImpl nullLiteral(InternalSyntaxToken nullToken) {
    return new LiteralTreeImpl(Kind.NULL_LITERAL, nullToken);
  }

  public LiteralTreeImpl booleanLiteral(InternalSyntaxToken trueFalseToken) {
    return new LiteralTreeImpl(Kind.BOOLEAN_LITERAL, trueFalseToken);
  }

  public LiteralTreeImpl numericLiteral(InternalSyntaxToken numericToken) {
    return new LiteralTreeImpl(Kind.NUMERIC_LITERAL, numericToken);
  }

  public LiteralTreeImpl stringLiteral(InternalSyntaxToken stringToken) {
    return new LiteralTreeImpl(Kind.STRING_LITERAL, stringToken);
  }

  public LiteralTreeImpl regexpLiteral(InternalSyntaxToken regexpToken) {
    return new LiteralTreeImpl(Kind.REGULAR_EXPRESSION_LITERAL, regexpToken);
  }

  public FunctionExpressionTree functionExpression(
    Optional<InternalSyntaxToken> asyncToken, InternalSyntaxToken functionKeyword, Optional<IdentifierTree> functionName,
    ParameterListTreeImpl parameters, BlockTreeImpl body
  ) {
    return FunctionExpressionTreeImpl.create(asyncToken.orNull(), functionKeyword, functionName.orNull(), parameters, body);
  }

  public SeparatedList<Tree> formalParameters(
    BindingElementTree formalParameter, Optional<List<Tuple<InternalSyntaxToken, BindingElementTree>>> formalParameters
  ) {
    List<Tree> parameters = Lists.newArrayList();
    List<InternalSyntaxToken> commas = Lists.newArrayList();

    parameters.add(formalParameter);

    if (formalParameters.isPresent()) {
      for (Tuple<InternalSyntaxToken, BindingElementTree> t : formalParameters.get()) {
        commas.add(t.first());
        parameters.add(t.second());
      }
    }

    return new SeparatedList<>(parameters, commas);
  }


  public ParameterListTreeImpl formalParameterClause1(
    InternalSyntaxToken lParenthesis,
    SeparatedList<Tree> parameters,
    Optional<InternalSyntaxToken> trailingComma,
    InternalSyntaxToken rParenthesis
  ) {
    if (trailingComma.isPresent()) {
      parameters.getSeparators().add(trailingComma.get());
    }
    return new ParameterListTreeImpl(Kind.FORMAL_PARAMETER_LIST, lParenthesis, parameters, rParenthesis);
  }


  public ParameterListTreeImpl formalParameterClause2(
    InternalSyntaxToken lParenthesis,
    SeparatedList<Tree> parameters,
    InternalSyntaxToken comma,
    RestElementTreeImpl restElementTree,
    InternalSyntaxToken rParenthesis
  ) {
    parameters.getSeparators().add(comma);
    parameters.add(restElementTree);

    return new ParameterListTreeImpl(Kind.FORMAL_PARAMETER_LIST, lParenthesis, parameters, rParenthesis);
  }

  public ParameterListTreeImpl formalParameterClause3(InternalSyntaxToken lParenthesis, Optional<RestElementTreeImpl> restElementTree, InternalSyntaxToken rParenthesis) {
    SeparatedList<Tree> parameters = new SeparatedList<>(Lists.<Tree>newArrayList(), Collections.<InternalSyntaxToken>emptyList());
    if (restElementTree.isPresent()) {
      parameters.add(restElementTree.get());
    }
    return new ParameterListTreeImpl(Kind.FORMAL_PARAMETER_LIST, lParenthesis, parameters, rParenthesis);
  }

  public RestElementTreeImpl bindingRestElement(InternalSyntaxToken ellipsis, IdentifierTreeImpl identifier) {
    return new RestElementTreeImpl(ellipsis, identifier);
  }

  public ConditionalExpressionTreeImpl newConditionalExpression(
    InternalSyntaxToken queryToken, ExpressionTree trueExpression,
    InternalSyntaxToken colonToken, ExpressionTree falseExpression
  ) {
    return new ConditionalExpressionTreeImpl(queryToken, trueExpression, colonToken, falseExpression);
  }

  public ExpressionTree completeConditionalExpression(ExpressionTree expression, Optional<ConditionalExpressionTreeImpl> partial) {
    return partial.isPresent() ? partial.get().complete(expression) : expression;
  }

  public ExpressionTree newConditionalOr(ExpressionTree expression, Optional<List<Tuple<InternalSyntaxToken, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newConditionalAnd(ExpressionTree expression, Optional<List<Tuple<InternalSyntaxToken, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newBitwiseOr(ExpressionTree expression, Optional<List<Tuple<InternalSyntaxToken, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newBitwiseXor(ExpressionTree expression, Optional<List<Tuple<InternalSyntaxToken, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newBitwiseAnd(ExpressionTree expression, Optional<List<Tuple<InternalSyntaxToken, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newEquality(ExpressionTree expression, Optional<List<Tuple<InternalSyntaxToken, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newRelational(ExpressionTree expression, Optional<List<Tuple<InternalSyntaxToken, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newShift(ExpressionTree expression, Optional<List<Tuple<InternalSyntaxToken, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newAdditive(ExpressionTree expression, Optional<List<Tuple<InternalSyntaxToken, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newMultiplicative(ExpressionTree expression, Optional<List<Tuple<InternalSyntaxToken, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree newExponentiation(ExpressionTree expression, Optional<List<Tuple<InternalSyntaxToken, ExpressionTree>>> operatorAndOperands) {
    if (!operatorAndOperands.isPresent()) {
      return expression;
    }


    List<Tuple<InternalSyntaxToken, ExpressionTree>> list = operatorAndOperands.get();
    ExpressionTree result = list.get(list.size() - 1).second;

    for (int i = list.size() - 1; i > 0; i--) {
      result = new BinaryExpressionTreeImpl(
        Kind.EXPONENT,
        list.get(i - 1).second,
        list.get(i).first,
        result);
    }

    return new BinaryExpressionTreeImpl(
      Kind.EXPONENT,
      expression,
      list.get(0).first,
      result);
  }

  private static ExpressionTree buildBinaryExpression(ExpressionTree expression, Optional<List<Tuple<InternalSyntaxToken, ExpressionTree>>> operatorAndOperands) {
    if (!operatorAndOperands.isPresent()) {
      return expression;
    }

    ExpressionTree result = expression;

    for (Tuple<InternalSyntaxToken, ExpressionTree> t : operatorAndOperands.get()) {
      result = new BinaryExpressionTreeImpl(
        getBinaryOperator(t.first()),
        result,
        t.first(),
        t.second());
    }
    return result;
  }

  public ExpressionTree prefixExpression(InternalSyntaxToken operator, ExpressionTree expression) {
    return new PrefixExpressionTreeImpl(getPrefixOperator(operator), operator, expression);
  }

  public ExpressionTree postfixExpression(ExpressionTree expression, Optional<Tuple<InternalSyntaxToken, InternalSyntaxToken>> operatorNoLB) {
    if (!operatorNoLB.isPresent()) {
      return expression;
    }
    Kind kind = operatorNoLB.get().second().is(JavaScriptPunctuator.INC) ? Kind.POSTFIX_INCREMENT : Kind.POSTFIX_DECREMENT;
    return new PostfixExpressionTreeImpl(kind, expression, operatorNoLB.get().second());
  }

  public YieldExpressionTreeImpl completeYieldExpression(InternalSyntaxToken yieldToken, Optional<YieldExpressionTreeImpl> partial) {
    if (partial.isPresent()) {
      return partial.get().complete(yieldToken);
    }
    return new YieldExpressionTreeImpl(yieldToken);
  }

  public YieldExpressionTreeImpl newYieldExpression(Tree spacingNoLB, Optional<InternalSyntaxToken> starToken, ExpressionTree expression) {
    if (starToken.isPresent()) {
      return new YieldExpressionTreeImpl(starToken.get(), expression);
    }
    return new YieldExpressionTreeImpl(expression);
  }

  public IdentifierTreeImpl identifierReference(InternalSyntaxToken identifier) {
    return new IdentifierTreeImpl(Kind.IDENTIFIER_REFERENCE, identifier);
  }

  public IdentifierTreeImpl bindingIdentifier(InternalSyntaxToken identifier) {
    return new IdentifierTreeImpl(Kind.BINDING_IDENTIFIER, identifier);
  }

  public ArrowFunctionTreeImpl arrowFunction(Optional<InternalSyntaxToken> asyncToken, Tree parameters, Tree spacingNoLB, InternalSyntaxToken doubleArrow, Tree body) {
    return new ArrowFunctionTreeImpl(asyncToken.orNull(), parameters, doubleArrow, body);
  }

  public IdentifierTreeImpl identifierName(InternalSyntaxToken identifier) {
    return new IdentifierTreeImpl(Kind.IDENTIFIER_NAME, identifier);
  }

  public DotMemberExpressionTreeImpl newDotMemberExpression(InternalSyntaxToken dotToken, IdentifierTreeImpl identifier) {
    return new DotMemberExpressionTreeImpl(dotToken, identifier);
  }

  public BracketMemberExpressionTreeImpl newBracketMemberExpression(InternalSyntaxToken openBracket, ExpressionTree expression, InternalSyntaxToken closeBracket) {
    return new BracketMemberExpressionTreeImpl(openBracket, expression, closeBracket);
  }

  public MemberExpressionTree completeSuperMemberExpression(SuperTreeImpl superExpression, MemberExpressionTree partial) {
    if (partial.is(Kind.DOT_MEMBER_EXPRESSION)) {
      return ((DotMemberExpressionTreeImpl) partial).complete(superExpression);
    }
    return ((BracketMemberExpressionTreeImpl) partial).complete(superExpression);
  }

  public SuperTreeImpl superExpression(InternalSyntaxToken superToken) {
    return new SuperTreeImpl(superToken);
  }

  public NewTargetTreeImpl newTarget(SyntaxToken newKeyword, SyntaxToken dot, SyntaxToken target) {
    return new NewTargetTreeImpl(newKeyword, dot, target);
  }

  public TaggedTemplateTreeImpl newTaggedTemplate(TemplateLiteralTree template) {
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

  public SeparatedList<Tree> argumentList(
    ExpressionTree argument,
    Optional<List<Tuple<InternalSyntaxToken, ExpressionTree>>> restArguments,
    Optional<InternalSyntaxToken> trailingComma
  ) {
    List<Tree> arguments = Lists.newArrayList();
    List<InternalSyntaxToken> commas = Lists.newArrayList();

    arguments.add(argument);

    if (restArguments.isPresent()) {
      for (Tuple<InternalSyntaxToken, ExpressionTree> t : restArguments.get()) {
        commas.add(t.first());
        arguments.add(t.second());
      }
    }

    if (trailingComma.isPresent()) {
      commas.add(trailingComma.get());
    }

    return new SeparatedList<>(arguments, commas);
  }

  public ParameterListTreeImpl argumentClause(InternalSyntaxToken openParenToken, Optional<SeparatedList<Tree>> arguments, InternalSyntaxToken closeParenToken) {
    return new ParameterListTreeImpl(
      Kind.ARGUMENTS,
      openParenToken,
      arguments.isPresent() ? arguments.get() : new SeparatedList<>(Collections.<Tree>emptyList(), Collections.<InternalSyntaxToken>emptyList()),
      closeParenToken);
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

  public ParenthesisedExpressionTreeImpl parenthesisedExpression(InternalSyntaxToken openParenToken, ExpressionTree expression, InternalSyntaxToken closeParenToken) {
    return new ParenthesisedExpressionTreeImpl(openParenToken, expression, closeParenToken);
  }

  public ClassTreeImpl classExpression(
    Optional<List<DecoratorTree>> decorators, InternalSyntaxToken classToken, Optional<IdentifierTreeImpl> name, Optional<Tuple<InternalSyntaxToken, ExpressionTree>> extendsClause,
    InternalSyntaxToken openCurlyBraceToken, Optional<List<Tree>> members, InternalSyntaxToken closeCurlyBraceToken
  ) {

    List<Tree> elements = Lists.newArrayList();

    if (members.isPresent()) {
      for (Tree member : members.get()) {
        elements.add(member);
      }
    }

    if (extendsClause.isPresent()) {
      return ClassTreeImpl.newClassExpression(
        optionalList(decorators),
        classToken, name.orNull(),
        extendsClause.get().first(), extendsClause.get().second(),
        openCurlyBraceToken,
        elements,
        closeCurlyBraceToken);
    }

    return ClassTreeImpl.newClassExpression(
      optionalList(decorators),
      classToken, name.orNull(),
      null, null,
      openCurlyBraceToken,
      elements,
      closeCurlyBraceToken);
  }

  public ComputedPropertyNameTreeImpl computedPropertyName(InternalSyntaxToken openBracketToken, ExpressionTree expression, InternalSyntaxToken closeBracketToken) {
    return new ComputedPropertyNameTreeImpl(openBracketToken, expression, closeBracketToken);
  }

  public PairPropertyTreeImpl pairProperty(Tree name, InternalSyntaxToken colonToken, ExpressionTree value) {
    return new PairPropertyTreeImpl(name, colonToken, value);
  }

  public SpreadElementTreeImpl spreadElement(InternalSyntaxToken ellipsis, ExpressionTree expression) {
    return new SpreadElementTreeImpl(ellipsis, expression);
  }

  public ObjectLiteralTreeImpl newObjectLiteral(Tree property, Optional<List<Tuple<InternalSyntaxToken, Tree>>> restProperties, Optional<InternalSyntaxToken> trailingComma) {
    List<InternalSyntaxToken> commas = Lists.newArrayList();
    List<Tree> properties = Lists.newArrayList();

    properties.add(property);

    if (restProperties.isPresent()) {
      for (Tuple<InternalSyntaxToken, Tree> t : restProperties.get()) {
        commas.add(t.first());

        properties.add(t.second());
      }
    }

    if (trailingComma.isPresent()) {
      commas.add(trailingComma.get());
    }

    return new ObjectLiteralTreeImpl(new SeparatedList<>(properties, commas));
  }

  public ObjectLiteralTreeImpl completeObjectLiteral(InternalSyntaxToken openCurlyToken, Optional<ObjectLiteralTreeImpl> partial, InternalSyntaxToken closeCurlyToken) {
    if (partial.isPresent()) {
      return partial.get().complete(openCurlyToken, closeCurlyToken);
    }
    return new ObjectLiteralTreeImpl(openCurlyToken, closeCurlyToken);
  }

  public NewExpressionTreeImpl newExpressionWithArgument(InternalSyntaxToken newToken, ExpressionTree expression, ParameterListTreeImpl arguments) {
    return new NewExpressionTreeImpl(
      expression.is(Kind.SUPER) ? Kind.NEW_SUPER : Kind.NEW_EXPRESSION,
      newToken,
      expression,
      arguments);
  }

  public ExpressionTree newExpression(InternalSyntaxToken newToken, ExpressionTree expression) {
    return new NewExpressionTreeImpl(
      expression.is(Kind.SUPER) ? Kind.NEW_SUPER : Kind.NEW_EXPRESSION,
      newToken,
      expression);
  }

  public TemplateLiteralTree noSubstitutionTemplate(
    InternalSyntaxToken openBacktickToken,
    Optional<TemplateCharactersTree> templateCharacters,
    InternalSyntaxToken closeBacktickToken
  ) {
    return new TemplateLiteralTreeImpl(
      openBacktickToken,
      templateCharacters.isPresent() ? Collections.<Tree>singletonList(templateCharacters.get()) : Collections.<Tree>emptyList(),
      closeBacktickToken);
  }

  public TemplateExpressionTreeImpl templateExpression(
    InternalSyntaxToken dollar, InternalSyntaxToken openCurlyBrace,
    ExpressionTree expression, InternalSyntaxToken closeCurlyBrace
  ) {
    return new TemplateExpressionTreeImpl(dollar, openCurlyBrace, expression, closeCurlyBrace);
  }

  public TemplateLiteralTree substitutionTemplate(
    InternalSyntaxToken openBacktick, Optional<TemplateCharactersTree> firstCharacters,
    Optional<List<Tuple<TemplateExpressionTree, Optional<TemplateCharactersTree>>>> list, InternalSyntaxToken closeBacktick
  ) {
    List<Tree> elements = new ArrayList<>();

    if (firstCharacters.isPresent()) {
      elements.add(firstCharacters.get());
    }

    if (list.isPresent()) {
      for (Tuple<TemplateExpressionTree, Optional<TemplateCharactersTree>> tuple : list.get()) {
        elements.add(tuple.first());
        if (tuple.second().isPresent()) {
          elements.add(tuple.second().get());
        }
      }
    }

    return new TemplateLiteralTreeImpl(openBacktick, elements, closeBacktick);
  }

  public TemplateCharactersTreeImpl templateCharacters(List<InternalSyntaxToken> characters) {
    List<InternalSyntaxToken> characterTokens = new ArrayList<>();
    for (InternalSyntaxToken character : characters) {
      characterTokens.add(character);
    }
    return new TemplateCharactersTreeImpl(characterTokens);
  }

  public IdentifierTree thisExpression(InternalSyntaxToken thisKeyword) {
    return new IdentifierTreeImpl(Kind.THIS, thisKeyword);
  }

  public IdentifierTreeImpl labelIdentifier(Tree spacing, InternalSyntaxToken identifier) {
    return new IdentifierTreeImpl(Kind.LABEL_IDENTIFIER, identifier);
  }

  public IdentifierTreeImpl labelIdentifier(InternalSyntaxToken identifier) {
    return new IdentifierTreeImpl(Kind.LABEL_IDENTIFIER, identifier);
  }

  public ExpressionTree assignmentExpression(ExpressionTree variable, InternalSyntaxToken operator, ExpressionTree expression) {
    return commonAssignmentExpression(variable, operator, expression);
  }

  public ExpressionTree assignmentWithArrayDestructuring(ExpressionTree variable, InternalSyntaxToken operator, ExpressionTree expression) {
    return commonAssignmentExpression(variable, operator, expression);
  }

  private static ExpressionTree commonAssignmentExpression(ExpressionTree variable, InternalSyntaxToken operator, ExpressionTree expression) {
    return new AssignmentExpressionTreeImpl(EXPRESSION_KIND_BY_VALUE.get(operator.text()), variable, operator, expression);
  }

  public ExpressionTree expression(ExpressionTree expression, Optional<List<Tuple<InternalSyntaxToken, ExpressionTree>>> operatorAndOperands) {
    return buildBinaryExpression(expression, operatorAndOperands);
  }

  public ExpressionTree expressionNoLineBreak(Tree spacingNoLineBreak, ExpressionTree expression) {
    return expression;
  }

  public FromClauseTreeImpl fromClause(InternalSyntaxToken fromToken, LiteralTreeImpl module) {
    return new FromClauseTreeImpl(fromToken, module);
  }

  public DefaultExportDeclarationTreeImpl defaultExportDeclaration(InternalSyntaxToken exportToken, InternalSyntaxToken defaultToken, Object declaration) {
    Tree deducedDeclaration;
    InternalSyntaxToken eos = null;
    if (declaration instanceof Tuple) {
      deducedDeclaration = (Tree) ((Tuple) declaration).first();
      eos = nullableSemicolonToken((Tree) ((Tuple) declaration).second());
    } else {
      deducedDeclaration = (Tree) declaration;
    }

    return new DefaultExportDeclarationTreeImpl(
      exportToken,
      defaultToken,
      deducedDeclaration,
      eos);
  }

  public NamedExportDeclarationTreeImpl namedExportDeclaration(InternalSyntaxToken exportToken, Tree object) {
    return new NamedExportDeclarationTreeImpl(exportToken, object);
  }

  public SpecifierTreeImpl exportSpecifier(IdentifierTreeImpl name1, InternalSyntaxToken asToken, IdentifierTreeImpl name2) {
    return new SpecifierTreeImpl(Kind.EXPORT_SPECIFIER, name1, asToken, name2);
  }

  public SpecifierTreeImpl exportSpecifier(IdentifierTreeImpl name) {
    return new SpecifierTreeImpl(Kind.EXPORT_SPECIFIER, name);
  }

  public SpecifierListTreeImpl newExportSpecifierList(
    SpecifierTreeImpl specifier, Optional<List<Tuple<InternalSyntaxToken, SpecifierTreeImpl>>> restSpecifier,
    Optional<InternalSyntaxToken> trailingComma
  ) {
    List<InternalSyntaxToken> commas = Lists.newArrayList();
    List<SpecifierTree> specifiers = Lists.newArrayList();

    specifiers.add(specifier);

    if (restSpecifier.isPresent()) {
      for (Tuple<InternalSyntaxToken, SpecifierTreeImpl> t : restSpecifier.get()) {
        commas.add(t.first());
        specifiers.add(t.second());
      }
    }

    if (trailingComma.isPresent()) {
      commas.add(trailingComma.get());
    }

    return new SpecifierListTreeImpl(Kind.EXPORT_LIST, new SeparatedList<>(specifiers, commas));
  }

  public SpecifierListTreeImpl exportList(InternalSyntaxToken openCurlyBraceToken, Optional<SpecifierListTreeImpl> specifierList, InternalSyntaxToken closeCurlyBraceToken) {
    if (specifierList.isPresent()) {
      return specifierList.get().complete(openCurlyBraceToken, closeCurlyBraceToken);
    }
    return new SpecifierListTreeImpl(Kind.EXPORT_LIST, openCurlyBraceToken, closeCurlyBraceToken);
  }

  public NameSpaceExportDeclarationTree namespaceExportDeclaration(
    InternalSyntaxToken exportToken, InternalSyntaxToken starToken,
    Optional<Tuple<InternalSyntaxToken, IdentifierTreeImpl>> nameSpaceExport, FromClauseTreeImpl fromClause, Tree semicolonToken
  ) {
    InternalSyntaxToken asToken = null;
    IdentifierTree synonymIdentifier = null;
    if (nameSpaceExport.isPresent()) {
      asToken = nameSpaceExport.get().first;
      synonymIdentifier = nameSpaceExport.get().second;
    }
    return new NameSpaceExportDeclarationTreeImpl(exportToken, starToken, asToken, synonymIdentifier, fromClause, nullableSemicolonToken(semicolonToken));
  }

  public ExportClauseTreeImpl exportClause(SpecifierListTreeImpl exportList, Optional<FromClauseTreeImpl> fromClause, Tree semicolonToken) {
    if (fromClause.isPresent()) {
      return new ExportClauseTreeImpl(exportList, fromClause.get(), nullableSemicolonToken(semicolonToken));
    }
    return new ExportClauseTreeImpl(exportList, nullableSemicolonToken(semicolonToken));
  }

  public ExportDefaultBinding exportDefaultBinding(IdentifierTreeImpl identifierTree, FromClauseTreeImpl fromClauseTree, Tree semicolonToken) {
    return new ExportDefaultBindingImpl(identifierTree, fromClauseTree, nullableSemicolonToken(semicolonToken));
  }

  public ExportDefaultBindingWithNameSpaceExport exportDefaultBindingWithNameSpaceExport(
    IdentifierTreeImpl identifierTree, InternalSyntaxToken commaToken, InternalSyntaxToken starToken, InternalSyntaxToken asToken, IdentifierTreeImpl synonymIdentifier,
    FromClauseTreeImpl fromClause, Tree semicolon
  ) {
    return new ExportDefaultBindingWithNameSpaceExportImpl(
      identifierTree,
      commaToken,
      starToken,
      asToken,
      synonymIdentifier,
      fromClause,
      nullableSemicolonToken(semicolon));
  }

  public ExportDefaultBindingWithExportList exportDefaultBindingWithExportList(
    IdentifierTreeImpl identifierTree, InternalSyntaxToken commaToken, SpecifierListTreeImpl specifierListTree,
    FromClauseTreeImpl fromClauseTree, Tree semicolon
  ) {
    return new ExportDefaultBindingWithExportListImpl(
      identifierTree,
      commaToken,
      specifierListTree,
      fromClauseTree,
      nullableSemicolonToken(semicolon));
  }

  public ImportModuleDeclarationTree importModuleDeclaration(InternalSyntaxToken importToken, LiteralTreeImpl moduleName, Tree semicolonToken) {
    return new ImportModuleDeclarationTreeImpl(importToken, moduleName, nullableSemicolonToken(semicolonToken));
  }

  public SpecifierTreeImpl newImportSpecifier(IdentifierTreeImpl name, InternalSyntaxToken asToken, IdentifierTreeImpl identifier) {
    return new SpecifierTreeImpl(Kind.IMPORT_SPECIFIER, name, asToken, identifier);
  }

  public SpecifierTreeImpl importSpecifier(IdentifierTreeImpl name) {
    return new SpecifierTreeImpl(Kind.IMPORT_SPECIFIER, name);
  }

  public SpecifierListTreeImpl newImportSpecifierList(
    SpecifierTreeImpl specifier, Optional<List<Tuple<InternalSyntaxToken, SpecifierTreeImpl>>> restSpecifier,
    Optional<InternalSyntaxToken> trailingComma
  ) {
    List<InternalSyntaxToken> commas = Lists.newArrayList();
    List<SpecifierTree> specifiers = Lists.newArrayList();

    specifiers.add(specifier);

    if (restSpecifier.isPresent()) {
      for (Tuple<InternalSyntaxToken, SpecifierTreeImpl> t : restSpecifier.get()) {
        commas.add(t.first());
        specifiers.add(t.second());
      }
    }

    if (trailingComma.isPresent()) {
      commas.add(trailingComma.get());
    }

    return new SpecifierListTreeImpl(Kind.IMPORT_LIST, new SeparatedList<>(specifiers, commas));
  }

  public SpecifierListTreeImpl importList(InternalSyntaxToken openCurlyBraceToken, Optional<SpecifierListTreeImpl> specifierList, InternalSyntaxToken closeCurlyBraceToken) {
    if (specifierList.isPresent()) {
      return specifierList.get().complete(openCurlyBraceToken, closeCurlyBraceToken);
    }
    return new SpecifierListTreeImpl(Kind.IMPORT_LIST, openCurlyBraceToken, closeCurlyBraceToken);
  }

  public NameSpaceSpecifierTreeImpl nameSpaceImport(InternalSyntaxToken starToken, InternalSyntaxToken asToken, IdentifierTreeImpl localName) {
    return new NameSpaceSpecifierTreeImpl(starToken, asToken, localName);
  }

  public ImportClauseTreeImpl defaultImport(IdentifierTreeImpl identifierTree, Optional<Tuple<InternalSyntaxToken, DeclarationTree>> namedImport) {
    if (namedImport.isPresent()) {
      return new ImportClauseTreeImpl(identifierTree, namedImport.get().first(), namedImport.get().second());
    }
    return new ImportClauseTreeImpl(identifierTree);
  }

  public ImportClauseTreeImpl importClause(DeclarationTree importTree) {
    if (importTree instanceof ImportClauseTree) {
      return (ImportClauseTreeImpl) importTree;
    }
    return new ImportClauseTreeImpl(importTree);
  }

  public ImportDeclarationTreeImpl importDeclaration(InternalSyntaxToken importToken, ImportClauseTreeImpl importClause, FromClauseTreeImpl fromClause, Tree semicolonToken) {
    return new ImportDeclarationTreeImpl(importToken, importClause, fromClause, nullableSemicolonToken(semicolonToken));
  }

  public ModuleTreeImpl module(List<Tree> items) {
    return new ModuleTreeImpl(items);
  }

  // [START] Classes, methods, functions & generators

  public ClassTreeImpl classDeclaration(
    Optional<List<DecoratorTree>> decorators, InternalSyntaxToken classToken, IdentifierTreeImpl name,
    Optional<Tuple<InternalSyntaxToken, ExpressionTree>> extendsClause,
    InternalSyntaxToken openCurlyBraceToken, Optional<List<Tree>> members, InternalSyntaxToken closeCurlyBraceToken
  ) {

    List<Tree> elements = Lists.newArrayList();

    if (members.isPresent()) {
      for (Tree member : members.get()) {
        elements.add(member);
      }
    }

    if (extendsClause.isPresent()) {
      return ClassTreeImpl.newClassDeclaration(
        optionalList(decorators), classToken, name,
        extendsClause.get().first(), extendsClause.get().second(),
        openCurlyBraceToken,
        elements,
        closeCurlyBraceToken);
    }

    return ClassTreeImpl.newClassDeclaration(
      optionalList(decorators),
      classToken, name,
      null, null,
      openCurlyBraceToken,
      elements,
      closeCurlyBraceToken);
  }

  public GeneratorMethodDeclarationTree generator(
    Optional<List<DecoratorTree>> decorators, Optional<InternalSyntaxToken> staticToken, InternalSyntaxToken starToken,
    Tree name, ParameterListTreeImpl parameters,
    BlockTreeImpl body
  ) {
    return new GeneratorMethodDeclarationTreeImpl(optionalList(decorators), staticToken.orNull(), starToken, name, parameters, body);
  }

  public MethodDeclarationTreeImpl method(
    Optional<List<DecoratorTree>> decorators, Optional<InternalSyntaxToken> staticToken, Optional<InternalSyntaxToken> asyncToken, Tree name, ParameterListTreeImpl parameters,
    BlockTreeImpl body
  ) {
    return new MethodDeclarationTreeImpl(optionalList(decorators), staticToken.orNull(), asyncToken.orNull(), name, parameters, body);
  }

  public AccessorMethodDeclarationTree accessor(
    Optional<List<DecoratorTree>> decorators, Optional<InternalSyntaxToken> staticToken, InternalSyntaxToken accessorToken, Tree name,
    ParameterListTreeImpl parameters,
    BlockTreeImpl body
  ) {

    return new AccessorMethodDeclarationTreeImpl(optionalList(decorators), staticToken.orNull(), accessorToken, name, parameters, body);
  }

  public FunctionDeclarationTree functionAndGeneratorDeclaration(
    Optional<InternalSyntaxToken> asyncToken, InternalSyntaxToken functionToken, Optional<InternalSyntaxToken> starToken,
    IdentifierTreeImpl name, ParameterListTreeImpl parameters, BlockTreeImpl body
  ) {

    return starToken.isPresent() ?
      FunctionDeclarationTreeImpl.createGenerator(functionToken, starToken.get(), name, parameters, body) :
      FunctionDeclarationTreeImpl.create(asyncToken.orNull(), functionToken, name, parameters, body);
  }

  // [START] Destructuring pattern

  public InitializedBindingElementTreeImpl newInitializedBindingElement1(InternalSyntaxToken equalToken, ExpressionTree expression) {
    return new InitializedBindingElementTreeImpl(equalToken, expression);
  }

  private static BindingElementTree completeBindingElement(BindingElementTree left, Optional<InitializedBindingElementTreeImpl> initializer) {
    if (!initializer.isPresent()) {
      return left;
    }
    return initializer.get().completeWithLeft(left);
  }

  public BindingElementTree completeBindingElement1(BindingElementTree left, Optional<InitializedBindingElementTreeImpl> initializer) {
    return completeBindingElement(left, initializer);
  }

  public BindingPropertyTreeImpl bindingProperty(Tree propertyName, InternalSyntaxToken colonToken, BindingElementTree bindingElement) {
    return new BindingPropertyTreeImpl(propertyName, colonToken, bindingElement);
  }

  public RestElementTreeImpl restObjectBindingElement(InternalSyntaxToken ellipsis, BindingElementTree bindingElement) {
    return new RestElementTreeImpl(ellipsis, bindingElement);
  }

  public SeparatedList<BindingElementTree> bindingPropertyList(
    BindingElementTree bindingProperty,
    Optional<List<Tuple<InternalSyntaxToken, BindingElementTree>>> restProperties
  ) {
    List<BindingElementTree> properties = Lists.newArrayList();
    List<InternalSyntaxToken> commas = Lists.newArrayList();

    properties.add(bindingProperty);

    if (restProperties.isPresent()) {
      for (Tuple<InternalSyntaxToken, BindingElementTree> tuple : restProperties.get()) {
        // Comma
        commas.add(tuple.first());

        // Property
        properties.add(tuple.second());
      }
    }

    return new SeparatedList<>(properties, commas);
  }

  public ObjectBindingPatternTreeImpl objectBindingPattern(
    InternalSyntaxToken lCurlyBrace,
    Optional<SeparatedList<BindingElementTree>> list,
    Optional<Tuple<InternalSyntaxToken, Optional<RestElementTree>>> commaAndRest,
    InternalSyntaxToken rCurlyBrace
  ) {

    SeparatedList<BindingElementTree> elements;

    if (list.isPresent()) {
      elements = list.get();
    } else {
      elements = new SeparatedList<>(new ArrayList<BindingElementTree>(), new ArrayList<InternalSyntaxToken>());
    }

    if (commaAndRest.isPresent()) {
      elements.getSeparators().add(commaAndRest.get().first);

      if (commaAndRest.get().second.isPresent()) {
        elements.add(commaAndRest.get().second.get());
      }
    }

    return new ObjectBindingPatternTreeImpl(
      lCurlyBrace,
      elements,
      rCurlyBrace);
  }

  public ObjectBindingPatternTreeImpl objectBindingPattern2(InternalSyntaxToken lCurlyBrace, RestElementTree rest, InternalSyntaxToken rCurlyBrace) {
    return new ObjectBindingPatternTreeImpl(
      lCurlyBrace,
      new SeparatedList<>(ImmutableList.<BindingElementTree>of(rest), ImmutableList.<InternalSyntaxToken>of()),
      rCurlyBrace);
  }

  public ArrayBindingPatternTreeImpl arrayBindingPattern(
    InternalSyntaxToken openBracketToken,
    Optional<BindingElementTree> firstElement,
    Optional<List<Tuple<InternalSyntaxToken, Optional<BindingElementTree>>>> optionalElements,
    Optional<BindingElementTree> restElement,
    InternalSyntaxToken closeBracketToken
  ) {
    return new ArrayBindingPatternTreeImpl(
      openBracketToken,
      getSeparatedListOfOptional(firstElement, optionalElements, restElement),
      closeBracketToken);
  }

  public ArrayAssignmentPatternTree arrayAssignmentPattern(
    InternalSyntaxToken openBracketToken,
    Optional<Tree> firstElement,
    Optional<List<Tuple<InternalSyntaxToken, Optional<Tree>>>> optionalElements,
    Optional<Tree> restElement,
    InternalSyntaxToken closeBracketToken
  ) {
    return new ArrayAssignmentPatternTreeImpl(
      openBracketToken,
      getSeparatedListOfOptional(firstElement, optionalElements, restElement),
      closeBracketToken);
  }

  private static <T extends Tree> SeparatedList<Optional<T>> getSeparatedListOfOptional(
    Optional<T> firstElement,
    Optional<List<Tuple<InternalSyntaxToken, Optional<T>>>> optionalElements,
    Optional<T> restElement
  ) {

    ImmutableList.Builder<Optional<T>> elements = ImmutableList.builder();
    ImmutableList.Builder<InternalSyntaxToken> separators = ImmutableList.builder();

    boolean skipComma = false;

    if (firstElement.isPresent()) {
      elements.add(firstElement);
      skipComma = true;
    }

    if (optionalElements.isPresent()) {
      List<Tuple<InternalSyntaxToken, Optional<T>>> list = optionalElements.get();
      for (Tuple<InternalSyntaxToken, Optional<T>> pair : list) {
        if (!skipComma) {
          elements.add(Optional.absent());
        }

        InternalSyntaxToken commaToken = pair.first();
        separators.add(commaToken);

        if (pair.second().isPresent()) {
          elements.add(pair.second());
          skipComma = true;
        } else {
          skipComma = false;
        }
      }
    }

    if (restElement.isPresent()) {
      elements.add(Optional.of(restElement.get()));
    }

    return new SeparatedList<>(elements.build(), separators.build());
  }

  public ExpressionTree assignmentNoCurly(Tree lookahead, ExpressionTree expression) {
    return expression;
  }

  public ExpressionTree skipLookahead1(Tree lookahead, ExpressionTree expression) {
    return expression;
  }

  public ExpressionTree skipLookahead2(Tree lookahead, ExpressionTree expression) {
    return expression;
  }

  public ExpressionTree skipLookahead3(Tree lookahead, ExpressionTree expression) {
    return expression;
  }

  public ExpressionTree skipLookahead4(ExpressionTree expression, Tree lookahead) {
    return expression;
  }

  // [END] Destructuring pattern

  // [END] Classes, methods, functions & generators

  public ScriptTreeImpl script(Optional<InternalSyntaxToken> shebangToken, Optional<ModuleTreeImpl> items, Tree spacing, InternalSyntaxToken eof) {
    return new ScriptTreeImpl(
      shebangToken.isPresent() ? shebangToken.get() : null,
      items.isPresent() ? items.get() : null,
      eof);
  }

  public ExpressionTree defaultExportExpression(Tree lookahead, ExpressionTree expression) {
    return expression;
  }

  // [START] JSX

  public JsxSelfClosingElementTree jsxSelfClosingElement(
    InternalSyntaxToken ltToken,
    JsxElementNameTree jsxElementNameTree,
    Optional<List<JsxAttributeTree>> attributes,
    InternalSyntaxToken divToken, InternalSyntaxToken gtToken
  ) {
    return new JsxSelfClosingElementTreeImpl(ltToken, jsxElementNameTree, optionalList(attributes), divToken, gtToken);
  }

  public JsxStandardElementTree jsxStandardElement(
    JsxOpeningElementTree jsxOpeningElementTree,
    Optional<List<JsxChildTree>> children,
    JsxClosingElementTree jsxClosingElementTree
  ) {
    return new JsxStandardElementTreeImpl(jsxOpeningElementTree, optionalList(children), jsxClosingElementTree);
  }

  public JsxOpeningElementTree jsxOpeningElement(
    InternalSyntaxToken ltToken,
    JsxElementNameTree jsxElementNameTree,
    Optional<List<JsxAttributeTree>> attributes,
    InternalSyntaxToken gtToken
  ) {
    return new JsxOpeningElementTreeImpl(
      ltToken,
      jsxElementNameTree,
      optionalList(attributes),
      gtToken);
  }

  public JsxClosingElementTree jsxClosingElement(InternalSyntaxToken ltToken, InternalSyntaxToken divToken, JsxElementNameTree jsxElementNameTree, InternalSyntaxToken gtToken) {
    return new JsxClosingElementTreeImpl(ltToken, divToken, jsxElementNameTree, gtToken);
  }

  public JsxJavaScriptExpressionTree jsxJavaScriptExpression(InternalSyntaxToken lCurlyBraceToken, Optional<ExpressionTree> expression, InternalSyntaxToken rCurlyBraceToken) {
    return new JsxJavaScriptExpressionTreeImpl(lCurlyBraceToken, expression.orNull(), rCurlyBraceToken);
  }

  public JsxJavaScriptExpressionTree jsxJavaScriptExpression(InternalSyntaxToken lCurlyBraceToken, ExpressionTree expression, InternalSyntaxToken rCurlyBraceToken) {
    return new JsxJavaScriptExpressionTreeImpl(lCurlyBraceToken, expression, rCurlyBraceToken);
  }

  public JsxStandardAttributeTree jsxStandardAttribute(JsxIdentifierTree name, InternalSyntaxToken equalToken, JsxAttributeValueTree jsxAttributeValueTree) {
    return new JsxStandardAttributeTreeImpl(name, equalToken, jsxAttributeValueTree);
  }

  public JsxSpreadAttributeTree jsxSpreadAttribute(
    InternalSyntaxToken lCurlyBraceToken,
    InternalSyntaxToken ellipsisToken,
    ExpressionTree expressionTree,
    InternalSyntaxToken rCurlyBraceToken
  ) {
    return new JsxSpreadAttributeTreeImpl(lCurlyBraceToken, ellipsisToken, expressionTree, rCurlyBraceToken);
  }

  public JsxTextTree jsxTextTree(InternalSyntaxToken token) {
    return new JsxTextTreeImpl(token);
  }

  public JsxIdentifierTree jsxIdentifier(InternalSyntaxToken identifierToken) {
    return new JsxIdentifierTreeImpl(identifierToken);
  }

  public JsxIdentifierTree jsxHtmlTag(InternalSyntaxToken htmlTagToken) {
    return new JsxIdentifierTreeImpl(htmlTagToken);
  }

  public ExpressionTree jsxMemberExpression(IdentifierTree identifierTree, List<Tuple<InternalSyntaxToken, IdentifierTreeImpl>> rest) {
    ExpressionTree currentObject = identifierTree;
    for (Tuple<InternalSyntaxToken, IdentifierTreeImpl> tuple : rest) {
      DotMemberExpressionTreeImpl newMemberExpression = new DotMemberExpressionTreeImpl(tuple.first, tuple.second);
      newMemberExpression.complete(currentObject);
      currentObject = newMemberExpression;
    }

    return currentObject;
  }

  public FieldDeclarationTree fieldDeclaration(
    Optional<List<DecoratorTree>> decorators, Optional<InternalSyntaxToken> staticToken, Tree propertyName,
    Optional<Tuple<InternalSyntaxToken, ExpressionTree>> initializer,
    Tree semicolonToken
  ) {
    if (initializer.isPresent()) {
      return new FieldDeclarationTreeImpl(
        optionalList(decorators),
        staticToken.orNull(),
        propertyName,
        initializer.get().first,
        initializer.get().second,
        nullableSemicolonToken(semicolonToken));
    }

    return new FieldDeclarationTreeImpl(optionalList(decorators), staticToken.orNull(), propertyName, null, null, nullableSemicolonToken(semicolonToken));
  }

  public DecoratorTree decorator(
    InternalSyntaxToken atToken, IdentifierTreeImpl name,
    Optional<List<Tuple<InternalSyntaxToken, IdentifierTree>>> rest, Optional<ParameterListTree> arguments
  ) {
    Builder<IdentifierTree> listBuilder = ImmutableList.builder();
    Builder<InternalSyntaxToken> dotsListBuilder = ImmutableList.builder();
    listBuilder.add(name);

    for (Tuple<InternalSyntaxToken, IdentifierTree> tuple : rest.or(new ArrayList<>())) {
      dotsListBuilder.add(tuple.first);
      listBuilder.add(tuple.second);
    }

    SeparatedList<IdentifierTree> body = new SeparatedList<>(listBuilder.build(), dotsListBuilder.build());

    return new DecoratorTreeImpl(atToken, body, arguments.orNull());
  }

  public AssignmentPatternRestElementTreeImpl assignmentPatternRestElement(InternalSyntaxToken ellipsisToken, ExpressionTree rest) {
    return new AssignmentPatternRestElementTreeImpl(ellipsisToken, rest);
  }

  public InitializedAssignmentPatternElementTree initializedAssignmentPatternElement1(ExpressionTree expression, InternalSyntaxToken equal, ExpressionTree initValue) {
    return new InitializedAssignmentPatternElementTreeImpl(expression, equal, initValue);
  }

  public InitializedAssignmentPatternElementTree initializedAssignmentPatternElement2(ExpressionTree expression, InternalSyntaxToken equal, ExpressionTree initValue) {
    return new InitializedAssignmentPatternElementTreeImpl(expression, equal, initValue);
  }

  public ObjectAssignmentPatternPairElementTree objectAssignmentPatternPairElement(IdentifierTree identifierName, InternalSyntaxToken colonToken, Tree rhs) {
    return new ObjectAssignmentPatternPairElementTreeImpl(identifierName, colonToken, rhs);
  }

  public ObjectAssignmentPatternTree emptyObjectAssignmentPattern(InternalSyntaxToken lBrace, InternalSyntaxToken rBrace) {
    return new ObjectAssignmentPatternTreeImpl(lBrace, new SeparatedList<>(new ArrayList<>(), new ArrayList<>()), rBrace);
  }

  public ObjectAssignmentPatternTree objectAssignmentPattern(
    InternalSyntaxToken lBrace,
    Tree firstProperty,
    Optional<List<Tuple<InternalSyntaxToken, Tree>>> properties,
    Optional<InternalSyntaxToken> comma,
    InternalSyntaxToken rBrace
  ) {
    ArrayList<Tree> propertyList = new ArrayList<>();
    ArrayList<InternalSyntaxToken> separators = new ArrayList<>();

    propertyList.add(firstProperty);

    for (Tuple<InternalSyntaxToken, Tree> tuple : properties.or(new ArrayList<>())) {
      separators.add(tuple.first);
      propertyList.add(tuple.second);
    }

    if (comma.isPresent()) {
      separators.add(comma.get());
    }

    return new ObjectAssignmentPatternTreeImpl(lBrace, new SeparatedList<>(propertyList, separators), rBrace);
  }

  public static class Tuple<T, U> {

    private final T first;
    private final U second;

    public Tuple(T first, U second) {
      super();

      this.first = first;
      this.second = second;
    }

    public T first() {
      return first;
    }

    public U second() {
      return second;
    }
  }

  private static <T> List<T> optionalList(Optional<List<T>> list) {
    if (list.isPresent()) {
      return list.get();
    } else {
      return Collections.emptyList();
    }
  }

  private static <T, U> Tuple<T, U> newTuple(T first, U second) {
    return new Tuple<>(first, second);
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

  public <T, U> Tuple<T, U> newTuple31(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple32(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple48(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple49(T first, U second) {
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

  public <T, U> Tuple<T, U> newTuple55(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple56(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple57(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple58(T first, U second) {
    return newTuple(first, second);
  }

  public <T, U> Tuple<T, U> newTuple59(T first, U second) {
    return newTuple(first, second);
  }

}
