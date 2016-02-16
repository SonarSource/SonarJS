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

import com.google.common.collect.ImmutableList;
import java.util.List;
import org.sonar.api.server.rule.RulesDefinition.SubCharacteristics;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.statement.VariableDeclarationTree;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "S3504",
  name = "Variables should be declared with \"let\" or \"const\"",
  priority = Priority.MAJOR,
  tags = {Tags.BAD_PRACTICE, Tags.ES2015})
@SqaleSubCharacteristic(SubCharacteristics.UNDERSTANDABILITY)
@SqaleConstantRemediation("5min")
public class VarDeclarationCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "Replace \"var\" with \"let\" or \"const\"";

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.of(Kind.VAR_DECLARATION);
  }

  @Override
  public void visitNode(Tree tree) {
    newIssue(((VariableDeclarationTree) tree).token(), MESSAGE);
  }

}
