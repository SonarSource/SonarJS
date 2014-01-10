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
import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.squid.checks.SquidCheck;
import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.api.EcmaScriptTokenType;
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.sslr.parser.LexerlessGrammar;

import java.util.LinkedList;
import java.util.Map;

@Rule(
  key = "UnusedFunctionArgument",
  priority = Priority.MAJOR)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class UnusedFunctionArgumentCheck extends SquidCheck<LexerlessGrammar> {

  private static class Argument {
    final AstNode declaration;
    int usages;

    public Argument(AstNode declaration, int usages) {
      this.declaration = declaration;
      this.usages = usages;
    }
  }

  private static class Scope {
    private final Scope outerScope;
    private final Map<String, Argument> arguments;

    public Scope(Scope outerScope) {
      this.outerScope = outerScope;
      this.arguments = Maps.newLinkedHashMap();
    }

    private void declare(AstNode astNode) {
      Preconditions.checkState(astNode.is(EcmaScriptTokenType.IDENTIFIER));
      String identifier = astNode.getTokenValue();
      arguments.put(identifier, new Argument(astNode, 0));
    }

    private void use(AstNode astNode) {
      Preconditions.checkState(astNode.is(EcmaScriptTokenType.IDENTIFIER));
      String identifier = astNode.getTokenValue();
      Scope scope = this;
      while (scope != null) {
        Argument arg = scope.arguments.get(identifier);
        if (arg != null) {
          arg.usages++;
          return;
        }
        scope = scope.outerScope;
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
        EcmaScriptGrammar.PRIMARY_EXPRESSION);
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
      for (AstNode identifierNode : astNode.getChildren(EcmaScriptTokenType.IDENTIFIER)) {
        currentScope.declare(identifierNode);
      }
    } else if (currentScope != null && astNode.is(EcmaScriptGrammar.PRIMARY_EXPRESSION)) {
      AstNode identifierNode = astNode.getFirstChild(EcmaScriptTokenType.IDENTIFIER);
      if (identifierNode != null) {
        currentScope.use(identifierNode);
      }
    }
  }

  @Override
  public void leaveNode(AstNode astNode) {
    if (astNode.is(EcmaScriptGrammar.FUNCTION_EXPRESSION, EcmaScriptGrammar.FUNCTION_DECLARATION)) {
      // leave scope
      reportUnusedArguments(astNode);
      currentScope = currentScope.outerScope;
    }
  }

  @Override
  public void leaveFile(AstNode astNode) {
    currentScope = null;
  }

  public void reportUnusedArguments(AstNode functionNode) {
    if (functionNode.is(EcmaScriptGrammar.FUNCTION_DECLARATION)) {
      reportAllUnusedArgs();
    } else {
      reportDanglingUnusedArgs();
    }
  }

  public void reportAllUnusedArgs() {
    for (Map.Entry<String, Argument> entry : currentScope.arguments.entrySet()) {
      if (entry.getValue().usages == 0) {
        getContext().createLineViolation(this, "Remove the declaration of the unused '" + entry.getKey() + "' argument.", entry.getValue().declaration);
      }
    }
  }

  public void reportDanglingUnusedArgs() {
    boolean hasMetUsedArg = false;
    LinkedList<Map.Entry<String, Argument>> entries = Lists.newLinkedList(currentScope.arguments.entrySet());

    for (Map.Entry<String, Argument> entry : Lists.reverse(entries)) {
      int usages = entry.getValue().usages;

      if (usages == 0 && !hasMetUsedArg) {
        getContext().createLineViolation(this, "Remove the declaration of the unused '" + entry.getKey() + "' argument.", entry.getValue().declaration);
      } else if (usages > 0 && !hasMetUsedArg) {
        hasMetUsedArg = true;
      }
    }
  }
}

