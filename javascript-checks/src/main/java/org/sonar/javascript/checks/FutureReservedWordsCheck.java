/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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
import java.util.List;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.symbols.Symbol;

@Rule(key = "FutureReservedWords")
public class FutureReservedWordsCheck extends AbstractSymbolNameCheck {

  private static final String MESSAGE = "Rename \"%s\" identifier to prevent potential conflicts with future evolutions of the JavaScript language.";

  private static final List<String> FUTURE_RESERVED_WORDS = ImmutableList.of(
    "implements",
    "interface",
    "package",
    "private",
    "protected",
    "public",
    "enum",
    "class",
    "const",
    "export",
    "extends",
    "import",
    "super",
    "let",
    "static",
    "yield",
    "await"
  );

  @Override
  List<String> illegalNames() {
    return FUTURE_RESERVED_WORDS;
  }

  @Override
  String getMessage(Symbol symbol) {
    return String.format(MESSAGE, symbol.name());
  }
}
