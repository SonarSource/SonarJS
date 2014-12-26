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
package org.sonar.javascript.checks;

import com.sonar.sslr.api.AstNode;
import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.api.EcmaScriptTokenType;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.checks.utils.IdentifierUtils;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.grammar.GrammarRuleKey;
import org.sonar.sslr.parser.LexerlessGrammar;

import java.util.List;

@Rule(
  key = "BoundOrAssignedEvalOrArguments",
  priority = Priority.CRITICAL)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.CRITICAL)
public class BoundOrAssignedEvalOrArgumentsCheck extends SquidCheck<LexerlessGrammar> {

  private static final GrammarRuleKey[] FUNCTION_NODES = {
    Kind.FUNCTION_EXPRESSION,
    EcmaScriptGrammar.FUNCTION_DECLARATION,
    EcmaScriptGrammar.GENERATOR_DECLARATION,
    Kind.GENERATOR_FUNCTION_EXPRESSION};

  private static final GrammarRuleKey[] CONST_AND_VAR_NODES = {
    Kind.VARIABLE_DECLARATION,
    EcmaScriptGrammar.VARIABLE_DECLARATION_NO_IN,
    EcmaScriptGrammar.LEXICAL_BINDING,
    EcmaScriptGrammar.LEXICAL_BINDING_NO_IN};

  @Override
  public void init() {
    subscribeTo(
      Kind.CATCH_BLOCK,
      EcmaScriptGrammar.PROPERTY_SET_PARAMETER_LIST,
      EcmaScriptGrammar.ASSIGNMENT_EXPRESSION);
    subscribeTo(CheckUtils.postfixExpressionArray());
    subscribeTo(CheckUtils.prefixExpressionArray());
    subscribeTo(FUNCTION_NODES);
    subscribeTo(CONST_AND_VAR_NODES);
  }

  @Override
  public void visitNode(AstNode astNode) {
    if (astNode.is(FUNCTION_NODES)) {
      checkFunction(astNode);
    } else if (astNode.is(Kind.CATCH_BLOCK) || astNode.is(CONST_AND_VAR_NODES)) {
      checkVariableDeclaration(astNode);
    } else if (astNode.is(EcmaScriptGrammar.PROPERTY_SET_PARAMETER_LIST)) {
      checkPropertySetParameterList(astNode);
    } else if (astNode.is(EcmaScriptGrammar.ASSIGNMENT_EXPRESSION)) {
      checkModification(astNode.getFirstDescendant(EcmaScriptGrammar.MEMBER_EXPRESSION));
    } else if (CheckUtils.isPostfixExpression(astNode) || CheckUtils.isPrefixExpression(astNode)
      && astNode.hasDirectChildren(EcmaScriptPunctuator.INC, EcmaScriptPunctuator.DEC)) {
      checkModification(astNode.getFirstDescendant(EcmaScriptGrammar.MEMBER_EXPRESSION));
    }
  }

  private void checkFunction(AstNode functionNode) {
    AstNode identifier = functionNode.getFirstChild(EcmaScriptTokenType.IDENTIFIER, Kind.IDENTIFIER);
    if (identifier != null && isEvalOrArguments(identifier.getTokenValue())) {
      getContext().createLineViolation(this, createMessageFor("function", identifier.getTokenValue()), identifier);
    }
    AstNode formalParameterList = functionNode.getFirstChild(Kind.FORMAL_PARAMETER_LIST);

    if (formalParameterList != null) {
      checkFormalParamList(formalParameterList);
    }
  }

  private void checkFormalParamList(AstNode formalParameterList) {
    for (AstNode identifier : IdentifierUtils.getParametersIdentifier(formalParameterList)) {
      String identifierName = identifier.getTokenValue();

      if (isEvalOrArguments(identifierName)) {
        getContext().createLineViolation(this, createMessageFor("parameter", identifierName), identifier);
      }
    }
  }

  private void checkVariableDeclaration(AstNode astNode) {
    List<AstNode> identifiers = astNode.is(Kind.CATCH_BLOCK) ?
      IdentifierUtils.getCatchIdentifiers(astNode) : IdentifierUtils.getVariableIdentifiers(astNode);

    for (AstNode identifier : identifiers) {
      String identifierName = identifier.getTokenValue();

      if (isEvalOrArguments(identifierName)) {
        getContext().createLineViolation(this, createMessageFor("variable", identifierName), identifier);
      }
    }
  }

  private void checkPropertySetParameterList(AstNode propertySetParameterList) {
    for (AstNode identifier : IdentifierUtils.getParametersIdentifier(propertySetParameterList)) {
      String identifierName = identifier.getTokenValue();

      if (isEvalOrArguments(identifierName)) {
        getContext().createLineViolation(this, createMessageFor("parameter", identifierName), identifier);
      }
    }
  }

  private void checkModification(AstNode astNode) {
    if (isEvalOrArguments(astNode.getTokenValue()) && !astNode.hasDirectChildren(EcmaScriptGrammar.BRACKET_EXPRESSION)
      && !astNode.getParent().is(EcmaScriptGrammar.SIMPLE_CALL_EXPRESSION)) {
      getContext().createLineViolation(this, "Remove the modification of \"" + astNode.getTokenValue() + "\".", astNode);
    }
  }

  private static String createMessageFor(String name, String value) {
    return "Do not use \"" + value + "\" to declare a " + name + " - use another name.";
  }

  private boolean isEvalOrArguments(String name) {
    return "eval".equals(name) || "arguments".equals(name);
  }

}
