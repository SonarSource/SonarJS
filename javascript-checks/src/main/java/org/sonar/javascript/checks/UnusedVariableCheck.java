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

import com.google.common.base.Preconditions;
import com.google.common.collect.Maps;
import com.sonar.sslr.api.AstNode;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.api.EcmaScriptTokenType;
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.sslr.parser.LexerlessGrammar;

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
      Preconditions.checkState(astNode.is(EcmaScriptTokenType.IDENTIFIER));
      String identifier = astNode.getTokenValue();
      if (!variables.containsKey(identifier)) {
        variables.put(identifier, new Variable(astNode, usages));
      }
    }

    private void use(AstNode astNode) {
      Preconditions.checkState(astNode.is(EcmaScriptTokenType.IDENTIFIER));
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

  private Scope currentScope;

  @Override
  public void init() {
    subscribeTo(
        EcmaScriptGrammar.FUNCTION_EXPRESSION,
        EcmaScriptGrammar.FUNCTION_DECLARATION,
        EcmaScriptGrammar.VARIABLE_DECLARATION,
        EcmaScriptGrammar.VARIABLE_DECLARATION_NO_IN,
        EcmaScriptGrammar.PRIMARY_EXPRESSION,
        EcmaScriptGrammar.FORMAL_PARAMETER_LIST);
  }

  @Override
  public void visitFile(AstNode astNode) {
    currentScope = null;
  }

  @Override
  public void visitNode(AstNode astNode) {
    if (astNode.is(EcmaScriptGrammar.FUNCTION_EXPRESSION, EcmaScriptGrammar.FUNCTION_DECLARATION)) {
      // enter new scope
      currentScope = new Scope(currentScope);
    } else if (astNode.is(EcmaScriptGrammar.FORMAL_PARAMETER_LIST)) {
      // declare all parameters as variables, which are already used, so that they won't trigger violations
      declareFormalParamList(astNode);

    } else if (currentScope != null) {
      if (astNode.is(EcmaScriptGrammar.VARIABLE_DECLARATION, EcmaScriptGrammar.VARIABLE_DECLARATION_NO_IN)) {
        currentScope.declare(astNode.getFirstChild(EcmaScriptTokenType.IDENTIFIER), 0);
      } else if (astNode.is(EcmaScriptGrammar.PRIMARY_EXPRESSION)) {
        AstNode identifierReference = astNode.getFirstChild(EcmaScriptGrammar.IDENTIFIER_REFERENCE);
        if (identifierReference != null && identifierReference.getFirstChild().is(EcmaScriptTokenType.IDENTIFIER)) {
          currentScope.use(identifierReference.getFirstChild());
        }
      }
    }
  }

  @Override
  public void leaveNode(AstNode astNode) {
    if (astNode.is(EcmaScriptGrammar.FUNCTION_EXPRESSION, EcmaScriptGrammar.FUNCTION_DECLARATION)) {
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

  private void declareFormalParamList(AstNode astNode) {
    for (AstNode formalP : astNode.getChildren(EcmaScriptGrammar.FORMAL_PARAMETER)) {
      AstNode identifier = formalP.getFirstChild(EcmaScriptGrammar.BINDING_IDENTIFIER).getFirstChild(EcmaScriptTokenType.IDENTIFIER);
      if (identifier != null) {
        currentScope.declare(identifier,1);
      }
    }

    AstNode restParam = astNode.getFirstChild(EcmaScriptGrammar.REST_PARAMETER);
    if (restParam != null) {
      currentScope.declare(restParam.getFirstChild(EcmaScriptGrammar.BINDING_IDENTIFIER).getFirstChild(EcmaScriptTokenType.IDENTIFIER), 1);
    }
  }

}
