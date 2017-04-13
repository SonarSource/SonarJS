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
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.ParameterListTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.declaration.ClassTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectLiteralTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.CatchBlockTree;
import org.sonar.plugins.javascript.api.tree.statement.DoWhileStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ElseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.FinallyBlockTree;
import org.sonar.plugins.javascript.api.tree.statement.ForObjectStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.IfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.TryStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.WhileStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.WithStatementTree;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

@Rule(key = "S1105")
public class OpenCurlyBracesAtEOLCheck extends SubscriptionVisitorCheck {

  @Override
  public Set<Kind> nodesToVisit() {
    return ImmutableSet.of(Kind.BLOCK, Kind.OBJECT_LITERAL, Kind.SWITCH_STATEMENT, Kind.CLASS_DECLARATION, Kind.CLASS_EXPRESSION);
  }

  @Override
  public void visitNode(Tree tree) {
    if (tree.is(Kind.BLOCK)) {
      BlockTree body = (BlockTree) tree;
      Tree parent = body.parent();
      SyntaxToken openCurly = body.openCurlyBraceToken();
      openCurly.column();
      checkFunction(parent, openCurly);
      checkConditional(parent, openCurly);
      checkLoop(parent, openCurly);
      checkTryCatchFinally(body, parent, openCurly);
      checkWith(parent, openCurly);
    }
    if (tree.is(Kind.OBJECT_LITERAL)) {
      ObjectLiteralTree objectLiteral = (ObjectLiteralTree) tree;
      SyntaxToken openCurly = objectLiteral.openCurlyBraceToken();
      Tree parent = objectLiteral.parent();
      checkAssignment(openCurly, parent);
    }
    if (tree.is(Kind.SWITCH_STATEMENT)) {
      checkSwitch((SwitchStatementTree) tree);
    }
    if (tree.is(Kind.CLASS_DECLARATION, Kind.CLASS_EXPRESSION)) {
      checkClass((ClassTree) tree);
    }
  }

  private void checkAssignment(SyntaxToken openCurly, Tree parent) {
    if (parent.is(Kind.INITIALIZED_BINDING_ELEMENT)) {
      issueIfLineMismatch(openCurly, ((InitializedBindingElementTree) parent).equalToken());
    }
  }

  private void checkClass(ClassTree classTree) {
    if (classTree.extendsToken() != null) {
      issueIfLineMismatch(classTree.openCurlyBraceToken(), classTree.extendsToken());
    } else {
      issueIfLineMismatch(classTree.openCurlyBraceToken(), classTree.classToken());
    }
  }

  private void checkSwitch(SwitchStatementTree switchStatement) {
    issueIfLineMismatch(switchStatement.openCurlyBraceToken(), switchStatement.closeParenthesisToken());
  }

  private void checkWith(Tree parent, SyntaxToken openCurly) {
    if (parent.is(Kind.WITH_STATEMENT)) {
      issueIfLineMismatch(openCurly, ((WithStatementTree) parent).closingParenthesisToken());
    }
  }

  private void checkTryCatchFinally(BlockTree body, Tree parent, SyntaxToken openCurly) {
    if (parent.is(Kind.TRY_STATEMENT)) {
      TryStatementTree tryStatementTree = (TryStatementTree) parent;
      if (tryStatementTree.block().equals(body)) {
        issueIfLineMismatch(openCurly, tryStatementTree.tryKeyword());
      }
    }
    if (parent.is(Kind.CATCH_BLOCK)) {
      issueIfLineMismatch(openCurly, ((CatchBlockTree) parent).catchKeyword());
    }
    if (parent.is(Kind.FINALLY_BLOCK)) {
      issueIfLineMismatch(openCurly, ((FinallyBlockTree) parent).finallyKeyword());
    }
  }

  private void checkLoop(Tree parent, SyntaxToken openCurly) {
    if (parent.is(Kind.DO_WHILE_STATEMENT)) {
      issueIfLineMismatch(openCurly, ((DoWhileStatementTree) parent).doKeyword());
    }
    if (parent.is(Kind.WHILE_STATEMENT)) {
      issueIfLineMismatch(openCurly, ((WhileStatementTree) parent).closeParenthesisToken());
    }
    if (parent.is(Kind.FOR_STATEMENT)) {
      issueIfLineMismatch(openCurly, ((ForStatementTree) parent).closeParenthesisToken());
    }
    if (parent.is(Kind.FOR_IN_STATEMENT, Kind.FOR_OF_STATEMENT)) {
      issueIfLineMismatch(openCurly, ((ForObjectStatementTree) parent).closeParenthesisToken());
    }
  }

  private void checkConditional(Tree parent, SyntaxToken openCurly) {
    if (parent.is(Kind.IF_STATEMENT)) {
      issueIfLineMismatch(openCurly, ((IfStatementTree) parent).closeParenthesisToken());
    }
    if (parent.is(Kind.ELSE_CLAUSE)) {
      issueIfLineMismatch(openCurly, ((ElseClauseTree) parent).elseKeyword());
    }
  }

  private void checkFunction(Tree parent, SyntaxToken openCurly) {
    if (parent.is(Kind.FUNCTION_DECLARATION, Kind.METHOD, Kind.GENERATOR_DECLARATION, Kind.FUNCTION_EXPRESSION, Kind.GENERATOR_FUNCTION_EXPRESSION)) {
      issueIfLineMismatch(openCurly, getParameterList((FunctionTree) parent).closeParenthesisToken());
    }
    if (parent.is(Kind.ARROW_FUNCTION)) {
      issueIfLineMismatch(openCurly, ((ArrowFunctionTree) parent).doubleArrowToken());
    }
  }

  private static ParameterListTree getParameterList(FunctionTree parent) {
    return (ParameterListTree) parent.parameterClause();
  }

  private void issueIfLineMismatch(SyntaxToken curlyBrace, SyntaxToken target) {
    CodeLine curlyBraceLine = new CodeLine(curlyBrace.line());
    if (curlyBraceLine.isJustBelow(target.line())) {
      addIssue(new PreciseIssue(this, new IssueLocation(curlyBrace, "Move this open curly brace to the end of the previous line.")));
    } else if (curlyBraceLine.isFarBelow(target.line())) {
      addIssue(new PreciseIssue(this, new IssueLocation(curlyBrace, "Move this open curly brace to the end of line " + target.line() + ".")));
    }
  }

  private static class CodeLine {
    private final int line;

    CodeLine(int line) {
      this.line = line;
    }

    boolean isJustBelow(int line) {
      return this.line == line + 1;
    }

    boolean isFarBelow(int line) {
      return this.line > line + 1;
    }
  }
}
