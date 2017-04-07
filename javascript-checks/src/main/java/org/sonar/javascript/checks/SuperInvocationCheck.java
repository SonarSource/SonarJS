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

import java.util.Deque;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import javax.annotation.CheckForNull;

import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.tree.KindSet;
import org.sonar.javascript.tree.impl.expression.SuperTreeImpl;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ClassTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;

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
  private Deque<List<SuperTreeImpl>> superInvocations = new LinkedList<>();

  @Override
  public void visitScript(ScriptTree tree) {
    superInvocations.clear();

    super.visitScript(tree);
  }

  /**
   * Entry point for 3 of the 5 checks in this rule.
   */
  @Override
  public void visitSuper(SuperTreeImpl tree) {
    if (tree.getParent().is(Kind.CALL_EXPRESSION)) {
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

  private void checkSuperOnlyInvokedInDerivedClassConstructor(SuperTreeImpl superTree) {
    addIssue(superTree, MESSAGE_SUPER_ONLY_IN_DERIVED_CLASS_CONSTRUCTOR);
  }

  private void checkSuperInvokedInAnyDerivedClassConstructor(MethodDeclarationTree method) {
    if (isConstructor(method) && !isInBaseClass(method) && !isInDummyDerivedClass(method)) {
      Set<SuperTreeImpl> superTrees = new SuperDetector().detectIn(method);
      if (superTrees.stream().noneMatch(s -> s.getParent().is(Kind.CALL_EXPRESSION))) {
        addIssue(method.name(), MESSAGE_SUPER_REQUIRED_IN_ANY_DERIVED_CLASS_CONSTRUCTOR);
      }
    }
  }

  private void checkSuperInvokedBeforeThisOrSuper(SuperTreeImpl superTree) {
    int line = superTree.getFirstToken().line();
    int column = superTree.getFirstToken().column();
    MethodDeclarationTree method = getEnclosingConstructor(superTree);
    Set<IssueLocation> secondaryLocations = new HashSet<>();

    // get the usages of "super" before super()
    Set<SuperTreeImpl> superTrees = new SuperDetector().detectIn(method);
    superTrees.stream()
      .filter(s -> !s.getParent().is(Kind.CALL_EXPRESSION))
      .filter(s -> isBefore(s.getFirstToken(), line, column))
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

  private void checkSuperHasCorrectNumberOfArguments(SuperTreeImpl superTree) {
    getEnclosingType(superTree).ifPresent(classTree -> {
      ExpressionTree superClassTree = classTree.superClass();
      // we consider only the simple case "class A extends B", not cases such as "class A extends class {} ..."
      if (superClassTree.is(Kind.IDENTIFIER_REFERENCE)) {
        Symbol superClassSymbol = ((IdentifierTree) superClassTree).symbol();
        if (superClassSymbol != null) {
          compareNumberOfArguments(superTree, superClassSymbol);
        }
      }
    });
  }

  private void checkSuperInvokedOnlyOnce(MethodDeclarationTree tree, List<SuperTreeImpl> superTrees) {
    if (isConstructor(tree) && superTrees.size() > 1) {
      SuperTreeImpl firstSuper = superTrees.get(0);
      superTrees.stream()
        .skip(1)
        .forEach(s -> addIssue(s, MESSAGE_SUPER_INVOKED_ONCE).secondary(new IssueLocation(firstSuper)));
    }
  }

  private void pushSuperInvocation(SuperTreeImpl tree) {
    if (superInvocations.peek() != null) {
      superInvocations.peek().add(tree);
    }
  }

  private void compareNumberOfArguments(SuperTreeImpl superTree, Symbol superClassSymbol) {
    Optional<ClassTree> baseClassTree = getDeclarationTree(superClassSymbol);
    if (baseClassTree.isPresent()) {
      Optional<MethodDeclarationTree> baseClassConstructor = getConstructor(baseClassTree.get());
      if (baseClassConstructor.isPresent()) {
        Integer nbParams = baseClassConstructor.get().parameterList().size();
        int nbArguments = ((CallExpressionTree) superTree.getParent()).arguments().parameters().size();
        if (nbArguments != nbParams) {
          String message = String.format(MESSAGE_SUPER_WITH_CORRECT_NUMBER_OF_ARGUMENTS, nbParams, nbParams == 1 ? "" : "s");
          addIssue(CheckUtils.parent(superTree), message).secondary(baseClassConstructor.get().parameterClause());
        }
      }
    }
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
      Tree parent = CheckUtils.parent(id);
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
    return getEnclosingType(method).map(classTree -> classTree.extendsToken() == null).orElse(true);
  }

  /**
   * Returns true if the class of the specified method extends "null", else returns false.
   * It is assumed that the class is a derived class.
   */
  private static boolean isInDummyDerivedClass(MethodDeclarationTree method) {
    return getEnclosingType(method).map(classTree -> classTree.superClass().is(Kind.NULL_LITERAL)).orElse(false);
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
      if (nameTree.is(Kind.IDENTIFIER_NAME)) {
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

    private Set<SuperTreeImpl> collectionOfSupers = new HashSet<>();

    public Set<SuperTreeImpl> detectIn(FunctionTree function) {
      collectionOfSupers.clear();
      scan(function);
      return collectionOfSupers;
    }

    @Override
    public void visitSuper(SuperTreeImpl superTree) {
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
