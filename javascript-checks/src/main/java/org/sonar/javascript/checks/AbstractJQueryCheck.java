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
package org.sonar.javascript.checks;

import org.sonar.javascript.ast.visitors.BaseTreeVisitor;

import java.util.Arrays;
import java.util.List;

public abstract class AbstractJQueryCheck extends BaseTreeVisitor {

  private List<String> jQueryAliases = null;

  // todo(Lena): PROPERTY_PREFIX ("sonar.javascript") is duplicated from JavaScriptPlugin
  public static final String JQUERY_OBJECT_ALIASES = "sonar.javascript.jQueryObjectAliases";
  public static final String JQUERY_OBJECT_ALIASES_DEFAULT_VALUE = "$, jQuery";

  protected boolean isJQueryObject(String name){
    if (jQueryAliases == null){
      jQueryAliases = Arrays.asList(getContext().getPropertyValues(JQUERY_OBJECT_ALIASES));
    }
    return jQueryAliases.contains(name);
  }
}
