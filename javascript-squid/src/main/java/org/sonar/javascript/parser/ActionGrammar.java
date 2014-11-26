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
import org.sonar.javascript.model.implementations.statement.ContinueStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.DebuggerStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.EmptyStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.LabelledStatementTreeImpl;
import org.sonar.javascript.model.implementations.statement.VariableStatementTreeImpl;
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
      .is(f.variableStatement(b.invokeRule(EcmaScriptKeyword.VAR), b.invokeRule(EcmaScriptGrammar.VARIABLE_DECLARATION_LIST), b.invokeRule(EcmaScriptGrammar.EOS)));
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

}
