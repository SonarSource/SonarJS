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

import com.google.common.collect.ArrayListMultimap;
import com.google.common.collect.ImmutableSet;
import com.google.common.collect.ListMultimap;
import java.util.List;
import java.util.Set;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.ModuleTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.BracketMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.MemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.CaseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.DefaultClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.VariableDeclarationTree;
import org.sonar.plugins.javascript.api.tree.statement.VariableStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;

@Rule(
  key = "S3514",
  name = "Destructuring syntax should be used for assignments",
  priority = Priority.MAJOR,
  tags = {Tags.ES2015, Tags.CLUMSY})
@SqaleConstantRemediation("5min")
public class DestructuringAssignmentSyntaxCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Use destructuring syntax for these assignments from \"%s\".";

  private static final Set<String> ALLOWED_INDEXES = ImmutableSet.of("0", "1", "2", "3", "4");

  @Override
  public void visitBlock(BlockTree tree) {
    visitStatements(tree.statements());
    super.visitBlock(tree);
  }

  @Override
  public void visitCaseClause(CaseClauseTree tree) {
    visitStatements(tree.statements());
    super.visitCaseClause(tree);
  }

  @Override
  public void visitDefaultClause(DefaultClauseTree tree) {
    visitStatements(tree.statements());
    super.visitDefaultClause(tree);
  }

  @Override
  public void visitModule(ModuleTree tree) {
    visitStatements(tree.items());
    super.visitModule(tree);
  }

  private void visitStatements(List<? extends Tree> statements) {
    ListMultimap<String, Declaration> declarationsByObject = ArrayListMultimap.create();

    for (Tree statement : statements) {
      if (statement.is(Kind.VARIABLE_STATEMENT)) {
        VariableDeclarationTree declaration = ((VariableStatementTree) statement).declaration();
        visitVariableDeclaration(declarationsByObject, declaration);

      } else {
        checkDeclarationsBlock(declarationsByObject);
        declarationsByObject.clear();

      }
    }

    checkDeclarationsBlock(declarationsByObject);
  }

  private static void visitVariableDeclaration(ListMultimap<String, Declaration> declarationsByObject, VariableDeclarationTree declaration) {
    for (BindingElementTree bindingElement : declaration.variables()) {
      if (bindingElement.is(Kind.INITIALIZED_BINDING_ELEMENT)) {
        InitializedBindingElementTree initializedDeclaration = (InitializedBindingElementTree) bindingElement;
        visitInitializedDeclaration(declarationsByObject, declaration, initializedDeclaration);
      }
    }
  }

  private static void visitInitializedDeclaration(
    ListMultimap<String, Declaration> declarationsByObject,
    VariableDeclarationTree declaration,
    InitializedBindingElementTree initializedDeclaration
  ) {
    if (initializedDeclaration.left().is(Kind.BINDING_IDENTIFIER)) {
      String varName = ((IdentifierTree) initializedDeclaration.left()).name();

      if (initializedDeclaration.right().is(Kind.DOT_MEMBER_EXPRESSION)) {
        DotMemberExpressionTree dotMemberExpression = (DotMemberExpressionTree) initializedDeclaration.right();

        if (dotMemberExpression.property().name().equals(varName)) {
          addDeclaration(declarationsByObject, dotMemberExpression, declaration, initializedDeclaration);
        }

      } else if (initializedDeclaration.right().is(Kind.BRACKET_MEMBER_EXPRESSION)) {
        BracketMemberExpressionTree bracketMemberExpression = (BracketMemberExpressionTree) initializedDeclaration.right();

        if (bracketMemberExpression.property().is(Kind.NUMERIC_LITERAL) && ALLOWED_INDEXES.contains(((LiteralTree) bracketMemberExpression.property()).value())) {
          addDeclaration(declarationsByObject, bracketMemberExpression, declaration, initializedDeclaration);
        }
      }
    }
  }

  private static void addDeclaration(
    ListMultimap<String, Declaration> declarationsByObject,
    MemberExpressionTree memberExpression,
    VariableDeclarationTree declaration,
    InitializedBindingElementTree initializedBindingElement
  ) {
    declarationsByObject.put(CheckUtils.asString(memberExpression.object()), new Declaration(((JavaScriptTree) declaration).getKind(), initializedBindingElement));
  }

  private void checkDeclarationsBlock(ListMultimap<String, Declaration> declarationsByObject) {
    for (String objectName : declarationsByObject.keySet()) {
      List<Declaration> declarations = declarationsByObject.get(objectName);

      if (declarations.size() > 1 && sameDeclarationKind(declarations)) {
        PreciseIssue preciseIssue = addIssue(declarations.get(0).tree, String.format(MESSAGE, objectName));

        for (int i = 1; i < declarations.size(); i++) {
          preciseIssue.secondary(declarations.get(i).tree);
        }
      }
    }
  }

  private static boolean sameDeclarationKind(List<Declaration> declarations) {
    Kind firstKind = declarations.get(0).declarationKind;
    for (Declaration declaration : declarations) {
      if (declaration.declarationKind != firstKind) {
        return false;
      }
    }
    return true;
  }

  private static class Declaration {
    Kind declarationKind;
    InitializedBindingElementTree tree;

    public Declaration(Kind declarationKind, InitializedBindingElementTree tree) {
      this.declarationKind = declarationKind;
      this.tree = tree;
    }
  }
}
