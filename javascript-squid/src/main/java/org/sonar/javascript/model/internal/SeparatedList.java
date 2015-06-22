/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
package org.sonar.javascript.model.internal;

import com.sonar.sslr.api.AstNode;
import org.apache.commons.collections.ListUtils;
import org.sonar.javascript.model.internal.lexical.InternalSyntaxToken;

import java.util.Collection;
import java.util.Iterator;
import java.util.List;
import java.util.ListIterator;

public class SeparatedList<T> implements List<T> {

  private final List<T> list;
  private final List<InternalSyntaxToken> separators;
  /**
   * +   * FIXME to remove when remove use of AstNode
   * +   * /!\ HACK: Use only to be able to pass the AstNode children to the parent in order.
   * +   * this list is used temporary during construction of the AST. It might be empty
   * +   * and/or not up to date.
   * +
   */
  private List<AstNode> children = ListUtils.EMPTY_LIST;

  public SeparatedList(List<T> list, List<InternalSyntaxToken> separators) {
    this.list = list;
    this.separators = separators;
  }

  public SeparatedList(List<T> list, List<InternalSyntaxToken> separators, List<AstNode> children) {
    this.list = list;
    this.separators = separators;
    this.children = children;
  }

  public InternalSyntaxToken getSeparator(int i) {
    return separators.get(i);
  }

  public List<InternalSyntaxToken> getSeparators() {
    return separators;
  }

  public void addChild(AstNode child) {
    children.add(child);
  }

  public List<AstNode> getChildren() {
    return children;
  }

  public void clearChildren() {
    children = ListUtils.EMPTY_LIST;
  }

  @Override
  public int size() {
    return list.size();
  }

  @Override
  public boolean isEmpty() {
    return list.isEmpty();
  }

  @Override
  public boolean contains(Object o) {
    return list.contains(o);
  }

  @Override
  public Iterator<T> iterator() {
    return list.iterator();
  }

  @Override
  public Object[] toArray() {
    return list.toArray();
  }

  @Override
  public <T> T[] toArray(T[] a) {
    return list.toArray(a);
  }

  @Override
  public boolean add(T e) {
    return list.add(e);
  }

  @Override
  public boolean remove(Object o) {
    return list.remove(o);
  }

  @Override
  public boolean containsAll(Collection<?> c) {
    return list.containsAll(c);
  }

  @Override
  public boolean addAll(Collection<? extends T> c) {
    return list.addAll(c);
  }

  @Override
  public boolean addAll(int index, Collection<? extends T> c) {
    return list.addAll(index, c);
  }

  @Override
  public boolean removeAll(Collection<?> c) {
    return list.removeAll(c);
  }

  @Override
  public boolean retainAll(Collection<?> c) {
    return list.retainAll(c);
  }

  @Override
  public void clear() {
    list.clear();
  }

  @Override
  public T get(int index) {
    return list.get(index);
  }

  @Override
  public T set(int index, T element) {
    return list.set(index, element);
  }

  @Override
  public void add(int index, T element) {
    list.add(index, element);
  }

  @Override
  public T remove(int index) {
    return list.remove(index);
  }

  @Override
  public int indexOf(Object o) {
    return list.indexOf(o);
  }

  @Override
  public int lastIndexOf(Object o) {
    return list.lastIndexOf(o);
  }

  @Override
  public ListIterator<T> listIterator() {
    return list.listIterator();
  }

  @Override
  public ListIterator<T> listIterator(int index) {
    return list.listIterator(index);
  }

  @Override
  public List<T> subList(int fromIndex, int toIndex) {
    return list.subList(fromIndex, toIndex);
  }

}
