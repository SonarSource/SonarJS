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

import java.util.Iterator;
import org.sonar.api.server.rule.RulesDefinition.SubCharacteristics;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "S3513",
  name = "\"arguments\" should not be accessed directly",
  priority = Priority.MAJOR,
  tags = {Tags.ES2015, Tags.API_DESIGN})
@SqaleSubCharacteristic(SubCharacteristics.UNDERSTANDABILITY)
@SqaleConstantRemediation("5min")
public class ArgumentsUsageCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Use the rest syntax to declare this function's arguments.";

  @Override
  public void visitScript(ScriptTree tree) {
    for (Symbol argumentsSymbol : getContext().getSymbolModel().getSymbols("arguments")) {
      if (argumentsSymbol.builtIn() && !argumentsSymbol.usages().isEmpty()) {

        Iterator<Usage> usageIterator = argumentsSymbol.usages().iterator();
        PreciseIssue preciseIssue = newIssue(usageIterator.next().identifierTree(), MESSAGE);

        while (usageIterator.hasNext()) {
          preciseIssue.secondary(usageIterator.next().identifierTree());
        }
      }
    }
  }
}
