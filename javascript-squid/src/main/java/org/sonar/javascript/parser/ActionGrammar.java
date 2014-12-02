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
package org.sonar.javascript.parser;

import org.sonar.javascript.api.EcmaScriptKeyword;
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.api.EcmaScriptTokenType;
import org.sonar.javascript.ast.parser.TreeFactory;
import org.sonar.javascript.model.implementations.statement.BlockTreeImpl;
import org.sonar.javascript.model.implementations.statement.BreakStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.CatchBlockTreeImpl;
import org.sonar.javascript.model.implementations.statement.ContinueStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.DebuggerStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.EmptyStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.LabelledStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.ReturnStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.ThrowStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.TryStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.VariableDeclarationTreeImpl;
import org.sonar.javascript.model.implementations.statement.VariableStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.WithStatementTreeImpl;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.statement.DebuggerStatementTree;
import org.sonar.javascript.parser.sslr.GrammarBuilder;

public class ActionGrammar {

  private final GrammarBuilder b;
  private final TreeFactory f;

  public ActionGrammar(GrammarBuilder b, TreeFactory f) {
    this.b = b;
    this.f = f;
  }

  /**
   * A.4 Statement
   */

  public EmptyStatementTreeImpl EMPTY_STATEMENT() {
    return b.<EmptyStatementTreeImpl>nonterminal(Kind.EMPTY_STATEMENT)
      .is(f.emptyStatement(b.invokeRule(EcmaScriptPunctuator.SEMI)));
  }

  public DebuggerStatementTree DEBUGGER_STATEMENT() {
    return b.<DebuggerStatementTreeImpl>nonterminal(Kind.DEBUGGER_STATEMENT)
      .is(f.debuggerStatement(b.invokeRule(EcmaScriptKeyword.DEBUGGER), b.invokeRule(EcmaScriptGrammar.EOS)));
  }

  public VariableStatementTreeImpl VARIABLE_STATEMENT() {
    return b.<VariableStatementTreeImpl>nonterminal(Kind.VARIABLE_STATEMENT)
      .is(f.completeVariableStatement(b.invokeRule(EcmaScriptKeyword.VAR), VARIABLE_DECLARATION_LIST(), b.invokeRule(EcmaScriptGrammar.EOS)));
  }

  public VariableStatementTreeImpl VARIABLE_DECLARATION_LIST() {
    return b.<VariableStatementTreeImpl>nonterminal(EcmaScriptGrammar.VARIABLE_DECLARATION_LIST)
      .is(f.newVariableStatement(VARIABLE_DECLARATION(), b.zeroOrMore(f.newTuple1(b.invokeRule(EcmaScriptPunctuator.COMMA), VARIABLE_DECLARATION()))));
  }

  public VariableDeclarationTreeImpl VARIABLE_DECLARATION() {
    return b.<VariableDeclarationTreeImpl>nonterminal(Kind.VARIABLE_DECLARATION)
      .is(f.variableDeclaration(b.firstOf(b.invokeRule(EcmaScriptGrammar.BINDING_IDENTIFIER_INITIALISER), b.invokeRule(EcmaScriptGrammar.BINDING_PATTERN_INITIALISER))));
  }

  public LabelledStatementTreeImpl LABELLED_STATEMENT() {
    return b.<LabelledStatementTreeImpl>nonterminal(Kind.LABELLED_STATEMENT)
      .is(f.labelledStatement(b.invokeRule(EcmaScriptTokenType.IDENTIFIER), b.invokeRule(EcmaScriptPunctuator.COLON), b.invokeRule(EcmaScriptGrammar.STATEMENT)));
  }

  public ContinueStatementTreeImpl CONTINUE_STATEMENT() {
    return b.<ContinueStatementTreeImpl>nonterminal(Kind.CONTINUE_STATEMENT)
      .is(f.completeContinueStatement(
        b.invokeRule(EcmaScriptKeyword.CONTINUE),
        b.firstOf(
          CONTINUE_WITH_LABEL(),
          CONTINUE_WITHOUT_LABEL())));
  }

  public ContinueStatementTreeImpl CONTINUE_WITH_LABEL() {
    return b.<ContinueStatementTreeImpl>nonterminal()
      .is(f.newContinueWithLabel(
        b.invokeRule(EcmaScriptGrammar.IDENTIFIER_NO_LB),
        b.invokeRule(EcmaScriptGrammar.EOS)));
  }

  public ContinueStatementTreeImpl CONTINUE_WITHOUT_LABEL() {
    return b.<ContinueStatementTreeImpl>nonterminal()
      .is(f.newContinueWithoutLabel(b.invokeRule(EcmaScriptGrammar.EOS_NO_LB)));
  }

  public BreakStatementTreeImpl BREAK_STATEMENT() {
    return b.<BreakStatementTreeImpl>nonterminal(Kind.BREAK_STATEMENT)
      .is(f.completeBreakStatement(
        b.invokeRule(EcmaScriptKeyword.BREAK),
        b.firstOf(
          BREAK_WITH_LABEL(),
          BREAK_WITHOUT_LABEL())));
  }

  public BreakStatementTreeImpl BREAK_WITH_LABEL() {
    return b.<BreakStatementTreeImpl>nonterminal()
      .is(f.newBreakWithLabel(
        b.invokeRule(EcmaScriptGrammar.IDENTIFIER_NO_LB),
        b.invokeRule(EcmaScriptGrammar.EOS)));
  }

  public BreakStatementTreeImpl BREAK_WITHOUT_LABEL() {
    return b.<BreakStatementTreeImpl>nonterminal()
      .is(f.newBreakWithoutLabel(b.invokeRule(EcmaScriptGrammar.EOS_NO_LB)));
  }

  public ReturnStatementTreeImpl RETURN_STATEMENT() {
    return b.<ReturnStatementTreeImpl>nonterminal(Kind.RETURN_STATEMENT)
      .is(f.completeReturnStatement(
        b.invokeRule(EcmaScriptKeyword.RETURN),
        b.firstOf(
          RETURN_WITH_EXPRESSION(),
          RETURN_WITHOUT_EXPRESSION())));
  }

  public ReturnStatementTreeImpl RETURN_WITH_EXPRESSION() {
    return b.<ReturnStatementTreeImpl>nonterminal()
      .is(f.newReturnWithExpression(
        b.invokeRule(EcmaScriptGrammar.EXPRESSION_NO_LB),
        b.invokeRule(EcmaScriptGrammar.EOS)));
  }

  public ReturnStatementTreeImpl RETURN_WITHOUT_EXPRESSION() {
    return b.<ReturnStatementTreeImpl>nonterminal()
      .is(f.newReturnWithoutExpression(b.invokeRule(EcmaScriptGrammar.EOS_NO_LB)));
  }

  public ThrowStatementTreeImpl THROW_STATEMENT() {
    return b.<ThrowStatementTreeImpl>nonterminal(Kind.THROW_STATEMENT)
      .is(f.newThrowStatement(
        b.invokeRule(EcmaScriptKeyword.THROW),
        b.invokeRule(EcmaScriptGrammar.EXPRESSION_NO_LB),
        b.invokeRule(EcmaScriptGrammar.EOS)));
  }

  public WithStatementTreeImpl WITH_STATEMENT() {
    return b.<WithStatementTreeImpl>nonterminal(Kind.WITH_STATEMENT)
      .is(f.newWithStatement(
        b.invokeRule(EcmaScriptKeyword.WITH),
        b.invokeRule(EcmaScriptPunctuator.LPARENTHESIS),
        b.invokeRule(EcmaScriptGrammar.EXPRESSION),
        b.invokeRule(EcmaScriptPunctuator.RPARENTHESIS),
        b.invokeRule(EcmaScriptGrammar.STATEMENT)));
  }

  public BlockTreeImpl BLOCK() {
    return b.<BlockTreeImpl>nonterminal(Kind.BLOCK)
      .is(f.newBlock(b.invokeRule(EcmaScriptPunctuator.LCURLYBRACE), b.optional(b.invokeRule(EcmaScriptGrammar.STATEMENT_LIST)), b.invokeRule(EcmaScriptPunctuator.RCURLYBRACE)));
  }

  public TryStatementTreeImpl TRY_STATEMENT() {
    return b.<TryStatementTreeImpl>nonterminal(Kind.TRY_STATEMENT)
      .is(f.completeTryStatement(
          b.invokeRule(EcmaScriptKeyword.TRY),
          BLOCK(),
          b.firstOf(
            f.newTryStatementWithCatch(CATCH_CLAUSE(), b.optional(FINALLY_CLAUSE())),
            FINALLY_CLAUSE())));
  }

  public TryStatementTreeImpl FINALLY_CLAUSE() {
    return b.<TryStatementTreeImpl>nonterminal(EcmaScriptGrammar.FINALLY)
      .is(f.newTryStatementWithFinally(b.invokeRule(EcmaScriptKeyword.FINALLY), BLOCK()));
  }

  public CatchBlockTreeImpl CATCH_CLAUSE() {
    return b.<CatchBlockTreeImpl>nonterminal(Kind.CATCH_BLOCK)
      .is(f.newCatchBlock(
        b.invokeRule(EcmaScriptKeyword.CATCH),
        b.invokeRule(EcmaScriptPunctuator.LPARENTHESIS),
        b.invokeRule(EcmaScriptGrammar.CATCH_PARAMETER),
        b.invokeRule(EcmaScriptPunctuator.RPARENTHESIS),
        BLOCK()));
  }

  /**
   * A.4 [END] Statement
   */

}
