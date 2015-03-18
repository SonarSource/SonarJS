/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * dev@sonar.codehaus.org
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.javascript.checks;

import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.parser.LexerlessGrammar;

import com.sonar.sslr.api.AstNode;

@Rule(
  key = "NestedIfDepth",
  priority = Priority.MINOR,
  tags = {Tags.BRAIN_OVERLOAD})
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MINOR)
public class NestedControlFlowDepthCheck extends SquidCheck<LexerlessGrammar> {

  private int nestedLevel;

  private static final int DEFAULT_MAXIMUM_NESTING_LEVEL = 3;

  @RuleProperty(
    key = "maximumNestingLevel",
    defaultValue = "" + DEFAULT_MAXIMUM_NESTING_LEVEL)
  public int maximumNestingLevel = DEFAULT_MAXIMUM_NESTING_LEVEL;

  public int getMaximumNestingLevel() {
    return maximumNestingLevel;
  }

  @Override
  public void init() {
    subscribeTo(
      Kind.IF_STATEMENT,
      Kind.FOR_STATEMENT,
      Kind.FOR_IN_STATEMENT,
      Kind.WHILE_STATEMENT,
      Kind.DO_WHILE_STATEMENT,
      Kind.SWITCH_STATEMENT,
      Kind.TRY_STATEMENT);
  }

  @Override
  public void visitFile(AstNode astNode) {
    nestedLevel = 0;
  }

  @Override
  public void visitNode(AstNode astNode) {
    if (!isElseIf(astNode)) {
      nestedLevel++;
      if (nestedLevel == getMaximumNestingLevel() + 1) {
        getContext().createLineViolation(this, "Refactor this code to not nest more than {0} if/for/while/switch/try statements.",
          astNode,
          getMaximumNestingLevel());
      }
    }
  }

  @Override
  public void leaveNode(AstNode astNode) {
    if (!isElseIf(astNode)) {
      nestedLevel--;
    }
  }

  private boolean isElseIf(AstNode astNode) {
    return astNode.is(Kind.IF_STATEMENT) && astNode.getParent().is(Kind.ELSE_CLAUSE);
  }

}
