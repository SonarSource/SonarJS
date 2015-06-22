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
package org.sonar.javascript.ast.parser;

import com.google.common.base.Throwables;
import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.Token;

import javax.annotation.Nullable;
import java.lang.reflect.Field;

public class AstNodeReflector {

  private static final Field TOKEN_FIELD = getAstNodeField("token");
  private static final Field CHILD_INDEX_FIELD = getAstNodeField("childIndex");
  private static final Field PARENT_FIELD = getAstNodeField("parent");

  private AstNodeReflector() {
  }

  public static void setToken(AstNode astNode, @Nullable Token token) {
    setField(TOKEN_FIELD, astNode, token);
  }

  public static void setChildIndex(AstNode astNode, int childIndex) {
    setField(CHILD_INDEX_FIELD, astNode, childIndex);
  }

  public static void setParent(AstNode astNode, @Nullable AstNode parent) {
    setField(PARENT_FIELD, astNode, parent);
  }

  private static Field getAstNodeField(String name) {
    try {
      Field field = AstNode.class.getDeclaredField(name);
      field.setAccessible(true);
      return field;
    } catch (NoSuchFieldException e) {
      throw Throwables.propagate(e);
    }
  }

  private static void setField(Field field, Object instance, Object value) {
    try {
      field.set(instance, value);
    } catch (IllegalAccessException e) {
      throw Throwables.propagate(e);
    }
  }

}
