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

import java.util.EnumSet;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Symbol.Kind;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@JavaScriptRule
@Rule(key = "S3798")
public class DeclarationInGlobalScopeCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Define this declaration in a local scope or bind explicitly the property to the global object.";

  private static Set<Kind> kindsNotToBeChecked = EnumSet.of(
    Kind.CONST_VARIABLE,
    Kind.LET_VARIABLE,
    Kind.CLASS,
    Kind.IMPORT,
    Kind.FLOW_TYPE,
    Kind.FLOW_GENERIC_TYPE
  );

  @Override
  public void visitScript(ScriptTree tree) {
    for (Symbol symbol : getContext().getSymbolModel().getSymbols()) {
      if (symbol.scope().isGlobal() && !kindsNotToBeChecked.contains(symbol.kind()) && !symbol.external()) {
        checkSymbol(symbol);
      }
    }
  }

  private void checkSymbol(Symbol symbol) {
    for (Usage usage : symbol.usages()) {
      if (usage.isDeclaration()) {
        addIssue(usage.identifierTree(), MESSAGE);
        // we raise at most one issue per symbol
        return;
      }
    }
  }

}
