/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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

import com.google.common.collect.ImmutableList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import javax.annotation.Nullable;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.ModuleTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.BracketMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.CaseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.DefaultClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.ExpressionStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "S4143")
public class NoElementOverwriteCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Verify this is the index that was intended; '%s' was already set on line %s.";

  private static final List<Function<Tree, KeyWriteCollectionUsage>> GET_WRITE_USAGE_FUNCTIONS = ImmutableList.of(
    NoElementOverwriteCheck::arrayKeyWriteUsage,
    NoElementOverwriteCheck::mapOrSetWriteUsage,
    NoElementOverwriteCheck::objectKeyWriteUsage);

  @Override
  public void visitBlock(BlockTree tree) {
    checkStatements(tree.statements());
    super.visitBlock(tree);
  }

  @Override
  public void visitModule(ModuleTree tree) {
    checkStatements(tree.items());
    super.visitModule(tree);
  }

  @Override
  public void visitCaseClause(CaseClauseTree tree) {
    checkStatements(tree.statements());
    super.visitCaseClause(tree);
  }

  @Override
  public void visitDefaultClause(DefaultClauseTree tree) {
    checkStatements(tree.statements());
    super.visitDefaultClause(tree);
  }

  private <T extends Tree> void checkStatements(List<T> statements) {
    Map<String, KeyWriteCollectionUsage> usedKeys = new HashMap<>();
    Symbol collection = null;

    for (T statement : statements) {
      KeyWriteCollectionUsage keyWriteUsage = keyWriteUsage(statement);

      if (keyWriteUsage != null) {
        if (collection != null && keyWriteUsage.collectionSymbol != collection) {
          usedKeys.clear();
        }

        KeyWriteCollectionUsage sameKeyWriteUsage = usedKeys.get(keyWriteUsage.indexOrKey);
        if (sameKeyWriteUsage != null) {
          addIssue(keyWriteUsage.tree, message(keyWriteUsage.indexOrKey, sameKeyWriteUsage.tree)).secondary(sameKeyWriteUsage.tree);
        }
        usedKeys.put(keyWriteUsage.indexOrKey, keyWriteUsage);
        collection = keyWriteUsage.collectionSymbol;

      } else {
        usedKeys.clear();
      }
    }
  }

  @Nullable
  private static KeyWriteCollectionUsage keyWriteUsage(Tree tree){
    if (tree.is(Kind.EXPRESSION_STATEMENT)) {
      ExpressionTree expression = ((ExpressionStatementTree) tree).expression();

      for (Function<Tree, KeyWriteCollectionUsage> getWriteUsageFunction : GET_WRITE_USAGE_FUNCTIONS) {
        KeyWriteCollectionUsage writeUsage = getWriteUsageFunction.apply(expression);
        if (writeUsage != null) {
          return writeUsage;
        }
      }
    }

    return null;
  }

  @Nullable
  private static KeyWriteCollectionUsage arrayKeyWriteUsage(Tree tree) {
    if (!tree.is(Kind.ASSIGNMENT)) {
      return null;
    }

    AssignmentExpressionTree assignmentExpression = (AssignmentExpressionTree) tree;

    if (assignmentExpression.variable().is(Kind.BRACKET_MEMBER_EXPRESSION)) {
      BracketMemberExpressionTree memberExpression = (BracketMemberExpressionTree) assignmentExpression.variable();

      if (memberExpression.object().is(Kind.IDENTIFIER_REFERENCE)) {
        Optional<Symbol> symbol = ((IdentifierTree) memberExpression.object()).symbol();
        String index = extractIndex(ImmutableList.of(memberExpression.property()));
        if (symbol.isPresent() && index != null && !usedInRhs(assignmentExpression.expression(), symbol.get())) {
          return new KeyWriteCollectionUsage(symbol.get(), index, memberExpression.object());
        }
      }
    }
    return null;
  }

  private static boolean usedInRhs(ExpressionTree rhs, Symbol symbol) {
    IdentifierVisitor identifierVisitor = new IdentifierVisitor(symbol);
    rhs.accept(identifierVisitor);
    return identifierVisitor.usageFound;
  }

  private static class IdentifierVisitor extends DoubleDispatchVisitor {

    final Symbol symbolToFind;
    boolean usageFound = false;

    IdentifierVisitor(Symbol symbolToFind) {
      this.symbolToFind = symbolToFind;
    }

    @Override
    public void visitIdentifier(IdentifierTree tree) {
      Optional<Symbol> symbol = tree.symbol();
      if (symbol.isPresent() && symbol.get() == this.symbolToFind) {
        usageFound = true;
      }
    }
  }

  private static String message(String index, Tree previousUsage) {
    int line = previousUsage.firstToken().line();
    return String.format(MESSAGE, index, line);
  }

  @Nullable
  private static KeyWriteCollectionUsage mapOrSetWriteUsage(Tree tree) {
    if (!tree.is(Kind.CALL_EXPRESSION)) {
      return null;
    }

    CallExpressionTree callExpression = (CallExpressionTree) tree;
    int argumentsNumber = callExpression.argumentClause().arguments().size();

    if (callExpression.callee().is(Kind.DOT_MEMBER_EXPRESSION)) {

      DotMemberExpressionTree callee = (DotMemberExpressionTree) callExpression.callee();
      if (callee.object().is(Kind.IDENTIFIER_REFERENCE)) {
        Optional<Symbol> symbol = ((IdentifierTree) callee.object()).symbol();
        String methodName = callee.property().name();
        String index = extractIndex(callExpression.argumentClause().arguments());

        boolean addMethod = methodName.equals("add") && argumentsNumber == 1;
        boolean setMethod = methodName.equals("set") && argumentsNumber == 2;
        if (symbol.isPresent() && (addMethod || setMethod) && index != null) {
          return new KeyWriteCollectionUsage(symbol.get(), index, callee.object());
        }
      }
    }

    return null;
  }

  @Nullable
  private static String extractIndex(List<ExpressionTree> arguments) {
    if (arguments.isEmpty()) {
      return null;
    }

    ExpressionTree firstArgument = arguments.get(0);

    if (firstArgument.is(Kind.NUMERIC_LITERAL, Kind.STRING_LITERAL)) {
      String value = ((LiteralTree) firstArgument).value();
      return firstArgument.is(Kind.STRING_LITERAL) ? value.substring(1, value.length() - 1) : value;
    }

    if (firstArgument.is(Kind.IDENTIFIER_REFERENCE)) {
      return ((IdentifierTree) firstArgument).name();
    }

    return null;
  }

  @Nullable
  private static KeyWriteCollectionUsage objectKeyWriteUsage(Tree tree) {
    if (!tree.is(Kind.ASSIGNMENT)) {
      return null;
    }

    AssignmentExpressionTree assignmentExpression = (AssignmentExpressionTree) tree;

    if (assignmentExpression.variable().is(Kind.DOT_MEMBER_EXPRESSION)) {
      DotMemberExpressionTree lhs = (DotMemberExpressionTree) assignmentExpression.variable();
      // avoid deeply nested property access
      if (!lhs.object().is(Kind.IDENTIFIER_REFERENCE)) {
        return null;
      }

      Optional<Symbol> symbol = ((IdentifierTree) lhs.object()).symbol();
      if (!symbol.isPresent()) {
        return null;
      }

      if (usedInRhs(assignmentExpression.expression(), symbol.get())) {
        return null;
      }
      String property = lhs.property().name();
      return new KeyWriteCollectionUsage(symbol.get(), property, lhs.object());
    }

    return null;
  }

  private static class KeyWriteCollectionUsage {
    Symbol collectionSymbol;
    String indexOrKey;
    Tree tree;

    KeyWriteCollectionUsage(Symbol collectionSymbol, String indexOrKey, Tree tree) {
      this.collectionSymbol = collectionSymbol;
      this.indexOrKey = indexOrKey;
      this.tree = tree;
    }
  }
}
