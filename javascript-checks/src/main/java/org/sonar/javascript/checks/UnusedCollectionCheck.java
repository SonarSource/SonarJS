/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
 * mailto:info AT sonarsource DOT com
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

import com.google.common.collect.ImmutableSet;
import java.util.EnumSet;
import java.util.Set;
import javax.annotation.Nullable;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.tree.KindSet;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.BracketMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.NewExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.ExpressionStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "S4030")
public class UnusedCollectionCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Either use this collection's contents or remove the collection.";

  private static final Set<String> COLLECTION_CONSTRUCTORS = ImmutableSet.of(
    "Array",
    "Int8Array",
    "Uint8Array",
    "Uint8ClampedArray",
    "Int16Array",
    "Uint16Array",
    "Int32Array",
    "Uint32Array",
    "Float32Array",
    "Float64Array",
    "Set",
    "Map",
    "WeakSet",
    "WeakMap");

  private static final Set<String> WRITING_METHODS = ImmutableSet.of(
    "copyWithin",
    "fill",
    "pop",
    "push",
    "reverse",
    "shift",
    "sort",
    "splice",
    "unshift",
    "clear",
    "delete",
    "set",
    "add");

  private static final EnumSet<Symbol.Kind> VARIABLE_SYMBOL_KINDS = EnumSet.of(
    Symbol.Kind.VARIABLE,
    Symbol.Kind.LET_VARIABLE,
    Symbol.Kind.CONST_VARIABLE);

  @Override
  public void visitScript(ScriptTree tree) {
    Set<Symbol> symbols = getContext().getSymbolModel().getSymbols();

    symbols.forEach(symbol -> {

      if (symbol.usages().size() < 2 || !VARIABLE_SYMBOL_KINDS.contains(symbol.kind())) {
        return;
      }

      Usage declaration = getDeclarationUsage(symbol);
      if (declaration == null) {
        return;
      }

      for (Usage usage : symbol.usages()) {
        if (usage.isDeclaration()) {
          if (isInitializedToNotCollection(usage)) {
            return;
          }

        } else if (!isCollectionWrite(usage)) {
          return;
        }
      }

      addIssue(declaration.identifierTree(), MESSAGE);
    });
  }

  private static boolean isInitializedToNotCollection(Usage usage) {
    IdentifierTree identifier = usage.identifierTree();
    Tree ancestor = CheckUtils.getFirstAncestor(identifier,
      Kind.INITIALIZED_BINDING_ELEMENT,

      Kind.VAR_DECLARATION,
      Kind.LET_DECLARATION,
      Kind.CONST_DECLARATION,

      Kind.SCRIPT);

    // "ancestor" should never be "null" here
    if (ancestor.is(Kind.INITIALIZED_BINDING_ELEMENT)) {
      return !isNewCollectionCreation(((InitializedBindingElementTree) ancestor).right());
    } else if (ancestor.is(Kind.SCRIPT)) {
      return true;
    }

    return ancestor.parent().is(Kind.FOR_OF_STATEMENT, Kind.FOR_IN_STATEMENT);
  }

  private static boolean isCollectionWrite(Usage usage) {
    ExpressionStatementTree expressionStatement = (ExpressionStatementTree) CheckUtils.getFirstAncestor(usage.identifierTree(), Kind.EXPRESSION_STATEMENT);
    if (expressionStatement != null) {
      return isElementWrite(expressionStatement, usage) || isWritingMethodCall(expressionStatement, usage) || isVariableWrite(expressionStatement, usage);
    }

    return false;
  }

  // myArray[1] = 42;
  // myArray[1] += 42;
  private static boolean isElementWrite(ExpressionStatementTree statement, Usage usage) {
    if (statement.expression().is(KindSet.ASSIGNMENT_KINDS)) {
      ExpressionTree variable = ((AssignmentExpressionTree) statement.expression()).variable();
      if (variable.is(Kind.BRACKET_MEMBER_EXPRESSION)) {
        return ((BracketMemberExpressionTree) variable).object() == usage.identifierTree();
      }
    }

    return false;
  }

  // myArray.push(1);
  private static boolean isWritingMethodCall(ExpressionStatementTree statement, Usage usage) {
    if (statement.expression().is(Kind.CALL_EXPRESSION)) {
      ExpressionTree callee = ((CallExpressionTree) statement.expression()).callee();

      if (callee.is(Kind.DOT_MEMBER_EXPRESSION)) {
        DotMemberExpressionTree memberExpression = (DotMemberExpressionTree) callee;
        return memberExpression.object() == usage.identifierTree() && WRITING_METHODS.contains(memberExpression.property().name());
      }
    }

    return false;
  }

  // myArray = [1, 2];
  private static boolean isVariableWrite(ExpressionStatementTree statement, Usage usage) {
    if (statement.expression().is(Kind.ASSIGNMENT)) {
      AssignmentExpressionTree assignment = (AssignmentExpressionTree) statement.expression();
      return assignment.variable() == usage.identifierTree() && isNewCollectionCreation(assignment.expression());
    }

    return false;
  }

  private static boolean isNewCollectionCreation(ExpressionTree expression) {
    if (expression.is(Kind.ARRAY_LITERAL)) {
      return true;
    }

    if (expression.is(Kind.CALL_EXPRESSION)) {
      return isCollectionConstructor(((CallExpressionTree) expression).callee());
    }

    if (expression.is(Kind.NEW_EXPRESSION)) {
      return isCollectionConstructor(((NewExpressionTree) expression).expression());
    }

    return false;
  }

  private static boolean isCollectionConstructor(ExpressionTree callee) {
    return callee.is(Kind.IDENTIFIER_REFERENCE) && COLLECTION_CONSTRUCTORS.contains(((IdentifierTree) callee).identifierToken().text());
  }

  @Nullable
  private static Usage getDeclarationUsage(Symbol symbol) {
    for (Usage usage : symbol.usages()) {
      if (usage.isDeclaration()) {
        return usage;
      }
    }
    return null;
  }


}
