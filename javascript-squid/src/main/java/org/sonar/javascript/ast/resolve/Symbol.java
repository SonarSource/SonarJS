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
package org.sonar.javascript.ast.resolve;

import java.util.List;

import org.sonar.javascript.model.interfaces.Tree;

import com.google.common.collect.Lists;

public class Symbol {

  private final String name;
  private List<Tree> declarations = Lists.newArrayList();

  public Symbol(String name, Tree declaration) {
    this.name = name;
    this.declarations.add(declaration);
  }

  public String name() {
    return name;
  }

  public List<Tree> declarations() {
    return declarations;
  }

  @Override
  public String toString() {
    return "Symbol{name=" + name + ", declarations=" + declarations.size() + "}";
  }
}
