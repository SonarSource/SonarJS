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
package org.sonar.javascript.se;

import org.junit.Test;
import org.sonar.javascript.se.Relation.Operator;
import org.sonar.plugins.javascript.api.symbols.Symbol;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

public class RelationOnSymbolsTest {

  private static final Operator OP1 = Operator.GREATER_THAN;
  private static final Operator OP2 = Operator.LESS_THAN;
  private static final Symbol SYMBOL1 = mock(Symbol.class);
  private static final Symbol SYMBOL2 = mock(Symbol.class);

  @Test
  public void equals_and_hashCode() throws Exception {
    assertThat(new RelationOnSymbols(OP1, SYMBOL1, SYMBOL2)).isEqualTo(new RelationOnSymbols(OP1, SYMBOL1, SYMBOL2));
    assertThat(new RelationOnSymbols(OP1, SYMBOL1, SYMBOL2)).isNotEqualTo(new RelationOnSymbols(OP2, SYMBOL1, SYMBOL2));
    assertThat(new RelationOnSymbols(OP1, SYMBOL1, SYMBOL2)).isNotEqualTo(new RelationOnSymbols(OP1, SYMBOL1, SYMBOL1));
    assertThat(new RelationOnSymbols(OP1, SYMBOL1, SYMBOL2)).isNotEqualTo(new RelationOnSymbols(OP1, SYMBOL2, SYMBOL2));
    assertThat(new RelationOnSymbols(OP1, SYMBOL1, SYMBOL2)).isNotEqualTo(null);

    assertThat(new RelationOnSymbols(OP1, SYMBOL1, SYMBOL2).hashCode())
      .isEqualTo(new RelationOnSymbols(OP1, SYMBOL1, SYMBOL2).hashCode());
  }

}
