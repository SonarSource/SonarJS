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
package org.sonar.javascript.se;

import com.google.common.annotations.VisibleForTesting;
import com.google.common.collect.ImmutableMap;
import java.util.Map.Entry;
import javax.annotation.Nullable;
import org.sonar.plugins.javascript.api.symbols.Symbol;

public class ProgramState {

  @VisibleForTesting
  protected final ImmutableMap<Symbol, SymbolicValue> valuesBySymbol;

  private static final ProgramState EMPTY = new ProgramState(ImmutableMap.<Symbol, SymbolicValue>of());

  public static ProgramState emptyState() {
    return EMPTY;
  }

  private ProgramState(ImmutableMap<Symbol, SymbolicValue> valuesBySymbol) {
    this.valuesBySymbol = valuesBySymbol;
  }

  public ProgramState copyAndAddValue(Symbol symbol, SymbolicValue value) {
    ImmutableMap.Builder<Symbol, SymbolicValue> builder = ImmutableMap.<Symbol, SymbolicValue>builder();
    for (Entry<Symbol, SymbolicValue> entry : valuesBySymbol.entrySet()) {
      if (!entry.getKey().equals(symbol)) {
        builder.put(entry.getKey(), entry.getValue());
      }
    }
    builder.put(symbol, value);
    return new ProgramState(builder.build());
  }

  public SymbolicValue get(Symbol symbol) {
    return valuesBySymbol.get(symbol);
  }

  public ProgramState constrain(Symbol symbol, Truthiness truthiness) {
    SymbolicValue value = get(symbol);
    if (value == null) {
      return this;
    }
    return copyAndAddValue(symbol, value.constrain(truthiness));
  }

  public ProgramState constrain(Symbol symbol, @Nullable Nullability nullability) {
    SymbolicValue value = get(symbol);
    if (value == null || nullability == null) {
      return this;
    }
    return copyAndAddValue(symbol, value.constrain(nullability));
  }

  @Override
  public int hashCode() {
    return valuesBySymbol.hashCode();
  }

  @Override
  public boolean equals(Object obj) {
    if (obj == null || getClass() != obj.getClass()) {
      return false;
    }
    ProgramState other = (ProgramState) obj;
    return this.valuesBySymbol.equals(other.valuesBySymbol);
  }

}
