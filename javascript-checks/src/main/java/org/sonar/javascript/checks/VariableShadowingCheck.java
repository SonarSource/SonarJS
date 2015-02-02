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

import com.google.common.collect.ImmutableList;
import com.google.common.collect.Maps;
import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.AstNodeType;
import com.sonar.sslr.api.AstVisitor;
import com.sonar.sslr.impl.ast.AstWalker;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.model.implementations.declaration.ParameterListTreeImpl;
import org.sonar.javascript.model.implementations.statement.VariableDeclarationTreeImpl;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.parser.LexerlessGrammar;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Rule(
  key = "VariableShadowing",
  priority = Priority.MAJOR)
public class VariableShadowingCheck extends SquidCheck<LexerlessGrammar> {

  private Map<AstNode, Scope> scopes;
  private static final AstNodeType[] NEW_NODES_USING_FORMAL_PARAMETER_LIST = {
    Kind.SET_METHOD,
    Kind.GET_METHOD
  };

  private static class Scope {
    private final Scope outerScope;
    private final Map<String, IdentifierTree> declaration = Maps.newHashMap();

    public Scope() {
      this.outerScope = null;
    }

    public Scope(Scope outerScope) {
      this.outerScope = outerScope;
    }

    private void declare(IdentifierTree identifierTree) {
      String identifier = identifierTree.name();
      if (!declaration.containsKey(identifier)) {
        declaration.put(identifier, identifierTree);
      }
    }
  }

  private static final AstNodeType[] CONST_AND_VAR_NODES = {
    Kind.VAR_DECLARATION,
    Kind.LET_DECLARATION,
    Kind.CONST_DECLARATION};

  private Scope currentScope;

  @Override
  public void init() {
    subscribeTo(Kind.FORMAL_PARAMETER_LIST);
    subscribeTo(CheckUtils.functionNodesArray());
    subscribeTo(CONST_AND_VAR_NODES);
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
    if (CheckUtils.isFunction(astNode)) {
      // enter new scope
      currentScope = scopes.get(astNode);
    } else if (astNode.is(Kind.FORMAL_PARAMETER_LIST) && !astNode.getParent().is(NEW_NODES_USING_FORMAL_PARAMETER_LIST)) {
      checkIdentifiers(((ParameterListTreeImpl) astNode).parameterIdentifiers());
    } else if (astNode.is(CONST_AND_VAR_NODES)) {
      checkIdentifiers(((VariableDeclarationTreeImpl) astNode).variableIdentifiers());
    }
  }

  private void check(IdentifierTree identifierTree) {
    String identifier = identifierTree.name();
    Scope scope = currentScope.outerScope;
    while (scope != null) {
      if (scope.declaration.containsKey(identifier)) {
        getContext().createLineViolation(this, "\"" + identifier + "\" hides variable declared in outer scope.", (AstNode) identifierTree);
        break;
      }
      scope = scope.outerScope;
    }
  }

  @Override
  public void leaveNode(AstNode astNode) {
    if (CheckUtils.isFunction(astNode)) {
      // leave scope
      currentScope = currentScope.outerScope;
    }
  }

  @Override
  public void leaveFile(AstNode astNode) {
    currentScope = null;
    scopes = null;
  }

  private void checkIdentifiers(List<IdentifierTree> identifiers) {
    for (IdentifierTree identifier : identifiers) {
      check(identifier);
    }
  }

  private class InnerVisitor implements AstVisitor {

    private Scope currentScope;

    @Override
    public List<AstNodeType> getAstNodeTypesToVisit() {
      return ImmutableList.<AstNodeType>builder()
        .add(Kind.FORMAL_PARAMETER_LIST)
        .addAll(Arrays.asList(CONST_AND_VAR_NODES))
        .addAll(CheckUtils.FUNCTION_NODES).build();
    }

    @Override
    public void visitFile(AstNode astNode) {
      currentScope = new Scope();
      scopes.put(astNode, currentScope);
    }

    @Override
    public void visitNode(AstNode astNode) {
      if (CheckUtils.isFunction(astNode)) {
        // enter new scope
        currentScope = new Scope(currentScope);
        scopes.put(astNode, currentScope);
      } else if (astNode.is(Kind.FORMAL_PARAMETER_LIST) && !astNode.getParent().is(NEW_NODES_USING_FORMAL_PARAMETER_LIST)) {
        declareInCurrentScope(((ParameterListTreeImpl) astNode).parameterIdentifiers());
      } else if (astNode.is(CONST_AND_VAR_NODES)) {
        declareInCurrentScope(((VariableDeclarationTreeImpl) astNode).variableIdentifiers());
      }
    }

    private void declareInCurrentScope(List<IdentifierTree> identifiers) {
      for (IdentifierTree identifier : identifiers) {
        currentScope.declare(identifier);
      }
    }

    @Override
    public void leaveNode(AstNode astNode) {
      if (CheckUtils.isFunction(astNode)) {
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
