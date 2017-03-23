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

import com.sonar.sslr.api.typed.GrammarBuilder;
import java.util.List;
import org.sonar.javascript.lexer.JavaScriptKeyword;
import org.sonar.javascript.lexer.JavaScriptPunctuator;
import org.sonar.javascript.lexer.JavaScriptTokenType;
import org.sonar.javascript.tree.impl.SeparatedList;
import org.sonar.javascript.tree.impl.declaration.ArrayBindingPatternTreeImpl;
import org.sonar.javascript.tree.impl.declaration.DefaultExportDeclarationTreeImpl;
import org.sonar.javascript.tree.impl.declaration.FromClauseTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ImportClauseTreeImpl;
import org.sonar.javascript.tree.impl.declaration.InitializedBindingElementTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ModuleTreeImpl;
import org.sonar.javascript.tree.impl.declaration.NamedExportDeclarationTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ObjectBindingPatternTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ParameterListTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ScriptTreeImpl;
import org.sonar.javascript.tree.impl.declaration.SpecifierListTreeImpl;
import org.sonar.javascript.tree.impl.declaration.SpecifierTreeImpl;
import org.sonar.javascript.tree.impl.expression.ArrayLiteralTreeImpl;
import org.sonar.javascript.tree.impl.expression.ArrowFunctionTreeImpl;
import org.sonar.javascript.tree.impl.expression.BracketMemberExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.ClassTreeImpl;
import org.sonar.javascript.tree.impl.expression.ComputedPropertyNameTreeImpl;
import org.sonar.javascript.tree.impl.expression.DotMemberExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.IdentifierTreeImpl;
import org.sonar.javascript.tree.impl.expression.LiteralTreeImpl;
import org.sonar.javascript.tree.impl.expression.ObjectLiteralTreeImpl;
import org.sonar.javascript.tree.impl.expression.PairPropertyTreeImpl;
import org.sonar.javascript.tree.impl.expression.ParenthesisedExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.RestElementTreeImpl;
import org.sonar.javascript.tree.impl.expression.SuperTreeImpl;
import org.sonar.javascript.tree.impl.expression.TaggedTemplateTreeImpl;
import org.sonar.javascript.tree.impl.expression.YieldExpressionTreeImpl;
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
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.DeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.DecoratorTree;
import org.sonar.plugins.javascript.api.tree.declaration.ExportClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.ExportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ExportDefaultBinding;
import org.sonar.plugins.javascript.api.tree.declaration.ExportDefaultBindingWithExportList;
import org.sonar.plugins.javascript.api.tree.declaration.ExportDefaultBindingWithNameSpaceExport;
import org.sonar.plugins.javascript.api.tree.declaration.FieldDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ImportModuleDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.NameSpaceExportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.SpecifierListTree;
import org.sonar.plugins.javascript.api.tree.declaration.SpecifierTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrayAssignmentPatternTree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentPatternRestElementTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.InitializedAssignmentPatternElementTree;
import org.sonar.plugins.javascript.api.tree.expression.MemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.NewTargetTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectAssignmentPatternTree;
import org.sonar.plugins.javascript.api.tree.expression.RestElementTree;
import org.sonar.plugins.javascript.api.tree.expression.SpreadElementTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateCharactersTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxAttributeTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxAttributeValueTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxChildTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxClosingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxElementNameTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxIdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxOpeningElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxSelfClosingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxSpreadAttributeTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxStandardAttributeTree;
import org.sonar.plugins.javascript.api.tree.statement.DebuggerStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;

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

  public EmptyStatementTreeImpl EMPTY_STATEMENT() {
    return b.<EmptyStatementTreeImpl>nonterminal(Kind.EMPTY_STATEMENT)
      .is(f.emptyStatement(b.token(JavaScriptPunctuator.SEMI)));
  }

  public DebuggerStatementTree DEBUGGER_STATEMENT() {
    return b.<DebuggerStatementTreeImpl>nonterminal(Kind.DEBUGGER_STATEMENT)
      .is(f.debuggerStatement(b.token(JavaScriptKeyword.DEBUGGER), b.token(JavaScriptLegacyGrammar.EOS)));
  }

  public VariableStatementTreeImpl VARIABLE_STATEMENT() {
    return b.<VariableStatementTreeImpl>nonterminal(Kind.VARIABLE_STATEMENT)
      .is(f.variableStatement(VARIABLE_DECLARATION(), b.token(JavaScriptLegacyGrammar.EOS)));
  }

  public VariableDeclarationTreeImpl VARIABLE_DECLARATION() {
    return b.<VariableDeclarationTreeImpl>nonterminal()
      .is(
        f.variableDeclaration1(
          b.firstOf(
            b.token(JavaScriptKeyword.VAR),
            b.token(JavaScriptLegacyGrammar.LET),
            b.token(JavaScriptKeyword.CONST)),
          BINDING_ELEMENT_LIST()));
  }

  public SeparatedList<BindingElementTree> BINDING_ELEMENT_LIST() {
    return b.<SeparatedList<BindingElementTree>>nonterminal()
      .is(f.bindingElementList1(BINDING_ELEMENT(), b.zeroOrMore(f.newTuple1(b.token(JavaScriptPunctuator.COMMA), BINDING_ELEMENT()))));
  }

  public LabelledStatementTreeImpl LABELLED_STATEMENT() {
    return b.<LabelledStatementTreeImpl>nonterminal(Kind.LABELLED_STATEMENT)
      .is(f.labelledStatement(LABEL_IDENTIFIER(), b.token(JavaScriptPunctuator.COLON), STATEMENT()));
  }

  public ContinueStatementTreeImpl CONTINUE_STATEMENT() {
    return b.<ContinueStatementTreeImpl>nonterminal(Kind.CONTINUE_STATEMENT)
      .is(b.firstOf(
        CONTINUE_WITH_LABEL(),
        CONTINUE_WITHOUT_LABEL()));
  }

  public ContinueStatementTreeImpl CONTINUE_WITH_LABEL() {
    return b.<ContinueStatementTreeImpl>nonterminal()
      .is(f.continueWithLabel(
        b.token(JavaScriptKeyword.CONTINUE),
        LABEL_IDENTIFIER_NO_LB(),
        b.token(JavaScriptLegacyGrammar.EOS)));
  }

  public ContinueStatementTreeImpl CONTINUE_WITHOUT_LABEL() {
    return b.<ContinueStatementTreeImpl>nonterminal()
      .is(f.continueWithoutLabel(b.token(JavaScriptKeyword.CONTINUE), b.token(JavaScriptLegacyGrammar.EOS_NO_LB)));
  }

  public BreakStatementTreeImpl BREAK_STATEMENT() {
    return b.<BreakStatementTreeImpl>nonterminal(Kind.BREAK_STATEMENT)
      .is(b.firstOf(
        BREAK_WITH_LABEL(),
        BREAK_WITHOUT_LABEL()));
  }

  public BreakStatementTreeImpl BREAK_WITH_LABEL() {
    return b.<BreakStatementTreeImpl>nonterminal()
      .is(f.breakWithLabel(
        b.token(JavaScriptKeyword.BREAK),
        LABEL_IDENTIFIER_NO_LB(),
        b.token(JavaScriptLegacyGrammar.EOS)));
  }

  public BreakStatementTreeImpl BREAK_WITHOUT_LABEL() {
    return b.<BreakStatementTreeImpl>nonterminal()
      .is(f.breakWithoutLabel(b.token(JavaScriptKeyword.BREAK), b.token(JavaScriptLegacyGrammar.EOS_NO_LB)));
  }

  public ReturnStatementTreeImpl RETURN_STATEMENT() {
    return b.<ReturnStatementTreeImpl>nonterminal(Kind.RETURN_STATEMENT)
      .is(b.firstOf(
        RETURN_WITH_EXPRESSION(),
        RETURN_WITHOUT_EXPRESSION()));
  }

  public ReturnStatementTreeImpl RETURN_WITH_EXPRESSION() {
    return b.<ReturnStatementTreeImpl>nonterminal()
      .is(f.returnWithExpression(
        b.token(JavaScriptKeyword.RETURN),
        EXPRESSION_NO_LINE_BREAK(),
        b.token(JavaScriptLegacyGrammar.EOS)));
  }

  public ReturnStatementTreeImpl RETURN_WITHOUT_EXPRESSION() {
    return b.<ReturnStatementTreeImpl>nonterminal()
      .is(f.returnWithoutExpression(b.token(JavaScriptKeyword.RETURN), b.token(JavaScriptLegacyGrammar.EOS_NO_LB)));
  }

  public ThrowStatementTreeImpl THROW_STATEMENT() {
    return b.<ThrowStatementTreeImpl>nonterminal(Kind.THROW_STATEMENT)
      .is(
        f.newThrowStatement(
          b.token(JavaScriptKeyword.THROW),
          EXPRESSION_NO_LINE_BREAK(),
          b.token(JavaScriptLegacyGrammar.EOS)));
  }

  public WithStatementTreeImpl WITH_STATEMENT() {
    return b.<WithStatementTreeImpl>nonterminal(Kind.WITH_STATEMENT)
      .is(f.newWithStatement(
        b.token(JavaScriptKeyword.WITH),
        b.token(JavaScriptPunctuator.LPARENTHESIS),
        EXPRESSION(),
        b.token(JavaScriptPunctuator.RPARENTHESIS),
        STATEMENT()));
  }

  public BlockTreeImpl BLOCK() {
    return b.<BlockTreeImpl>nonterminal(Kind.BLOCK)
      .is(f.newBlock(
        b.token(JavaScriptPunctuator.LCURLYBRACE),
        b.optional(b.oneOrMore(STATEMENT())),
        b.token(JavaScriptPunctuator.RCURLYBRACE)));
  }

  public TryStatementTreeImpl TRY_STATEMENT() {
    return b.<TryStatementTreeImpl>nonterminal(Kind.TRY_STATEMENT)
      .is(f.completeTryStatement(
        b.token(JavaScriptKeyword.TRY),
        BLOCK(),
        b.firstOf(
          f.newTryStatementWithCatch(CATCH_CLAUSE(), b.optional(FINALLY_CLAUSE())),
          FINALLY_CLAUSE())
      ));
  }

  public TryStatementTreeImpl FINALLY_CLAUSE() {
    return b.<TryStatementTreeImpl>nonterminal(JavaScriptLegacyGrammar.FINALLY)
      .is(f.newTryStatementWithFinally(b.token(JavaScriptKeyword.FINALLY), BLOCK()));
  }

  public CatchBlockTreeImpl CATCH_CLAUSE() {
    return b.<CatchBlockTreeImpl>nonterminal(Kind.CATCH_BLOCK)
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

  public SwitchStatementTreeImpl SWITCH_STATEMENT() {
    return b.<SwitchStatementTreeImpl>nonterminal(Kind.SWITCH_STATEMENT)
      .is(f.completeSwitchStatement(
        b.token(JavaScriptKeyword.SWITCH),
        b.token(JavaScriptPunctuator.LPARENTHESIS),
        EXPRESSION(),
        b.token(JavaScriptPunctuator.RPARENTHESIS),
        CASE_BLOCK()));
  }

  public SwitchStatementTreeImpl CASE_BLOCK() {
    return b.<SwitchStatementTreeImpl>nonterminal()
      .is(f.newSwitchStatement(
        b.token(JavaScriptPunctuator.LCURLYBRACE),
        b.zeroOrMore(CASE_CLAUSE()),
        b.optional(f.newTuple2(DEFAULT_CLAUSE(), b.zeroOrMore(CASE_CLAUSE()))),
        b.token(JavaScriptPunctuator.RCURLYBRACE)));
  }

  public CaseClauseTreeImpl CASE_CLAUSE() {
    return b.<CaseClauseTreeImpl>nonterminal(Kind.CASE_CLAUSE)
      .is(
        f.caseClause(
          b.token(JavaScriptKeyword.CASE),
          EXPRESSION(),
          b.token(JavaScriptPunctuator.COLON),
          b.optional(b.oneOrMore(STATEMENT()))));
  }

  public DefaultClauseTreeImpl DEFAULT_CLAUSE() {
    return b.<DefaultClauseTreeImpl>nonterminal(Kind.DEFAULT_CLAUSE)
      .is(f.defaultClause(
        b.token(JavaScriptKeyword.DEFAULT),
        b.token(JavaScriptPunctuator.COLON),
        b.optional(b.oneOrMore(STATEMENT()))));
  }

  public IfStatementTreeImpl IF_STATEMENT() {
    return b.<IfStatementTreeImpl>nonterminal(Kind.IF_STATEMENT)
      .is(
        f.ifStatement(
          b.token(JavaScriptKeyword.IF),
          b.token(JavaScriptPunctuator.LPARENTHESIS),
          EXPRESSION(),
          b.token(JavaScriptPunctuator.RPARENTHESIS),
          STATEMENT(),
          b.optional(ELSE_CLAUSE())));
  }

  public ElseClauseTreeImpl ELSE_CLAUSE() {
    return b.<ElseClauseTreeImpl>nonterminal(Kind.ELSE_CLAUSE)
      .is(f.elseClause(
        b.token(JavaScriptKeyword.ELSE),
        STATEMENT()));
  }

  public WhileStatementTreeImpl WHILE_STATEMENT() {
    return b.<WhileStatementTreeImpl>nonterminal(Kind.WHILE_STATEMENT)
      .is(
        f.whileStatement(
          b.token(JavaScriptKeyword.WHILE),
          b.token(JavaScriptPunctuator.LPARENTHESIS),
          EXPRESSION(),
          b.token(JavaScriptPunctuator.RPARENTHESIS),
          STATEMENT()));
  }

  public DoWhileStatementTreeImpl DO_WHILE_STATEMENT() {
    return b.<DoWhileStatementTreeImpl>nonterminal(Kind.DO_WHILE_STATEMENT)
      .is(
        f.doWhileStatement(
          b.token(JavaScriptKeyword.DO),
          STATEMENT(),
          b.token(JavaScriptKeyword.WHILE),
          b.token(JavaScriptPunctuator.LPARENTHESIS),
          EXPRESSION(),
          b.token(JavaScriptPunctuator.RPARENTHESIS),
          b.token(JavaScriptLegacyGrammar.EOS)));
  }

  public ExpressionStatementTreeImpl EXPRESSION_STATEMENT() {
    return b.<ExpressionStatementTreeImpl>nonterminal(Kind.EXPRESSION_STATEMENT)
      .is(f.expressionStatement(b.token(JavaScriptLegacyGrammar.NEXT_NOT_LCURLY_AND_FUNCTION), EXPRESSION(), b.token(JavaScriptLegacyGrammar.EOS)));
  }

  /**
   * ECMAScript 6
   */
  public ForObjectStatementTreeImpl FOR_OF_STATEMENT() {
    return b.<ForObjectStatementTreeImpl>nonterminal(Kind.FOR_OF_STATEMENT)
      .is(f.forOfStatement(
        b.token(JavaScriptKeyword.FOR),
        b.optional(b.token(JavaScriptKeyword.AWAIT)),
        b.token(JavaScriptPunctuator.LPARENTHESIS),
        b.firstOf(
          VARIABLE_DECLARATION(),
          f.skipLookahead3(b.token(JavaScriptLegacyGrammar.NEXT_NOT_LET), LEFT_HAND_SIDE_EXPRESSION())),
        b.token(JavaScriptLegacyGrammar.OF),
        ASSIGNMENT_EXPRESSION(),
        b.token(JavaScriptPunctuator.RPARENTHESIS),
        STATEMENT()));
  }

  public ForObjectStatementTreeImpl FOR_IN_STATEMENT() {
    return b.<ForObjectStatementTreeImpl>nonterminal(Kind.FOR_IN_STATEMENT)
      .is(
        f.forInStatement(
          b.token(JavaScriptKeyword.FOR),
          b.token(JavaScriptPunctuator.LPARENTHESIS),
          b.firstOf(
            VARIABLE_DECLARATION(),
            f.skipLookahead2(b.token(JavaScriptLegacyGrammar.NEXT_NOT_LET_AND_BRACKET), LEFT_HAND_SIDE_EXPRESSION())),
          b.token(JavaScriptKeyword.IN),
          EXPRESSION(),
          b.token(JavaScriptPunctuator.RPARENTHESIS),
          STATEMENT()));
  }

  public ForStatementTreeImpl FOR_STATEMENT() {
    return b.<ForStatementTreeImpl>nonterminal(Kind.FOR_STATEMENT)
      .is(
        f.forStatement(
          b.token(JavaScriptKeyword.FOR),
          b.token(JavaScriptPunctuator.LPARENTHESIS),

          b.optional(
            b.firstOf(
              VARIABLE_DECLARATION(),
              f.skipLookahead1(b.token(JavaScriptLegacyGrammar.NEXT_NOT_LET_AND_BRACKET), EXPRESSION()))),
          b.token(JavaScriptPunctuator.SEMI),

          b.optional(EXPRESSION()),
          b.token(JavaScriptPunctuator.SEMI),

          b.optional(EXPRESSION()),
          b.token(JavaScriptPunctuator.RPARENTHESIS),
          STATEMENT()));
  }

  public StatementTree ITERATION_STATEMENT() {
    return b.<StatementTree>nonterminal(JavaScriptLegacyGrammar.ITERATION_STATEMENT)
      .is(
        b.firstOf(
          DO_WHILE_STATEMENT(),
          WHILE_STATEMENT(),
          FOR_IN_STATEMENT(),
          ES6(FOR_OF_STATEMENT()),
          FOR_STATEMENT()));
  }

  public StatementTree STATEMENT() {
    return b.<StatementTree>nonterminal(JavaScriptLegacyGrammar.STATEMENT)
      .is(
        b.firstOf(
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
          FUNCTION_AND_GENERATOR_DECLARATION()));
  }

  /**
   * A.4 [END] Statement
   */

  /**
   * A.3 Expressions
   */

  public LiteralTreeImpl LITERAL() {
    return b.<LiteralTreeImpl>nonterminal(JavaScriptLegacyGrammar.LITERAL)
      .is(b.firstOf(
        f.nullLiteral(b.token(JavaScriptKeyword.NULL)),
        f.booleanLiteral(b.firstOf(b.token(JavaScriptKeyword.TRUE), b.token(JavaScriptKeyword.FALSE))),
        NUMERIC_LITERAL(),
        STRING_LITERAL(),
        f.regexpLiteral(b.token(JavaScriptTokenType.REGULAR_EXPRESSION_LITERAL))));
  }

  public LiteralTreeImpl NUMERIC_LITERAL() {
    return b.<LiteralTreeImpl>nonterminal(Kind.NUMERIC_LITERAL)
      .is(f.numericLiteral(b.token(JavaScriptTokenType.NUMERIC_LITERAL)));
  }

  public LiteralTreeImpl STRING_LITERAL() {
    return b.<LiteralTreeImpl>nonterminal(Kind.STRING_LITERAL)
      .is(f.stringLiteral(b.token(JavaScriptLegacyGrammar.STRING_LITERAL)));
  }

  public ExpressionTree ARRAY_LITERAL_ELEMENT() {
    return b.<ExpressionTree>nonterminal(JavaScriptLegacyGrammar.ARRAY_LITERAL_ELEMENT)
      .is(b.firstOf(SPREAD_ELEMENT(), ASSIGNMENT_EXPRESSION()));
  }

  public ArrayLiteralTreeImpl ARRAY_ELEMENT_LIST() {
    return b.<ArrayLiteralTreeImpl>nonterminal(JavaScriptLegacyGrammar.ELEMENT_LIST)
      .is(f.newArrayLiteralWithElements(
        b.zeroOrMore(b.token(JavaScriptPunctuator.COMMA)),
        ARRAY_LITERAL_ELEMENT(),
        b.zeroOrMore(
          f.newTuple3(b.oneOrMore(b.token(JavaScriptPunctuator.COMMA)), ARRAY_LITERAL_ELEMENT())),
        b.zeroOrMore(b.token(JavaScriptPunctuator.COMMA))
      ));
  }

  public ParameterListTreeImpl FORMAL_PARAMETER_CLAUSE() {
    return b.<ParameterListTreeImpl>nonterminal(Kind.FORMAL_PARAMETER_LIST)
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

  public SeparatedList<Tree> FORMAL_PARAMETER_LIST() {
    return b.<SeparatedList<Tree>>nonterminal()
      .is(f.formalParameters(
        BINDING_ELEMENT(),
        b.zeroOrMore(f.newTuple4(b.token(JavaScriptPunctuator.COMMA), BINDING_ELEMENT()))));
  }

  /**
   * ECMAScript 6
   */
  public RestElementTreeImpl BINDING_REST_ELEMENT() {
    return b.<RestElementTreeImpl>nonterminal(JavaScriptLegacyGrammar.BINDING_REST_ELEMENT)
      .is(f.bindingRestElement(b.token(JavaScriptPunctuator.ELLIPSIS), BINDING_IDENTIFIER()));
  }

  public ArrayLiteralTreeImpl ARRAY_LITERAL() {
    return b.<ArrayLiteralTreeImpl>nonterminal(Kind.ARRAY_LITERAL)
      .is(f.completeArrayLiteral(
        b.token(JavaScriptPunctuator.LBRACKET),
        b.optional(b.firstOf(
          ARRAY_ELEMENT_LIST(),
          f.newArrayLiteralWithElidedElements(b.oneOrMore(b.token(JavaScriptPunctuator.COMMA))))),
        b.token(JavaScriptPunctuator.RBRACKET)
      ));
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
          FORMAL_PARAMETER_CLAUSE(),
          BLOCK()));
  }

  public FunctionExpressionTree FUNCTION_EXPRESSION() {
    return b.<FunctionExpressionTree>nonterminal(Kind.FUNCTION_EXPRESSION)
      .is(
        f.functionExpression(
          b.optional(b.token(JavaScriptLegacyGrammar.ASYNC)),
          b.token(JavaScriptKeyword.FUNCTION),
          b.optional(BINDING_IDENTIFIER()),
          FORMAL_PARAMETER_CLAUSE(),
          BLOCK()));
  }

  public ExpressionTree CONDITIONAL_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(Kind.CONDITIONAL_EXPRESSION)
      .is(f.completeConditionalExpression(
        CONDITIONAL_OR_EXPRESSION(),
        b.optional(f.newConditionalExpression(
          b.token(JavaScriptPunctuator.QUERY),
          ASSIGNMENT_EXPRESSION(),
          b.token(JavaScriptPunctuator.COLON),
          ASSIGNMENT_EXPRESSION()))
      ));
  }

  public ExpressionTree CONDITIONAL_EXPRESSION_NOT_ES6_ASSIGNMENT_EXPRESSION() {
    return b.<ExpressionTree>nonterminal()
      .is(f.skipLookahead4(CONDITIONAL_EXPRESSION(), b.token(JavaScriptLegacyGrammar.NEXT_NOT_ES6_ASSIGNMENT_EXPRESSION)));
  }

  public ExpressionTree CONDITIONAL_OR_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(Kind.CONDITIONAL_OR)
      .is(f.newConditionalOr(
        CONDITIONAL_AND_EXPRESSION(),
        b.zeroOrMore(f.newTuple6(
          b.token(JavaScriptPunctuator.OROR),
          CONDITIONAL_AND_EXPRESSION()
        ))
      ));
  }

  public ExpressionTree CONDITIONAL_AND_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(Kind.CONDITIONAL_AND)
      .is(f.newConditionalAnd(
        BITWISE_OR_EXPRESSION(),
        b.zeroOrMore(f.newTuple7(
          b.token(JavaScriptPunctuator.ANDAND),
          BITWISE_OR_EXPRESSION()
        ))
      ));
  }

  public ExpressionTree BITWISE_OR_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(Kind.BITWISE_OR)
      .is(f.newBitwiseOr(
        BITWISE_XOR_EXPRESSION(),
        b.zeroOrMore(f.newTuple8(
          b.token(JavaScriptPunctuator.OR),
          BITWISE_XOR_EXPRESSION()
        ))
      ));
  }

  public ExpressionTree BITWISE_XOR_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(Kind.BITWISE_XOR)
      .is(f.newBitwiseXor(
        BITWISE_AND_EXPRESSION(),
        b.zeroOrMore(f.newTuple9(
          b.token(JavaScriptPunctuator.XOR),
          BITWISE_AND_EXPRESSION()
        ))
      ));
  }

  public ExpressionTree BITWISE_AND_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(Kind.BITWISE_AND)
      .is(f.newBitwiseAnd(
        EQUALITY_EXPRESSION(),
        b.zeroOrMore(f.newTuple10(
          b.token(JavaScriptPunctuator.AND),
          EQUALITY_EXPRESSION()
        ))
      ));
  }

  public ExpressionTree EQUALITY_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(JavaScriptLegacyGrammar.EQUALITY_EXPRESSION)
      .is(f.newEquality(
        RELATIONAL_EXPRESSION(),
        b.zeroOrMore(f.newTuple11(
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
    return b.<ExpressionTree>nonterminal(JavaScriptLegacyGrammar.RELATIONAL_EXPRESSION)
      .is(f.newRelational(
        SHIFT_EXPRESSION(),
        b.zeroOrMore(f.newTuple12(
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
    return b.<ExpressionTree>nonterminal(JavaScriptLegacyGrammar.SHIFT_EXPRESSION)
      .is(f.newShift(
        ADDITIVE_EXPRESSION(),
        b.zeroOrMore(f.newTuple13(
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
    return b.<ExpressionTree>nonterminal(JavaScriptLegacyGrammar.ADDITIVE_EXPRESSION)
      .is(f.newAdditive(
        MULTIPLICATIVE_EXPRESSION(),
        b.zeroOrMore(f.newTuple14(
          b.firstOf(
            b.token(JavaScriptPunctuator.PLUS),
            b.token(JavaScriptPunctuator.MINUS)),
          MULTIPLICATIVE_EXPRESSION()
        ))
        )
      );
  }

  public ExpressionTree MULTIPLICATIVE_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(JavaScriptLegacyGrammar.MULTIPLICATIVE_EXPRESSION)
      .is(f.newMultiplicative(
        EXPONENTIATION_EXPRESSION(),
        b.zeroOrMore(f.newTuple15(
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
          f.newTuple31(
            b.token(JavaScriptPunctuator.EXP),
            UNARY_EXPRESSION()))));
  }

  public ExpressionTree UNARY_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(JavaScriptLegacyGrammar.UNARY_EXPRESSION)
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
    return b.<ExpressionTree>nonterminal(JavaScriptLegacyGrammar.POSTFIX_EXPRESSION)
      .is(f.postfixExpression(
        LEFT_HAND_SIDE_EXPRESSION(),
        b.optional(f.newTuple16(
          b.token(JavaScriptLegacyGrammar.SPACING_NO_LINE_BREAK_NOT_FOLLOWED_BY_LINE_BREAK),
          b.firstOf(
            b.token(JavaScriptPunctuator.INC),
            b.token(JavaScriptPunctuator.DEC))
        ))
      ));
  }

  public ExpressionTree LEFT_HAND_SIDE_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(JavaScriptLegacyGrammar.LEFT_HAND_SIDE_EXPRESSION)
      .is(
        b.firstOf(
          CALL_EXPRESSION(),
          NEW_EXPRESSION()));
  }

  public YieldExpressionTreeImpl YIELD_EXPRESSION() {
    return b.<YieldExpressionTreeImpl>nonterminal(Kind.YIELD_EXPRESSION)
      .is(f.completeYieldExpression(
        b.token(JavaScriptKeyword.YIELD),
        b.optional(f.newYieldExpression(
          b.token(JavaScriptLegacyGrammar.SPACING_NO_LINE_BREAK_NOT_FOLLOWED_BY_LINE_BREAK),
          b.optional(b.token(JavaScriptPunctuator.STAR)),
          ASSIGNMENT_EXPRESSION())
        )
      ));
  }

  public IdentifierTreeImpl IDENTIFIER_REFERENCE() {
    return b.<IdentifierTreeImpl>nonterminal(JavaScriptLegacyGrammar.IDENTIFIER_REFERENCE)
      .is(f.identifierReference(b.firstOf(
        b.token(JavaScriptKeyword.YIELD),
        b.token(JavaScriptKeyword.AWAIT),
        b.token(JavaScriptTokenType.IDENTIFIER)))
      );
  }

  public IdentifierTreeImpl BINDING_IDENTIFIER() {
    return b.<IdentifierTreeImpl>nonterminal(JavaScriptLegacyGrammar.BINDING_IDENTIFIER)
      .is(f.bindingIdentifier(b.firstOf(
        b.token(JavaScriptKeyword.YIELD),
        b.token(JavaScriptKeyword.AWAIT),
        b.token(JavaScriptTokenType.IDENTIFIER)))
      );
  }

  public IdentifierTreeImpl LABEL_IDENTIFIER_NO_LB() {
    return b.<IdentifierTreeImpl>nonterminal()
      .is(f.labelIdentifier(
        b.token(JavaScriptLegacyGrammar.SPACING_NO_LINE_BREAK_NOT_FOLLOWED_BY_LINE_BREAK),
        b.token(JavaScriptTokenType.IDENTIFIER)));
  }

  public IdentifierTreeImpl LABEL_IDENTIFIER() {
    return b.<IdentifierTreeImpl>nonterminal()
      .is(f.labelIdentifier(b.token(JavaScriptTokenType.IDENTIFIER)));
  }

  public IdentifierTreeImpl IDENTIFIER_NAME() {
    return b.<IdentifierTreeImpl>nonterminal()
      .is(f.identifierName(b.token(JavaScriptLegacyGrammar.IDENTIFIER_NAME)));
  }

  public ArrowFunctionTreeImpl ARROW_FUNCTION() {
    return b.<ArrowFunctionTreeImpl>nonterminal(Kind.ARROW_FUNCTION)
      .is(f.arrowFunction(
        b.optional(b.token(JavaScriptLegacyGrammar.ASYNC)),
        b.firstOf(
          BINDING_IDENTIFIER(),
          FORMAL_PARAMETER_CLAUSE()),
        b.token(JavaScriptLegacyGrammar.SPACING_NO_LINE_BREAK_NOT_FOLLOWED_BY_LINE_BREAK),
        b.token(JavaScriptPunctuator.DOUBLEARROW),
        b.firstOf(
          BLOCK(),
          f.assignmentNoCurly(b.token(JavaScriptLegacyGrammar.NEXT_NOT_LCURLY), ASSIGNMENT_EXPRESSION()))
      ));
  }

  public ExpressionTree MEMBER_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(JavaScriptLegacyGrammar.MEMBER_EXPRESSION)
      .is(f.completeMemberExpression(
        b.firstOf(
          ES6(SUPER_PROPERTY()),
          ES6(NEW_TARGET()),
          f.newExpressionWithArgument(b.token(JavaScriptKeyword.NEW), b.firstOf(ES6(SUPER()), MEMBER_EXPRESSION()), ARGUMENT_CLAUSE()),
          PRIMARY_EXPRESSION()),
        b.zeroOrMore(
          b.firstOf(
            BRACKET_EXPRESSION(),
            OBJECT_PROPERTY_ACCESS(),
            ES6(TAGGED_TEMPLATE())))
      ));
  }

  public MemberExpressionTree SUPER_PROPERTY() {
    return b.<MemberExpressionTree>nonterminal()
      .is(f.completeSuperMemberExpression(
        SUPER(),
        b.firstOf(
          OBJECT_PROPERTY_ACCESS(),
          BRACKET_EXPRESSION())
      ));
  }

  public SuperTreeImpl SUPER() {
    return b.<SuperTreeImpl>nonterminal(Kind.SUPER)
      .is(f.superExpression(b.token(JavaScriptKeyword.SUPER)));
  }

  public NewTargetTree NEW_TARGET() {
    return b.<NewTargetTree>nonterminal(Kind.NEW_TARGET)
      .is(f.newTarget(
        b.token(JavaScriptKeyword.NEW),
        b.token(JavaScriptPunctuator.DOT),
        b.token(JavaScriptLegacyGrammar.TARGET)));
  }

  public MemberExpressionTree OBJECT_PROPERTY_ACCESS() {
    return b.<DotMemberExpressionTreeImpl>nonterminal(Kind.DOT_MEMBER_EXPRESSION)
      .is(f.newDotMemberExpression(
        b.token(JavaScriptPunctuator.DOT),
        IDENTIFIER_NAME()));
  }

  public MemberExpressionTree BRACKET_EXPRESSION() {
    return b.<BracketMemberExpressionTreeImpl>nonterminal(Kind.BRACKET_MEMBER_EXPRESSION)
      .is(
        f.newBracketMemberExpression(
          b.token(JavaScriptPunctuator.LBRACKET),
          EXPRESSION(),
          b.token(JavaScriptPunctuator.RBRACKET)));
  }

  public ExpressionTree TAGGED_TEMPLATE() {
    return b.<TaggedTemplateTreeImpl>nonterminal(Kind.TAGGED_TEMPLATE)
      .is(f.newTaggedTemplate(TEMPLATE_LITERAL()));

  }

  public ParameterListTreeImpl ARGUMENT_CLAUSE() {
    return b.<ParameterListTreeImpl>nonterminal(Kind.ARGUMENTS)
      .is(f.argumentClause(
        b.token(JavaScriptPunctuator.LPARENTHESIS),
        b.optional(ARGUMENT_LIST()),
        b.token(JavaScriptPunctuator.RPARENTHESIS)));
  }

  public SeparatedList<Tree> ARGUMENT_LIST() {
    return b.<SeparatedList<Tree>>nonterminal()
      .is(f.argumentList(
        ARGUMENT(),
        b.zeroOrMore(f.newTuple17(
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
        f.simpleCallExpression(b.firstOf(MEMBER_EXPRESSION(), SUPER()), ARGUMENT_CLAUSE()),
        b.zeroOrMore(b.firstOf(
          ARGUMENT_CLAUSE(),
          BRACKET_EXPRESSION(),
          OBJECT_PROPERTY_ACCESS(),
          ES6(TAGGED_TEMPLATE())
        ))));
  }

  public ParenthesisedExpressionTreeImpl PARENTHESISED_EXPRESSION() {
    return b.<ParenthesisedExpressionTreeImpl>nonterminal(Kind.PARENTHESISED_EXPRESSION)
      .is(
        f.parenthesisedExpression(
          b.token(JavaScriptPunctuator.LPARENTHESIS),
          EXPRESSION(),
          b.token(JavaScriptPunctuator.RPARENTHESIS)));
  }

  public ClassTreeImpl CLASS_EXPRESSION() {
    return b.<ClassTreeImpl>nonterminal(Kind.CLASS_EXPRESSION)
      .is(
        f.classExpression(
          b.zeroOrMore(DECORATOR()),
          b.token(JavaScriptKeyword.CLASS),
          b.optional(BINDING_IDENTIFIER()),
          // TODO Factor the duplication with CLASS_DECLARATION() into CLASS_TRAIT() ?
          b.optional(f.newTuple28(b.token(JavaScriptKeyword.EXTENDS), LEFT_HAND_SIDE_EXPRESSION())),
          b.token(JavaScriptPunctuator.LCURLYBRACE),
          b.zeroOrMore(CLASS_ELEMENT()),
          b.token(JavaScriptPunctuator.RCURLYBRACE)));
  }

  public ComputedPropertyNameTreeImpl COMPUTED_PROPERTY_NAME() {
    return b.<ComputedPropertyNameTreeImpl>nonterminal(Kind.COMPUTED_PROPERTY_NAME)
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
    return b.<Tree>nonterminal(JavaScriptLegacyGrammar.PROPERTY_NAME)
      .is(b.firstOf(
        LITERAL_PROPERTY_NAME(),
        ES6(COMPUTED_PROPERTY_NAME())
      ));
  }

  public PairPropertyTreeImpl PAIR_PROPERTY() {
    return b.<PairPropertyTreeImpl>nonterminal(Kind.PAIR_PROPERTY)
      .is(f.pairProperty(
        PROPERTY_NAME(),
        b.token(JavaScriptPunctuator.COLON),
        ASSIGNMENT_EXPRESSION()
      ));
  }

  public Tree PROPERTY_DEFINITION() {
    return b.<Tree>nonterminal(JavaScriptLegacyGrammar.PROPERTY_DEFINITION)
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

  public ObjectLiteralTreeImpl OBJECT_LITERAL() {
    return b.<ObjectLiteralTreeImpl>nonterminal(Kind.OBJECT_LITERAL)
      .is(f.completeObjectLiteral(
        b.token(JavaScriptPunctuator.LCURLYBRACE),
        b.optional(f.newObjectLiteral(
          PROPERTY_DEFINITION(),
          b.zeroOrMore(f.newTuple18(b.token(JavaScriptPunctuator.COMMA), PROPERTY_DEFINITION())),
          b.optional(b.token(JavaScriptPunctuator.COMMA)))),
        b.token(JavaScriptPunctuator.RCURLYBRACE)
      ));
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
        f.noSubstitutionTemplate(b.token(JavaScriptLegacyGrammar.BACKTICK), b.optional(TEMPLATE_CHARACTERS()), b.token(JavaScriptLegacyGrammar.BACKTICK)),
        f.substitutionTemplate(
          b.token(JavaScriptLegacyGrammar.BACKTICK),
          b.optional(TEMPLATE_CHARACTERS()),

          b.zeroOrMore(f.newTuple55(
            TEMPLATE_EXPRESSION(),
            b.optional(TEMPLATE_CHARACTERS())
          )),

          b.token(JavaScriptLegacyGrammar.BACKTICK)
        )
      ));
  }

  public TemplateExpressionTree TEMPLATE_EXPRESSION() {
    return b.<TemplateExpressionTree>nonterminal(Kind.TEMPLATE_EXPRESSION)
      .is(
        f.templateExpression(
          b.token(JavaScriptLegacyGrammar.DOLLAR_SIGN),
          b.token(JavaScriptPunctuator.LCURLYBRACE),
          EXPRESSION(),
          b.token(JavaScriptPunctuator.RCURLYBRACE)));
  }

  public TemplateCharactersTree TEMPLATE_CHARACTERS() {
    return b.<TemplateCharactersTree>nonterminal()
      .is(f.templateCharacters(b.oneOrMore(b.token(JavaScriptLegacyGrammar.TEMPLATE_CHARACTER))));
  }

  public IdentifierTree THIS() {
    return b.<IdentifierTree>nonterminal(Kind.THIS)
      .is(f.thisExpression(b.token(JavaScriptKeyword.THIS)));

  }

  public ExpressionTree PRIMARY_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(JavaScriptLegacyGrammar.PRIMARY_EXPRESSION)
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
          JSX_ELEMENT()
        ));
  }

  public ExpressionTree ASSIGNMENT_EXPRESSION() {
    return b.<ExpressionTree>nonterminal(JavaScriptLegacyGrammar.ASSIGNMENT_EXPRESSION)
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
            b.firstOf(
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
              b.token(JavaScriptPunctuator.OR_EQU)),
            ASSIGNMENT_EXPRESSION()),
          YIELD_EXPRESSION(),
          ARROW_FUNCTION(),
          CONDITIONAL_EXPRESSION_NOT_ES6_ASSIGNMENT_EXPRESSION()
        ));
  }

  public ExpressionTree EXPRESSION() {
    return b.<ExpressionTree>nonterminal(JavaScriptLegacyGrammar.EXPRESSION)
      .is(f.expression(ASSIGNMENT_EXPRESSION(), b.zeroOrMore(f.newTuple26(b.token(JavaScriptPunctuator.COMMA), ASSIGNMENT_EXPRESSION()))));
  }

  public ExpressionTree EXPRESSION_NO_LINE_BREAK() {
    return b.<ExpressionTree>nonterminal(JavaScriptLegacyGrammar.EXPRESSION_NO_LB)
      .is(f.expressionNoLineBreak(b.token(JavaScriptLegacyGrammar.SPACING_NO_LINE_BREAK_NOT_FOLLOWED_BY_LINE_BREAK), EXPRESSION()));
  }

  /**
   * A.3 [END] Expressions
   */

  /**
   * A.5 Declarations
   */

  // [START] Module, import & export
  public FromClauseTreeImpl FROM_CLAUSE() {
    return b.<FromClauseTreeImpl>nonterminal(Kind.FROM_CLAUSE)
      .is(f.fromClause(b.token(JavaScriptLegacyGrammar.FROM), STRING_LITERAL()));
  }

  public DefaultExportDeclarationTreeImpl DEFAULT_EXPORT_DECLARATION() {
    return b.<DefaultExportDeclarationTreeImpl>nonterminal(Kind.DEFAULT_EXPORT_DECLARATION)
      .is(f.defaultExportDeclaration(
        b.token(JavaScriptKeyword.EXPORT),
        b.token(JavaScriptKeyword.DEFAULT),
        b.firstOf(
          FUNCTION_AND_GENERATOR_DECLARATION(),
          CLASS_DECLARATION(),
          f.newTuple56(
            f.defaultExportExpression(b.token(JavaScriptLegacyGrammar.NEXT_NOT_FUNCTION_AND_CLASS), ASSIGNMENT_EXPRESSION()), b.token(JavaScriptLegacyGrammar.EOS)))
      ));
  }

  public NamedExportDeclarationTreeImpl NAMED_EXPORT_DECLARATION() {
    return b.<NamedExportDeclarationTreeImpl>nonterminal(Kind.NAMED_EXPORT_DECLARATION)
      .is(
        f.namedExportDeclaration(
          b.token(JavaScriptKeyword.EXPORT),
          b.firstOf(
            EXPORT_CLAUSE(),
            EXPORT_DEFAULT_BINDING(),
            EXPORT_DEFAULT_BINDING_WITH_NAMESPACE_EXPORT(),
            EXPORT_DEFAULT_BINDING_WITH_EXPORT_LIST(),
            VARIABLE_STATEMENT(),
            CLASS_DECLARATION(),
            FUNCTION_AND_GENERATOR_DECLARATION())));
  }

  public ExportClauseTree EXPORT_CLAUSE() {
    return b.<ExportClauseTree>nonterminal(Kind.EXPORT_CLAUSE)
      .is(f.exportClause(
        EXPORT_LIST(),
        b.optional(FROM_CLAUSE()),
        b.token(JavaScriptLegacyGrammar.EOS)));
  }

  public ExportDefaultBindingWithExportList EXPORT_DEFAULT_BINDING_WITH_EXPORT_LIST() {
    return b.<ExportDefaultBindingWithExportList>nonterminal()
      .is(f.exportDefaultBindingWithExportList(
        IDENTIFIER_NAME(),
        b.token(JavaScriptPunctuator.COMMA),
        EXPORT_LIST(),
        FROM_CLAUSE(),
        b.token(JavaScriptLegacyGrammar.EOS)));
  }

  public ExportDefaultBindingWithNameSpaceExport EXPORT_DEFAULT_BINDING_WITH_NAMESPACE_EXPORT() {
    return b.<ExportDefaultBindingWithNameSpaceExport>nonterminal()
      .is(f.exportDefaultBindingWithNameSpaceExport(
        IDENTIFIER_NAME(),
        b.token(JavaScriptPunctuator.COMMA),
        b.token(JavaScriptPunctuator.STAR),
        b.token(JavaScriptLegacyGrammar.AS),
        IDENTIFIER_NAME(),
        FROM_CLAUSE(),
        b.token(JavaScriptLegacyGrammar.EOS)));
  }

  public ExportDefaultBinding EXPORT_DEFAULT_BINDING() {
    return b.<ExportDefaultBinding>nonterminal(Kind.EXPORT_DEFAULT_BINDING)
      .is(f.exportDefaultBinding(
        IDENTIFIER_NAME(),
        FROM_CLAUSE(),
        b.token(JavaScriptLegacyGrammar.EOS)));
  }

  public SpecifierListTreeImpl EXPORT_LIST() {
    return b.<SpecifierListTreeImpl>nonterminal(Kind.EXPORT_LIST)
      .is(f.exportList(
        b.token(JavaScriptPunctuator.LCURLYBRACE),
        b.optional(f.newExportSpecifierList(
          EXPORT_SPECIFIER(),
          b.zeroOrMore(f.newTuple50(b.token(JavaScriptPunctuator.COMMA), EXPORT_SPECIFIER())),
          b.optional(b.token(JavaScriptPunctuator.COMMA)))),
        b.token(JavaScriptPunctuator.RCURLYBRACE)
      ));
  }

  public SpecifierTreeImpl EXPORT_SPECIFIER() {
    return b.<SpecifierTreeImpl>nonterminal(Kind.EXPORT_SPECIFIER)
      .is(b.firstOf(
        f.exportSpecifier(IDENTIFIER_NAME(), b.token(JavaScriptLegacyGrammar.AS), IDENTIFIER_NAME()),
        f.exportSpecifier(IDENTIFIER_NAME())
      ));
  }

  public NameSpaceExportDeclarationTree NAMESPACE_EXPORT_DECLARATION() {
    return b.<NameSpaceExportDeclarationTree>nonterminal(Kind.NAMESPACE_EXPORT_DECLARATION)
      .is(f.namespaceExportDeclaration(
        b.token(JavaScriptKeyword.EXPORT),
        b.token(JavaScriptPunctuator.STAR),
        b.optional(f.newTuple5(b.token(JavaScriptLegacyGrammar.AS), IDENTIFIER_NAME())),
        FROM_CLAUSE(),
        b.token(JavaScriptLegacyGrammar.EOS)
      ));
  }

  public ExportDeclarationTree EXPORT_DECLARATION() {
    return b.<ExportDeclarationTree>nonterminal(JavaScriptLegacyGrammar.EXPORT_DECLARATION)
      .is(b.firstOf(
        NAMESPACE_EXPORT_DECLARATION(),
        DEFAULT_EXPORT_DECLARATION(),
        NAMED_EXPORT_DECLARATION()
      ));

  }

  public ImportModuleDeclarationTree IMPORT_MODULE_DECLARATION() {
    return b.<ImportModuleDeclarationTree>nonterminal()
      .is(f.importModuleDeclaration(
        b.token(JavaScriptKeyword.IMPORT), STRING_LITERAL(), b.token(JavaScriptLegacyGrammar.EOS))
      );
  }

  public SpecifierListTree IMPORT_LIST() {
    return b.<SpecifierListTree>nonterminal(Kind.IMPORT_LIST)
      .is(f.importList(
        b.token(JavaScriptPunctuator.LCURLYBRACE),
        b.optional(f.newImportSpecifierList(
          IMPORT_SPECIFIER(),
          b.zeroOrMore(f.newTuple51(b.token(JavaScriptPunctuator.COMMA), IMPORT_SPECIFIER())),
          b.optional(b.token(JavaScriptPunctuator.COMMA)))),
        b.token(JavaScriptPunctuator.RCURLYBRACE)
      ));
  }

  public SpecifierTreeImpl IMPORT_SPECIFIER() {
    return b.<SpecifierTreeImpl>nonterminal(Kind.IMPORT_SPECIFIER)
      .is(b.firstOf(
        f.newImportSpecifier(IDENTIFIER_NAME(), b.token(JavaScriptLegacyGrammar.AS), BINDING_IDENTIFIER()),
        f.importSpecifier(BINDING_IDENTIFIER())
      ));
  }

  public SpecifierTree NAMESPACE_IMPORT() {
    return b.<SpecifierTree>nonterminal(Kind.NAMESPACE_IMPORT_SPECIFIER)
      .is(f.nameSpaceImport(
        b.token(JavaScriptPunctuator.STAR),
        b.token(JavaScriptLegacyGrammar.AS),
        BINDING_IDENTIFIER()
      ));
  }

  public ImportClauseTreeImpl IMPORT_CLAUSE() {
    return b.<ImportClauseTreeImpl>nonterminal(Kind.IMPORT_CLAUSE)
      .is(f.importClause(
        b.firstOf(
          IMPORT_LIST(),
          NAMESPACE_IMPORT(),
          f.defaultImport(
            BINDING_IDENTIFIER(),
            b.optional(f.newTuple52(b.token(JavaScriptPunctuator.COMMA), b.firstOf(NAMESPACE_IMPORT(), IMPORT_LIST()))))
        )
      ));
  }

  public DeclarationTree IMPORT_DECLARATION() {
    return b.<DeclarationTree>nonterminal(JavaScriptLegacyGrammar.IMPORT_DECLARATION)
      .is(b.firstOf(
        f.importDeclaration(
          b.token(JavaScriptKeyword.IMPORT),
          IMPORT_CLAUSE(),
          FROM_CLAUSE(),
          b.token(JavaScriptLegacyGrammar.EOS)),
        IMPORT_MODULE_DECLARATION()
      ));
  }

  public ModuleTreeImpl MODULE_BODY() {
    return b.<ModuleTreeImpl>nonterminal(JavaScriptLegacyGrammar.MODULE_BODY)
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
    return b.<BindingElementTree>nonterminal(JavaScriptLegacyGrammar.BINDING_PATTERN)
      .is(b.firstOf(
          OBJECT_BINDING_PATTERN(),
          ARRAY_BINDING_PATTERN()));
  }

  public InitializedBindingElementTreeImpl INITIALISER() {
    return b.<InitializedBindingElementTreeImpl>nonterminal(JavaScriptLegacyGrammar.INITIALISER)
      .is(f.newInitializedBindingElement1(b.token(JavaScriptPunctuator.EQU), ASSIGNMENT_EXPRESSION()));
  }

  public ObjectBindingPatternTreeImpl OBJECT_BINDING_PATTERN() {
    return b.<ObjectBindingPatternTreeImpl>nonterminal(Kind.OBJECT_BINDING_PATTERN)
      .is(b.firstOf(
        f.objectBindingPattern(
          b.token(JavaScriptPunctuator.LCURLYBRACE),
          b.optional(BINDING_PROPERTY_LIST()),
          b.optional(f.newTuple32(b.token(JavaScriptPunctuator.COMMA), b.optional(REST_OBJECT_BINDING_ELEMENT()))),
          b.token(JavaScriptPunctuator.RCURLYBRACE)),
        f.objectBindingPattern2(
          b.token(JavaScriptPunctuator.LCURLYBRACE),
          REST_OBJECT_BINDING_ELEMENT(),
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
        b.zeroOrMore(f.newTuple53(b.token(JavaScriptPunctuator.COMMA), BINDING_PROPERTY()))));
  }

  public BindingElementTree BINDING_PROPERTY() {
    return b.<BindingElementTree>nonterminal()
      .is(b.firstOf(
          f.bindingProperty(PROPERTY_NAME(), b.token(JavaScriptPunctuator.COLON), BINDING_ELEMENT()),
          BINDING_ELEMENT()));
  }

  public BindingElementTree BINDING_ELEMENT() {
    return b.<BindingElementTree>nonterminal(JavaScriptLegacyGrammar.BINDING_ELEMENT)
      .is(
        f.completeBindingElement1(
          b.firstOf(
            BINDING_IDENTIFIER(),
            BINDING_PATTERN()),
          b.optional(INITIALISER())));
  }

  public ArrayBindingPatternTreeImpl ARRAY_BINDING_PATTERN() {
    return b.<ArrayBindingPatternTreeImpl>nonterminal(JavaScriptLegacyGrammar.ARRAY_BINDING_PATTERN)
      .is(f.arrayBindingPattern(
        b.token(JavaScriptPunctuator.LBRACKET),
        b.optional(BINDING_ELEMENT()),
        b.zeroOrMore(f.newTuple29(
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
          b.zeroOrMore(f.newTuple48(b.token(JavaScriptPunctuator.COMMA), ASSIGNMENT_PROPERTY())),
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
        b.zeroOrMore(f.newTuple49(
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
      .is(f.initializedAssignmentPatternElement1(LEFT_HAND_SIDE_EXPRESSION(), b.token(JavaScriptPunctuator.EQU), ASSIGNMENT_EXPRESSION()));
  }

  public InitializedAssignmentPatternElementTree INITIALIZED_OBJECT_ASSIGNMENT_PATTERN_ELEMENT() {
    return b.<InitializedAssignmentPatternElementTree>nonterminal()
      .is(f.initializedAssignmentPatternElement2(IDENTIFIER_REFERENCE(), b.token(JavaScriptPunctuator.EQU), ASSIGNMENT_EXPRESSION()));
  }

  public AssignmentPatternRestElementTree ASSIGNMENT_PATTERN_REST_ELEMENT() {
    return b.<AssignmentPatternRestElementTree>nonterminal()
      .is(f.assignmentPatternRestElement(b.token(JavaScriptPunctuator.ELLIPSIS), LEFT_HAND_SIDE_EXPRESSION()));
  }

  // [END] Destructuring pattern

  // [START] Classes, methods, functions & generators

  public ClassTreeImpl CLASS_DECLARATION() {
    return b.<ClassTreeImpl>nonterminal(Kind.CLASS_DECLARATION)
      .is(
        f.classDeclaration(
          b.zeroOrMore(DECORATOR()),
          b.token(JavaScriptKeyword.CLASS), BINDING_IDENTIFIER(),
          // TODO Factor the duplication with CLASS_EXPRESSION() into CLASS_TRAIT() ?
          b.optional(f.newTuple27(b.token(JavaScriptKeyword.EXTENDS), LEFT_HAND_SIDE_EXPRESSION())),
          b.token(JavaScriptPunctuator.LCURLYBRACE),
          b.zeroOrMore(CLASS_ELEMENT()),
          b.token(JavaScriptPunctuator.RCURLYBRACE)));
  }

  public Tree CLASS_ELEMENT() {
    return b.<Tree>nonterminal(JavaScriptLegacyGrammar.CLASS_ELEMENT)
      .is(
        b.firstOf(
          METHOD_DEFINITION(),
          CLASS_FIELD_INITIALIZER(),
          b.token(JavaScriptPunctuator.SEMI)));
  }

  public DecoratorTree DECORATOR() {
    return b.<DecoratorTree>nonterminal(Kind.DECORATOR)
      .is(f.decorator(
        b.token(JavaScriptPunctuator.AT),
        IDENTIFIER_REFERENCE(),
        b.zeroOrMore(f.newTuple59(b.token(JavaScriptPunctuator.DOT), IDENTIFIER_NAME())),
        b.optional(ARGUMENT_CLAUSE())));
  }

  public FieldDeclarationTree CLASS_FIELD_INITIALIZER() {
    return b.<FieldDeclarationTree>nonterminal()
      .is(f.fieldDeclaration(
        b.zeroOrMore(DECORATOR()),
        b.optional(b.token(JavaScriptLegacyGrammar.STATIC)),
        PROPERTY_NAME(),
        b.optional(f.newTuple58(b.token(JavaScriptPunctuator.EQU), ASSIGNMENT_EXPRESSION())),
        b.token(JavaScriptLegacyGrammar.EOS)));
  }

  public MethodDeclarationTree METHOD_DEFINITION() {
    return b.<MethodDeclarationTree>nonterminal(JavaScriptLegacyGrammar.METHOD_DEFINITION)
      .is(
        b.firstOf(
          f.generator(
            b.zeroOrMore(DECORATOR()),
            b.optional(b.token(JavaScriptLegacyGrammar.STATIC)),
            b.token(JavaScriptPunctuator.STAR),
            PROPERTY_NAME(), FORMAL_PARAMETER_CLAUSE(),
            BLOCK()),
          f.method(
            b.zeroOrMore(DECORATOR()),
            b.optional(b.token(JavaScriptLegacyGrammar.STATIC)),
            b.optional(b.token(JavaScriptLegacyGrammar.ASYNC)),
            PROPERTY_NAME(), FORMAL_PARAMETER_CLAUSE(),
            BLOCK()),
          f.accessor(
            b.zeroOrMore(DECORATOR()),
            b.optional(b.token(JavaScriptLegacyGrammar.STATIC)),
            b.firstOf(
              b.token(JavaScriptLegacyGrammar.GET),
              b.token(JavaScriptLegacyGrammar.SET)),
            PROPERTY_NAME(),
            FORMAL_PARAMETER_CLAUSE(),
            BLOCK())));
  }

  public FunctionDeclarationTree FUNCTION_AND_GENERATOR_DECLARATION() {
    return b.<FunctionDeclarationTree>nonterminal(JavaScriptLegacyGrammar.FUNCTION_DECLARATION)
      .is(
        f.functionAndGeneratorDeclaration(
          b.optional(b.token(JavaScriptLegacyGrammar.ASYNC)),
          b.token(JavaScriptKeyword.FUNCTION), b.optional(b.token(JavaScriptPunctuator.STAR)), BINDING_IDENTIFIER(), FORMAL_PARAMETER_CLAUSE(),
          BLOCK()));
  }

  // [END] Classes, methods, functions & generators

  /**
   * A.5 [END] Declaration
   */

  // [START] JSX

  public JsxElementTree JSX_ELEMENT() {
    return b.<JsxElementTree>nonterminal(JavaScriptLegacyGrammar.JSX_ELEMENT)
      .is(b.firstOf(
        JSX_SELF_CLOSING_ELEMENT(),
        f.jsxStandardElement(JSX_OPENING_ELEMENT(), b.zeroOrMore(JSX_CHILD()), JSX_CLOSING_ELEMENT())
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
        f.jsxHtmlTag(b.token(JavaScriptLegacyGrammar.JSX_HTML_TAG)),
        THIS(),
        IDENTIFIER_REFERENCE()
      ));
  }

  public ExpressionTree JSX_MEMBER_EXPRESSION() {
    return b.<ExpressionTree>nonterminal()
      .is(f.jsxMemberExpression(
        b.firstOf(THIS(), IDENTIFIER_REFERENCE()),
        b.oneOrMore(f.newTuple57(b.token(JavaScriptPunctuator.DOT), IDENTIFIER_REFERENCE()))));
  }

  public JsxIdentifierTree JSX_IDENTIFIER() {
    return b.<JsxIdentifierTree>nonterminal(Kind.JSX_IDENTIFIER)
      .is(f.jsxIdentifier(b.token(JavaScriptLegacyGrammar.JSX_IDENTIFIER)));
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
        f.jsxTextTree(b.token(JavaScriptLegacyGrammar.JSX_TEXT)),
        JSX_ELEMENT(),
        f.jsxJavaScriptExpression(
          b.token(JavaScriptPunctuator.LCURLYBRACE),
          b.optional(ASSIGNMENT_EXPRESSION()),
          b.token(JavaScriptPunctuator.RCURLYBRACE))));
  }

  // [END] JSX


  public ScriptTreeImpl SCRIPT() {
    return b.<ScriptTreeImpl>nonterminal(JavaScriptLegacyGrammar.SCRIPT)
      .is(
        f.script(
          b.optional(b.token(JavaScriptLegacyGrammar.SHEBANG)),
          b.optional(MODULE_BODY()),
          b.token(JavaScriptLegacyGrammar.SPACING_NOT_SKIPPED),
          b.token(JavaScriptLegacyGrammar.EOF)));
  }

  private static <T> T ES6(T object) {
    return object;
  }

}
