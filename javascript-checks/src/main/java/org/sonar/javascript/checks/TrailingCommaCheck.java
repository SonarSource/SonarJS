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
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.plugins.javascript.api.tree.SeparatedList;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ArrayLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectLiteralTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonarsource.analyzer.commons.annotations.DeprecatedRuleKey;

/**
 * http://stackoverflow.com/questions/7246618/trailing-commas-in-javascript
 */
@JavaScriptRule
@Rule(key = "S1537")
@DeprecatedRuleKey(ruleKey = "TrailingComma")
public class TrailingCommaCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Remove this trailing comma.";

  @Override
  public void visitObjectLiteral(ObjectLiteralTree tree) {
    SeparatedList<Tree> separatedList = tree.properties();
    int listSize = separatedList.size();
    if (listSize > 0 && listSize == separatedList.getSeparators().size()) {
      Tree trailingComma = separatedList.getSeparator(listSize - 1);
      raiseIssue(trailingComma);
    }
    super.visitObjectLiteral(tree);
  }

  @Override
  public void visitArrayLiteral(ArrayLiteralTree tree) {
    List<Tree> elementsAndCommas = tree.elementsAndCommas();
    if (!elementsAndCommas.isEmpty()) {
      Tree last = elementsAndCommas.get(elementsAndCommas.size() - 1);
      if (last.is(Kind.TOKEN)) {
        raiseIssue(last);
      }
    }
    super.visitArrayLiteral(tree);
  }

  private void raiseIssue(Tree trailingComma) {
    addIssue(trailingComma, MESSAGE);
  }

}
