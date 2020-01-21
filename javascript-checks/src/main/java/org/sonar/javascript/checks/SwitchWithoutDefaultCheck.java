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

import com.google.common.collect.Iterables;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.statement.DefaultClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonarsource.analyzer.commons.annotations.DeprecatedRuleKey;

@JavaScriptRule
@Rule(key = "S131")
@DeprecatedRuleKey(ruleKey = "SwitchWithoutDefault")
public class SwitchWithoutDefaultCheck extends DoubleDispatchVisitorCheck {

  private static final String ADD_DEFAULT_MESSAGE = "Add a \"default\" clause to this \"switch\" statement.";
  private static final String MOVE_DEFAULT_MESSAGE = "Move this \"default\" clause to the end of this \"switch\" statement.";

  @Override
  public void visitSwitchStatement(SwitchStatementTree tree) {
    DefaultClauseTree defaultClause = getDefaultClause(tree);
    if (defaultClause == null) {
      addIssue(tree.switchKeyword(), ADD_DEFAULT_MESSAGE);

    } else if (!Iterables.getLast(tree.cases()).is(Kind.DEFAULT_CLAUSE)) {
      addIssue(defaultClause.keyword(), MOVE_DEFAULT_MESSAGE);
    }
    super.visitSwitchStatement(tree);
  }

  private static DefaultClauseTree getDefaultClause(SwitchStatementTree switchStmt) {
    for (SwitchClauseTree clause : switchStmt.cases()) {

      if (clause.is(Kind.DEFAULT_CLAUSE)) {
        return (DefaultClauseTree) clause;
      }
    }
    return null;
  }

}
