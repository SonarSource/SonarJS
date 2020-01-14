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

import com.google.common.collect.ImmutableList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.SymbolModel;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.symbols.Usage.Kind;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@JavaScriptRule
@Rule(key = "S2424")
public class BuiltInObjectOverriddenCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Remove this override of \"%s\".";

  private static final Set<Usage.Kind> ILLEGAL_USAGE_KINDS = EnumSet.of(
    Kind.DECLARATION,
    Kind.DECLARATION_WRITE,
    Kind.LEXICAL_DECLARATION,
    Kind.WRITE,
    Kind.READ_WRITE);

  private static final List<String> BUILD_IN_OBJECTS = ImmutableList.of(
    "Object",
    "Function",
    "Boolean",
    "Symbol",
    "Error",
    "EvalError",
    "InternalError",
    "RangeError",
    "ReferenceError",
    "SyntaxError",
    "TypeError",
    "URIError",
    "Number",
    "Math",
    "Date",
    "String",
    "RegExp",
    "Array",
    "Int8Array",
    "Uint8Array",
    "Uint8ClampedArray",
    "Int16Array",
    "Unit16Array",
    "Int32Array",
    "Uint32Array",
    "Float32Array",
    "Float64Array",
    "Map",
    "Set",
    "WeakMap",
    "WeakSet",
    "ArrayBuffer",
    "DataView",
    "JSON",
    "Promise",
    "Reflect",
    "Proxy",
    "Intl",
    "Generator",
    "Iterator",
    "ParallelArray",
    "StopIteration"
  );

  @Override
  public void visitScript(ScriptTree tree) {
    SymbolModel symbolModel = getContext().getSymbolModel();
    for (String name : BUILD_IN_OBJECTS) {
      for (Symbol symbol : symbolModel.getSymbols(name)) {
        checkSymbol(symbol);
      }
    }

  }

  private void checkSymbol(Symbol symbol) {
    for (Usage usage : symbol.usages()) {
      if (ILLEGAL_USAGE_KINDS.contains(usage.kind())) {
        addIssue(usage.identifierTree(), String.format(MESSAGE, symbol.name()));
        return;
      }
    }
  }

}
