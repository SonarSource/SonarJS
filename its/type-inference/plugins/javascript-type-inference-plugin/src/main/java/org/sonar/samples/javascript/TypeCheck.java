/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2015-2016 SonarSource SA
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
package org.sonar.samples.javascript;

import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;

@Rule(
  key = "type",
  name = "Potential type for symbol",
  description = "This rule triggers an issue for every possible type found on a symbol",
  priority = Priority.MAJOR)
public class TypeCheck extends BaseTreeVisitor {

  @Override
  public void visitScript(ScriptTree tree) {
    for (Symbol s : getContext().getSymbolModel().getSymbols()) {
      TypeStatistics.increaseSymbol(s.types().size());

      if (!s.builtIn()) {
        for (Type type : s.types()) {

          if (type.kind() != Type.Kind.UNKNOWN) {
            getContext().addIssue(this, getSymbolReference(s), String.format("\"%s\"  =>  type %s  -  within %s.", s.name(), type.kind(), s.types().toString()));
          }
        }
      }
    }
  }

  private static Tree getSymbolReference(Symbol s) {
    for (Usage u : s.usages()) {

      if (u.isDeclaration()) {
        return u.identifierTree();
      }
    }
    return s.usages().iterator().next().identifierTree();
  }
}
