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
package org.sonar.plugins.javascript.api.symbols;

import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;
import javax.annotation.Nullable;
import org.sonar.plugins.javascript.api.symbols.Type.Kind;

public class TypeSet implements Set<Type> {
  private Set<Type> types;

  public TypeSet() {
    types = new HashSet<>();
  }

  @Override
  public int size() {
    return types.size();
  }

  @Override
  public boolean isEmpty() {
    return types.isEmpty();
  }

  @Override
  public boolean contains(Object o) {
    return types.contains(o);
  }

  @Override
  public Iterator<Type> iterator() {
    return types.iterator();
  }

  @Override
  public Object[] toArray() {
    return types.toArray();
  }

  @Override
  public <T> T[] toArray(T[] a) {
    return types.toArray(a);
  }

  @Override
  public boolean add(Type type) {
    return types.add(type);
  }

  @Override
  public boolean remove(Object o) {
    return types.remove(o);
  }

  @Override
  public boolean containsAll(Collection<?> c) {
    return types.containsAll(c);
  }

  @Override
  public boolean addAll(Collection<? extends Type> c) {
    return types.addAll(c);
  }

  @Override
  public boolean retainAll(Collection<?> c) {
    return types.retainAll(c);
  }

  @Override
  public boolean removeAll(Collection<?> c) {
    return types.removeAll(c);
  }

  @Override
  public void clear() {
    types.clear();
  }

  public boolean containsOnlyAndUnique(Type.Kind kind) {
    return size() == 1 && iterator().next().kind() == kind;
  }

  /*
 * @return true if set contains instances of specified kind and only them.
 */
  public boolean contains(Type.Kind kind) {
    for (Type type : types) {
      if (type.kind() == kind) {
        return true;
      }
    }
    return false;
  }

  /*
   * @return true if set contains instances of specified kind and only them.
   */
  public boolean containsOnly(Type.Kind kind) {
    for (Type type : types) {
      if (type.kind() != kind) {
        return false;
      }
    }
    return !types.isEmpty();
  }

  public static TypeSet emptyTypeSet() {
    return new TypeSet();
  }

  @Nullable
  public Type element() {
    if (isEmpty()) {
      return null;
    } else {
      return iterator().next();
    }
  }

  /**
   * Returns Type, which is the only not UNKNOWN element of TypeSet.
   * Otherwise (if the only element is UNKNOWN or there are more than one element) result is null.
   */
  @Nullable
  public Type getUniqueKnownType() {
    if (size() == 1) {
      Type type = iterator().next();
      if (!type.kind().equals(Kind.UNKNOWN)) {
        return type;
      }
    }
    return null;
  }

  @Override
  public boolean equals(Object o) {
    return types.equals(o);
  }

  @Override
  public int hashCode() {
    return types.hashCode();
  }

  @Override
  public String toString() {
    return types.toString();
  }

  public TypeSet immutableCopy() {
    TypeSet copy = new TypeSet();
    copy.types = Collections.unmodifiableSet(types);
    return copy;
  }

  /*
   * @return the instance of type with specified kind. Return null if there are several or none of types of such kind.
   */
  @Nullable
  public Type getUniqueType(Type.Kind kind) {
    Type result = null;
    for (Type type : types) {
      if (type.kind().equals(kind)) {
        if (result == null) {
          result = type;
        } else {
          return null;
        }
      }
    }
    return result;
  }

}
