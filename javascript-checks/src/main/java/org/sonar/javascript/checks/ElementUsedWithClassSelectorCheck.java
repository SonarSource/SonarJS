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

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Rule(
  key = "S2714",
  name = "Element type selectors should not be used with class selectors",
  priority = Priority.MAJOR,
  tags = {Tags.JQUERY, Tags.PERFORMANCE, Tags.USER_EXPERIENCE})
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.CPU_EFFICIENCY)
@SqaleConstantRemediation("2min")
public class ElementUsedWithClassSelectorCheck extends AbstractJQuerySelectorOptimizationCheck {

  private static final String MESSAGE = "Remove \"%s\" in this selector.";
  private static final Pattern elementUsedWithClassSelectorPattern = Pattern.compile("(\\w+)\\.([\\w_-]+)");

  @Override
  protected void visitSelector(String selector, Tree tree) {
    Matcher matcher = elementUsedWithClassSelectorPattern.matcher(selector);
    if (matcher.matches()){
      getContext().addIssue(this, tree, String.format(MESSAGE, matcher.group(1)));
    }
  }
}
