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
import org.sonar.javascript.api.SymbolModel;
import org.sonar.javascript.ast.resolve.Symbol;
import org.sonar.javascript.ast.visitors.BaseTreeVisitor;
import org.sonar.javascript.model.interfaces.declaration.ScriptTree;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import java.util.LinkedList;
import java.util.List;

@Rule(
  key = "S2424",
  name = "Built-in objects should not be overridden",
  priority = Priority.CRITICAL,
  tags = {Tags.BUG, Tags.CONFUSING})
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.INSTRUCTION_RELIABILITY)
@SqaleConstantRemediation("20min")
public class BuildInObjectOverriddenCheck extends BaseTreeVisitor {

  private static final String MESSAGE = "Remove this override of \"%s\".";

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
    List<Symbol> symbols = getSymbols();
    for (Symbol symbol : symbols) {
      getContext().addIssue(this, symbol.declaration().tree(), String.format(MESSAGE, symbol.name()));
    }
  }

  public List<Symbol> getSymbols() {
    SymbolModel symbolModel = getContext().getSymbolModel();
    List<Symbol> symbols = new LinkedList<>();
    for (String name : BUILD_IN_OBJECTS){
      symbols.addAll(symbolModel.getSymbols(name));
    }
    return symbols;
  }
}
