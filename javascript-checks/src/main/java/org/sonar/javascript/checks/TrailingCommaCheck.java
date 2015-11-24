/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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

import java.util.List;

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.tree.impl.SeparatedList;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ArrayLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectLiteralTree;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import com.google.common.collect.ImmutableList;

/**
 * http://stackoverflow.com/questions/7246618/trailing-commas-in-javascript
 */
@Rule(
  key = "TrailingComma",
  name = "Trailing commas should not be used",
  priority = Priority.BLOCKER,
  tags = {Tags.CROSS_BROWSER})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.INSTRUCTION_RELIABILITY)
@SqaleConstantRemediation("1min")
public class TrailingCommaCheck extends BaseTreeVisitor {

  private static final String MESSAGE = "Avoid trailing comma in array and object literals.";

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
    getContext().addIssue(this, new IssueLocation(trailingComma, MESSAGE), ImmutableList.<IssueLocation>of(), null);
  }

}
