/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
package org.sonar.javascript.checks;

import com.google.common.collect.ImmutableList;
import java.util.List;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.statement.VariableDeclarationTree;

@Rule(key = "BoundOrAssignedEvalOrArguments")
public class BoundOrAssignedSpecialIdentifiersCheck extends AbstractSymbolNameCheck {

  private static final String DECLARATION_MESSAGE = "Do not use \"%s\" to declare a %s - use another name.";

  private static final String MODIFICATION_MESSAGE = "Remove the modification of \"%s\".";

  private static final String UNDEFINED = "undefined";

  @Override
  List<String> illegalNames() {
    return ImmutableList.of("eval", "arguments", /* "undefined", */ "NaN", "Infinity");
  }

  @Override
  String getMessage(Symbol symbol) {
    return null;
  }

  @Override
  public void visitScript(ScriptTree tree) {
    for (Symbol symbol : getIllegalSymbols()) {
      if (symbol.is(Symbol.Kind.PARAMETER) || !symbol.builtIn()) {
        raiseIssuesOnDeclarations(symbol, String.format(DECLARATION_MESSAGE, symbol.name(), symbol.kind().getValue()));
      } else {
        raiseIssuesOnWriteUsages(symbol);
      }
    }

    super.visitScript(tree);
  }

  @Override
  public void visitVariableDeclaration(VariableDeclarationTree tree) {
    System.out.println("VAR DEC  on " + tree);

    for (BindingElementTree elem : tree.variables()) {
      System.out.println("elem: " + elem);
      if (elem.is(Kind.INITIALIZED_BINDING_ELEMENT)) {
        InitializedBindingElementTree init = (InitializedBindingElementTree) elem;
        BindingElementTree left = init.left();
        if (left.is(Kind.BINDING_IDENTIFIER)) {
          IdentifierTree identifier = (IdentifierTree) left;
          checkIdentifier(identifier, init.right());
        }
      } else {
        System.out.println("not an InitializedBindingElementTree: " + elem);
      }
    }

    super.visitVariableDeclaration(tree);
  }

  private void checkIdentifier(IdentifierTree identifier, ExpressionTree expression) {
    System.out.println("  identifier  = " + identifier);

    if (expression.is(Kind.ASSIGNMENT)) {
      AssignmentExpressionTree assign = (AssignmentExpressionTree) expression;
      if (assign.variable().is(Kind.BINDING_IDENTIFIER, Kind.IDENTIFIER_REFERENCE)) {
        checkIdentifier((IdentifierTree) assign.variable(), assign.expression());
      }
    } else if (identifier.name().equals(UNDEFINED) && !isUndefined(expression)) {
      System.out.println("  raise issue");
      addIssue(identifier, String.format(MODIFICATION_MESSAGE, UNDEFINED));
    }
  }

  private static boolean isUndefined(ExpressionTree expression) {
    boolean undef = false;
    if (expression.is(Kind.IDENTIFIER_REFERENCE)) {
      Symbol symbol = ((IdentifierTree) expression).symbol();
      if (symbol.name().equals(UNDEFINED)) {
        undef = true;
      }
    }
    return undef;
  }

  private void raiseIssuesOnWriteUsages(Symbol symbol) {
    for (Usage usage : symbol.usages()) {
      if (!usage.kind().equals(Usage.Kind.READ)) {
        addIssue(usage.identifierTree(), String.format(MODIFICATION_MESSAGE, symbol.name()));
      }
    }
  }

}
