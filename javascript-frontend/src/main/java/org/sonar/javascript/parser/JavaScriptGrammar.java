/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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

import com.sonar.sslr.api.typed.GrammarBuilder;
import java.util.List;
import org.sonar.javascript.lexer.JavaScriptKeyword;
import org.sonar.javascript.lexer.JavaScriptPunctuator;
import org.sonar.javascript.lexer.JavaScriptTokenType;
import org.sonar.javascript.parser.TreeFactory.BracketAccessTail;
import org.sonar.javascript.parser.TreeFactory.ConditionalExpressionTail;
import org.sonar.javascript.parser.TreeFactory.DotAccessTail;
import org.sonar.javascript.parser.TreeFactory.ExpressionTail;
import org.sonar.javascript.parser.TreeFactory.VueElement;
import org.sonar.javascript.parser.TreeFactory.VueScriptTag;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.ModuleTree;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.SeparatedList;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.ArrayBindingPatternTree;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.ClassTree;
import org.sonar.plugins.javascript.api.tree.declaration.DeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.DecoratorTree;
import org.sonar.plugins.javascript.api.tree.declaration.DefaultExportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ExportClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.ExportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ExportDefaultBinding;
import org.sonar.plugins.javascript.api.tree.declaration.ExportDefaultBindingWithExportList;
import org.sonar.plugins.javascript.api.tree.declaration.ExportDefaultBindingWithNameSpaceExport;
import org.sonar.plugins.javascript.api.tree.declaration.ExtendsClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.FieldDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.FromClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.declaration.ImportClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.NameSpaceExportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.NameSpaceImportTree;
import org.sonar.plugins.javascript.api.tree.declaration.NamedExportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.NamedImportExportClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.ObjectBindingPatternTree;
import org.sonar.plugins.javascript.api.tree.declaration.ParameterListTree;
import org.sonar.plugins.javascript.api.tree.declaration.SpecifierTree;
import org.sonar.plugins.javascript.api.tree.expression.ArgumentListTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrayAssignmentPatternTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrayLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentPatternRestElementTree;
import org.sonar.plugins.javascript.api.tree.expression.ComputedPropertyNameTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.ImportTree;
import org.sonar.plugins.javascript.api.tree.expression.InitializedAssignmentPatternElementTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.NewTargetTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectAssignmentPatternTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.PairPropertyTree;
import org.sonar.plugins.javascript.api.tree.expression.ParenthesisedExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.RestElementTree;
import org.sonar.plugins.javascript.api.tree.expression.SpreadElementTree;
import org.sonar.plugins.javascript.api.tree.expression.SuperTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateCharactersTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.YieldExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxAttributeTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxAttributeValueTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxChildTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxClosingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxElementNameTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxEmptyClosingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxEmptyOpeningElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxIdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxOpeningElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxSelfClosingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxSpreadAttributeTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxStandardAttributeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowArrayTypeWithKeywordTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowCastingExpressionTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowDeclareTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowFunctionSignatureTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowFunctionTypeParameterClauseTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowFunctionTypeParameterTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowGenericParameterClauseTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowGenericParameterTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowImplementsClauseTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowIndexerPropertyDefinitionKeyTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowInterfaceDeclarationTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowLiteralTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowMethodPropertyDefinitionKeyTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowModuleExportsTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowModuleTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowNamespacedTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowObjectTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowOpaqueTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowOptionalBindingElementTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowOptionalTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowParameterizedGenericsTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowParenthesisedTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowPropertyDefinitionTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowSimplePropertyDefinitionKeyTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowSimpleTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTupleTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypeAliasStatementTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypeAnnotationTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypeofTypeTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.BreakStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.CaseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.CatchBlockTree;
import org.sonar.plugins.javascript.api.tree.statement.ContinueStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.DebuggerStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.DefaultClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.DoWhileStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ElseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.EmptyStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ExpressionStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.FinallyBlockTree;
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

import static org.sonar.javascript.parser.EcmaScriptLexer.SPACING;
import static org.sonar.javascript.parser.EcmaScriptLexer.VUE_SPACING;

public class JavaScriptGrammar {

  private final GrammarBuilder<InternalSyntaxToken> b;
  private final TreeFactory f;

  public JavaScriptGrammar(GrammarBuilder<InternalSyntaxToken> b, TreeFactory f) {
    this.b = b;
    this.f = f;
  }

  /**
   * A.4 Statement
   */

  public EmptyStatementTree EMPTY_STATEMENT() {
    return b.<EmptyStatementTree>nonterminal(Kind.EMPTY_STATEMENT)
      .is(f.emptyStatement(b.token(JavaScriptPunctuator.SEMI)));
  }

  public DebuggerStatementTree DEBUGGER_STATEMENT() {
    return b.<DebuggerStatementTree>nonterminal(Kind.DEBUGGER_STATEMENT)
      .is(f.debuggerStatement(b.token(JavaScriptKeyword.DEBUGGER), b.token(EcmaScriptLexer.EOS)));
  }

  public VariableStatementTree VARIABLE_STATEMENT() {
    return b.<VariableStatementTree>nonterminal(Kind.VARIABLE_STATEMENT)
      .is(f.variableStatement(VARIABLE_DECLARATION(), b.token(EcmaScriptLexer.EOS)));
  }

  public VariableDeclarationTree VARIABLE_DECLARATION() {
    return b.<VariableDeclarationTree>nonterminal()
      .is(
        f.variableDeclaration1(
          b.firstOf(
            b.token(JavaScriptKeyword.VAR),
            b.token(EcmaScriptLexer.LET),
            b.token(JavaScriptKeyword.CONST)),
          BINDING_ELEMENT_LIST()));
  }

  public SeparatedList<BindingElementTree> BINDING_ELEMENT_LIST() {
    return b.<SeparatedList<BindingElementTree>>nonterminal()
      .is(f.bindingElementList1(BINDING_ELEMENT(), b.zeroOrMore(f.newTuple(b.token(JavaScriptPunctuator.COMMA), BINDING_ELEMENT()))));
  }

  public LabelledStatementTree LABELLED_STATEMENT() {
    return b.<LabelledStatementTree>nonterminal(Kind.LABELLED_STATEMENT)
      .is(f.labelledStatement(b.token(JavaScriptTokenType.IDENTIFIER), b.token(JavaScriptPunctuator.COLON), STATEMENT()));
  }

  public ContinueStatementTree CONTINUE_STATEMENT() {
    return b.<ContinueStatementTree>nonterminal(Kind.CONTINUE_STATEMENT)
      .is(b.firstOf(
        CONTINUE_WITH_LABEL(),
        CONTINUE_WITHOUT_LABEL()));
  }

  public ContinueStatementTree CONTINUE_WITH_LABEL() {
    return b.<ContinueStatementTree>nonterminal()
      .is(f.continueWithLabel(
        b.token(JavaScriptKeyword.CONTINUE),
        LABEL_IDENTIFIER_NO_LB(),
        b.token(EcmaScriptLexer.EOS)));
  }

  public ContinueStatementTree CONTINUE_WITHOUT_LABEL() {
    return b.<ContinueStatementTree>nonterminal()
      .is(f.continueWithoutLabel(b.token(JavaScriptKeyword.CONTINUE), b.token(EcmaScriptLexer.EOS_NO_LB)));
  }

  public BreakStatementTree BREAK_STATEMENT() {
    return b.<BreakStatementTree>nonterminal(Kind.BREAK_STATEMENT)
      .is(b.firstOf(
        BREAK_WITH_LABEL(),
        BREAK_WITHOUT_LABEL()));
  }

  public BreakStatementTree BREAK_WITH_LABEL() {
    return b.<BreakStatementTree>nonterminal()
      .is(f.breakWithLabel(
        b.token(JavaScriptKeyword.BREAK),
        LABEL_IDENTIFIER_NO_LB(),
        b.token(EcmaScriptLexer.EOS)));
  }

  public BreakStatementTree BREAK_WITHOUT_LABEL() {
    return b.<BreakStatementTree>nonterminal()
      .is(f.breakWithoutLabel(b.token(JavaScriptKeyword.BREAK), b.token(EcmaScriptLexer.EOS_NO_LB)));
  }

  public ReturnStatementTree RETURN_STATEMENT() {
    return b.<ReturnStatementTree>nonterminal(Kind.RETURN_STATEMENT)
      .is(b.firstOf(
        RETURN_WITH_EXPRESSION(),
        RETURN_WITHOUT_EXPRESSION()));
  }

  public ReturnStatementTree RETURN_WITH_EXPRESSION() {
    return b.<ReturnStatementTree>nonterminal()
      .is(f.returnWithExpression(
        b.token(JavaScriptKeyword.RETURN),
        EXPRESSION_NO_LINE_BREAK(),
        b.token(EcmaScriptLexer.EOS)));
  }

  public ReturnStatementTree RETURN_WITHOUT_EXPRESSION() {
    return b.<ReturnStatementTree>nonterminal()
      .is(f.returnWithoutExpression(b.token(JavaScriptKeyword.RETURN), b.token(EcmaScriptLexer.EOS_NO_LB)));
  }

  public ThrowStatementTree THROW_STATEMENT() {
    return b.<ThrowStatementTree>nonterminal(Kind.THROW_STATEMENT)
      .is(
        f.newThrowStatement(
          b.token(JavaScriptKeyword.THROW),
          EXPRESSION_NO_LINE_BREAK(),
          b.token(EcmaScriptLexer.EOS)));
  }

  public WithStatementTree WITH_STATEMENT() {
    return b.<WithStatementTree>nonterminal(Kind.WITH_STATEMENT)
      .is(f.newWithStatement(
        b.token(JavaScriptKeyword.WITH),
        b.token(JavaScriptPunctuator.LPARENTHESIS),
        EXPRESSION(),
        b.token(JavaScriptPunctuator.RPARENTHESIS),
        STATEMENT()));
  }

  public BlockTree BLOCK() {
    return b.<BlockTree>nonterminal(Kind.BLOCK)
      .is(f.newBlock(
        b.token(JavaScriptPunctuator.LCURLYBRACE),
        b.optional(b.oneOrMore(STATEMENT())),
        b.token(JavaScriptPunctuator.RCURLYBRACE)));
  }

  public TryStatementTree TRY_STATEMENT() {
    return b.<TryStatementTree>nonterminal(Kind.TRY_STATEMENT)
      .is(b.firstOf(
        TRY_STATEMENT_WITHOUT_CATCH(),
        TRY_STATEMENT_WITH_CATCH()));
  }

  public TryStatementTree TRY_STATEMENT_WITHOUT_CATCH() {
    return b.<TryStatementTree>nonterminal()
      .is(f.tryStatementWithoutCatch(
        b.token(JavaScriptKeyword.TRY),
        BLOCK(),
        FINALLY_CLAUSE()));
  }

  public TryStatementTree TRY_STATEMENT_WITH_CATCH() {
    return b.<TryStatementTree>nonterminal()
      .is(f.tryStatementWithCatch(
        b.token(JavaScriptKeyword.TRY),
        BLOCK(),
        CATCH_CLAUSE(),
        b.optional(FINALLY_CLAUSE())));
  }

  public FinallyBlockTree FINALLY_CLAUSE() {
    return b.<FinallyBlockTree>nonterminal()
      .is(f.finallyBlock(b.token(JavaScriptKeyword.FINALLY), BLOCK()));
  }

  public CatchBlockTree CATCH_CLAUSE() {
    return b.<CatchBlockTree>nonterminal(Kind.CATCH_BLOCK)
      .is(f.newCatchBlock(
        b.token(JavaScriptKeyword.CATCH),
        b.token(JavaScriptPunctuator.LPARENTHESIS),
        b.firstOf(
          BINDING_IDENTIFIER(),
          BINDING_PATTERN()
        ),
        b.token(JavaScriptPunctuator.RPARENTHESIS),
        BLOCK()));
  }

  public SwitchStatementTree SWITCH_STATEMENT() {
    return b.<SwitchStatementTree>nonterminal(Kind.SWITCH_STATEMENT)
      .is(f.switchStatement(
        b.token(JavaScriptKeyword.SWITCH),
        b.token(JavaScriptPunctuator.LPARENTHESIS),
        EXPRESSION(),
        b.token(JavaScriptPunctuator.RPARENTHESIS),
        b.token(JavaScriptPunctuator.LCURLYBRACE),
        b.optional(SWITCH_CASES()),
        b.token(JavaScriptPunctuator.RCURLYBRACE)
        ));
  }

  public List<SwitchClauseTree> SWITCH_CASES() {
    return b.<List<SwitchClauseTree>>nonterminal()
      .is(f.switchCases(
        b.zeroOrMore(b.firstOf(CASE_CLAUSE(), DEFAULT_CLAUSE()))));
  }

  public CaseClauseTree CASE_CLAUSE() {
    return b.<CaseClauseTree>nonterminal(Kind.CASE_CLAUSE)
      .is(f.caseClause(
        b.token(JavaScriptKeyword.CASE),
        EXPRESSION(),
        b.token(JavaScriptPunctuator.COLON),
        b.optional(b.oneOrMore(STATEMENT()))));
  }

  public DefaultClauseTree DEFAULT_CLAUSE() {
    return b.<DefaultClauseTree>nonterminal(Kind.DEFAULT_CLAUSE)
      .is(f.defaultClause(
        b.token(JavaScriptKeyword.DEFAULT),
        b.token(JavaScriptPunctuator.COLON),
        b.optional(b.oneOrMore(STATEMENT()))));
  }

  public IfStatementTree IF_STATEMENT() {
    return b.<IfStatementTree>nonterminal(Kind.IF_STATEMENT)
      .is(
        f.ifStatement(
          b.token(JavaScriptKeyword.IF),
          b.token(JavaScriptPunctuator.LPARENTHESIS),
          EXPRESSION(),
          b.token(JavaScriptPunctuator.RPARENTHESIS),
          STATEMENT(),
          b.optional(ELSE_CLAUSE())));
  }

  public ElseClauseTree ELSE_CLAUSE() {
    return b.<ElseClauseTree>nonterminal(Kind.ELSE_CLAUSE)
      .is(f.elseClause(
        b.token(JavaScriptKeyword.ELSE),
        STATEMENT()));
  }

  public WhileStatementTree WHILE_STATEMENT() {
    return b.<WhileStatementTree>nonterminal(Kind.WHILE_STATEMENT)
      .is(
        f.whileStatement(
          b.token(JavaScriptKeyword.WHILE),
          b.token(JavaScriptPunctuator.LPARENTHESIS),
          EXPRESSION(),
          b.token(JavaScriptPunctuator.RPARENTHESIS),
          STATEMENT()));
  }

  public DoWhileStatementTree DO_WHILE_STATEMENT() {
    return b.<DoWhileStatementTree>nonterminal(Kind.DO_WHILE_STATEMENT)
      .is(
        f.doWhileStatement(
          b.token(JavaScriptKeyword.DO),
          STATEMENT(),
          b.token(JavaScriptKeyword.WHILE),
          b.token(JavaScriptPunctuator.LPARENTHESIS),
          EXPRESSION(),
          b.token(JavaScriptPunctuator.RPARENTHESIS),
          b.token(EcmaScriptLexer.EOS)));
  }

  public ExpressionStatementTree EXPRESSION_STATEMENT() {
    return b.<ExpressionStatementTree>nonterminal(Kind.EXPRESSION_STATEMENT)
      .is(f.expressionStatement(EXPRESSION(), b.token(EcmaScriptLexer.EOS)));
  }

  /**
   * ECMAScript 6
   */
  public ForObjectStatementTree FOR_OF_STATEMENT() {
    return b.<ForObjectStatementTree>nonterminal(Kind.FOR_OF_STATEMENT)
      .is(f.forOfStatement(
        b.token(JavaScriptKeyword.FOR),
        b.optional(b.token(JavaScriptKeyword.AWAIT)),
        b.token(JavaScriptPunctuator.LPARENTHESIS),
        b.firstOf(
          VARIABLE_DECLARATION(),
          f.skipLookahead(b.token(EcmaScriptLexer.NEXT_NOT_LET), LEFT_HAND_SIDE_EXPRESSION())),
        b.token(EcmaScriptLexer.OF),
        ASSIGNMENT_EXPRESSION(),
        b.token(JavaScriptPunctuator.RPARENTHESIS),
        STATEMENT()));
  }

  public ForObjectStatementTree FOR_IN_STATEMENT() {
    return b.<ForObjectStatementTree>nonterminal(Kind.FOR_IN_STATEMENT)
      .is(
        f.forInStatement(
          b.token(JavaScriptKeyword.FOR),
          b.token(JavaScriptPunctuator.LPARENTHESIS),
          b.firstOf(
            VARIABLE_DECLARATION(),
            f.skipLookahead(b.token(EcmaScriptLexer.NEXT_NOT_LET_AND_BRACKET), LEFT_HAND_SIDE_EXPRESSION())),
          b.token(JavaScriptKeyword.IN),
          EXPRESSION(),
          b.token(JavaScriptPunctuator.RPARENTHESIS),
          STATEMENT()));
  }

  public ForStatementTree FOR_STATEMENT() {
    return b.<ForStatementTree>nonterminal(Kind.FOR_STATEMENT)
      .is(
        f.forStatement(
          b.token(JavaScriptKeyword.FOR),
          b.token(JavaScriptPunctuator.LPARENTHESIS),

          b.optional(
            b.firstOf(
              VARIABLE_DECLARATION(),
              f.skipLookahead(b.token(EcmaScriptLexer.NEXT_NOT_LET_AND_BRACKET), EXPRESSION()))),
          b.token(JavaScriptPunctuator.SEMI),

          b.optional(EXPRESSION()),
          b.token(JavaScriptPunctuator.SEMI),

          b.optional(EXPRESSION()),
          b.token(JavaScriptPunctuator.RPARENTHESIS),
          STATEMENT()));
  }

  public StatementTree ITERATION_STATEMENT() {
    return b.<StatementTree>nonterminal(EcmaScriptLexer.ITERATION_STATEMENT)
      .is(
        b.firstOf(
          DO_WHILE_STATEMENT(),
          WHILE_STATEMENT(),
          FOR_IN_STATEMENT(),
          ES6(FOR_OF_STATEMENT()),
          FOR_STATEMENT()));
  }

  public StatementTree STATEMENT() {
    return b.<StatementTree>nonterminal(EcmaScriptLexer.STATEMENT)
      .is(
        b.firstOf(
          FUNCTION_AND_GENERATOR_DECLARATION(),
          BLOCK(),
          VARIABLE_STATEMENT(),
          EMPTY_STATEMENT(),
          LABELLED_STATEMENT(),
          CLASS_DECLARATION(),
          EXPRESSION_STATEMENT(),
          IF_STATEMENT(),
          ITERATION_STATEMENT(),
          CONTINUE_STATEMENT(),
          BREAK_STATEMENT(),
          RETURN_STATEMENT(),
          WITH_STATEMENT(),
          SWITCH_STATEMENT(),
          THROW_STATEMENT(),
          TRY_STATEMENT(),
          DEBUGGER_STATEMENT(),
          FLOW_TYPE_ALIAS_STATEMENT(),
          FLOW_INTERFACE_DECLARATION(),
          FLOW_DECLARE()));
  }

  /**
   * A.4 [END] Statement
   */

  /**
   * A.3 Expressions
   */

  public LiteralTree LITERAL() {
    return b.<LiteralTree>nonterminal(EcmaScriptLexer.LITERAL)
      .is(b.firstOf(
        f.nullLiteral(b.token(JavaScriptKeyword.NULL)),
        f.booleanLiteral(b.firstOf(b.token(JavaScriptKeyword.TRUE), b.token(JavaScriptKeyword.FALSE))),
        NUMERIC_LITERAL(),
        STRING_LITERAL(),
        f.regexpLiteral(b.token(JavaScriptTokenType.REGULAR_EXPRESSION_LITERAL))));
  }

  public LiteralTree NUMERIC_LITERAL() {
    return b.<LiteralTree>nonterminal(Kind.NUMERIC_LITERAL)
      .is(f.numericLiteral(b.token(JavaScriptTokenType.NUMERIC_LITERAL)));
  }

  public LiteralTree STRING_LITERAL() {
    return b.<LiteralTree>nonterminal(Kind.STRING_LITERAL)
      .is(f.stringLiteral(b.token(EcmaScriptLexer.STRING_LITERAL)));
  }

  public ParameterListTree FORMAL_PARAMETER_CLAUSE() {
    return b.<ParameterListTree>nonterminal(Kind.PARAMETER_LIST)
      .is(b.firstOf(
        f.formalParameterClause1(
          b.token(JavaScriptPunctuator.LPARENTHESIS),
          FORMAL_PARAMETER_LIST(),
          b.optional(b.token(JavaScriptPunctuator.COMMA)),
          b.token(JavaScriptPunctuator.RPARENTHESIS)),
        f.formalParameterClause2(
          b.token(JavaScriptPunctuator.LPARENTHESIS),
          FORMAL_PARAMETER_LIST(),
          b.token(JavaScriptPunctuator.COMMA),
          BINDING_REST_ELEMENT(),
          b.token(JavaScriptPunctuator.RPARENTHESIS)),
        f.formalParameterClause3(
          b.token(JavaScriptPunctuator.LPARENTHESIS),
          b.optional(BINDING_REST_ELEMENT()),
          b.token(JavaScriptPunctuator.RPARENTHESIS))
      ));
  }

  public SeparatedList<BindingElementTree> FORMAL_PARAMETER_LIST() {
    return b.<SeparatedList<BindingElementTree>>nonterminal()
      .is(f.parameterList(
        BINDING_ELEMENT(),
        b.zeroOrMore(f.newTuple(b.token(JavaScriptPunctuator.COMMA), BINDING_ELEMENT()))));
  }

  /**
   * ECMAScript 6
   */
  public RestElementTree BINDING_REST_ELEMENT() {
    return b.<RestElementTree>nonterminal(EcmaScriptLexer.BINDING_REST_ELEMENT)
      .is(f.bindingRestElement(b.token(JavaScriptPunctuator.ELLIPSIS), b.firstOf(FLOW_OPTIONAL_BINDING_ELEMENT(), BINDING_IDENTIFIER()), b.optional(FLOW_TYPE_ANNOTATION())));
  }

  public ArrayLiteralTree ARRAY_LITERAL() {
    return b.<ArrayLiteralTree>nonterminal(Kind.ARRAY_LITERAL)
      .is(f.arrayLiteral(
        b.token(JavaScriptPunctuator.LBRACKET),
        b.optional(ARRAY_ELEMENT_LIST()),
        b.token(JavaScriptPunctuator.RBRACKET)
      ));
  }

  public ExpressionTree ARRAY_LITERAL_ELEMENT() {
    return b.<ExpressionTree>nonterminal(EcmaScriptLexer.ARRAY_LITERAL_ELEMENT)
      .is(b.firstOf(SPREAD_ELEMENT(), ASSIGNMENT_EXPRESSION()));
  }

  public List<Tree> ARRAY_ELEMENT_LIST() {
    return b.<List<Tree>>nonterminal()
      .is(b.firstOf(
        f.arrayLiteralElements(
          b.zeroOrMore(b.token(JavaScriptPunctuator.COMMA)),
          ARRAY_LITERAL_ELEMENT(),
          b.zeroOrMore(f.newTuple(b.oneOrMore(b.token(JavaScriptPunctuator.COMMA)), ARRAY_LITERAL_ELEMENT())),
          b.zeroOrMore(b.token(JavaScriptPunctuator.COMMA))),
        f.tokenList(b.oneOrMore(b.token(JavaScriptPunctuator.COMMA)))));
  }

  /**
   * ECMAScript 6
   */
  public FunctionExpressionTree GENERATOR_EXPRESSION() {
    return b.<FunctionExpressionTree>nonterminal(Kind.GENERATOR_FUNCTION_EXPRESSION)
      .is(
        f.generatorExpression(
          b.token(JavaScriptKeyword.FUNCTION),
          b.token(JavaScriptPunctuator.STAR),
          b.optional(BINDING_IDENTIFIER()),
          b.optional(FLOW_GENERIC_PARAMETER_CLAUSE()),
          FORMAL_PARAMETER_CLAUSE(),
          b.optional(FLOW_TYPE_ANNOTATION()),
          BLOCK()));
  }

  public FunctionExpressionTree FUNCTION_EXPRESSION() {
    return b.<FunctionExpressionTree>nonterminal(Kind.FUNCTION_EXPRESSION)
      .is(
        f.functionExpression(
          b.optional(b.token(EcmaScriptLexer.ASYNC)),
          b.token(JavaScriptKeyword.FUNCTION),
          b.optional(BINDING_IDENTIFIER()),
          b.optional(FLOW_GENERIC_PARAMETER_CLAUSE()),
          FORMAL_PARAMETER_CLAUSE(),
          b.optional(FLOW_TYPE_ANNOTATION()),
          BLOCK()));
  }

  public ExpressionTree CONDITIONAL_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(Kind.CONDITIONAL_EXPRESSION)
      .is(f.optionalConditionalExpression(
        CONDITIONAL_OR_EXPRESSION(),
        b.optional(CONDITIONAL_EXPRESSION_TAIL())));
  }

  public ConditionalExpressionTail CONDITIONAL_EXPRESSION_TAIL() {
    return b.<ConditionalExpressionTail>nonterminal()
      .is(b.firstOf(
        f.conditionalExpressionTail(
          b.token(JavaScriptPunctuator.QUERY),
          ASSIGNMENT_EXPRESSION(),
          b.token(JavaScriptPunctuator.COLON),
          ASSIGNMENT_EXPRESSION()),

        // this is required to parse
        // "a ? b : c => c"
        // as true expression could be mistakenly parsed as arrow function with return type
        f.conditionalExpressionTail(
          b.token(JavaScriptPunctuator.QUERY),
          ASSIGNMENT_EXPRESSION_NOT_ARROW_FUNCTION(),
          b.token(JavaScriptPunctuator.COLON),
          ASSIGNMENT_EXPRESSION())
        ));
  }

  public ExpressionTree CONDITIONAL_OR_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(Kind.CONDITIONAL_OR)
      .is(f.newConditionalOr(
        CONDITIONAL_AND_EXPRESSION(),
        b.zeroOrMore(f.newTuple(
          b.token(JavaScriptPunctuator.OROR),
          CONDITIONAL_AND_EXPRESSION()
        ))
      ));
  }

  public ExpressionTree CONDITIONAL_AND_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(Kind.CONDITIONAL_AND)
      .is(f.newConditionalAnd(
        BITWISE_OR_EXPRESSION(),
        b.zeroOrMore(f.newTuple(
          b.token(JavaScriptPunctuator.ANDAND),
          BITWISE_OR_EXPRESSION()
        ))
      ));
  }

  public ExpressionTree BITWISE_OR_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(Kind.BITWISE_OR)
      .is(f.newBitwiseOr(
        BITWISE_XOR_EXPRESSION(),
        b.zeroOrMore(f.newTuple(
          b.token(JavaScriptPunctuator.OR),
          BITWISE_XOR_EXPRESSION()
        ))
      ));
  }

  public ExpressionTree BITWISE_XOR_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(Kind.BITWISE_XOR)
      .is(f.newBitwiseXor(
        BITWISE_AND_EXPRESSION(),
        b.zeroOrMore(f.newTuple(
          b.token(JavaScriptPunctuator.XOR),
          BITWISE_AND_EXPRESSION()
        ))
      ));
  }

  public ExpressionTree BITWISE_AND_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(Kind.BITWISE_AND)
      .is(f.newBitwiseAnd(
        EQUALITY_EXPRESSION(),
        b.zeroOrMore(f.newTuple(
          b.token(JavaScriptPunctuator.AND),
          EQUALITY_EXPRESSION()
        ))
      ));
  }

  public ExpressionTree EQUALITY_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(EcmaScriptLexer.EQUALITY_EXPRESSION)
      .is(f.newEquality(
        RELATIONAL_EXPRESSION(),
        b.zeroOrMore(f.newTuple(
          b.firstOf(
            b.token(JavaScriptPunctuator.EQUAL),
            b.token(JavaScriptPunctuator.NOTEQUAL),
            b.token(JavaScriptPunctuator.EQUAL2),
            b.token(JavaScriptPunctuator.NOTEQUAL2)),
          RELATIONAL_EXPRESSION()
        ))
        )
      );
  }

  public ExpressionTree RELATIONAL_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(EcmaScriptLexer.RELATIONAL_EXPRESSION)
      .is(f.newRelational(
        SHIFT_EXPRESSION(),
        b.zeroOrMore(f.newTuple(
          b.firstOf(
            b.token(JavaScriptPunctuator.LT),
            b.token(JavaScriptPunctuator.GT),
            b.token(JavaScriptPunctuator.LE),
            b.token(JavaScriptPunctuator.GE),
            b.token(JavaScriptKeyword.INSTANCEOF),
            b.token(JavaScriptKeyword.IN)),
          SHIFT_EXPRESSION()
        ))
        )
      );
  }

  public ExpressionTree SHIFT_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(EcmaScriptLexer.SHIFT_EXPRESSION)
      .is(f.newShift(
        ADDITIVE_EXPRESSION(),
        b.zeroOrMore(f.newTuple(
          b.firstOf(
            b.token(JavaScriptPunctuator.SL),
            b.token(JavaScriptPunctuator.SR),
            b.token(JavaScriptPunctuator.SR2)),
          ADDITIVE_EXPRESSION()
        ))
        )
      );
  }

  public ExpressionTree ADDITIVE_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(EcmaScriptLexer.ADDITIVE_EXPRESSION)
      .is(f.newAdditive(
        MULTIPLICATIVE_EXPRESSION(),
        b.zeroOrMore(f.newTuple(
          b.firstOf(
            b.token(JavaScriptPunctuator.PLUS),
            b.token(JavaScriptPunctuator.MINUS)),
          MULTIPLICATIVE_EXPRESSION()
        ))
        )
      );
  }

  public ExpressionTree MULTIPLICATIVE_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(EcmaScriptLexer.MULTIPLICATIVE_EXPRESSION)
      .is(f.newMultiplicative(
        EXPONENTIATION_EXPRESSION(),
        b.zeroOrMore(f.newTuple(
          b.firstOf(
            b.token(JavaScriptPunctuator.STAR),
            b.token(JavaScriptPunctuator.DIV),
            b.token(JavaScriptPunctuator.MOD)),
          EXPONENTIATION_EXPRESSION()
        ))
        )
      );
  }

  public ExpressionTree EXPONENTIATION_EXPRESSION() {
    return b.<ExpressionTree>nonterminal()
      .is(f.newExponentiation(
        UNARY_EXPRESSION(),
        b.zeroOrMore(
          f.newTuple(
            b.token(JavaScriptPunctuator.EXP),
            UNARY_EXPRESSION()))));
  }

  public ExpressionTree UNARY_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(EcmaScriptLexer.UNARY_EXPRESSION)
      .is(b.firstOf(
        f.prefixExpression(
          b.firstOf(
            b.token(JavaScriptKeyword.AWAIT),
            b.token(JavaScriptKeyword.DELETE),
            b.token(JavaScriptKeyword.VOID),
            b.token(JavaScriptKeyword.TYPEOF),
            b.token(JavaScriptPunctuator.INC),
            b.token(JavaScriptPunctuator.DEC),
            b.token(JavaScriptPunctuator.PLUS),
            b.token(JavaScriptPunctuator.MINUS),
            b.token(JavaScriptPunctuator.TILDA),
            b.token(JavaScriptPunctuator.BANG)),
          UNARY_EXPRESSION()),
        POSTFIX_EXPRESSION()
      ));
  }

  public ExpressionTree POSTFIX_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(EcmaScriptLexer.POSTFIX_EXPRESSION)
      .is(f.postfixExpression(
        LEFT_HAND_SIDE_EXPRESSION(),
        b.optional(f.newTuple(
          b.token(EcmaScriptLexer.SPACING_NO_LINE_BREAK_NOT_FOLLOWED_BY_LINE_BREAK),
          b.firstOf(
            b.token(JavaScriptPunctuator.INC),
            b.token(JavaScriptPunctuator.DEC))
        ))
      ));
  }

  public ExpressionTree LEFT_HAND_SIDE_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(EcmaScriptLexer.LEFT_HAND_SIDE_EXPRESSION)
      .is(
        b.firstOf(
          CALL_EXPRESSION(),
          NEW_EXPRESSION()));
  }

  public YieldExpressionTree YIELD_EXPRESSION() {
    return b.<YieldExpressionTree>nonterminal(Kind.YIELD_EXPRESSION)
      .is(f.yieldExpression(
        b.token(JavaScriptKeyword.YIELD),
        b.optional(f.newTuple(
          b.token(EcmaScriptLexer.SPACING_NO_LINE_BREAK_NOT_FOLLOWED_BY_LINE_BREAK),
          f.newTuple(b.optional(b.token(JavaScriptPunctuator.STAR)), ASSIGNMENT_EXPRESSION())))));
  }

  public IdentifierTree IDENTIFIER_REFERENCE() {
    return b.<IdentifierTree>nonterminal(EcmaScriptLexer.IDENTIFIER_REFERENCE)
      .is(f.identifierReference(b.firstOf(
        b.token(JavaScriptKeyword.YIELD),
        b.token(JavaScriptKeyword.AWAIT),
        b.token(JavaScriptTokenType.IDENTIFIER)))
      );
  }

  public IdentifierTree BINDING_IDENTIFIER() {
    return b.<IdentifierTree>nonterminal(EcmaScriptLexer.BINDING_IDENTIFIER)
      .is(f.bindingIdentifier(b.firstOf(
        b.token(JavaScriptKeyword.YIELD),
        b.token(JavaScriptKeyword.AWAIT),
        b.token(JavaScriptTokenType.IDENTIFIER)))
      );
  }

  public InternalSyntaxToken LABEL_IDENTIFIER_NO_LB() {
    return b.<InternalSyntaxToken>nonterminal()
      .is(f.labelToken(
        b.token(EcmaScriptLexer.SPACING_NO_LINE_BREAK_NOT_FOLLOWED_BY_LINE_BREAK),
        b.token(JavaScriptTokenType.IDENTIFIER)));
  }

  public IdentifierTree IDENTIFIER_NAME() {
    return b.<IdentifierTree>nonterminal()
      .is(f.identifierName(b.token(EcmaScriptLexer.IDENTIFIER_NAME)));
  }

  public ArrowFunctionTree ARROW_FUNCTION() {
    return b.<ArrowFunctionTree>nonterminal(Kind.ARROW_FUNCTION)
      .is(f.arrowFunction(
        b.optional(b.token(EcmaScriptLexer.ASYNC)),
        b.optional(FLOW_GENERIC_PARAMETER_CLAUSE()),
        b.firstOf(
          BINDING_IDENTIFIER(),
          FORMAL_PARAMETER_CLAUSE()),
        b.optional(FLOW_ARROW_FUNCTION_RETURN_TYPE_ANNOTATION()),
        b.token(EcmaScriptLexer.SPACING_NO_LINE_BREAK_NOT_FOLLOWED_BY_LINE_BREAK),
        b.token(JavaScriptPunctuator.DOUBLEARROW),
        b.firstOf(
          BLOCK(),
          f.assignmentNoCurly(b.token(EcmaScriptLexer.NEXT_NOT_LCURLY), ASSIGNMENT_EXPRESSION()))
      ));
  }

  public ExpressionTree MEMBER_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(EcmaScriptLexer.MEMBER_EXPRESSION)
      .is(f.memberExpression(
        b.firstOf(
          ES6(SUPER()),
          ES6(NEW_TARGET()),
          f.newExpressionWithArgument(b.token(JavaScriptKeyword.NEW), b.firstOf(ES6(SUPER()), MEMBER_EXPRESSION()), ARGUMENT_CLAUSE()),
          PRIMARY_EXPRESSION()),
        // we use "zeroOrMore" here as in specification we have left recursion, which can't be coded with our means
        b.zeroOrMore(MEMBER_EXPRESSION_TAIL())));
  }

  public ExpressionTail MEMBER_EXPRESSION_TAIL() {
    return b.<ExpressionTail>nonterminal()
      .is(b.firstOf(
        BRACKET_ACCESS(),
        DOT_ACCESS(),
        f.templateLiteralTailForMember(TEMPLATE_LITERAL())));
  }

  public SuperTree SUPER() {
    return b.<SuperTree>nonterminal(Kind.SUPER)
      .is(f.superExpression(b.token(JavaScriptKeyword.SUPER)));
  }

  public ImportTree IMPORT() {
    return b.<ImportTree>nonterminal(Kind.IMPORT)
      .is(f.importExpression(b.token(JavaScriptKeyword.IMPORT)));
  }

  public NewTargetTree NEW_TARGET() {
    return b.<NewTargetTree>nonterminal(Kind.NEW_TARGET)
      .is(f.newTarget(
        b.token(JavaScriptKeyword.NEW),
        b.token(JavaScriptPunctuator.DOT),
        b.token(EcmaScriptLexer.TARGET)));
  }

  public ArgumentListTree ARGUMENT_CLAUSE() {
    return b.<ArgumentListTree>nonterminal(Kind.ARGUMENT_LIST)
      .is(f.argumentClause(
        b.token(JavaScriptPunctuator.LPARENTHESIS),
        b.optional(ARGUMENT_LIST()),
        b.token(JavaScriptPunctuator.RPARENTHESIS)));
  }

  public SeparatedList<ExpressionTree> ARGUMENT_LIST() {
    return b.<SeparatedList<ExpressionTree>>nonterminal()
      .is(f.parameterListWithTrailingComma(
        ARGUMENT(),
        b.zeroOrMore(f.newTuple(
          b.token(JavaScriptPunctuator.COMMA),
          ARGUMENT())),
        b.optional(b.token(JavaScriptPunctuator.COMMA))));
  }

  public ExpressionTree ARGUMENT() {
    return b.<ExpressionTree>nonterminal()
      .is(b.firstOf(SPREAD_ELEMENT(), ASSIGNMENT_EXPRESSION()));
  }

  public ExpressionTree CALL_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(Kind.CALL_EXPRESSION)
      .is(f.callExpression(
        f.simpleCallExpression(b.firstOf(MEMBER_EXPRESSION(), SUPER(), IMPORT()), ARGUMENT_CLAUSE()),
        // we use "zeroOrMore" here as in specification we have left recursion, which can't be coded with our means
        b.zeroOrMore(CALL_EXPRESSION_TAIL())));
  }

  public ExpressionTail CALL_EXPRESSION_TAIL() {
    return b.<ExpressionTail>nonterminal()
      .is(b.firstOf(
        f.argumentClauseTail(ARGUMENT_CLAUSE()),
        BRACKET_ACCESS(),
        DOT_ACCESS(),
        f.templateLiteralTailForCall(TEMPLATE_LITERAL())));
  }

  public BracketAccessTail BRACKET_ACCESS() {
    return b.<BracketAccessTail>nonterminal()
      .is(f.newBracketAccess(
        b.token(JavaScriptPunctuator.LBRACKET),
        EXPRESSION(),
        b.token(JavaScriptPunctuator.RBRACKET)));
  }

  public DotAccessTail DOT_ACCESS() {
    return b.<DotAccessTail>nonterminal()
      .is(f.dotAccess(
        b.token(JavaScriptPunctuator.DOT),
        IDENTIFIER_NAME()));
  }

  public ParenthesisedExpressionTree PARENTHESISED_EXPRESSION() {
    return b.<ParenthesisedExpressionTree>nonterminal(Kind.PARENTHESISED_EXPRESSION)
      .is(
        f.parenthesisedExpression(
          b.token(JavaScriptPunctuator.LPARENTHESIS),
          EXPRESSION(),
          b.token(JavaScriptPunctuator.RPARENTHESIS)));
  }

  public ClassTree CLASS_EXPRESSION() {
    return b.<ClassTree>nonterminal(Kind.CLASS_EXPRESSION)
      .is(
        f.classExpression(
          b.zeroOrMore(DECORATOR()),
          b.token(JavaScriptKeyword.CLASS),
          b.optional(BINDING_IDENTIFIER()),
          b.optional(FLOW_GENERIC_PARAMETER_CLAUSE()),
          // TODO Factor the duplication with CLASS_DECLARATION() into CLASS_TRAIT() ?
          b.optional(EXTENDS_CLAUSE()),
          b.optional(FLOW_IMPLEMENTS_CLAUSE()),
          b.token(JavaScriptPunctuator.LCURLYBRACE),
          b.zeroOrMore(CLASS_ELEMENT()),
          b.token(JavaScriptPunctuator.RCURLYBRACE)));
  }

  public ExtendsClauseTree EXTENDS_CLAUSE() {
    return b.<ExtendsClauseTree>nonterminal(Kind.EXTENDS_CLAUSE)
      .is(f.extendsClause(b.token(JavaScriptKeyword.EXTENDS), b.firstOf(FLOW_PARAMETERIZED_GENERICS_TYPE(), LEFT_HAND_SIDE_EXPRESSION())));
  }

  public ComputedPropertyNameTree COMPUTED_PROPERTY_NAME() {
    return b.<ComputedPropertyNameTree>nonterminal(Kind.COMPUTED_PROPERTY_NAME)
      .is(f.computedPropertyName(
        b.token(JavaScriptPunctuator.LBRACKET),
        ASSIGNMENT_EXPRESSION(),
        b.token(JavaScriptPunctuator.RBRACKET)
      ));
  }

  public ExpressionTree LITERAL_PROPERTY_NAME() {
    return b.<ExpressionTree>nonterminal()
      .is(b.firstOf(
        IDENTIFIER_NAME(),
        STRING_LITERAL(),
        NUMERIC_LITERAL()
      ));
  }

  public Tree PROPERTY_NAME() {
    return b.<Tree>nonterminal(EcmaScriptLexer.PROPERTY_NAME)
      .is(b.firstOf(
        LITERAL_PROPERTY_NAME(),
        ES6(COMPUTED_PROPERTY_NAME())
      ));
  }

  public PairPropertyTree PAIR_PROPERTY() {
    return b.<PairPropertyTree>nonterminal(Kind.PAIR_PROPERTY)
      .is(f.pairProperty(
        PROPERTY_NAME(),
        b.token(JavaScriptPunctuator.COLON),
        ASSIGNMENT_EXPRESSION()
      ));
  }

  public Tree PROPERTY_DEFINITION() {
    return b.<Tree>nonterminal(EcmaScriptLexer.PROPERTY_DEFINITION)
      .is(b.firstOf(
        SPREAD_ELEMENT(),
        PAIR_PROPERTY(),
        METHOD_DEFINITION(),
        IDENTIFIER_REFERENCE())
      );
  }

  public SpreadElementTree SPREAD_ELEMENT() {
    return b.<SpreadElementTree>nonterminal(Kind.SPREAD_ELEMENT)
      .is(f.spreadElement(b.token(JavaScriptPunctuator.ELLIPSIS), ASSIGNMENT_EXPRESSION()));
  }

  public ObjectLiteralTree OBJECT_LITERAL() {
    return b.<ObjectLiteralTree>nonterminal(Kind.OBJECT_LITERAL)
      .is(f.objectLiteral(
        b.token(JavaScriptPunctuator.LCURLYBRACE),
        b.optional(PROPERTIES()),
        b.token(JavaScriptPunctuator.RCURLYBRACE)
      ));
  }

  public SeparatedList<Tree> PROPERTIES() {
    return b.<SeparatedList<Tree>>nonterminal()
      .is(f.properties(
        PROPERTY_DEFINITION(),
        b.zeroOrMore(f.newTuple(b.token(JavaScriptPunctuator.COMMA), PROPERTY_DEFINITION())),
        b.optional(b.token(JavaScriptPunctuator.COMMA))));
  }

  public ExpressionTree NEW_EXPRESSION() {
    return b.<ExpressionTree>nonterminal()
      .is(b.firstOf(
        MEMBER_EXPRESSION(),
        f.newExpression(b.token(JavaScriptKeyword.NEW), b.firstOf(ES6(SUPER()), NEW_EXPRESSION()))
      ));
  }

  public TemplateLiteralTree TEMPLATE_LITERAL() {
    return b.<TemplateLiteralTree>nonterminal(Kind.TEMPLATE_LITERAL)
      .is(b.firstOf(
        f.noSubstitutionTemplate(b.token(EcmaScriptLexer.BACKTICK), b.optional(TEMPLATE_CHARACTERS()), b.token(EcmaScriptLexer.BACKTICK)),
        f.substitutionTemplate(
          b.token(EcmaScriptLexer.BACKTICK),
          b.optional(TEMPLATE_CHARACTERS()),

          b.zeroOrMore(f.newTuple(
            TEMPLATE_EXPRESSION(),
            b.optional(TEMPLATE_CHARACTERS())
          )),

          b.token(EcmaScriptLexer.BACKTICK)
        )
      ));
  }

  public TemplateExpressionTree TEMPLATE_EXPRESSION() {
    return b.<TemplateExpressionTree>nonterminal(Kind.TEMPLATE_EXPRESSION)
      .is(
        f.templateExpression(
          b.token(EcmaScriptLexer.DOLLAR_SIGN),
          b.token(JavaScriptPunctuator.LCURLYBRACE),
          EXPRESSION(),
          b.token(JavaScriptPunctuator.RCURLYBRACE)));
  }

  public TemplateCharactersTree TEMPLATE_CHARACTERS() {
    return b.<TemplateCharactersTree>nonterminal()
      .is(f.templateCharacters(b.oneOrMore(b.token(EcmaScriptLexer.TEMPLATE_CHARACTER))));
  }

  public IdentifierTree THIS() {
    return b.<IdentifierTree>nonterminal(Kind.THIS)
      .is(f.thisExpression(b.token(JavaScriptKeyword.THIS)));

  }

  public ExpressionTree PRIMARY_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(EcmaScriptLexer.PRIMARY_EXPRESSION)
      .is(
        b.firstOf(
          THIS(),
          FUNCTION_EXPRESSION(),
          IDENTIFIER_REFERENCE(),
          LITERAL(),
          ARRAY_LITERAL(),
          OBJECT_LITERAL(),
          PARENTHESISED_EXPRESSION(),
          CLASS_EXPRESSION(),
          GENERATOR_EXPRESSION(),
          TEMPLATE_LITERAL(),
          JSX_ELEMENT(),
          FLOW_CASTING_EXPRESSION()
        ));
  }

  public ExpressionTree ASSIGNMENT_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(EcmaScriptLexer.ASSIGNMENT_EXPRESSION)
      .is(
        b.firstOf(
          f.assignmentWithArrayDestructuring(
            ARRAY_ASSIGNMENT_PATTERN(),
            b.token(JavaScriptPunctuator.EQU),
            ASSIGNMENT_EXPRESSION()),
          f.assignmentExpression(
            b.firstOf(
              OBJECT_ASSIGNMENT_PATTERN(),
              LEFT_HAND_SIDE_EXPRESSION()),
            ASSIGNMENT_TOKEN(),
            ASSIGNMENT_EXPRESSION()),
          YIELD_EXPRESSION(),
          ARROW_FUNCTION(),
          CONDITIONAL_EXPRESSION()
        ));
  }

  public ExpressionTree ASSIGNMENT_EXPRESSION_NOT_ARROW_FUNCTION() {
    return b.<ExpressionTree>nonterminal()
      .is(
        b.firstOf(
          f.assignmentWithArrayDestructuring(
            ARRAY_ASSIGNMENT_PATTERN(),
            b.token(JavaScriptPunctuator.EQU),
            ASSIGNMENT_EXPRESSION()),
          f.assignmentExpression(
            b.firstOf(
              OBJECT_ASSIGNMENT_PATTERN(),
              LEFT_HAND_SIDE_EXPRESSION()),
            ASSIGNMENT_TOKEN(),
            ASSIGNMENT_EXPRESSION()),
          YIELD_EXPRESSION(),
          // no arrow function here
          CONDITIONAL_EXPRESSION()
        ));
  }

  public InternalSyntaxToken ASSIGNMENT_TOKEN() {
    return b.<InternalSyntaxToken>nonterminal()
      .is(b.firstOf(
        b.token(JavaScriptPunctuator.EQU),
        b.token(JavaScriptPunctuator.STAR_EQU),
        b.token(JavaScriptPunctuator.EXP_EQU),
        b.token(JavaScriptPunctuator.DIV_EQU),
        b.token(JavaScriptPunctuator.MOD_EQU),
        b.token(JavaScriptPunctuator.PLUS_EQU),
        b.token(JavaScriptPunctuator.MINUS_EQU),
        b.token(JavaScriptPunctuator.SL_EQU),
        b.token(JavaScriptPunctuator.SR_EQU),
        b.token(JavaScriptPunctuator.SR_EQU2),
        b.token(JavaScriptPunctuator.AND_EQU),
        b.token(JavaScriptPunctuator.XOR_EQU),
        b.token(JavaScriptPunctuator.OR_EQU)));
  }

  public ExpressionTree EXPRESSION() {
    return b.<ExpressionTree>nonterminal(EcmaScriptLexer.EXPRESSION)
      .is(f.expression(ASSIGNMENT_EXPRESSION(), b.zeroOrMore(f.newTuple(b.token(JavaScriptPunctuator.COMMA), ASSIGNMENT_EXPRESSION()))));
  }

  public ExpressionTree EXPRESSION_NO_LINE_BREAK() {
    return b.<ExpressionTree>nonterminal(EcmaScriptLexer.EXPRESSION_NO_LB)
      .is(f.expressionNoLineBreak(b.token(EcmaScriptLexer.SPACING_NO_LINE_BREAK_NOT_FOLLOWED_BY_LINE_BREAK), EXPRESSION()));
  }

  /**
   * A.3 [END] Expressions
   */

  /**
   * A.5 Declarations
   */

  // [START] Module, import & export
  public FromClauseTree FROM_CLAUSE() {
    return b.<FromClauseTree>nonterminal(Kind.FROM_CLAUSE)
      .is(f.fromClause(b.token(EcmaScriptLexer.FROM), STRING_LITERAL()));
  }

  public DefaultExportDeclarationTree DEFAULT_EXPORT_DECLARATION() {
    return b.<DefaultExportDeclarationTree>nonterminal(Kind.DEFAULT_EXPORT_DECLARATION)
      .is(f.defaultExportDeclaration(
        b.zeroOrMore(DECORATOR()),
        b.token(JavaScriptKeyword.EXPORT),
        b.token(JavaScriptKeyword.DEFAULT),
        b.firstOf(
          FUNCTION_AND_GENERATOR_DECLARATION(),
          CLASS_DECLARATION(),
          f.newTuple(
            f.defaultExportExpression(b.token(EcmaScriptLexer.NEXT_NOT_FUNCTION_AND_CLASS), ASSIGNMENT_EXPRESSION()), b.token(EcmaScriptLexer.EOS)))
      ));
  }

  public NamedExportDeclarationTree NAMED_EXPORT_DECLARATION() {
    return b.<NamedExportDeclarationTree>nonterminal(Kind.NAMED_EXPORT_DECLARATION)
      .is(
        f.namedExportDeclaration(
          b.zeroOrMore(DECORATOR()),
          b.token(JavaScriptKeyword.EXPORT),
          b.firstOf(
            EXPORT_CLAUSE(),
            EXPORT_DEFAULT_BINDING(),
            EXPORT_DEFAULT_BINDING_WITH_NAMESPACE_EXPORT(),
            EXPORT_DEFAULT_BINDING_WITH_EXPORT_LIST(),
            VARIABLE_STATEMENT(),
            CLASS_DECLARATION(),
            FUNCTION_AND_GENERATOR_DECLARATION(),
            FLOW_TYPE_ALIAS_STATEMENT(),
            FLOW_INTERFACE_DECLARATION())));
  }

  public ExportClauseTree EXPORT_CLAUSE() {
    return b.<ExportClauseTree>nonterminal(Kind.EXPORT_CLAUSE)
      .is(f.exportClause(
        b.optional(b.token(EcmaScriptLexer.TYPE)),
        EXPORT_LIST(),
        b.optional(FROM_CLAUSE()),
        b.token(EcmaScriptLexer.EOS)));
  }

  public ExportDefaultBindingWithExportList EXPORT_DEFAULT_BINDING_WITH_EXPORT_LIST() {
    return b.<ExportDefaultBindingWithExportList>nonterminal()
      .is(f.exportDefaultBindingWithExportList(
        IDENTIFIER_NAME(),
        b.token(JavaScriptPunctuator.COMMA),
        EXPORT_LIST(),
        FROM_CLAUSE(),
        b.token(EcmaScriptLexer.EOS)));
  }

  public ExportDefaultBindingWithNameSpaceExport EXPORT_DEFAULT_BINDING_WITH_NAMESPACE_EXPORT() {
    return b.<ExportDefaultBindingWithNameSpaceExport>nonterminal()
      .is(f.exportDefaultBindingWithNameSpaceExport(
        IDENTIFIER_NAME(),
        b.token(JavaScriptPunctuator.COMMA),
        b.token(JavaScriptPunctuator.STAR),
        b.token(EcmaScriptLexer.AS),
        IDENTIFIER_NAME(),
        FROM_CLAUSE(),
        b.token(EcmaScriptLexer.EOS)));
  }

  public ExportDefaultBinding EXPORT_DEFAULT_BINDING() {
    return b.<ExportDefaultBinding>nonterminal(Kind.EXPORT_DEFAULT_BINDING)
      .is(f.exportDefaultBinding(
        IDENTIFIER_NAME(),
        FROM_CLAUSE(),
        b.token(EcmaScriptLexer.EOS)));
  }

  public NamedImportExportClauseTree EXPORT_LIST() {
    return b.<NamedImportExportClauseTree>nonterminal(Kind.EXPORT_LIST)
      .is(f.exportList(
        b.token(JavaScriptPunctuator.LCURLYBRACE),
        b.optional(EXPORT_LIST_BODY()),
        b.token(JavaScriptPunctuator.RCURLYBRACE)
      ));
  }

  public SeparatedList<SpecifierTree> EXPORT_LIST_BODY() {
    return b.<SeparatedList<SpecifierTree>>nonterminal()
      .is(f.exportListBody(
        EXPORT_SPECIFIER(),
        b.zeroOrMore(f.newTuple(b.token(JavaScriptPunctuator.COMMA), EXPORT_SPECIFIER())),
        b.optional(b.token(JavaScriptPunctuator.COMMA))));
  }

  public SpecifierTree EXPORT_SPECIFIER() {
    return b.<SpecifierTree>nonterminal(Kind.EXPORT_SPECIFIER)
      .is(b.firstOf(
        f.exportSpecifier(f.identifierReference(b.token(JavaScriptKeyword.DEFAULT)), b.token(EcmaScriptLexer.AS), IDENTIFIER_NAME()),
        f.exportSpecifier(f.identifierReference(b.token(JavaScriptKeyword.DEFAULT))),
        f.exportSpecifier(IDENTIFIER_REFERENCE(), b.token(EcmaScriptLexer.AS), IDENTIFIER_NAME()),
        f.exportSpecifier(IDENTIFIER_REFERENCE())
      ));
  }

  public NameSpaceExportDeclarationTree NAMESPACE_EXPORT_DECLARATION() {
    return b.<NameSpaceExportDeclarationTree>nonterminal(Kind.NAMESPACE_EXPORT_DECLARATION)
      .is(f.namespaceExportDeclaration(
        b.token(JavaScriptKeyword.EXPORT),
        b.optional(FLOW_TYPE_KEYWORD()),
        b.token(JavaScriptPunctuator.STAR),
        b.optional(f.newTuple(b.token(EcmaScriptLexer.AS), IDENTIFIER_NAME())),
        FROM_CLAUSE(),
        b.token(EcmaScriptLexer.EOS)));
  }

  public ExportDeclarationTree EXPORT_DECLARATION() {
    return b.<ExportDeclarationTree>nonterminal(EcmaScriptLexer.EXPORT_DECLARATION)
      .is(b.firstOf(
        NAMESPACE_EXPORT_DECLARATION(),
        DEFAULT_EXPORT_DECLARATION(),
        NAMED_EXPORT_DECLARATION()
      ));

  }

  public DeclarationTree IMPORT_DECLARATION() {
    return b.<DeclarationTree>nonterminal(EcmaScriptLexer.IMPORT_DECLARATION)
      .is(b.firstOf(
        f.importDeclaration(
          b.token(JavaScriptKeyword.IMPORT),
          IMPORT_CLAUSE(),
          FROM_CLAUSE(),
          b.token(EcmaScriptLexer.EOS)),
        // Flow import
        f.importDeclaration(
          b.token(JavaScriptKeyword.IMPORT),
          FLOW_TYPE_KEYWORD(),
          IMPORT_CLAUSE(),
          FROM_CLAUSE(),
          b.token(EcmaScriptLexer.EOS)),
        f.importModuleDeclaration(
          b.token(JavaScriptKeyword.IMPORT),
          STRING_LITERAL(),
          b.token(EcmaScriptLexer.EOS))));
  }

  public ImportClauseTree IMPORT_CLAUSE() {
    return b.<ImportClauseTree>nonterminal(Kind.IMPORT_CLAUSE)
      .is(b.firstOf(
        f.importClauseWithTwoParts(BINDING_IDENTIFIER(), b.token(JavaScriptPunctuator.COMMA), b.firstOf(NAMESPACE_IMPORT(), NAMED_IMPORTS())),
        f.importClause(BINDING_IDENTIFIER()),
        f.importClause(NAMESPACE_IMPORT()),
        f.importClause(NAMED_IMPORTS())));
  }

  public NamedImportExportClauseTree NAMED_IMPORTS() {
    return b.<NamedImportExportClauseTree>nonterminal(Kind.NAMED_IMPORTS)
      .is(f.namedImports(
        b.token(JavaScriptPunctuator.LCURLYBRACE),
        b.optional(f.newImportSpecifierList(
          IMPORT_SPECIFIER(),
          b.zeroOrMore(f.newTuple(b.token(JavaScriptPunctuator.COMMA), IMPORT_SPECIFIER())),
          b.optional(b.token(JavaScriptPunctuator.COMMA)))),
        b.token(JavaScriptPunctuator.RCURLYBRACE)));
  }

  public SpecifierTree IMPORT_SPECIFIER() {
    return b.<SpecifierTree>nonterminal(Kind.IMPORT_SPECIFIER)
      .is(b.firstOf(
        f.importSpecifier(FLOW_TYPE_KEYWORD(), IDENTIFIER_NAME(), b.token(EcmaScriptLexer.AS), BINDING_IDENTIFIER()),
        f.importSpecifier(IDENTIFIER_NAME(), b.token(EcmaScriptLexer.AS), BINDING_IDENTIFIER()),
        f.importSpecifier(FLOW_TYPE_KEYWORD(), BINDING_IDENTIFIER()),
        f.importSpecifier(BINDING_IDENTIFIER())
      ));
  }

  public NameSpaceImportTree NAMESPACE_IMPORT() {
    return b.<NameSpaceImportTree>nonterminal(Kind.NAME_SPACE_IMPORT)
      .is(f.nameSpaceImport(
        b.token(JavaScriptPunctuator.STAR),
        b.token(EcmaScriptLexer.AS),
        BINDING_IDENTIFIER()));
  }

  public ModuleTree MODULE_BODY() {
    return b.<ModuleTree>nonterminal(EcmaScriptLexer.MODULE_BODY)
      .is(
        f.module(
          b.oneOrMore(
            b.firstOf(
              IMPORT_DECLARATION(),
              EXPORT_DECLARATION(),
              VARIABLE_STATEMENT(),
              CLASS_DECLARATION(),
              FUNCTION_AND_GENERATOR_DECLARATION(),
              STATEMENT()))));
  }

  // [END] Module, import & export

  // [START] Destructuring pattern

  public BindingElementTree BINDING_PATTERN() {
    return b.<BindingElementTree>nonterminal(EcmaScriptLexer.BINDING_PATTERN)
      .is(b.firstOf(
        OBJECT_BINDING_PATTERN(),
        ARRAY_BINDING_PATTERN()));
  }

  public InitializedBindingElementTree INITIALISED_BINDING_ELEMENT() {
    return b.<InitializedBindingElementTree>nonterminal(EcmaScriptLexer.INITIALISED_BINDING_ELEMENT)
      .is(f.initializedBindingElement(
        b.firstOf(
          FLOW_TYPED_BINDING_ELEMENT(),
          BINDING_IDENTIFIER(),
          BINDING_PATTERN()),
        b.token(JavaScriptPunctuator.EQU),
        ASSIGNMENT_EXPRESSION()));
  }

  public ObjectBindingPatternTree OBJECT_BINDING_PATTERN() {
    return b.<ObjectBindingPatternTree>nonterminal(Kind.OBJECT_BINDING_PATTERN)
      .is(b.firstOf(
        f.objectBindingPattern(
          b.token(JavaScriptPunctuator.LCURLYBRACE),
          b.optional(BINDING_PROPERTY_LIST()),
          b.optional(f.newTuple(b.token(JavaScriptPunctuator.COMMA), REST_OBJECT_BINDING_ELEMENT())),
          b.optional(b.token(JavaScriptPunctuator.COMMA)),
          b.token(JavaScriptPunctuator.RCURLYBRACE)),
        f.objectBindingPattern2(
          b.token(JavaScriptPunctuator.LCURLYBRACE),
          REST_OBJECT_BINDING_ELEMENT(),
          b.optional(b.token(JavaScriptPunctuator.COMMA)),
          b.token(JavaScriptPunctuator.RCURLYBRACE))));
  }

  public RestElementTree REST_OBJECT_BINDING_ELEMENT() {
    return b.<RestElementTree>nonterminal()
      .is(f.restObjectBindingElement(b.token(JavaScriptPunctuator.ELLIPSIS), b.firstOf(BINDING_IDENTIFIER(), BINDING_PATTERN())));
  }

  public SeparatedList<BindingElementTree> BINDING_PROPERTY_LIST() {
    return b.<SeparatedList<BindingElementTree>>nonterminal()
      .is(f.bindingPropertyList(
        BINDING_PROPERTY(),
        b.zeroOrMore(f.newTuple(b.token(JavaScriptPunctuator.COMMA), BINDING_PROPERTY()))));
  }

  public BindingElementTree BINDING_PROPERTY() {
    return b.<BindingElementTree>nonterminal()
      .is(b.firstOf(
        f.bindingProperty(PROPERTY_NAME(), b.token(JavaScriptPunctuator.COLON), BINDING_ELEMENT()),
        BINDING_ELEMENT()));
  }

  public BindingElementTree BINDING_ELEMENT() {
    return b.<BindingElementTree>nonterminal(EcmaScriptLexer.BINDING_ELEMENT)
      .is(b.firstOf(
        INITIALISED_BINDING_ELEMENT(),
        FLOW_TYPED_BINDING_ELEMENT(),
        FLOW_OPTIONAL_BINDING_ELEMENT(),
        BINDING_IDENTIFIER(),
        BINDING_PATTERN()));
  }

  public ArrayBindingPatternTree ARRAY_BINDING_PATTERN() {
    return b.<ArrayBindingPatternTree>nonterminal(EcmaScriptLexer.ARRAY_BINDING_PATTERN)
      .is(f.arrayBindingPattern(
        b.token(JavaScriptPunctuator.LBRACKET),
        b.optional(BINDING_ELEMENT()),
        b.zeroOrMore(f.newTuple(
          b.token(JavaScriptPunctuator.COMMA),
          b.optional(BINDING_ELEMENT()))),
        b.optional(BINDING_REST_ELEMENT()),
        b.token(JavaScriptPunctuator.RBRACKET)));
  }

  public ObjectAssignmentPatternTree OBJECT_ASSIGNMENT_PATTERN() {
    return b.<ObjectAssignmentPatternTree>nonterminal(Kind.OBJECT_ASSIGNMENT_PATTERN)
      .is(b.firstOf(
        f.objectAssignmentPattern(
          b.token(JavaScriptPunctuator.LCURLYBRACE),
          ASSIGNMENT_PROPERTY(),
          b.zeroOrMore(f.newTuple(b.token(JavaScriptPunctuator.COMMA), ASSIGNMENT_PROPERTY())),
          b.optional(b.token(JavaScriptPunctuator.COMMA)),
          b.token(JavaScriptPunctuator.RCURLYBRACE)),
        f.emptyObjectAssignmentPattern(
          b.token(JavaScriptPunctuator.LCURLYBRACE),
          b.token(JavaScriptPunctuator.RCURLYBRACE))));
  }

  public Tree ASSIGNMENT_PROPERTY() {
    return b.<Tree>nonterminal()
      .is(b.firstOf(
        f.objectAssignmentPatternPairElement(
          IDENTIFIER_NAME(),
          b.token(JavaScriptPunctuator.COLON),
          b.firstOf(
            INITIALIZED_ASSIGNMENT_PATTERN_ELEMENT(),
            LEFT_HAND_SIDE_EXPRESSION())),
        INITIALIZED_OBJECT_ASSIGNMENT_PATTERN_ELEMENT(),
        IDENTIFIER_REFERENCE()));
  }

  public ArrayAssignmentPatternTree ARRAY_ASSIGNMENT_PATTERN() {
    return b.<ArrayAssignmentPatternTree>nonterminal(Kind.ARRAY_ASSIGNMENT_PATTERN)
      .is(f.arrayAssignmentPattern(
        b.token(JavaScriptPunctuator.LBRACKET),
        b.optional(ASSIGNMENT_PATTERN_ELEMENT()),
        b.zeroOrMore(f.newTuple(
          b.token(JavaScriptPunctuator.COMMA),
          b.optional(ASSIGNMENT_PATTERN_ELEMENT()))),
        b.optional(ASSIGNMENT_PATTERN_REST_ELEMENT()),
        b.token(JavaScriptPunctuator.RBRACKET)));
  }

  public Tree ASSIGNMENT_PATTERN_ELEMENT() {
    return b.<Tree>nonterminal()
      .is(b.firstOf(INITIALIZED_ASSIGNMENT_PATTERN_ELEMENT(), LEFT_HAND_SIDE_EXPRESSION()));
  }

  public InitializedAssignmentPatternElementTree INITIALIZED_ASSIGNMENT_PATTERN_ELEMENT() {
    return b.<InitializedAssignmentPatternElementTree>nonterminal()
      .is(f.initializedAssignmentPatternElement(LEFT_HAND_SIDE_EXPRESSION(), b.token(JavaScriptPunctuator.EQU), ASSIGNMENT_EXPRESSION()));
  }

  public InitializedAssignmentPatternElementTree INITIALIZED_OBJECT_ASSIGNMENT_PATTERN_ELEMENT() {
    return b.<InitializedAssignmentPatternElementTree>nonterminal()
      .is(f.initializedAssignmentPatternElement(IDENTIFIER_REFERENCE(), b.token(JavaScriptPunctuator.EQU), ASSIGNMENT_EXPRESSION()));
  }

  public AssignmentPatternRestElementTree ASSIGNMENT_PATTERN_REST_ELEMENT() {
    return b.<AssignmentPatternRestElementTree>nonterminal()
      .is(f.assignmentPatternRestElement(b.token(JavaScriptPunctuator.ELLIPSIS), LEFT_HAND_SIDE_EXPRESSION()));
  }

  // [END] Destructuring pattern

  // [START] Classes, methods, functions & generators

  public ClassTree CLASS_DECLARATION() {
    return b.<ClassTree>nonterminal(Kind.CLASS_DECLARATION)
      .is(
        f.classDeclaration(
          b.zeroOrMore(DECORATOR()),
          b.token(JavaScriptKeyword.CLASS), BINDING_IDENTIFIER(),
          b.optional(FLOW_GENERIC_PARAMETER_CLAUSE()),
          // TODO Factor the duplication with CLASS_EXPRESSION() into CLASS_TRAIT() ?
          b.optional(EXTENDS_CLAUSE()),
          b.optional(FLOW_IMPLEMENTS_CLAUSE()),
          b.token(JavaScriptPunctuator.LCURLYBRACE),
          b.zeroOrMore(CLASS_ELEMENT()),
          b.token(JavaScriptPunctuator.RCURLYBRACE)));
  }

  public Tree CLASS_ELEMENT() {
    return b.<Tree>nonterminal(EcmaScriptLexer.CLASS_ELEMENT)
      .is(
        b.firstOf(
          METHOD_DEFINITION(),
          CLASS_FIELD_INITIALIZER(),
          FLOW_PROPERTY_DEFINITION(),
          b.token(JavaScriptPunctuator.SEMI),
          // comma can appear as separator for flow property definitions (e.g. in the context of declare statement)
          b.token(JavaScriptPunctuator.COMMA)));
  }

  public DecoratorTree DECORATOR() {
    return b.<DecoratorTree>nonterminal(Kind.DECORATOR)
      .is(f.decorator(
        b.token(JavaScriptPunctuator.AT),
        IDENTIFIER_REFERENCE(),
        b.zeroOrMore(f.newTuple(b.token(JavaScriptPunctuator.DOT), IDENTIFIER_NAME())),
        b.optional(ARGUMENT_CLAUSE())));
  }

  public FieldDeclarationTree CLASS_FIELD_INITIALIZER() {
    return b.<FieldDeclarationTree>nonterminal()
      .is(f.fieldDeclaration(
        b.zeroOrMore(DECORATOR()),
        b.optional(b.token(EcmaScriptLexer.STATIC)),
        PROPERTY_NAME(),
        b.optional(FLOW_TYPE_ANNOTATION()),
        b.optional(f.newTuple(b.token(JavaScriptPunctuator.EQU), ASSIGNMENT_EXPRESSION())),
        b.token(EcmaScriptLexer.EOS)));
  }

  public FunctionTree METHOD_DEFINITION() {
    return b.<FunctionTree>nonterminal(EcmaScriptLexer.METHOD_DEFINITION)
      .is(
        b.firstOf(
          f.generatorMethod(
            b.zeroOrMore(DECORATOR()),
            b.optional(b.token(EcmaScriptLexer.STATIC)),
            b.token(JavaScriptPunctuator.STAR),
            PROPERTY_NAME(),
            b.optional(FLOW_GENERIC_PARAMETER_CLAUSE()),
            FORMAL_PARAMETER_CLAUSE(),
            b.optional(FLOW_TYPE_ANNOTATION()),
            BLOCK()),
          f.method(
            b.zeroOrMore(DECORATOR()),
            b.optional(b.token(EcmaScriptLexer.STATIC)),
            b.optional(b.token(EcmaScriptLexer.ASYNC)),
            PROPERTY_NAME(),
            b.optional(FLOW_GENERIC_PARAMETER_CLAUSE()),
            FORMAL_PARAMETER_CLAUSE(),
            b.optional(FLOW_TYPE_ANNOTATION()),
            BLOCK()),
          f.accessor(
            b.zeroOrMore(DECORATOR()),
            b.optional(b.token(EcmaScriptLexer.STATIC)),
            b.firstOf(
              b.token(EcmaScriptLexer.GET),
              b.token(EcmaScriptLexer.SET)),
            PROPERTY_NAME(),
            b.optional(FLOW_GENERIC_PARAMETER_CLAUSE()),
            FORMAL_PARAMETER_CLAUSE(),
            b.optional(FLOW_TYPE_ANNOTATION()),
            BLOCK())));
  }

  public FunctionDeclarationTree FUNCTION_AND_GENERATOR_DECLARATION() {
    return b.<FunctionDeclarationTree>nonterminal(EcmaScriptLexer.FUNCTION_DECLARATION)
      .is(
        f.functionAndGeneratorDeclaration(
          b.optional(b.token(EcmaScriptLexer.ASYNC)),
          b.token(JavaScriptKeyword.FUNCTION), b.optional(b.token(JavaScriptPunctuator.STAR)), BINDING_IDENTIFIER(),
          b.optional(FLOW_GENERIC_PARAMETER_CLAUSE()),
          FORMAL_PARAMETER_CLAUSE(),
          b.optional(FLOW_TYPE_ANNOTATION()),
          BLOCK()));
  }

  // [END] Classes, methods, functions & generators

  /**
   * A.5 [END] Declaration
   */

  // [START] JSX

  public JsxElementTree JSX_ELEMENT() {
    return b.<JsxElementTree>nonterminal(EcmaScriptLexer.JSX_ELEMENT)
      .is(b.firstOf(
        JSX_SELF_CLOSING_ELEMENT(),
        f.jsxStandardElement(JSX_OPENING_ELEMENT(), b.zeroOrMore(JSX_CHILD()), JSX_CLOSING_ELEMENT()),
        f.jsxShortFragmentElement(JSX_EMPTY_OPENING_ELEMENT(), b.zeroOrMore(JSX_CHILD()), JSX_EMPTY_CLOSING_ELEMENT())
      ));
  }

  public JsxSelfClosingElementTree JSX_SELF_CLOSING_ELEMENT() {
    return b.<JsxSelfClosingElementTree>nonterminal(Kind.JSX_SELF_CLOSING_ELEMENT)
      .is(f.jsxSelfClosingElement(
        b.token(JavaScriptPunctuator.LT),
        JSX_ELEMENT_NAME(),
        b.optional(JSX_ATTRIBUTES()),
        b.token(JavaScriptPunctuator.DIV),
        b.token(JavaScriptPunctuator.GT)));
  }

  public JsxOpeningElementTree JSX_OPENING_ELEMENT() {
    return b.<JsxOpeningElementTree>nonterminal(Kind.JSX_OPENING_ELEMENT)
      .is(f.jsxOpeningElement(
        b.token(JavaScriptPunctuator.LT),
        JSX_ELEMENT_NAME(),
        b.optional(JSX_ATTRIBUTES()),
        b.token(JavaScriptPunctuator.GT)));
  }

  public JsxEmptyOpeningElementTree JSX_EMPTY_OPENING_ELEMENT() {
    return b.<JsxEmptyOpeningElementTree>nonterminal(Kind.JSX_EMPTY_OPENING_ELEMENT)
      .is(f.jsxEmptyOpeningElement(
        b.token(JavaScriptPunctuator.LT),
        b.token(JavaScriptPunctuator.GT)));
  }

  public JsxEmptyClosingElementTree JSX_EMPTY_CLOSING_ELEMENT() {
    return b.<JsxEmptyClosingElementTree>nonterminal(Kind.JSX_EMPTY_CLOSING_ELEMENT)
      .is(f.jsxEmptyClosingElement(
        b.token(JavaScriptPunctuator.LT),
        b.token(JavaScriptPunctuator.DIV),
        b.token(JavaScriptPunctuator.GT)));
  }

  public JsxClosingElementTree JSX_CLOSING_ELEMENT() {
    return b.<JsxClosingElementTree>nonterminal(Kind.JSX_CLOSING_ELEMENT)
      .is(f.jsxClosingElement(
        b.token(JavaScriptPunctuator.LT),
        b.token(JavaScriptPunctuator.DIV),
        JSX_ELEMENT_NAME(),
        b.token(JavaScriptPunctuator.GT)));
  }

  public JsxElementNameTree JSX_ELEMENT_NAME() {
    return b.<JsxElementNameTree>nonterminal()
      .is(b.firstOf(
        JSX_MEMBER_EXPRESSION(),
        f.jsxHtmlTag(b.token(EcmaScriptLexer.JSX_HTML_TAG)),
        THIS(),
        IDENTIFIER_REFERENCE()
      ));
  }

  public ExpressionTree JSX_MEMBER_EXPRESSION() {
    return b.<ExpressionTree>nonterminal()
      .is(f.jsxMemberExpression(
        b.firstOf(THIS(), IDENTIFIER_REFERENCE()),
        b.oneOrMore(f.newTuple(b.token(JavaScriptPunctuator.DOT), IDENTIFIER_NAME()))));
  }

  public JsxIdentifierTree JSX_IDENTIFIER() {
    return b.<JsxIdentifierTree>nonterminal(Kind.JSX_IDENTIFIER)
      .is(f.jsxIdentifier(b.token(EcmaScriptLexer.JSX_IDENTIFIER)));
  }

  public List<JsxAttributeTree> JSX_ATTRIBUTES() {
    return b.<List<JsxAttributeTree>>nonterminal()
      .is(b.oneOrMore(b.firstOf(
        JSX_STANDARD_ATTRIBUTE(),
        JSX_SPREAD_ATTRIBUTE(),
        JSX_IDENTIFIER())));
  }

  public JsxSpreadAttributeTree JSX_SPREAD_ATTRIBUTE() {
    return b.<JsxSpreadAttributeTree>nonterminal(Kind.JSX_SPREAD_ATTRIBUTE)
      .is(f.jsxSpreadAttribute(
        b.token(JavaScriptPunctuator.LCURLYBRACE),
        b.token(JavaScriptPunctuator.ELLIPSIS),
        ASSIGNMENT_EXPRESSION(),
        b.token(JavaScriptPunctuator.RCURLYBRACE)
      ));
  }

  public JsxAttributeTree JSX_STANDARD_ATTRIBUTE() {
    return b.<JsxStandardAttributeTree>nonterminal(Kind.JSX_STANDARD_ATTRIBUTE)
      .is(
        f.jsxStandardAttribute(
          JSX_IDENTIFIER(),
          b.token(JavaScriptPunctuator.EQU),
          JSX_ATTRIBUTE_VALUE())
      );
  }

  public JsxAttributeValueTree JSX_ATTRIBUTE_VALUE() {
    return b.<JsxAttributeValueTree>nonterminal()
      .is(b.firstOf(
        STRING_LITERAL(),
        f.jsxJavaScriptExpression(
          b.token(JavaScriptPunctuator.LCURLYBRACE),
          ASSIGNMENT_EXPRESSION(),
          b.token(JavaScriptPunctuator.RCURLYBRACE)),
        JSX_ELEMENT()));
  }

  public JsxChildTree JSX_CHILD() {
    return b.<JsxChildTree>nonterminal()
      .is(b.firstOf(
        f.jsxTextTree(b.token(EcmaScriptLexer.JSX_TEXT)),
        JSX_ELEMENT(),
        f.jsxJavaScriptExpression(
          b.token(JavaScriptPunctuator.LCURLYBRACE),
          b.optional(ASSIGNMENT_EXPRESSION()),
          b.token(JavaScriptPunctuator.RCURLYBRACE))));
  }

  // [END] JSX

  public ScriptTree SCRIPT() {
    return b.<ScriptTree>nonterminal(EcmaScriptLexer.SCRIPT)
      .is(
        f.script(
          b.optional(b.token(EcmaScriptLexer.SHEBANG)),
          b.optional(MODULE_BODY()),
          b.token(EcmaScriptLexer.SPACING_NOT_SKIPPED),
          b.token(EcmaScriptLexer.EOF)));
  }

  public ScriptTree VUE_SCRIPT() {
    return b.<ScriptTree>nonterminal(EcmaScriptLexer.VUE_SCRIPT)
      .is(f.vueScript(
        b.zeroOrMore(VUE_ELEMENT()),
        b.token(EcmaScriptLexer.VUE_SPACING),
        b.token(EcmaScriptLexer.EOF)));
  }

  public VueElement VUE_ELEMENT() {
    return b.<VueElement>nonterminal()
      .is(b.firstOf(
        f.vueElement(b.token(EcmaScriptLexer.VUE_TEMPLATE_SECTION)),
        f.vueElement(b.token(EcmaScriptLexer.VUE_STYLE_SECTION)),
        f.vueElement(b.token(EcmaScriptLexer.SCRIPT_SECTION_TS)),
        f.scriptVueElement(
          VUE_SCRIPT_TAG(),
          b.optional(b.token(EcmaScriptLexer.SHEBANG)),
          b.optional(MODULE_BODY()),
          b.token(EcmaScriptLexer.SCRIPT_TAG_CLOSE)),
        f.vueElement(b.token(EcmaScriptLexer.VUE_CUSTOM_SECTION))
        ));
  }

  public VueScriptTag VUE_SCRIPT_TAG() {
    return b.<VueScriptTag>nonterminal()
      .is(f.vueScriptTag(
        b.token(EcmaScriptLexer.SCRIPT_TAG),
        // reuse of JSX attributes just to not reimplement xml attributes
        // it will not appear in final syntax tree
        b.optional(JSX_ATTRIBUTES()),
        b.token(JavaScriptPunctuator.GT)
      ));
  }

  // [START] FLOW

  public FlowTypeTree FLOW_TYPE() {
    return b.<FlowTypeTree>nonterminal(EcmaScriptLexer.FLOW_TYPE)
      .is(FLOW_UNION_TYPE_OR_HIGHER());
  }

  public FlowTypeTree FLOW_ARRAY_TYPE_SHORTHAND_OR_HIGHER() {
    return b.<FlowTypeTree>nonterminal(Kind.FLOW_ARRAY_TYPE_SHORTHAND)
      .is(b.firstOf(
        f.flowArrayTypeShorthand(
          FLOW_TOP_PRIORITY_TYPE(),
          b.oneOrMore(f.newTuple(b.token(JavaScriptPunctuator.LBRACKET), b.token(JavaScriptPunctuator.RBRACKET)))
        ),
        FLOW_TOP_PRIORITY_TYPE()));
  }

  public FlowTypeTree FLOW_TOP_PRIORITY_TYPE() {
    return b.<FlowTypeTree>nonterminal()
      .is(b.firstOf(
        FLOW_ARRAY_TYPE_WITH_KEYWORD(),
        FLOW_OPTIONAL_TYPE(),
        FLOW_PARAMETERIZED_GENERICS_TYPE(),
        FLOW_NAMESPACED_TYPE(),
        FLOW_SIMPLE_TYPE(),
        FLOW_LITERAL_TYPE(),
        FLOW_OBJECT_TYPE(),
        FLOW_PARENTHESISED_TYPE(),
        FLOW_TUPLE_TYPE(),
        FLOW_TYPEOF_TYPE()));
  }

  public FlowTypeofTypeTree FLOW_TYPEOF_TYPE() {
    return b.<FlowTypeofTypeTree>nonterminal(Kind.FLOW_TYPEOF_TYPE)
      .is(f.flowTypeofType(
        b.token(JavaScriptKeyword.TYPEOF),
        b.firstOf(
          // arrow function is not accepted by flow-remove-types, but it is by babel
          ARROW_FUNCTION(),
          FLOW_PARAMETERIZED_GENERICS_TYPE(),
          MEMBER_EXPRESSION(),
          PRIMARY_EXPRESSION())));
  }

  public FlowCastingExpressionTree FLOW_CASTING_EXPRESSION() {
    return b.<FlowCastingExpressionTree>nonterminal(Kind.FLOW_CASTING_EXPRESSION)
      .is(f.flowCastingExpression(
        b.token(JavaScriptPunctuator.LPARENTHESIS),
        EXPRESSION(),
        b.token(JavaScriptPunctuator.COLON),
        FLOW_TYPE(),
        b.token(JavaScriptPunctuator.RPARENTHESIS)));
  }

  public FlowNamespacedTypeTree FLOW_NAMESPACED_TYPE() {
    return b.<FlowNamespacedTypeTree>nonterminal(Kind.FLOW_NAMESPACED_TYPE)
      .is(f.flowNamespacedType(
        IDENTIFIER_REFERENCE(),
        b.oneOrMore(f.newTuple(b.token(JavaScriptPunctuator.DOT), IDENTIFIER_NAME()))));
  }

  public FlowTupleTypeTree FLOW_TUPLE_TYPE() {
    return b.<FlowTupleTypeTree>nonterminal(Kind.FLOW_TUPLE_TYPE)
      .is(f.flowTupleType(
        b.token(JavaScriptPunctuator.LBRACKET),
        b.optional(FLOW_TUPLE_TYPE_ELEMENTS()),
        b.token(JavaScriptPunctuator.RBRACKET)));
  }

  public SeparatedList<FlowTypeTree> FLOW_TUPLE_TYPE_ELEMENTS() {
    return b.<SeparatedList<FlowTypeTree>>nonterminal()
      .is(f.flowTupleTypeElements(FLOW_TYPE(),
        b.zeroOrMore(f.newTuple(b.token(JavaScriptPunctuator.COMMA), FLOW_TYPE())),
        b.optional(b.token(JavaScriptPunctuator.COMMA))));
  }

  public FlowParenthesisedTypeTree FLOW_PARENTHESISED_TYPE() {
    return b.<FlowParenthesisedTypeTree>nonterminal(Kind.FLOW_PARENTHESISED_TYPE)
      .is(f.flowParenthesisedType(b.token(JavaScriptPunctuator.LPARENTHESIS), FLOW_TYPE(), b.token(JavaScriptPunctuator.RPARENTHESIS)));
  }

  public FlowArrayTypeWithKeywordTree FLOW_ARRAY_TYPE_WITH_KEYWORD() {
    return b.<FlowArrayTypeWithKeywordTree>nonterminal(Kind.FLOW_ARRAY_TYPE_WITH_KEYWORD)
      .is(f.flowArrayTypeWithKeyword(b.token(EcmaScriptLexer.ARRAY), b.token(JavaScriptPunctuator.LT), FLOW_TYPE(), b.token(JavaScriptPunctuator.GT)));
  }

  public FlowTypeTree FLOW_UNION_TYPE_OR_HIGHER() {
    return b.<FlowTypeTree>nonterminal()
      .is(b.firstOf(
        FLOW_UNION_TYPE(),
        FLOW_INTERSECTION_TYPE_OR_HIGHER()));
  }

  public FlowTypeTree FLOW_UNION_TYPE() {
    return b.<FlowTypeTree>nonterminal(Kind.FLOW_UNION_TYPE)
      .is(f.flowUnionType(
        b.optional(b.token(JavaScriptPunctuator.OR)),
        f.flowTypeElements(FLOW_INTERSECTION_TYPE_OR_HIGHER(),
          b.oneOrMore(f.newTuple(b.token(JavaScriptPunctuator.OR), FLOW_INTERSECTION_TYPE_OR_HIGHER())))));
  }

  public FlowTypeTree FLOW_UNION_TYPE_OR_HIGHER_NON_FUNCTION() {
    return b.<FlowTypeTree>nonterminal()
      .is(b.firstOf(
        FLOW_UNION_TYPE(),
        FLOW_INTERSECTION_TYPE_OR_HIGHER_NON_FUNCTION()));
  }

  public FlowTypeTree FLOW_INTERSECTION_TYPE_OR_HIGHER() {
    return b.<FlowTypeTree>nonterminal(Kind.FLOW_INTERSECTION_TYPE)
      .is(b.firstOf(
        f.flowIntersectionType(
          b.optional(b.token(JavaScriptPunctuator.AND)),
          f.flowTypeElements(FLOW_FUNCTION_TYPE_WITHOUT_PARENTHESES_OR_HIGHER(),
            b.oneOrMore(f.newTuple(b.token(JavaScriptPunctuator.AND), FLOW_FUNCTION_TYPE_WITHOUT_PARENTHESES_OR_HIGHER())))),
        FLOW_FUNCTION_TYPE_WITHOUT_PARENTHESES_OR_HIGHER()));
  }

  public FlowTypeTree FLOW_INTERSECTION_TYPE_OR_HIGHER_NON_FUNCTION() {
    return b.<FlowTypeTree>nonterminal()
      .is(b.firstOf(
        f.flowIntersectionType(
          b.optional(b.token(JavaScriptPunctuator.AND)),
          f.flowTypeElements(FLOW_ARRAY_TYPE_SHORTHAND_OR_HIGHER(),
            b.oneOrMore(f.newTuple(b.token(JavaScriptPunctuator.AND), FLOW_ARRAY_TYPE_SHORTHAND_OR_HIGHER())))),
        FLOW_ARRAY_TYPE_SHORTHAND_OR_HIGHER()));
  }

  public FlowSimpleTypeTree FLOW_SIMPLE_TYPE() {
    return b.<FlowSimpleTypeTree>nonterminal(Kind.FLOW_SIMPLE_TYPE)
      .is(b.firstOf(
        f.flowSimpleType(IDENTIFIER_REFERENCE()),
        f.flowSimpleType(b.token(JavaScriptPunctuator.STAR)),
        f.flowSimpleType(b.token(JavaScriptKeyword.VOID)),
        f.flowSimpleType(b.token(JavaScriptKeyword.THIS)),
        f.flowSimpleType(b.token(JavaScriptKeyword.NULL))));
  }

  public FlowOptionalTypeTree FLOW_OPTIONAL_TYPE() {
    return b.<FlowOptionalTypeTree>nonterminal(Kind.FLOW_OPTIONAL_TYPE)
      .is(f.flowOptionalType(b.token(JavaScriptPunctuator.QUERY), FLOW_FUNCTION_TYPE_WITH_PARENTHESES_OR_HIGHER()));
  }

  public FlowLiteralTypeTree FLOW_LITERAL_TYPE() {
    return b.<FlowLiteralTypeTree>nonterminal(Kind.FLOW_LITERAL_TYPE)
      .is(b.firstOf(
        f.flowLiteralType(b.optional(b.token(JavaScriptPunctuator.MINUS)), b.token(JavaScriptTokenType.NUMERIC_LITERAL)),
        f.flowLiteralType(b.firstOf(
          b.token(JavaScriptKeyword.TRUE),
          b.token(JavaScriptKeyword.FALSE),
          b.token(EcmaScriptLexer.STRING_LITERAL)))));
  }

  // Right now this is the lowest priority flow type, so this 'string | number => string' is parsed like this '(string | number) => string'
  // This is wrong but, due to arrow-function return type, the correct alternative is much more complex. See issue #778
  public FlowTypeTree FLOW_FUNCTION_TYPE_WITH_PARENTHESES_OR_HIGHER() {
    return b.<FlowTypeTree>nonterminal()
      .is(b.firstOf(
        f.flowFunctionType(
          b.optional(FLOW_GENERIC_PARAMETER_CLAUSE()),
          FLOW_FUNCTION_TYPE_PARAMETER_CLAUSE(),
          b.token(JavaScriptPunctuator.DOUBLEARROW),
          FLOW_TYPE()),
        FLOW_ARRAY_TYPE_SHORTHAND_OR_HIGHER()));
  }

  public FlowTypeTree FLOW_FUNCTION_TYPE_WITHOUT_PARENTHESES_OR_HIGHER() {
    return b.<FlowTypeTree>nonterminal(Kind.FLOW_FUNCTION_TYPE)
      .is(b.firstOf(
        f.flowFunctionType(
          b.optional(FLOW_GENERIC_PARAMETER_CLAUSE()),
          f.flowFunctionTypeSingleParameterClause(FLOW_FUNCTION_TYPE_WITH_PARENTHESES_OR_HIGHER()),
          b.token(JavaScriptPunctuator.DOUBLEARROW),
          FLOW_TYPE()),
        FLOW_FUNCTION_TYPE_WITH_PARENTHESES_OR_HIGHER()));
  }

  public FlowFunctionTypeParameterClauseTree FLOW_FUNCTION_TYPE_PARAMETER_CLAUSE() {
    return b.<FlowFunctionTypeParameterClauseTree>nonterminal(Kind.FLOW_FUNCTION_TYPE_PARAMETER_CLAUSE)
      .is(b.firstOf(
        f.flowFunctionTypeParameterClause(
          b.token(JavaScriptPunctuator.LPARENTHESIS),
          FLOW_FUNCTION_TYPE_PARAMETER_LIST(),
          b.optional(b.token(JavaScriptPunctuator.COMMA)),
          b.token(JavaScriptPunctuator.RPARENTHESIS)),
        f.flowFunctionTypeParameterClause(
          b.token(JavaScriptPunctuator.LPARENTHESIS),
          FLOW_FUNCTION_TYPE_PARAMETER_LIST(),
          b.token(JavaScriptPunctuator.COMMA),
          FLOW_FUNCTION_TYPE_REST_PARAMETER(),
          b.token(JavaScriptPunctuator.RPARENTHESIS)),
        f.flowFunctionTypeParameterClause(
          b.token(JavaScriptPunctuator.LPARENTHESIS),
          b.optional(FLOW_FUNCTION_TYPE_REST_PARAMETER()),
          b.token(JavaScriptPunctuator.RPARENTHESIS))));

  }

  public SeparatedList<FlowFunctionTypeParameterTree> FLOW_FUNCTION_TYPE_PARAMETER_LIST() {
    return b.<SeparatedList<FlowFunctionTypeParameterTree>>nonterminal()
      .is(f.parameterList(
        FLOW_FUNCTION_TYPE_PARAMETER(),
        b.zeroOrMore(f.newTuple(
          b.token(JavaScriptPunctuator.COMMA),
          FLOW_FUNCTION_TYPE_PARAMETER()))));
  }

  public FlowGenericParameterClauseTree FLOW_GENERIC_PARAMETER_CLAUSE() {
    return b.<FlowGenericParameterClauseTree>nonterminal(Kind.FLOW_GENERIC_PARAMETER_CLAUSE)
      .is(f.flowGenericParameterClause(
        b.token(JavaScriptPunctuator.LT),
        FLOW_GENERIC_PARAMETER(),
        b.zeroOrMore(f.newTuple(b.token(JavaScriptPunctuator.COMMA), FLOW_GENERIC_PARAMETER())),
        b.optional(b.token(JavaScriptPunctuator.COMMA)),
        b.token(JavaScriptPunctuator.GT)));
  }

  public FlowParameterizedGenericsTypeTree FLOW_PARAMETERIZED_GENERICS_TYPE() {
    return b.<FlowParameterizedGenericsTypeTree>nonterminal(Kind.FLOW_PARAMETERIZED_GENERICS_TYPE)
      .is(f.flowParameterizedGenericsClause(
        b.firstOf(FLOW_NAMESPACED_TYPE(), FLOW_SIMPLE_TYPE()),
        b.token(JavaScriptPunctuator.LT),
        b.optional(FLOW_TYPE()),
        b.zeroOrMore(f.newTuple(b.token(JavaScriptPunctuator.COMMA), FLOW_TYPE())),
        b.optional(b.token(JavaScriptPunctuator.COMMA)),
        b.token(JavaScriptPunctuator.GT)));
  }

  public FlowImplementsClauseTree FLOW_IMPLEMENTS_CLAUSE() {
    return b.<FlowImplementsClauseTree>nonterminal(Kind.FLOW_IMPLEMENTS_CLAUSE)
      .is(f.flowImplementsClause(
        b.token(EcmaScriptLexer.IMPLEMENTS),
        FLOW_TYPE_TO_BE_EXTENDED(),
        b.zeroOrMore(f.newTuple(b.token(JavaScriptPunctuator.COMMA), FLOW_TYPE_TO_BE_EXTENDED()))));
  }

  public FlowImplementsClauseTree FLOW_EXTENDS_CLAUSE() {
    return b.<FlowImplementsClauseTree>nonterminal()
      .is(f.flowImplementsClause(
        b.token(JavaScriptKeyword.EXTENDS),
        FLOW_TYPE_TO_BE_EXTENDED(),
        b.zeroOrMore(f.newTuple(b.token(JavaScriptPunctuator.COMMA), FLOW_TYPE_TO_BE_EXTENDED()))));
  }

  public FlowTypeTree FLOW_TYPE_TO_BE_EXTENDED() {
    return b.<FlowTypeTree>nonterminal()
      .is(b.firstOf(FLOW_PARAMETERIZED_GENERICS_TYPE(), FLOW_NAMESPACED_TYPE(), FLOW_SIMPLE_TYPE()));
  }

  public FlowGenericParameterTree FLOW_GENERIC_PARAMETER() {
    return b.<FlowGenericParameterTree>nonterminal(Kind.FLOW_GENERIC_PARAMETER)
      .is(f.flowGenericParameter(
        BINDING_IDENTIFIER(),
        b.optional(FLOW_TYPE_ANNOTATION()),
        b.optional(f.newTuple(b.token(JavaScriptPunctuator.EQU), FLOW_TYPE()))));
  }

  public FlowFunctionTypeParameterTree FLOW_FUNCTION_TYPE_PARAMETER() {
    return b.<FlowFunctionTypeParameterTree>nonterminal(Kind.FLOW_FUNCTION_TYPE_PARAMETER)
      .is(b.firstOf(
        f.flowFunctionTypeParameter(IDENTIFIER_NAME(), b.optional(b.token(JavaScriptPunctuator.QUERY)), FLOW_TYPE_ANNOTATION()),
        f.flowFunctionTypeParameter(FLOW_TYPE())));
  }

  public FlowFunctionTypeParameterTree FLOW_FUNCTION_TYPE_REST_PARAMETER() {
    return b.<FlowFunctionTypeParameterTree>nonterminal()
      .is(f.flowFunctionTypeRestParameter(b.token(JavaScriptPunctuator.ELLIPSIS), FLOW_FUNCTION_TYPE_PARAMETER()));
  }

  public FlowObjectTypeTree FLOW_OBJECT_TYPE() {
    return b.<FlowObjectTypeTree>nonterminal(Kind.FLOW_OBJECT_TYPE)
      .is(b.firstOf(
        f.flowObjectType(
          b.token(JavaScriptPunctuator.LCURLYBRACE),
          b.optional(FLOW_OBJECT_TYPE_PROPERTIES()),
          b.token(JavaScriptPunctuator.RCURLYBRACE)),
        f.flowStrictObjectType(
          b.token(JavaScriptPunctuator.LCURLYBRACE),
          b.token(JavaScriptPunctuator.OR),
          b.optional(FLOW_OBJECT_TYPE_PROPERTIES()),
          b.token(JavaScriptPunctuator.OR),
          b.token(JavaScriptPunctuator.RCURLYBRACE))));
  }

  public SeparatedList<Tree> FLOW_OBJECT_TYPE_PROPERTIES() {
    return b.<SeparatedList<Tree>>nonterminal()
      .is(f.properties(
        FLOW_PROPERTY_DEFINITION(),
        b.zeroOrMore(f.newTuple(b.firstOf(b.token(JavaScriptPunctuator.COMMA), b.token(JavaScriptPunctuator.SEMI)), FLOW_PROPERTY_DEFINITION())),
        b.optional(b.firstOf(b.token(JavaScriptPunctuator.COMMA), b.token(JavaScriptPunctuator.SEMI)))));
  }

  public FlowPropertyDefinitionTree FLOW_PROPERTY_DEFINITION() {
    return b.<FlowPropertyDefinitionTree>nonterminal(Kind.FLOW_PROPERTY_DEFINITION)
      .is(b.firstOf(
        // this duplication here in order  to support property with name "static"
        f.flowPropertyDefinition(
          b.token(EcmaScriptLexer.STATIC),
          b.optional(b.firstOf(b.token(JavaScriptPunctuator.PLUS), b.token(JavaScriptPunctuator.MINUS))),
          b.firstOf(
            FLOW_METHOD_PROPERTY_DEFINITION_KEY(),
            FLOW_SIMPLE_PROPERTY_DEFINITION_KEY(),
            FLOW_INDEXER_PROPERTY_DEFINITION_KEY()),
          FLOW_TYPE_ANNOTATION()),
        f.flowPropertyDefinition(
          b.optional(b.firstOf(b.token(JavaScriptPunctuator.PLUS), b.token(JavaScriptPunctuator.MINUS))),
          b.firstOf(
            FLOW_METHOD_PROPERTY_DEFINITION_KEY(),
            FLOW_SIMPLE_PROPERTY_DEFINITION_KEY(),
            FLOW_INDEXER_PROPERTY_DEFINITION_KEY()),
          FLOW_TYPE_ANNOTATION())));
  }

  public FlowMethodPropertyDefinitionKeyTree FLOW_METHOD_PROPERTY_DEFINITION_KEY() {
    return b.<FlowMethodPropertyDefinitionKeyTree>nonterminal(Kind.FLOW_METHOD_PROPERTY_DEFINITION_KEY)
      .is(f.flowMethodPropertyDefinitionKeyTree(
        b.optional(IDENTIFIER_NAME()),
        b.optional(FLOW_GENERIC_PARAMETER_CLAUSE()),
        FLOW_FUNCTION_TYPE_PARAMETER_CLAUSE()));
  }

  public FlowSimplePropertyDefinitionKeyTree FLOW_SIMPLE_PROPERTY_DEFINITION_KEY() {
    return b.<FlowSimplePropertyDefinitionKeyTree>nonterminal(Kind.FLOW_SIMPLE_PROPERTY_DEFINITION_KEY)
      .is(f.flowSimplePropertyDefinitionKeyTree(
        b.firstOf(b.token(EcmaScriptLexer.IDENTIFIER_NAME), b.token(EcmaScriptLexer.STRING_LITERAL)),
        b.optional(b.token(JavaScriptPunctuator.QUERY))));
  }

  public FlowIndexerPropertyDefinitionKeyTree FLOW_INDEXER_PROPERTY_DEFINITION_KEY() {
    return b.<FlowIndexerPropertyDefinitionKeyTree>nonterminal(Kind.FLOW_INDEXER_PROPERTY_DEFINITION_KEY)
      .is(f.flowIndexerPropertyDefinitionKey(
        b.token(JavaScriptPunctuator.LBRACKET),
        b.optional(f.newTuple(IDENTIFIER_NAME(), b.token(JavaScriptPunctuator.COLON))),
        FLOW_TYPE(),
        b.token(JavaScriptPunctuator.RBRACKET)));
  }

  public FlowTypeAnnotationTree FLOW_TYPE_ANNOTATION() {
    return b.<FlowTypeAnnotationTree>nonterminal(Kind.FLOW_TYPE_ANNOTATION)
      .is(f.flowTypeAnnotation(b.token(JavaScriptPunctuator.COLON), FLOW_TYPE()));
  }

  public FlowTypeAnnotationTree FLOW_ARROW_FUNCTION_RETURN_TYPE_ANNOTATION() {
    return b.<FlowTypeAnnotationTree>nonterminal()
      .is(f.flowTypeAnnotation(b.token(JavaScriptPunctuator.COLON), FLOW_UNION_TYPE_OR_HIGHER_NON_FUNCTION()));
  }

  public FlowTypedBindingElementTree FLOW_TYPED_BINDING_ELEMENT() {
    return b.<FlowTypedBindingElementTree>nonterminal(Kind.FLOW_TYPED_BINDING_ELEMENT)
      .is(f.flowTypedBindingElement(
        b.firstOf(FLOW_OPTIONAL_BINDING_ELEMENT(), BINDING_IDENTIFIER(), BINDING_PATTERN()),
        FLOW_TYPE_ANNOTATION()));
  }

  public FlowOptionalBindingElementTree FLOW_OPTIONAL_BINDING_ELEMENT() {
    return b.<FlowOptionalBindingElementTree>nonterminal(Kind.FLOW_OPTIONAL_BINDING_ELEMENT)
      .is(f.flowOptionalBindingElement(
        b.firstOf(BINDING_IDENTIFIER(), BINDING_PATTERN()),
        b.token(JavaScriptPunctuator.QUERY)));
  }

  public FlowTypeAliasStatementTree FLOW_TYPE_ALIAS_STATEMENT() {
    return b.<FlowTypeAliasStatementTree>nonterminal(Kind.FLOW_TYPE_ALIAS_STATEMENT)
      .is(f.flowTypeAliasStatement(
        b.optional(b.token(EcmaScriptLexer.OPAQUE)),
        b.token(EcmaScriptLexer.TYPE),
        BINDING_IDENTIFIER(),
        b.optional(FLOW_GENERIC_PARAMETER_CLAUSE()),
        b.optional(FLOW_TYPE_ANNOTATION()),
        b.token(JavaScriptPunctuator.EQU),
        FLOW_TYPE(),
        b.token(EcmaScriptLexer.EOS)));
  }

  public FlowOpaqueTypeTree FLOW_OPAQUE_TYPE() {
    return b.<FlowOpaqueTypeTree>nonterminal(Kind.FLOW_OPAQUE_TYPE)
      .is(f.flowOpaqueType(
        b.token(EcmaScriptLexer.OPAQUE),
        b.token(EcmaScriptLexer.TYPE),
        IDENTIFIER_NAME()));
  }

  public InternalSyntaxToken FLOW_TYPE_KEYWORD() {
    return b.<InternalSyntaxToken>nonterminal()
      .is(b.firstOf(b.token(JavaScriptKeyword.TYPEOF), b.token(EcmaScriptLexer.TYPE)));
  }

  public FlowInterfaceDeclarationTree FLOW_INTERFACE_DECLARATION() {
    return b.<FlowInterfaceDeclarationTree>nonterminal(Kind.FLOW_INTERFACE_DECLARATION)
      .is(f.flowInterfaceDeclaration(
        b.token(EcmaScriptLexer.INTERFACE),
        BINDING_IDENTIFIER(),
        b.optional(FLOW_GENERIC_PARAMETER_CLAUSE()),
        b.optional(FLOW_EXTENDS_CLAUSE()),
        b.token(JavaScriptPunctuator.LCURLYBRACE),
        b.optional(FLOW_OBJECT_TYPE_PROPERTIES()),
        b.token(JavaScriptPunctuator.RCURLYBRACE)));
  }

  public FlowDeclareTree FLOW_DECLARE() {
    return b.<FlowDeclareTree>nonterminal(Kind.FLOW_DECLARE)
      .is(f.flowDeclare(
        b.token(EcmaScriptLexer.DECLARE),
        b.firstOf(
          VARIABLE_STATEMENT(),
          CLASS_DECLARATION(),
          FLOW_TYPE_ALIAS_STATEMENT(),
          FLOW_OPAQUE_TYPE(),
          FLOW_FUNCTION_SIGNATURE(),
          FLOW_EXPORT_DEFAULT_TYPE(),
          EXPORT_DECLARATION(),
          FLOW_INTERFACE_DECLARATION(),
          FLOW_MODULE_EXPORTS(),
          FLOW_MODULE()),
        b.optional(b.token(EcmaScriptLexer.EOS))));
  }

  public DefaultExportDeclarationTree FLOW_EXPORT_DEFAULT_TYPE() {
    return b.<DefaultExportDeclarationTree>nonterminal()
      .is(f.flowExportDefaultType(
        b.token(JavaScriptKeyword.EXPORT),
        b.token(JavaScriptKeyword.DEFAULT),
        b.firstOf(FLOW_FUNCTION_SIGNATURE(), FLOW_TYPE()),
        b.token(EcmaScriptLexer.EOS)));
  }

  public FlowModuleTree FLOW_MODULE() {
    return b.<FlowModuleTree>nonterminal(Kind.FLOW_MODULE)
      .is(f.flowModule(
        b.token(EcmaScriptLexer.MODULE),
        b.firstOf(b.token(EcmaScriptLexer.STRING_LITERAL), b.token(JavaScriptTokenType.IDENTIFIER)),
        b.token(JavaScriptPunctuator.LCURLYBRACE),
        b.zeroOrMore(FLOW_DECLARE()),
        b.token(JavaScriptPunctuator.RCURLYBRACE)));
  }

  public FlowFunctionSignatureTree FLOW_FUNCTION_SIGNATURE() {
    return b.<FlowFunctionSignatureTree>nonterminal(Kind.FLOW_FUNCTION_SIGNATURE)
      .is(f.flowFunctionSignature(
        b.token(JavaScriptKeyword.FUNCTION),
        BINDING_IDENTIFIER(),
        b.optional(FLOW_GENERIC_PARAMETER_CLAUSE()),
        FLOW_FUNCTION_TYPE_PARAMETER_CLAUSE(),
        FLOW_TYPE_ANNOTATION()));
  }

  public FlowModuleExportsTree FLOW_MODULE_EXPORTS() {
    return b.<FlowModuleExportsTree>nonterminal(Kind.FLOW_MODULE_EXPORTS)
      .is(f.flowModuleExports(
        b.token(EcmaScriptLexer.MODULE),
        b.token(JavaScriptPunctuator.DOT),
        b.token(EcmaScriptLexer.EXPORTS),
        FLOW_TYPE_ANNOTATION()));
  }

  // [END] FLOW

  private static <T> T ES6(T object) {
    return object;
  }

}
