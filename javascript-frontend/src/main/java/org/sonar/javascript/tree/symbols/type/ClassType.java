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

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import javax.annotation.Nullable;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;

public class ClassType extends ObjectType {

  private Map<String, Symbol> properties = new HashMap<>();

  protected ClassType() {
    super(Callability.NON_CALLABLE);
  }

  @Override
  public Kind kind() {
    return Kind.CLASS;
  }

  public static ClassType create() {
    return new ClassType();
  }

  public ObjectType createObject() {
    ObjectType objectType = ObjectType.create(Callability.NON_CALLABLE);
    objectType.classType(this);
    return objectType;
  }

  public void addMethod(IdentifierTree name, FunctionType functionType, Scope scope) {
    Symbol symbol = new Symbol(name.name(), Symbol.Kind.METHOD, scope);
    symbol.addUsage(name, Usage.Kind.DECLARATION);
    symbol.addType(functionType);
    properties.put(
      name.name(),
      symbol);
  }

  public Collection<Symbol> properties() {
    return properties.values();
  }

  @Override
  @Nullable
  public Symbol property(String name) {
    return properties.get(name);
  }
}
