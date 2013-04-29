/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis and SonarSource
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
package org.sonar.javascript.checks;

import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.squid.checks.SquidCheck;
import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.api.EcmaScriptTokenType;
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.sslr.parser.LexerlessGrammar;

@Rule(
  key = "BoundOrAssignedEvalOrArguments",
  priority = Priority.CRITICAL)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.CRITICAL)
public class BoundOrAssignedEvalOrArgumentsCheck extends SquidCheck<LexerlessGrammar> {

  @Override
  public void init() {
    subscribeTo(
        EcmaScriptGrammar.FUNCTION_DECLARATION,
        EcmaScriptGrammar.FUNCTION_EXPRESSION,
        EcmaScriptGrammar.CATCH_,
        EcmaScriptGrammar.VARIABLE_DECLARATION,
        EcmaScriptGrammar.VARIABLE_DECLARATION_NO_IN,
        EcmaScriptGrammar.PROPERTY_SET_PARAMETER_LIST,
        EcmaScriptGrammar.MEMBER_EXPRESSION);
  }

  @Override
  public void visitNode(AstNode astNode) {
    if (astNode.is(EcmaScriptGrammar.FUNCTION_DECLARATION, EcmaScriptGrammar.FUNCTION_EXPRESSION)) {
      checkFunction(astNode);
    } else if (astNode.is(EcmaScriptGrammar.CATCH_, EcmaScriptGrammar.VARIABLE_DECLARATION, EcmaScriptGrammar.VARIABLE_DECLARATION_NO_IN)) {
      checkVariableDeclaration(astNode);
    } else if (astNode.is(EcmaScriptGrammar.PROPERTY_SET_PARAMETER_LIST)) {
      checkPropertySetParameterList(astNode);
    } else if (astNode.is(EcmaScriptGrammar.MEMBER_EXPRESSION)) {
      checkModification(astNode);
    }
  }

  private void checkFunction(AstNode astNode) {
    AstNode identifier = astNode.getFirstChild(EcmaScriptTokenType.IDENTIFIER);
    if (identifier != null && isEvalOrArguments(identifier.getTokenValue())) {
      getContext().createLineViolation(this, createMessageFor("function", identifier.getTokenValue()), identifier);
    }
    AstNode formalParameterList = astNode.getFirstChild(EcmaScriptGrammar.FORMAL_PARAMETER_LIST);
    if (formalParameterList != null) {
      for (int i = 0; i < formalParameterList.getNumberOfChildren(); i += 2) {
        identifier = formalParameterList.getChild(i);
        if (isEvalOrArguments(identifier.getTokenValue())) {
          getContext().createLineViolation(this, createMessageFor("parameter", identifier.getTokenValue()), identifier);
        }
      }
    }
  }

  private void checkVariableDeclaration(AstNode astNode) {
    AstNode identifier = astNode.getFirstChild(EcmaScriptTokenType.IDENTIFIER);
    if (isEvalOrArguments(identifier.getTokenValue())) {
      getContext().createLineViolation(this, createMessageFor("variable", identifier.getTokenValue()), identifier);
    }
  }

  private void checkPropertySetParameterList(AstNode astNode) {
    AstNode identifier = astNode.getFirstChild(EcmaScriptTokenType.IDENTIFIER);
    if (isEvalOrArguments(identifier.getTokenValue())) {
      getContext().createLineViolation(this, createMessageFor("parameter", identifier.getTokenValue()), identifier);
    }
  }

  private void checkModification(AstNode astNode) {
    if (isEvalOrArguments(astNode.getTokenValue()) && !astNode.hasDirectChildren(EcmaScriptPunctuator.LBRACKET)
      && !astNode.getParent().is(EcmaScriptGrammar.CALL_EXPRESSION)
      && !astNode.hasAncestor(EcmaScriptGrammar.EQUALITY_EXPRESSION)) {
      getContext().createLineViolation(this, "Remove the modification of '" + astNode.getTokenValue() + "'.", astNode);
    }
  }

  private static String createMessageFor(String name, String value) {
    return "Do not use '" + value + "' to declare a " + name + " - use another name.";
  }

  private boolean isEvalOrArguments(String name) {
    return "eval".equals(name) || "arguments".equals(name);
  }

}
