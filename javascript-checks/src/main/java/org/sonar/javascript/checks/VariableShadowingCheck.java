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
import com.sonar.sslr.api.AstNodeType;
import com.sonar.sslr.api.AstVisitor;
import com.sonar.sslr.impl.ast.AstWalker;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.api.EcmaScriptTokenType;
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.parser.LexerlessGrammar;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Rule(
  key = "VariableShadowing",
  priority = Priority.MAJOR)
public class VariableShadowingCheck extends SquidCheck<LexerlessGrammar> {

  private Map<AstNode, Scope> scopes;

  private static class Scope {
    private final Scope outerScope;
    private Map<String, AstNode> declaration = Maps.newHashMap();

    public Scope() {
      this.outerScope = null;
    }

    public Scope(Scope outerScope) {
      this.outerScope = outerScope;
    }

    private void declare(AstNode astNode) {
      Preconditions.checkState(astNode.is(EcmaScriptTokenType.IDENTIFIER));
      String identifier = astNode.getTokenValue();
      if (!declaration.containsKey(identifier)) {
        declaration.put(identifier, astNode);
      }
    }
  }

  private Scope currentScope;

  @Override
  public void init() {
    subscribeTo(
      EcmaScriptGrammar.FUNCTION_EXPRESSION,
      EcmaScriptGrammar.FUNCTION_DECLARATION,
      EcmaScriptGrammar.FORMAL_PARAMETER_LIST,
      EcmaScriptGrammar.VARIABLE_DECLARATION,
      EcmaScriptGrammar.VARIABLE_DECLARATION_NO_IN);
  }

  @Override
  public void visitFile(AstNode astNode) {
    if (astNode != null) {
      scopes = Maps.newHashMap();
      new AstWalker(new InnerVisitor()).walkAndVisit(astNode);
      currentScope = scopes.get(astNode);
    }
  }

  @Override
  public void visitNode(AstNode astNode) {
    if (astNode.is(EcmaScriptGrammar.FUNCTION_EXPRESSION, EcmaScriptGrammar.FUNCTION_DECLARATION)) {
      // enter new scope
      currentScope = scopes.get(astNode);
    } else if (astNode.is(EcmaScriptGrammar.FORMAL_PARAMETER_LIST)) {
      for (AstNode identifier : getIdentifiers(astNode)) {
        check(identifier);
      }
    } else if (astNode.is(EcmaScriptGrammar.VARIABLE_DECLARATION, EcmaScriptGrammar.VARIABLE_DECLARATION_NO_IN)) {
      check(astNode.getFirstChild(EcmaScriptTokenType.IDENTIFIER));
    }
  }

  private void check(AstNode astNode) {
    Preconditions.checkState(astNode.is(EcmaScriptTokenType.IDENTIFIER));
    String identifier = astNode.getTokenValue();
    Scope scope = currentScope.outerScope;
    while (scope != null) {
      if (scope.declaration.containsKey(identifier)) {
        getContext().createLineViolation(this, "'" + identifier + "' hides variable declared in outer scope.", astNode);
        break;
      }
      scope = scope.outerScope;
    }
  }

  @Override
  public void leaveNode(AstNode astNode) {
    if (astNode.is(EcmaScriptGrammar.FUNCTION_EXPRESSION, EcmaScriptGrammar.FUNCTION_DECLARATION)) {
      // leave scope
      currentScope = currentScope.outerScope;
    }
  }

  @Override
  public void leaveFile(AstNode astNode) {
    currentScope = null;
    scopes = null;
  }

  private static List<AstNode> getIdentifiers(AstNode astNode) {
    List<AstNode> identifiers = new ArrayList<AstNode>();

    for (AstNode formalP : astNode.getChildren(EcmaScriptGrammar.FORMAL_PARAMETER)) {
      AstNode identifier = formalP.getFirstChild(EcmaScriptGrammar.BINDING_IDENTIFIER).getFirstChild(EcmaScriptTokenType.IDENTIFIER);
      if (identifier != null) {
        identifiers.add(identifier);
      }
    }

    AstNode restParam = astNode.getFirstChild(EcmaScriptGrammar.REST_PARAMETER);
    if (restParam != null) {
      identifiers.add(restParam.getFirstChild(EcmaScriptGrammar.BINDING_IDENTIFIER).getFirstChild(EcmaScriptTokenType.IDENTIFIER));
    }

    return identifiers;
  }

  private class InnerVisitor implements AstVisitor {

    private Scope currentScope;

    public List<AstNodeType> getAstNodeTypesToVisit() {
      return Arrays.asList((AstNodeType)
        EcmaScriptGrammar.FUNCTION_EXPRESSION,
        EcmaScriptGrammar.FUNCTION_DECLARATION,
        EcmaScriptGrammar.VARIABLE_DECLARATION,
        EcmaScriptGrammar.VARIABLE_DECLARATION_NO_IN,
        EcmaScriptGrammar.FORMAL_PARAMETER_LIST);
    }

    @Override
    public void visitFile(AstNode astNode) {
      currentScope = new Scope();
      scopes.put(astNode, currentScope);
    }

    @Override
    public void visitNode(AstNode astNode) {
      if (astNode.is(EcmaScriptGrammar.FUNCTION_EXPRESSION, EcmaScriptGrammar.FUNCTION_DECLARATION)) {
        // enter new scope
        currentScope = new Scope(currentScope);
        scopes.put(astNode, currentScope);
      } else if (astNode.is(EcmaScriptGrammar.FORMAL_PARAMETER_LIST)) {
        for (AstNode identifierNode : getIdentifiers(astNode)) {
          currentScope.declare(identifierNode);
        }
      } else if (astNode.is(EcmaScriptGrammar.VARIABLE_DECLARATION, EcmaScriptGrammar.VARIABLE_DECLARATION_NO_IN)) {
        currentScope.declare(astNode.getFirstChild(EcmaScriptTokenType.IDENTIFIER));
      }
    }

    @Override
    public void leaveNode(AstNode astNode) {
      if (astNode.is(EcmaScriptGrammar.FUNCTION_EXPRESSION, EcmaScriptGrammar.FUNCTION_DECLARATION)) {
        // leave scope
        currentScope = currentScope.outerScope;
      }
    }

    @Override
    public void leaveFile(AstNode astNode) {
      // nop
    }
  }

}
