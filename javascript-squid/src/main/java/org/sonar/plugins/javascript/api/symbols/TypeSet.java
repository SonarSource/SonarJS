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
package org.sonar.plugins.javascript.api.symbols;

import com.google.common.collect.Sets;

import javax.annotation.Nullable;
import java.util.Collection;
import java.util.Iterator;
import java.util.Set;

public class TypeSet implements Set<Type> {
  private final Set<Type> types;

  public TypeSet() {
    types = Sets.newHashSet();
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
    return containsAll(c);
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
    return types.retainAll(c);
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

  public static TypeSet emptyTypeSet(){
    return new TypeSet();
  }

  @Nullable
  public Type element() {
    if (isEmpty()){
      return null;
    } else {
      return iterator().next();
    }
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
}
