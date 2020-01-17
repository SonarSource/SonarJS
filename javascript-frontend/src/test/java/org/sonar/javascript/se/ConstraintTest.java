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
import org.junit.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.sonar.javascript.se.Constraint.ANY_VALUE;
import static org.sonar.javascript.se.Constraint.ARRAY;
import static org.sonar.javascript.se.Constraint.BOOLEAN_PRIMITIVE;
import static org.sonar.javascript.se.Constraint.FALSY;
import static org.sonar.javascript.se.Constraint.FUNCTION;
import static org.sonar.javascript.se.Constraint.NO_POSSIBLE_VALUE;
import static org.sonar.javascript.se.Constraint.NULL;
import static org.sonar.javascript.se.Constraint.NUMBER_PRIMITIVE;
import static org.sonar.javascript.se.Constraint.OBJECT;
import static org.sonar.javascript.se.Constraint.STRING_OBJECT;
import static org.sonar.javascript.se.Constraint.STRING_PRIMITIVE;
import static org.sonar.javascript.se.Constraint.ZERO;

public class ConstraintTest {

  @Test
  public void any_value() throws Exception {
    assertThat(ANY_VALUE.not()).isEqualTo(NO_POSSIBLE_VALUE);
    assertThat(ANY_VALUE.and(NULL)).isEqualTo(NULL);
    assertThat(ANY_VALUE.and(FALSY)).isEqualTo(FALSY);
    assertThat(ANY_VALUE.and(NO_POSSIBLE_VALUE)).isEqualTo(NO_POSSIBLE_VALUE);
  }

  @Test
  public void no_possible_value() throws Exception {
    assertThat(NO_POSSIBLE_VALUE.not()).isEqualTo(ANY_VALUE);
    assertThat(NO_POSSIBLE_VALUE.and(NULL)).isEqualTo(NO_POSSIBLE_VALUE);
    assertThat(NO_POSSIBLE_VALUE.and(FALSY)).isEqualTo(NO_POSSIBLE_VALUE);
    assertThat(NO_POSSIBLE_VALUE.and(ANY_VALUE)).isEqualTo(NO_POSSIBLE_VALUE);
  }

  @Test
  public void equals() throws Exception {
    assertThat(Constraint.NULL).isEqualTo(Constraint.NULL);
    assertThat(Constraint.NULL).isNotEqualTo(Constraint.UNDEFINED);
    assertThat(Constraint.NULL).isNotEqualTo("");
  }

  @Test
  public void hash() throws Exception {
    assertThat(Constraint.NULL.hashCode()).isEqualTo(Constraint.NULL.hashCode());
    assertThat(Constraint.NULL.hashCode()).isNotEqualTo(Constraint.UNDEFINED.hashCode());
  }

  @Test
  public void or() throws Exception {
    assertThat(Constraint.NULL.or(Constraint.UNDEFINED)).isEqualTo(Constraint.NULL_OR_UNDEFINED);
    assertThat(Constraint.FALSY.or(Constraint.TRUTHY)).isEqualTo(Constraint.ANY_VALUE);

    assertThat(Constraint.NULL.or(Constraint.TRUTHY)).isEqualTo(Constraint.TRUTHY.or(Constraint.NULL));
  }

  @Test
  public void type() throws Exception {
    assertThat(NUMBER_PRIMITIVE.type()).isEqualTo(Type.NUMBER_PRIMITIVE);
    assertThat(STRING_PRIMITIVE.type()).isEqualTo(Type.STRING_PRIMITIVE);
    assertThat(STRING_OBJECT.type()).isEqualTo(Type.STRING_OBJECT);
    assertThat(BOOLEAN_PRIMITIVE.type()).isEqualTo(Type.BOOLEAN_PRIMITIVE);
    assertThat(OBJECT.type()).isEqualTo(Type.OBJECT);
    assertThat(FUNCTION.type()).isEqualTo(Type.FUNCTION);
    assertThat(ARRAY.type()).isEqualTo(Type.ARRAY);
  }

  @Test
  public void to_string() throws Exception {
    assertThat(Constraint.ANY_VALUE.toString()).isEqualTo("ANY_VALUE");
    assertThat(Constraint.NO_POSSIBLE_VALUE.toString()).isEqualTo("NO_POSSIBLE_VALUE");
    assertThat(Constraint.TRUTHY.toString()).isEqualTo("TRUTHY");
    assertThat(Constraint.FALSY.toString()).isEqualTo("FALSY");

    assertThat(Constraint.NULL.toString()).isEqualTo("NULL");
    assertThat(Constraint.NULL_OR_UNDEFINED.toString()).isEqualTo("NULL|UNDEFINED");
    assertThat(Constraint.ZERO.or(Constraint.NULL).toString()).isEqualTo("NULL|ZERO");
  }

  @Test
  public void test_isStricterOrEqual() throws Exception {
    assertThat(Constraint.NULL.isStricterOrEqualTo(Constraint.NULL_OR_UNDEFINED)).isTrue();
    assertThat(Constraint.UNDEFINED.isStricterOrEqualTo(Constraint.NULL_OR_UNDEFINED)).isTrue();
    assertThat(Constraint.NULL_OR_UNDEFINED.isStricterOrEqualTo(Constraint.NULL_OR_UNDEFINED)).isTrue();

    assertThat(Constraint.FALSY.isStricterOrEqualTo(Constraint.NULL_OR_UNDEFINED)).isFalse();
    assertThat(Constraint.FALSE.isStricterOrEqualTo(Constraint.NULL_OR_UNDEFINED)).isFalse();

    assertThat(Constraint.FALSE.isStricterOrEqualTo(Constraint.FALSY)).isTrue();

    assertThat(Constraint.ANY_VALUE.isStricterOrEqualTo(Constraint.TRUTHY)).isFalse();
    assertThat(Constraint.ANY_VALUE.isStricterOrEqualTo(Constraint.FALSY)).isFalse();

    assertThat(Constraint.NULL_OR_UNDEFINED.isStricterOrEqualTo(Constraint.FALSY)).isTrue();
    assertThat(Constraint.STRING_OBJECT.isStricterOrEqualTo(Constraint.TRUTHY)).isTrue();
    assertThat(Constraint.FUNCTION.isStricterOrEqualTo(Constraint.TRUTHY)).isTrue();
  }

  @Test
  public void test_numericRange() throws Exception {
    assertThat(Constraint.ANY_VALUE.numericRange()).isEmpty();
    assertThat(Constraint.ZERO.or(ARRAY).numericRange()).isEmpty();
    assertThat(Constraint.TRUTHY_NUMBER_PRIMITIVE.numericRange()).isEmpty();
    assertThat(Constraint.NUMBER_OBJECT.numericRange()).isEmpty();
    assertThat(Constraint.STRING_PRIMITIVE.numericRange()).isEmpty();

    assertThat(Constraint.ZERO.numericRange().get()).isEqualTo(Range.singleton(0));
    assertThat(Constraint.POSITIVE_NUMBER_PRIMITIVE.numericRange().get()).isEqualTo(Range.greaterThan(0));
    assertThat(Constraint.NEGATIVE_NUMBER_PRIMITIVE.numericRange().get()).isEqualTo(Range.lessThan(0));
    assertThat(Constraint.POSITIVE_NUMBER_PRIMITIVE.or(ZERO).numericRange().get()).isEqualTo(Range.atLeast(0));
    assertThat(Constraint.NEGATIVE_NUMBER_PRIMITIVE.or(ZERO).numericRange().get()).isEqualTo(Range.atMost(0));
  }
}
