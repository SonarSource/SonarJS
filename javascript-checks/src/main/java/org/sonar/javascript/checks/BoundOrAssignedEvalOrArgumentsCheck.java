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

import java.util.List;

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.api.EcmaScriptTokenType;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.model.implementations.declaration.ParameterListTreeImpl;
import org.sonar.javascript.model.implementations.statement.CatchBlockTreeImpl;
import org.sonar.javascript.model.implementations.statement.VariableDeclarationTreeImpl;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.grammar.GrammarRuleKey;
import org.sonar.sslr.parser.LexerlessGrammar;

import com.sonar.sslr.api.AstNode;

@Rule(
  key = "BoundOrAssignedEvalOrArguments",
  name = "\"eval\" and \"arguments\" should not be bound or assigned",
  priority = Priority.CRITICAL,
  tags = {Tags.BUG})
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.CRITICAL)
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.UNDERSTANDABILITY)
@SqaleConstantRemediation("10min")
public class BoundOrAssignedEvalOrArgumentsCheck extends SquidCheck<LexerlessGrammar> {

  private static final GrammarRuleKey[] FUNCTION_NODES = {
    Kind.FUNCTION_EXPRESSION,
    Kind.FUNCTION_DECLARATION,
    Kind.GENERATOR_DECLARATION,
    Kind.GENERATOR_FUNCTION_EXPRESSION};

  private static final GrammarRuleKey[] CONST_AND_VAR_NODES = {
    Kind.VAR_DECLARATION,
    Kind.LET_DECLARATION,
    Kind.CONST_DECLARATION
  };

  @Override

  public void init() {
    subscribeTo(
      Kind.CATCH_BLOCK,
      Kind.FORMAL_PARAMETER_LIST,
      Kind.PREFIX_INCREMENT,
      Kind.PREFIX_DECREMENT,
      Kind.POSTFIX_INCREMENT,
      Kind.POSTFIX_DECREMENT);
    subscribeTo(CheckUtils.assignmentExpressionArray());
    subscribeTo(FUNCTION_NODES);
    subscribeTo(CONST_AND_VAR_NODES);
  }

  @Override
  public void visitNode(AstNode astNode) {
    if (astNode.is(FUNCTION_NODES)) {
      checkFunction(astNode);

    } else if (astNode.is(Kind.CATCH_BLOCK) || astNode.is(CONST_AND_VAR_NODES)) {
      checkVariableDeclaration(astNode);

    } else if (astNode.is(Kind.FORMAL_PARAMETER_LIST)) {
      checkFormalParamList(astNode);

    } else if (CheckUtils.isAssignmentExpression(astNode)) {
      checkModification(astNode.getFirstChild());

    } else if (astNode.is(Kind.PREFIX_INCREMENT, Kind.PREFIX_DECREMENT)) {
      checkModification(astNode.getLastChild());

    } else if (astNode.is(Kind.POSTFIX_INCREMENT, Kind.POSTFIX_DECREMENT)) {
      checkModification(astNode.getFirstChild());
    }
  }

  private void checkFunction(AstNode functionNode) {
    AstNode identifier = functionNode.getFirstChild(EcmaScriptTokenType.IDENTIFIER, Kind.BINDING_IDENTIFIER);
    if (identifier != null && isEvalOrArguments(identifier.getTokenValue())) {
      getContext().createLineViolation(this, createMessageFor("function", identifier.getTokenValue()), identifier);
    }
  }

  private void checkFormalParamList(AstNode formalParameterList) {
    for (IdentifierTree identifier : ((ParameterListTreeImpl) formalParameterList).parameterIdentifiers()) {
      String identifierName = identifier.name();

      if (isEvalOrArguments(identifierName)) {
        getContext().createLineViolation(this, createMessageFor("parameter", identifierName), (AstNode) identifier);
      }
    }
  }

  private void checkVariableDeclaration(AstNode astNode) {
    List<IdentifierTree> identifiers = astNode.is(Kind.CATCH_BLOCK) ?
      ((CatchBlockTreeImpl) astNode).parameterIdentifiers() : ((VariableDeclarationTreeImpl) astNode).variableIdentifiers();

    for (IdentifierTree identifier : identifiers) {
      String identifierName = identifier.name();

      if (isEvalOrArguments(identifierName)) {
        getContext().createLineViolation(this, createMessageFor("variable", identifierName), (AstNode) identifier);
      }
    }
  }

  private void checkModification(AstNode astNode) {
    if (astNode.isNot(Kind.BRACKET_MEMBER_EXPRESSION) && isEvalOrArguments(astNode.getTokenValue())) {
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
