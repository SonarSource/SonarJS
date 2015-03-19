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

import java.util.HashSet;
import java.util.Set;
import java.util.Stack;

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.model.implementations.declaration.ParameterListTreeImpl;
import org.sonar.javascript.model.implementations.statement.VariableDeclarationTreeImpl;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.expression.ArrowFunctionTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.parser.LexerlessGrammar;

import com.sonar.sslr.api.AstNode;

@Rule(
  key = "RedeclaredVariable",
  name = "Variables should not be redeclared",
  priority = Priority.MAJOR,
  tags = {Tags.BUG})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.LOGIC_RELIABILITY)
@SqaleConstantRemediation("10min")
public class RedeclaredVariableCheck extends SquidCheck<LexerlessGrammar> {

  private Stack<Set<String>> stack;

  @Override
  public void init() {
    subscribeTo(
      Kind.VAR_DECLARATION,
      Kind.LET_DECLARATION,
      Kind.CONST_DECLARATION);
    subscribeTo(CheckUtils.functionNodesArray());
  }

  @Override
  public void visitFile(AstNode astNode) {
    stack = new Stack<Set<String>>();
    stack.add(new HashSet<String>());
  }

  @Override
  public void visitNode(AstNode astNode) {
    if (CheckUtils.isFunction(astNode)) {
      Set<String> currentScope = new HashSet<String>();
      stack.add(currentScope);
      addParametersToScope(astNode, currentScope);
    } else {
      Set<String> currentScope = stack.peek();

      for (IdentifierTree identifier : ((VariableDeclarationTreeImpl) astNode).variableIdentifiers()) {
        String variableName = identifier.name();

        if (currentScope.contains(variableName)) {
          getContext().createLineViolation(this, "Rename variable \"" + variableName + "\" as this name is already used.", (AstNode) identifier);
        } else {
          currentScope.add(variableName);
        }
      }
    }
  }

  @Override
  public void leaveNode(AstNode astNode) {
    if (CheckUtils.isFunction(astNode)) {
      stack.pop();
    }
  }

  @Override
  public void leaveFile(AstNode astNode) {
    stack = null;
  }

  private void addParametersToScope(AstNode functionNode, Set<String> currentScope) {
    if (functionNode.is(Kind.ARROW_FUNCTION)) {
      addArrowParametersToScope(((ArrowFunctionTree) functionNode).parameters(), currentScope);
    } else {
      addFormalParametersToScope((ParameterListTreeImpl) functionNode.getFirstChild(Kind.FORMAL_PARAMETER_LIST), currentScope);
    }
  }

  private void addArrowParametersToScope(Tree parameters, Set<String> currentScope) {
    if (parameters.is(Kind.FORMAL_PARAMETER_LIST)) {
      for (IdentifierTree identifier : ((ParameterListTreeImpl) parameters).parameterIdentifiers()) {
        currentScope.add(identifier.name());
      }
    }
  }

  private void addFormalParametersToScope(ParameterListTreeImpl formalParameterList, Set<String> currentScope) {
    for (IdentifierTree identifier : formalParameterList.parameterIdentifiers()) {
      currentScope.add(identifier.name());
    }
  }
}
