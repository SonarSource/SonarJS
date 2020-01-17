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

import com.google.common.collect.ImmutableSet;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.javascript.tree.KindSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.MemberExpressionTree;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

@JavaScriptRule
@Rule(key = "S2990")
public class GlobalThisCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "Remove the use of \"this\".";
  private int scopeLevel = 0;

  @Override
  public Set<Kind> nodesToVisit() {
    return ImmutableSet.<Kind>builder()
      .addAll(KindSet.FUNCTION_KINDS.getSubKinds())
      .add(Kind.CLASS_DECLARATION)
      .add(Kind.CLASS_EXPRESSION)
      .add(Tree.Kind.DOT_MEMBER_EXPRESSION)
      .build();
  }

  @Override
  public void visitNode(Tree tree) {
    if (tree.is(Tree.Kind.DOT_MEMBER_EXPRESSION)) {
      ExpressionTree object = ((MemberExpressionTree) tree).object();
      if (object.is(Tree.Kind.THIS) && scopeLevel == 0) {
        addIssue(object, MESSAGE);
      }
      return;
    }

    scopeLevel++;
  }

  @Override
  public void leaveNode(Tree tree) {
    if (!tree.is(Tree.Kind.DOT_MEMBER_EXPRESSION)) {
      scopeLevel--;
    }
  }
}
