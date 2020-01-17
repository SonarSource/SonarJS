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
package org.sonar.plugins.javascript.api;

import org.junit.Before;
import org.junit.Test;
import org.sonar.javascript.tree.symbols.type.FunctionType;
import org.sonar.javascript.tree.symbols.type.ObjectType;
import org.sonar.javascript.tree.symbols.type.PrimitiveType;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.symbols.TypeSet;

import static org.assertj.core.api.Assertions.assertThat;

public class TypeSetTest {

  private TypeSet typeSet1;
  private TypeSet typeSet2;
  private TypeSet typeSet3;

  @Before
  public void setUp() {
    typeSet1 = TypeSet.emptyTypeSet();
    typeSet1.add(PrimitiveType.NUMBER);

    typeSet2 = TypeSet.emptyTypeSet();
    typeSet2.add(PrimitiveType.NUMBER);
    typeSet2.add(PrimitiveType.UNKNOWN);

    typeSet3 = TypeSet.emptyTypeSet();
    typeSet3.add(FunctionType.create());
    typeSet3.add(FunctionType.create());
  }

  @Test
  public void size() {
    assertThat(typeSet1.size()).isEqualTo(1);
    assertThat(typeSet2.size()).isEqualTo(2);
    assertThat(typeSet3.size()).isEqualTo(2);
  }

  @Test
  public void is_empty() {
    assertThat(TypeSet.emptyTypeSet().isEmpty()).isTrue();
    assertThat(typeSet1.isEmpty()).isFalse();
  }

  @Test
  public void contains_object() {
    assertThat(typeSet1.contains(PrimitiveType.NUMBER)).isTrue();
    assertThat(typeSet2.contains(ObjectType.create())).isFalse();
  }

  @Test
  public void iterator() {
    assertThat(typeSet1.iterator().hasNext()).isTrue();
    assertThat(TypeSet.emptyTypeSet().iterator().hasNext()).isFalse();
  }

  @Test
  public void to_array() {
    Object[] array = typeSet3.toArray();
    assertThat(array.length).isEqualTo(2);
    assertThat(array[0]).isInstanceOf(ObjectType.class);
  }

  @Test
  public void to_array_t() {
    Type[] array = typeSet3.toArray(new Type[2]);
    assertThat(array.length).isEqualTo(2);
    assertThat(array[0]).isInstanceOf(ObjectType.class);
  }

  @Test
  public void add_type() {
    TypeSet typeSet = TypeSet.emptyTypeSet();
    ObjectType type = ObjectType.create();
    typeSet.add(type);
    assertThat(typeSet.size()).isEqualTo(1);
    assertThat(typeSet.element()).isEqualTo(type);
  }

  @Test
  public void remove_object() {
    TypeSet typeSet = TypeSet.emptyTypeSet();
    ObjectType type = ObjectType.create();

    typeSet.add(type);
    assertThat(typeSet.size()).isEqualTo(1);

    typeSet.remove(type);
    assertThat(typeSet).isEmpty();
  }

  @Test
  public void contains_all() {
    assertThat(typeSet2.containsAll(typeSet1)).isTrue();
  }

  @Test
  public void add_all() {
    TypeSet typeSet = TypeSet.emptyTypeSet();
    typeSet.addAll(typeSet3);
    assertThat(typeSet.containsAll(typeSet3)).isTrue();
  }

  @Test
  public void retain_all() {
    TypeSet typeSet = TypeSet.emptyTypeSet();
    typeSet.addAll(typeSet2);

    typeSet.retainAll(typeSet1);

    assertThat(typeSet.size()).isEqualTo(1);
    assertThat(typeSet.element()).isEqualTo(PrimitiveType.NUMBER);
  }

  @Test
  public void remove_all() {
    TypeSet typeSet = TypeSet.emptyTypeSet();
    typeSet.addAll(typeSet2);

    typeSet.removeAll(typeSet1);

    assertThat(typeSet.size()).isEqualTo(1);
    assertThat(typeSet.element()).isEqualTo(PrimitiveType.UNKNOWN);
  }

  @Test
  public void clear() {
    TypeSet typeSet = TypeSet.emptyTypeSet();
    typeSet.addAll(typeSet2);

    typeSet.clear();

    assertThat(typeSet).isEmpty();
  }

  @Test
  public void contains_only_and_unique_type_kind() {
    assertThat(typeSet1.containsOnlyAndUnique(Type.Kind.NUMBER)).isTrue();
    assertThat(typeSet3.containsOnlyAndUnique(Type.Kind.OBJECT)).isFalse();
  }

  @Test
  public void contains_type_kind() {
    assertThat(typeSet1.contains(Type.Kind.UNKNOWN)).isFalse();
    assertThat(typeSet2.contains(Type.Kind.UNKNOWN)).isTrue();
    assertThat(typeSet3.contains(Type.Kind.OBJECT)).isTrue();
  }

  @Test
  public void contains_only_type_kind() {
    assertThat(typeSet2.containsOnly(Type.Kind.NUMBER)).isFalse();
    assertThat(typeSet3.containsOnly(Type.Kind.OBJECT)).isTrue();
  }

  @Test
  public void empty_type_set() {
    assertThat(TypeSet.emptyTypeSet()).isEmpty();
  }

  @Test
  public void equals() {
    TypeSet typeSet = TypeSet.emptyTypeSet();
    typeSet.add(PrimitiveType.NUMBER);

    assertThat(typeSet1.equals(typeSet2)).isFalse();
    assertThat(typeSet1.equals(typeSet)).isTrue();
  }

  @Test
  public void hash_code() {
    TypeSet typeSet = TypeSet.emptyTypeSet();
    typeSet.add(PrimitiveType.NUMBER);

    assertThat(typeSet1.hashCode()).isEqualTo(typeSet.hashCode());
    assertThat(typeSet1.hashCode()).isNotEqualTo(typeSet2.hashCode());
  }

  @Test
  public void to_sting() {
    assertThat(TypeSet.emptyTypeSet().toString()).isEqualTo("[]");
    assertThat(typeSet1.toString()).isEqualTo("[NUMBER]");
    assertThat(typeSet2.toString()).contains("NUMBER");
    assertThat(typeSet2.toString()).contains("UNKNOWN");
  }

  @Test
  public void immutable_copy() {
    TypeSet copy = typeSet1.immutableCopy();

    assertThat(copy.size()).isEqualTo(1);
    assertThat(copy.element()).isEqualTo(PrimitiveType.NUMBER);

    try {
      copy.add(PrimitiveType.NUMBER);
    } catch (Exception e) {
      assertThat(e).isInstanceOf(UnsupportedOperationException.class);
    }
  }

  @Test
  public void get_unique_type() {
    assertThat(typeSet1.getUniqueType(Type.Kind.NUMBER)).isEqualTo(PrimitiveType.NUMBER);
    assertThat(typeSet3.getUniqueType(Type.Kind.OBJECT)).isNull();
    assertThat(typeSet3.getUniqueType(Type.Kind.UNKNOWN)).isNull();
  }
}
