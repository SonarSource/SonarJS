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
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

import static org.sonar.plugins.javascript.api.tree.Tree.Kind.INSTANCE_OF;
import static org.sonar.plugins.javascript.api.tree.Tree.Kind.LOGICAL_COMPLEMENT;
import static org.sonar.plugins.javascript.api.tree.Tree.Kind.RELATIONAL_IN;

@JavaScriptRule
@Rule(key = "S3812")
public class InstanceofInMisuseCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "Add parentheses to perform \"%s\" operator before logical NOT operator.";

  @Override
  public Set<Kind> nodesToVisit() {
    return ImmutableSet.of(INSTANCE_OF, RELATIONAL_IN);
  }

  @Override
  public void visitNode(Tree tree) {
    BinaryExpressionTree expression = (BinaryExpressionTree) tree;
    if (expression.leftOperand().is(LOGICAL_COMPLEMENT)) {
      addIssue(tree, String.format(MESSAGE, expression.operatorToken().text()));
    }
  }
}
