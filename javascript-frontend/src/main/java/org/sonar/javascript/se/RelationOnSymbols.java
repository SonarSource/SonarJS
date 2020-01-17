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

import java.util.Objects;
import org.sonar.javascript.se.Relation.Operator;
import org.sonar.plugins.javascript.api.symbols.Symbol;

public class RelationOnSymbols {

  private final Operator operator;
  private final Symbol leftOperand;
  private final Symbol rightOperand;

  public RelationOnSymbols(Relation.Operator operator, Symbol leftOperand, Symbol rightOperand) {
    this.operator = operator;
    this.leftOperand = leftOperand;
    this.rightOperand = rightOperand;
  }

  @Override
  public boolean equals(Object obj) {
    if (obj instanceof RelationOnSymbols) {
      RelationOnSymbols other = (RelationOnSymbols) obj;
      return Objects.equals(this.operator, other.operator)
        && Objects.equals(this.leftOperand, other.leftOperand)
        && Objects.equals(this.rightOperand, other.rightOperand);
    }
    return false;
  }

  @Override
  public int hashCode() {
    return Objects.hash(operator, leftOperand, rightOperand);
  }

}
