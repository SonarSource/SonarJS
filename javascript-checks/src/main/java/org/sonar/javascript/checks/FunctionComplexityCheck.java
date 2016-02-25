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

import java.util.List;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.metrics.ComplexityVisitor;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleLinearWithOffsetRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "FunctionComplexity",
  name = "Functions should not be too complex",
  priority = Priority.MAJOR,
  tags = {Tags.BRAIN_OVERLOAD})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.UNIT_TESTABILITY)
@SqaleLinearWithOffsetRemediation(
  coeff = "1min",
  offset = "10min",
  effortToFixDescription = "per complexity point above the threshold")
public class FunctionComplexityCheck extends AbstractFunctionSizeCheck {

  private static final String MESSAGE = "Function has a complexity of %s which is greater than %s authorized.";

  private static final int DEFAULT_MAXIMUM_FUNCTION_COMPLEXITY_THRESHOLD = 10;

  @RuleProperty(
    key = "maximumFunctionComplexityThreshold",
    description = "The maximum authorized complexity in function",
    defaultValue = "" + DEFAULT_MAXIMUM_FUNCTION_COMPLEXITY_THRESHOLD)
  private int maximumFunctionComplexityThreshold = DEFAULT_MAXIMUM_FUNCTION_COMPLEXITY_THRESHOLD;

  @Override
  void checkFunction(Tree functionTree) {
    List<Tree> complexityTrees = new ComplexityVisitor().complexityTrees(functionTree);
    if (complexityTrees.size() > maximumFunctionComplexityThreshold) {
      raiseIssue(functionTree, complexityTrees);
    }
  }

  private void raiseIssue(Tree tree, List<Tree> complexityTrees) {
    int complexity = complexityTrees.size();
    String message = String.format(MESSAGE, complexity, maximumFunctionComplexityThreshold);

    Tree primaryLocationTree = complexityTrees.get(0);
    if (tree.is(Kind.FUNCTION_DECLARATION)) {
      primaryLocationTree = ((FunctionDeclarationTree) tree).name();
    }

    PreciseIssue issue = addIssue(primaryLocationTree, message);

    for (Tree complexityTree : complexityTrees) {
      issue.secondary(complexityTree, "+1");
    }

    issue.cost((double) complexity - maximumFunctionComplexityThreshold);
  }

  public void setMaximumFunctionComplexityThreshold(int threshold) {
    this.maximumFunctionComplexityThreshold = threshold;
  }

}
