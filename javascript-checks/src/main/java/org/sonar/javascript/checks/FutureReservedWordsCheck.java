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

import com.google.common.collect.ImmutableSet;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.ast.resolve.Symbol;
import org.sonar.javascript.ast.resolve.SymbolModel;
import org.sonar.javascript.ast.visitors.BaseTreeVisitor;
import org.sonar.javascript.model.interfaces.declaration.ScriptTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import java.util.List;
import java.util.Set;

@Rule(
  key = "FutureReservedWords",
  name = "\"future reserved words\" should not be used as identifiers",
  priority = Priority.CRITICAL,
  tags = {Tags.LOCK_IN, Tags.PITFALL})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.LANGUAGE_RELATED_PORTABILITY)
@SqaleConstantRemediation("5min")
public class FutureReservedWordsCheck extends BaseTreeVisitor {

  private static final boolean ECMASCRIPT6_DEFAULT = false;

  @RuleProperty(
      key = "ecmascript6",
      description = "Whether use ECMAScript 5 or 6 list of future reserved words",
      defaultValue = "" + ECMASCRIPT6_DEFAULT)
  private boolean ecmascript6 = ECMASCRIPT6_DEFAULT;

  private static final String MESSAGE = "Rename \"%s\" identifier to prevent potential conflicts with future evolutions of the JavaScript language.";

  private static final Set<String> COMMON_FUTURE_RESERVED_WORDS = ImmutableSet.of(
      "implements",
      "interface",
      "package",
      "private",
      "protected",
      "public",
      "enum"
  );

  private static final Set<String> ES5_FUTURE_RESERVED_WORDS = ImmutableSet.of(
      "class",
      "const",
      "export",
      "extends",
      "import",
      "super",
      "let",
      "static",
      "yield"
  );

  private static final Set<String> ES6_FUTURE_RESERVED_WORDS = ImmutableSet.of(
      "await"
  );

  public void setEcmascript6(boolean value){
    ecmascript6 = value;
  }

  @Override
  public void visitScript(ScriptTree tree) {
    SymbolModel symbolModel = getContext().getSymbolModel();
    List<Symbol> symbols = symbolModel.getSymbols();
    for (Symbol symbol : symbols) {
      if (COMMON_FUTURE_RESERVED_WORDS.contains(symbol.name())) {
        assIssue(symbol);
      } else if ((ecmascript6 && ES6_FUTURE_RESERVED_WORDS.contains(symbol.name())) || (!ecmascript6 && ES5_FUTURE_RESERVED_WORDS.contains(symbol.name()))){
        assIssue(symbol);
      }

    }
  }

  private void assIssue(Symbol symbol) {
    getContext().addIssue(this, symbol.getFirstDeclaration().tree(), String.format(MESSAGE, symbol.name()));
  }

}
