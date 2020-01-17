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
package org.sonar.javascript.tree.symbols.type;

import org.junit.Before;
import org.junit.Test;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Symbol.Kind;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.symbols.Type.Callability;
import org.sonar.plugins.javascript.api.tree.Tree;

import static org.assertj.core.api.Assertions.assertThat;

public class ClassTypeTest extends TypeTest {

  @Before
  public void setUp() throws Exception {
    super.setUp("classType.js");
  }

  @Test
  public void test_symbols() {
    Symbol A = getSymbol("A");
    assertThat(A.is(Kind.CLASS)).isTrue();
    assertThat(A.scope().isGlobal()).isTrue();
    assertThat(A.usages()).hasSize(2);

    Symbol B = getSymbol("B");
    assertThat(B.is(Kind.VARIABLE)).isTrue();

    Symbol B1 = getSymbol("B1");
    assertThat(B1.is(Kind.CLASS)).isTrue();
    assertThat(B1.scope().isGlobal()).isFalse();
    assertThat(B1.scope().tree().is(Tree.Kind.CLASS_EXPRESSION)).isTrue();
    assertThat(B1.usages()).hasSize(1);

    Symbol C = getSymbol("C");
    assertThat(C.is(Kind.VARIABLE)).isTrue();

    Symbol D = getSymbol("D");
    assertThat(D.is(Kind.CLASS)).isTrue();
    assertThat(D.scope().isGlobal()).isFalse();
    assertThat(D.scope().tree().is(Tree.Kind.FUNCTION_DECLARATION)).isTrue();
    assertThat(D.usages()).hasSize(2);

  }

  @Test
  public void test_class_type() throws Exception {
    Symbol A = getSymbol("A");
    assertThat(A.types().containsOnlyAndUnique(Type.Kind.CLASS)).isTrue();

    Symbol B = getSymbol("B");
    assertThat(B.types().containsOnlyAndUnique(Type.Kind.CLASS)).isTrue();
    assertThat(B.types().getUniqueKnownType()).isEqualTo(getSymbol("B1").types().getUniqueKnownType());
  }

  @Test
  public void test_object_type() throws Exception {
    Symbol z = getSymbol("z");
    assertThat(z.types().containsOnlyAndUnique(Type.Kind.OBJECT)).isTrue();

    ObjectType type = (ObjectType) z.types().getUniqueKnownType();

    assertThat(type.callability()).isEqualTo(Callability.NON_CALLABLE);
    assertThat(type.classType()).isNotNull();
    assertThat(type.classType().properties()).hasSize(2);

    Symbol barProperty = type.property("bar");
    assertThat(barProperty).isNotNull();
    assertThat(barProperty.name()).isEqualTo("bar");
    assertThat(barProperty.kind()).isEqualTo(Kind.METHOD);
    assertThat(barProperty.scope().tree().is(Tree.Kind.CLASS_EXPRESSION)).isTrue();

    Symbol propertyWithGetter = type.property("propWithGetter");
    assertThat(propertyWithGetter).isNull();
  }

  @Test
  public void test_this_access() throws Exception {
    assertThat(getSymbol("p").types().containsOnlyAndUnique(Type.Kind.NUMBER)).isTrue();
  }
}
