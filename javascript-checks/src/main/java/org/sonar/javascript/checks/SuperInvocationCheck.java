/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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

import java.util.Deque;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import javax.annotation.CheckForNull;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.tree.KindSet;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.ClassTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.SuperTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;

@JavaScriptRule
@Rule(key = "S3854")
public class SuperInvocationCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE_SUPER_ONLY_IN_DERIVED_CLASS_CONSTRUCTOR = "super() can only be invoked in a derived class constructor.";

  private static final String MESSAGE_SUPER_REQUIRED_IN_ANY_DERIVED_CLASS_CONSTRUCTOR = "super() must be invoked in any derived class constructor.";

  private static final String MESSAGE_SUPER_BEFORE_THIS_OR_SUPER = "super() must be invoked before \"this\" or \"super\" can be used.";

  private static final String MESSAGE_SUPER_WITH_CORRECT_NUMBER_OF_ARGUMENTS = "super() must be invoked with %s argument%s.";

  private static final String MESSAGE_SUPER_INVOKED_ONCE = "super() can only be invoked once.";

  /**
   * The invocations of super() in the current method or function.
   * Used for detecting multiple invocations of super() in the same constructor.
   */
  private Deque<List<SuperTree>> superInvocations = new LinkedList<>();

  @Override
  public void visitScript(ScriptTree tree) {
    superInvocations.clear();

    super.visitScript(tree);
  }

  /**
   * Entry point for 3 of the 5 checks in this rule.
   */
  @Override
  public void visitSuper(SuperTree tree) {
    if (tree.parent().is(Kind.CALL_EXPRESSION)) {
      if (!isInConstructor(tree) || isInBaseClass(getEnclosingConstructor(tree))) {
        checkSuperOnlyInvokedInDerivedClassConstructor(tree);
      } else {
        checkSuperInvokedBeforeThisOrSuper(tree);
        checkSuperHasCorrectNumberOfArguments(tree);
      }
      pushSuperInvocation(tree);
    }

    super.visitSuper(tree);
  }

  /**
   * Entry point for 2 of the 5 checks in this rule.
   */
  @Override
  public void visitMethodDeclaration(MethodDeclarationTree tree) {
    checkSuperInvokedInAnyDerivedClassConstructor(tree);

    superInvocations.push(new LinkedList<>());
    super.visitMethodDeclaration(tree);

    checkSuperInvokedOnlyOnce(tree, superInvocations.pop());
  }

  @Override
  public void visitFunctionDeclaration(FunctionDeclarationTree tree) {
    superInvocations.push(new LinkedList<>());
    super.visitFunctionDeclaration(tree);
    superInvocations.pop();
  }

  @Override
  public void visitFunctionExpression(FunctionExpressionTree tree) {
    superInvocations.push(new LinkedList<>());
    super.visitFunctionExpression(tree);
    superInvocations.pop();
  }

  private void checkSuperOnlyInvokedInDerivedClassConstructor(SuperTree superTree) {
    addIssue(superTree, MESSAGE_SUPER_ONLY_IN_DERIVED_CLASS_CONSTRUCTOR);
  }

  private void checkSuperInvokedInAnyDerivedClassConstructor(MethodDeclarationTree method) {
    if (isConstructor(method) && !isInBaseClass(method) && !isInDummyDerivedClass(method)) {
      Set<SuperTree> superTrees = new SuperDetector().detectIn(method);
      if (superTrees.stream().noneMatch(s -> s.parent().is(Kind.CALL_EXPRESSION))) {
        addIssue(method.name(), MESSAGE_SUPER_REQUIRED_IN_ANY_DERIVED_CLASS_CONSTRUCTOR);
      }
    }
  }

  private void checkSuperInvokedBeforeThisOrSuper(SuperTree superTree) {
    int line = superTree.firstToken().line();
    int column = superTree.firstToken().column();
    MethodDeclarationTree method = getEnclosingConstructor(superTree);
    Set<IssueLocation> secondaryLocations = new HashSet<>();

    // get the usages of "super" before super()
    Set<SuperTree> superTrees = new SuperDetector().detectIn(method);
    superTrees.stream()
      .filter(s -> !s.parent().is(Kind.CALL_EXPRESSION))
      .filter(s -> isBefore(s.firstToken(), line, column))
      .map(IssueLocation::new)
      .forEach(secondaryLocations::add);

    // get the usages of "this" before super()
    Set<IdentifierTree> thisTrees = new ThisDetector().detectIn(method);
    thisTrees.stream()
      .filter(s -> isBefore(s.identifierToken(), line, column))
      .map(IssueLocation::new)
      .forEach(secondaryLocations::add);

    // create the issue
    if (!secondaryLocations.isEmpty()) {
      PreciseIssue issue = addIssue(superTree, MESSAGE_SUPER_BEFORE_THIS_OR_SUPER);
      secondaryLocations.forEach(issue::secondary);
    }
  }

  private void checkSuperHasCorrectNumberOfArguments(SuperTree superTree) {
    getEnclosingType(superTree).ifPresent(classTree -> {
      Tree superClassTree = classTree.extendsClause().superClass();
      // we consider only the simple case "class A extends B", not cases such as "class A extends class {} ..."
      if (superClassTree.is(Kind.IDENTIFIER_REFERENCE)) {
        Optional<Symbol> superClassSymbol = ((IdentifierTree) superClassTree).symbol();
        if (superClassSymbol.isPresent()) {
          compareNumberOfArguments(superTree, superClassSymbol.get());
        }
      }
    });
  }

  private void checkSuperInvokedOnlyOnce(MethodDeclarationTree tree, List<SuperTree> superTrees) {
    if (isConstructor(tree) && superTrees.size() > 1) {
      SuperTree firstSuper = superTrees.get(0);
      superTrees.stream()
        .skip(1)
        .forEach(s -> addIssue(s, MESSAGE_SUPER_INVOKED_ONCE).secondary(new IssueLocation(firstSuper)));
    }
  }

  private void pushSuperInvocation(SuperTree tree) {
    if (superInvocations.peek() != null) {
      superInvocations.peek().add(tree);
    }
  }

  private void compareNumberOfArguments(SuperTree superTree, Symbol superClassSymbol) {
    CallExpressionTree superCallTree = (CallExpressionTree) superTree.parent();
    boolean hasSpreadArgument = superCallTree.argumentClause().arguments().stream().anyMatch(t -> t.is(Kind.SPREAD_ELEMENT));
    if (hasSpreadArgument) {
      return;
    }
    getDeclarationTree(superClassSymbol)
      .flatMap(SuperInvocationCheck::getConstructor)
      .ifPresent(baseClassConstructor -> {
        int paramCount = baseClassConstructor.parameterList().size();
        long nonDefaultParamCount = baseClassConstructor.parameterList().stream()
          .filter(b -> !b.is(Kind.INITIALIZED_BINDING_ELEMENT)).count();
        int nbArguments = superCallTree.argumentClause().arguments().size();
        if (nbArguments < nonDefaultParamCount || nbArguments > paramCount) {
          String message = String.format(MESSAGE_SUPER_WITH_CORRECT_NUMBER_OF_ARGUMENTS, nonDefaultParamCount, nonDefaultParamCount == 1 ? "" : "s");
          addIssue(superCallTree, message).secondary(baseClassConstructor.parameterClause());
        }
      });
  }

  private static Optional<MethodDeclarationTree> getConstructor(ClassTree classTree) {
    return classTree.elements().stream()
      .filter(t -> t.is(Kind.METHOD))
      .map(t -> (MethodDeclarationTree) t)
      .filter(SuperInvocationCheck::isConstructor)
      .findAny();
  }

  /**
   * Returns the ClassTree, if any, where the specified symbol has been declared.
   * If the symbol has been declared more that once, returns any of these declarations.
   */
  private static Optional<ClassTree> getDeclarationTree(Symbol symbol) {
    Optional<Usage> tree = symbol.usages().stream()
      .filter(Usage::isDeclaration)
      .findFirst();
    if (tree.isPresent()) {
      IdentifierTree id = tree.get().identifierTree();
      Tree parent = id.parent();
      if (parent.is(Kind.CLASS_DECLARATION, Kind.CLASS_EXPRESSION)) {
        return Optional.of((ClassTree) parent);
      }
    }
    return Optional.empty();
  }

  /**
   * Returns true if the specified token (a "this" or a "super") comes before
   * the specified location, else returns false.
   */
  private static boolean isBefore(SyntaxToken token, int line, int column) {
    if (token.line() < line) {
      return true;
    }
    if (token.line() > line) {
      return false;
    }
    return token.column() < column;
  }

  private static boolean isInConstructor(Tree tree) {
    return getEnclosingConstructor(tree) != null;
  }

  private static boolean isInBaseClass(MethodDeclarationTree method) {
    return getEnclosingType(method).map(classTree -> classTree.extendsClause() == null).orElse(true);
  }

  /**
   * Returns true if the class of the specified method extends "null", else returns false.
   * It is assumed that the class is a derived class.
   */
  private static boolean isInDummyDerivedClass(MethodDeclarationTree method) {
    return getEnclosingType(method).map(classTree -> classTree.extendsClause().superClass().is(Kind.NULL_LITERAL)).orElse(false);
  }

  @CheckForNull
  private static MethodDeclarationTree getEnclosingConstructor(Tree tree) {
    FunctionTree function = (FunctionTree) CheckUtils.getFirstAncestor(tree, KindSet.FUNCTION_KINDS);
    if (function != null && isConstructor(function)) {
      return (MethodDeclarationTree) function;
    }
    return null;
  }

  private static boolean isConstructor(FunctionTree tree) {
    if (tree.is(Kind.METHOD)) {
      MethodDeclarationTree constructor = (MethodDeclarationTree) tree;
      Tree nameTree = constructor.name();
      if (nameTree.is(Kind.PROPERTY_IDENTIFIER)) {
        String name = ((IdentifierTree) nameTree).name();
        return "constructor".equals(name);
      }
    }
    return false;
  }

  private static Optional<ClassTree> getEnclosingType(Tree tree) {
    final Tree classBoundary = CheckUtils.getFirstAncestor(tree, Kind.CLASS_DECLARATION, Kind.CLASS_EXPRESSION, Kind.OBJECT_LITERAL);
    if (classBoundary.is(Kind.OBJECT_LITERAL)) {
      return Optional.empty();
    } else {
      return Optional.ofNullable((ClassTree) classBoundary);
    }
  }

  /**
   * An object to find the usages of "super" in a function.
   */
  private static class SuperDetector extends DoubleDispatchVisitor {

    private Set<SuperTree> collectionOfSupers = new HashSet<>();

    public Set<SuperTree> detectIn(FunctionTree function) {
      collectionOfSupers.clear();
      scan(function);
      return collectionOfSupers;
    }

    @Override
    public void visitSuper(SuperTree superTree) {
      collectionOfSupers.add(superTree);
    }

  }

  /**
   * An object to find the usages of "this" in a function.
   */
  private static class ThisDetector extends DoubleDispatchVisitor {

    private Set<IdentifierTree> collectionOfThiss = new HashSet<>();

    public Set<IdentifierTree> detectIn(FunctionTree function) {
      collectionOfThiss.clear();
      scan(function);
      return collectionOfThiss;
    }

    @Override
    public void visitIdentifier(IdentifierTree identifier) {
      if (identifier.is(Kind.THIS)) {
        collectionOfThiss.add(identifier);
      }
    }

  }

}
