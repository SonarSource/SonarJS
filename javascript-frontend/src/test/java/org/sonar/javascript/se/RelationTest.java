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

import com.google.common.collect.Range;
import java.util.Optional;
import org.junit.Test;
import org.sonar.javascript.se.Relation.Operator;
import org.sonar.javascript.se.sv.SimpleSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

import static org.assertj.core.api.Assertions.assertThat;

public class RelationTest {

  private static final SymbolicValue SV1 = new SimpleSymbolicValue(1);
  private static final SymbolicValue SV2 = new SimpleSymbolicValue(2);
  private static final SymbolicValue SV3 = new SimpleSymbolicValue(3);

  @Test
  public void should_be_compatible_with_relation_with_other_operands() {
    assertThat(relation(Kind.LESS_THAN, SV1, SV2).isCompatibleWith(relation(Kind.GREATER_THAN, SV1, SV3))).isTrue();
    assertThat(relation(Kind.LESS_THAN, SV1, SV2).isCompatibleWith(relation(Kind.GREATER_THAN, SV3, SV2))).isTrue();
  }

  @Test
  public void isCompatibleWith_and_same_operands() {
    Relation lessThan = relation(Kind.LESS_THAN, SV1, SV2);
    Relation lessThanOrEqualTo = relation(Kind.LESS_THAN_OR_EQUAL_TO, SV1, SV2);
    Relation greaterThan = relation(Kind.GREATER_THAN, SV1, SV2);
    Relation greaterThanOrEqualTo = relation(Kind.GREATER_THAN_OR_EQUAL_TO, SV1, SV2);
    Relation equalTo = relation(Kind.EQUAL_TO, SV1, SV2);
    Relation notEqualTo = relation(Kind.NOT_EQUAL_TO, SV1, SV2);
    Relation strictEqualTo = relation(Kind.STRICT_EQUAL_TO, SV1, SV2);
    Relation strictNotEqualTo = relation(Kind.STRICT_NOT_EQUAL_TO, SV1, SV2);

    assertThat(lessThan.isCompatibleWith(lessThan)).isTrue();
    assertThat(lessThan.isCompatibleWith(lessThanOrEqualTo)).isTrue();
    assertThat(lessThan.isCompatibleWith(greaterThan)).isFalse();
    assertThat(lessThan.isCompatibleWith(greaterThanOrEqualTo)).isFalse();
    assertThat(lessThan.isCompatibleWith(equalTo)).isFalse();
    assertThat(lessThan.isCompatibleWith(notEqualTo)).isTrue();
    assertThat(lessThan.isCompatibleWith(strictEqualTo)).isFalse();
    assertThat(lessThan.isCompatibleWith(strictNotEqualTo)).isTrue();

    assertThat(lessThanOrEqualTo.isCompatibleWith(greaterThanOrEqualTo)).isTrue();
    assertThat(greaterThanOrEqualTo.isCompatibleWith(lessThanOrEqualTo)).isTrue();

    assertThat(equalTo.isCompatibleWith(strictNotEqualTo)).isTrue();
    assertThat(strictNotEqualTo.isCompatibleWith(equalTo)).isTrue();
  }

  @Test
  public void isCompatibleWith_and_reversed_operands() {
    Relation lessThan = relation(Kind.LESS_THAN, SV1, SV2);
    assertThat(lessThan.isCompatibleWith(relation(Kind.GREATER_THAN, SV2, SV1))).isTrue();
    assertThat(lessThan.isCompatibleWith(relation(Kind.GREATER_THAN_OR_EQUAL_TO, SV2, SV1))).isTrue();
    assertThat(lessThan.isCompatibleWith(relation(Kind.LESS_THAN, SV2, SV1))).isFalse();
    assertThat(lessThan.isCompatibleWith(relation(Kind.LESS_THAN_OR_EQUAL_TO, SV2, SV1))).isFalse();
  }

  @Test
  public void not() {
    assertThat(relation(Kind.LESS_THAN, SV1, SV2).not()).isEqualTo(relation(Kind.GREATER_THAN_OR_EQUAL_TO, SV1, SV2));
    assertThat(relation(Kind.EQUAL_TO, SV1, SV2).not()).isEqualTo(relation(Kind.NOT_EQUAL_TO, SV1, SV2));
    assertThat(relation(Kind.STRICT_EQUAL_TO, SV1, SV2).not()).isEqualTo(relation(Kind.STRICT_NOT_EQUAL_TO, SV1, SV2));
  }

  @Test
  public void equals_and_hashCode() {
    assertThat(relation(Kind.LESS_THAN, SV1, SV2)).isEqualTo(relation(Kind.LESS_THAN, SV1, SV2));
    assertThat(relation(Kind.LESS_THAN, SV1, SV2)).isNotEqualTo(relation(Kind.LESS_THAN, SV1, SV3));
    assertThat(relation(Kind.LESS_THAN, SV1, SV2)).isNotEqualTo(relation(Kind.LESS_THAN, SV3, SV2));
    assertThat(relation(Kind.LESS_THAN, SV1, SV2)).isNotEqualTo(relation(Kind.LESS_THAN_OR_EQUAL_TO, SV1, SV2));
    assertThat(relation(Kind.LESS_THAN, SV1, SV2)).isNotEqualTo(null);

    assertThat(relation(Kind.LESS_THAN, SV1, SV2).hashCode()).isEqualTo(relation(Kind.LESS_THAN, SV1, SV2).hashCode());
  }

  @Test
  public void test_toString() {
    assertThat(new Relation(Kind.LESS_THAN, SV1, SV2).toString()).isEqualTo("SV_1 < SV_2");
  }

  @Test
  public void ranges_comparison() {
    Range<Integer> positive = Constraint.POSITIVE_NUMBER_PRIMITIVE.numericRange().get();
    Range<Integer> positiveAndZero = Constraint.POSITIVE_NUMBER_PRIMITIVE.or(Constraint.ZERO).numericRange().get();
    Range<Integer> negativeAndZero = Constraint.NEGATIVE_NUMBER_PRIMITIVE.or(Constraint.ZERO).numericRange().get();
    Range<Integer> negative = Constraint.NEGATIVE_NUMBER_PRIMITIVE.numericRange().get();
    Range<Integer> zero = Constraint.ZERO.numericRange().get();

    assertThat(Operator.LESS_THAN.numericComparison.apply(positive, positiveAndZero)).isEmpty();
    assertThat(Operator.LESS_THAN.numericComparison.apply(positive, negative)).isEqualTo(Optional.of(false));
    assertThat(Operator.LESS_THAN.numericComparison.apply(negative, positive)).isEqualTo(Optional.of(true));
    assertThat(Operator.LESS_THAN.numericComparison.apply(negativeAndZero, positiveAndZero)).isEmpty();

    assertThat(Operator.NOT_EQUAL_TO.numericComparison.apply(positive, positiveAndZero)).isEmpty();
    assertThat(Operator.NOT_EQUAL_TO.numericComparison.apply(positive, negative)).isEqualTo(Optional.of(true));
    assertThat(Operator.NOT_EQUAL_TO.numericComparison.apply(negative, positive)).isEqualTo(Optional.of(true));

    assertThat(Operator.GREATER_THAN_OR_EQUAL_TO.numericComparison.apply(zero, negative)).isEqualTo(Optional.of(true));
    assertThat(Operator.GREATER_THAN_OR_EQUAL_TO.numericComparison.apply(zero, positive)).isEqualTo(Optional.of(false));
    assertThat(Operator.GREATER_THAN_OR_EQUAL_TO.numericComparison.apply(zero, positiveAndZero)).isEmpty();
  }

  private static Relation relation(Kind kind, SymbolicValue leftOperand, SymbolicValue rightOperand) {
    return new Relation(kind, leftOperand, rightOperand);
  }

}
