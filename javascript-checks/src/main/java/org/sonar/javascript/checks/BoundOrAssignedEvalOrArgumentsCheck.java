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

import com.google.common.collect.ImmutableList;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import java.util.List;

@Rule(
  key = "BoundOrAssignedEvalOrArguments",
  name = "\"eval\" and \"arguments\" should not be bound or assigned",
  priority = Priority.CRITICAL,
  tags = {Tags.BUG})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.INSTRUCTION_RELIABILITY)
@SqaleConstantRemediation("10min")
public class BoundOrAssignedEvalOrArgumentsCheck extends AbstractSymbolNameCheck {

  private static final String DECLARATION_MESSAGE = "Do not use \"%s\" to declare a %s - use another name.";
  private static final String MODIFICATION_MESSAGE = "Remove the modification of \"%s\".";

  @Override
  List<String> illegalNames() {
    return ImmutableList.of("eval", "arguments");
  }

  @Override
  String getMessage(Symbol symbol) {
    return null;
  }

  @Override
  public void visitScript(ScriptTree tree) {
    for (Symbol symbol : getIllegalSymbols()) {
      if (symbol.is(Symbol.Kind.PARAMETER) || !symbol.builtIn()) {
        raiseIssuesOnDeclarations(this, symbol, String.format(DECLARATION_MESSAGE, symbol.name(), symbol.kind().getValue()));
      } else {
        raiseIssuesOnWriteUsages(symbol);
      }
    }
  }

  private void raiseIssuesOnWriteUsages(Symbol symbol) {
    for (Usage usage : symbol.usages()) {
      if (!usage.kind().equals(Usage.Kind.READ)) {
        getContext().addIssue(this, usage.identifierTree(), String.format(MODIFICATION_MESSAGE, symbol.name()));
      }
    }
  }

}
