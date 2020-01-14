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

import java.util.List;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.plugins.javascript.api.tree.SeparatedList;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ArrayLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectLiteralTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@JavaScriptRule
@Rule(key = "S3723")
public class MissingTrailingCommaCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Add a trailing comma to this item of the list.";

  @Override
  public void visitObjectLiteral(ObjectLiteralTree tree) {
    if (isMultiline(tree) && !endsWithComma(tree)) {
      raiseIssueOnLastElement(tree.properties());
    }

    super.visitObjectLiteral(tree);
  }

  @Override
  public void visitArrayLiteral(ArrayLiteralTree tree) {
    if (isMultiline(tree) && !endsWithComma(tree)) {
      raiseIssueOnLastElement(tree.elements());
    }
    
    super.visitArrayLiteral(tree);
  }

  private static boolean isMultiline(ObjectLiteralTree objectLiteral) {
    return isMultilineInternal(objectLiteral.properties(), objectLiteral.closeCurlyBraceToken());
  }

  private static boolean isMultiline(ArrayLiteralTree arrayLiteral) {
    return isMultilineInternal(arrayLiteral.elements(), arrayLiteral.closeBracketToken());
  }
  
  private static boolean isMultilineInternal(List<? extends Tree> list, SyntaxToken closingToken) {
    if (!list.isEmpty()) {
      Tree last = list.get(list.size() - 1);
      return last.lastToken().endLine() != closingToken.line();
    }
    return false;
  }
  
  private static boolean endsWithComma(ObjectLiteralTree objectLiteral) {
    SeparatedList<Tree> properties = objectLiteral.properties();
    return properties.size() == properties.getSeparators().size();
  }

  private static boolean endsWithComma(ArrayLiteralTree arrayLiteral) {
    Tree last = arrayLiteral.elementsAndCommas().get(arrayLiteral.elementsAndCommas().size() - 1);
    return last.is(Tree.Kind.TOKEN);
  }
  
  private void raiseIssueOnLastElement(List<? extends Tree> list) {
    addIssue(list.get(list.size() - 1), MESSAGE);
  }

}
