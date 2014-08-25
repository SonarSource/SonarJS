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

import com.google.common.collect.Maps;
import com.sonar.sslr.api.AstNode;
import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.api.EcmaScriptTokenType;
import org.sonar.javascript.checks.utils.FunctionUtils;
import org.sonar.javascript.checks.utils.IdentifierUtils;
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.grammar.GrammarRuleKey;
import org.sonar.sslr.parser.LexerlessGrammar;

import java.util.List;
import java.util.Map;

@Rule(
  key = "UnusedVariable",
  priority = Priority.MAJOR)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
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

    private void declare(AstNode astNode, int usages) {
      String identifier = astNode.getTokenValue();
      if (!variables.containsKey(identifier)) {
        variables.put(identifier, new Variable(astNode, usages));
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

  private static final GrammarRuleKey[] CONST_AND_VAR_NODES = {
    EcmaScriptGrammar.VARIABLE_DECLARATION,
    EcmaScriptGrammar.VARIABLE_DECLARATION_NO_IN,
    EcmaScriptGrammar.LEXICAL_BINDING,
    EcmaScriptGrammar.LEXICAL_BINDING_NO_IN};

  private Scope currentScope;

  @Override
  public void init() {
    subscribeTo(
      EcmaScriptGrammar.PRIMARY_EXPRESSION,
      EcmaScriptGrammar.FORMAL_PARAMETER_LIST,
      EcmaScriptGrammar.ARROW_PARAMETERS);
    subscribeTo(CONST_AND_VAR_NODES);
    subscribeTo(FunctionUtils.FUNCTION_NODES);
  }

  @Override
  public void visitFile(AstNode astNode) {
    currentScope = null;
  }

  @Override
  public void visitNode(AstNode astNode) {
    if (astNode.is(FunctionUtils.FUNCTION_NODES)) {
      // enter new scope
      currentScope = new Scope(currentScope);

    } else if (currentScope != null) {

      // declare all parameters as variables, which are already used, so that they won't trigger violations
      if (astNode.is(EcmaScriptGrammar.ARROW_PARAMETERS)) {
        declareInCurrentScope(IdentifierUtils.getArrowParametersIdentifier(astNode), 1);

      } else if (astNode.is(EcmaScriptGrammar.FORMAL_PARAMETER_LIST)) {
        declareInCurrentScope(IdentifierUtils.getParametersIdentifier(astNode), 1);

      } else if (astNode.is(CONST_AND_VAR_NODES)) {
        declareInCurrentScope(IdentifierUtils.getVariableIdentifiers(astNode), 0);

      } else if (astNode.is(EcmaScriptGrammar.PRIMARY_EXPRESSION)) {
        AstNode identifier = astNode.getFirstChild(EcmaScriptTokenType.IDENTIFIER);
        if (identifier != null) {
          currentScope.use(identifier);
        }
      }
    }
  }

  @Override
  public void leaveNode(AstNode astNode) {
    if (astNode.is(FunctionUtils.FUNCTION_NODES)) {
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

  private void declareInCurrentScope(List<AstNode> identifiers, int usage) {
    for (AstNode identifier : identifiers) {
      currentScope.declare(identifier, usage);
    }
  }
}
