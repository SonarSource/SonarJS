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

import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.api.EcmaScriptKeyword;
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.model.implementations.declaration.ParameterListTreeImpl;
import org.sonar.javascript.model.implementations.statement.VariableDeclarationTreeImpl;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.expression.ArrowFunctionTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.squidbridge.annotations.Tags;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.grammar.GrammarRuleKey;
import org.sonar.sslr.parser.LexerlessGrammar;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.Maps;
import com.sonar.sslr.api.AstNode;

@Rule(
  key = "VariableDeclarationAfterUsage",
  priority = Priority.MAJOR,
  tags = {Tags.PITFALL})
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class VariableDeclarationAfterUsageCheck extends SquidCheck<LexerlessGrammar> {

  private static class Scope {
    private final Scope outerScope;
    Map<String, AstNode> firstDeclaration = Maps.newHashMap();
    Map<String, AstNode> firstUsage = Maps.newHashMap();

    public Scope() {
      this.outerScope = null;
    }

    public Scope(Scope outerScope) {
      this.outerScope = outerScope;
    }

    private void declare(IdentifierTree identifierTree) {
      String identifier = identifierTree.name();
      if (!firstDeclaration.containsKey(identifier)) {
        firstDeclaration.put(identifier, (AstNode) identifierTree);
      }
    }

    private void use(AstNode astNode) {
      String identifier = astNode.getTokenValue();
      if (!firstUsage.containsKey(identifier)) {
        firstUsage.put(identifier, astNode);
      }
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
    Kind.CONST_DECLARATION};

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
    currentScope = new Scope();
  }

  @Override
  public void visitNode(AstNode astNode) {
    if (astNode.is(FUNCTION_NODES)) {
      // enter new scope
      currentScope = new Scope(currentScope);

    } else if (astNode.is(Kind.FORMAL_PARAMETER_LIST)) {
      declareInCurrentScope(((ParameterListTreeImpl) astNode).parameterIdentifiers());

    } else if (astNode.is(Kind.ARROW_FUNCTION)) {
      Tree parameter = ((ArrowFunctionTree) astNode).parameters();
      if (parameter.is(Kind.BINDING_IDENTIFIER)) {
        declareInCurrentScope(ImmutableList.of((IdentifierTree) parameter));
      }
      // else is handle with FORMAL_PARAMETER_LIST

    } else if (astNode.is(CONST_AND_VAR_NODES)) {
      declareInCurrentScope(((VariableDeclarationTreeImpl) astNode).variableIdentifiers());

    } else if (astNode.is(Kind.IDENTIFIER_REFERENCE)) {

      if (astNode.getParent().is(Kind.FOR_IN_STATEMENT, Kind.FOR_OF_STATEMENT)
        && astNode.getNextAstNode().is(EcmaScriptKeyword.IN, EcmaScriptGrammar.OF)) {
        declareInCurrentScope(ImmutableList.of((IdentifierTree) astNode));
      } else {
        currentScope.use(astNode);
      }
    }
  }

  private void declareInCurrentScope(List<IdentifierTree> identifiers) {
    for (IdentifierTree identifier : identifiers) {
      currentScope.declare(identifier);
    }
  }

  @Override
  public void leaveNode(AstNode astNode) {
    if (astNode.is(FUNCTION_NODES)) {
      // leave scope
      checkCurrentScope();
      for (Map.Entry<String, AstNode> entry : currentScope.firstUsage.entrySet()) {
        if (!currentScope.firstDeclaration.containsKey(entry.getKey())) {
          currentScope.outerScope.use(entry.getValue());
        }
      }
      currentScope = currentScope.outerScope;
    }
  }

  private void checkCurrentScope() {
    for (Map.Entry<String, AstNode> entry : currentScope.firstDeclaration.entrySet()) {
      AstNode declaration = entry.getValue();
      AstNode usage = currentScope.firstUsage.get(entry.getKey());
      if (usage != null && usage.getTokenLine() < declaration.getTokenLine()) {
        getContext().createLineViolation(this, "Variable '" + entry.getKey() + "' referenced before declaration.", usage);
      }
    }
  }

  @Override
  public void leaveFile(AstNode astNode) {
    checkCurrentScope();
    currentScope = null;
  }

}
