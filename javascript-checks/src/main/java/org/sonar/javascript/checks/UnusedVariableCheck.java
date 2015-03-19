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
import java.util.Map;

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.model.implementations.declaration.ParameterListTreeImpl;
import org.sonar.javascript.model.implementations.statement.VariableDeclarationTreeImpl;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.expression.ArrowFunctionTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.grammar.GrammarRuleKey;
import org.sonar.sslr.parser.LexerlessGrammar;

import com.google.common.collect.Maps;
import com.sonar.sslr.api.AstNode;

@Rule(
  key = "UnusedVariable",
  name = "Unused local variables should be removed",
  priority = Priority.MAJOR,
  tags = {Tags.UNUSED})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.UNDERSTANDABILITY)
@SqaleConstantRemediation("20min")
public class UnusedVariableCheck extends SquidCheck<LexerlessGrammar> {

  private static class Variable {
    final AstNode declaration;
    int usages;

    public Variable(AstNode declaration, int usages) {
      this.declaration = declaration;
      this.usages = usages;
    }
  }

  private static class Scope {
    private final Scope outerScope;
    private final Map<String, Variable> variables;

    public Scope(Scope outerScope) {
      this.outerScope = outerScope;
      this.variables = Maps.newHashMap();
    }

    private void declare(IdentifierTree identifierTree, int usages) {
      String identifier = identifierTree.name();
      if (!variables.containsKey(identifier)) {
        variables.put(identifier, new Variable((AstNode) identifierTree, usages));
      }
    }

    private void use(AstNode astNode) {
      String identifier = astNode.getTokenValue();
      Scope scope = this;
      while (scope != null) {
        Variable var = scope.variables.get(identifier);
        if (var != null) {
          var.usages++;
          return;
        }
        scope = scope.outerScope;
      }
      variables.put(identifier, new Variable(astNode, 1));
    }
  }
  private static final GrammarRuleKey[] FUNCTION_NODES = {
    Kind.FUNCTION_EXPRESSION,
    Kind.FUNCTION_DECLARATION,
    Kind.METHOD,
    Kind.GENERATOR_METHOD,
    Kind.GENERATOR_DECLARATION,
    Kind.GENERATOR_FUNCTION_EXPRESSION,
    Kind.ARROW_FUNCTION
  };

  private static final GrammarRuleKey[] CONST_AND_VAR_NODES = {
    Kind.VAR_DECLARATION,
    Kind.LET_DECLARATION,
    Kind.CONST_DECLARATION
  };

  private Scope currentScope;

  @Override
  public void init() {
    subscribeTo(
      Kind.IDENTIFIER_REFERENCE,
      Kind.FORMAL_PARAMETER_LIST,
      Kind.ARROW_FUNCTION);
    subscribeTo(CONST_AND_VAR_NODES);
    subscribeTo(FUNCTION_NODES);
  }

  @Override
  public void visitFile(AstNode astNode) {
    currentScope = null;
  }

  @Override
  public void visitNode(AstNode astNode) {
    if (astNode.is(FUNCTION_NODES)) {
      // enter new scope
      currentScope = new Scope(currentScope);

    } else if (currentScope != null) {

      // declare all parameters as variables, which are already used, so that they won't trigger violations
      if (astNode.is(Kind.ARROW_FUNCTION)) {
        addArrowParametersToScope((ArrowFunctionTree) astNode);

      } else if (astNode.is(Kind.FORMAL_PARAMETER_LIST)) {
        declareInCurrentScope(((ParameterListTreeImpl) astNode).parameterIdentifiers(), 1);

      } else if (astNode.is(CONST_AND_VAR_NODES)) {
        declareInCurrentScope(((VariableDeclarationTreeImpl) astNode).variableIdentifiers(), 0);

      } else if (astNode.is(Kind.IDENTIFIER_REFERENCE)) {
        currentScope.use(astNode);
      }
    }
  }

  @Override
  public void leaveNode(AstNode astNode) {
    if (astNode.is(FUNCTION_NODES)) {
      // leave scope
      for (Map.Entry<String, Variable> entry : currentScope.variables.entrySet()) {
        if (entry.getValue().usages == 0) {
          getContext().createLineViolation(this, "Remove the declaration of the unused '" + entry.getKey() + "' variable.", entry.getValue().declaration);
        }
      }
      currentScope = currentScope.outerScope;
    }
  }

  @Override
  public void leaveFile(AstNode astNode) {
    currentScope = null;
  }

  private void declareInCurrentScope(List<IdentifierTree> identifiers, int usage) {
    for (IdentifierTree identifier : identifiers) {
      currentScope.declare(identifier, usage);
    }
  }

  private void addArrowParametersToScope(ArrowFunctionTree arrowFunction) {
    if (arrowFunction.parameters().is(Kind.FORMAL_PARAMETER_LIST)) {
      for (IdentifierTree identifier : ((ParameterListTreeImpl) arrowFunction.parameters()).parameterIdentifiers()) {
        currentScope.declare(identifier, 1);
      }
    } else {
      currentScope.declare((IdentifierTree) arrowFunction.parameters(), 1);
    }
  }

}
