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
package org.sonar.javascript.ast.resolve.type;

import org.junit.Before;
import org.junit.Test;
import org.sonar.javascript.ast.resolve.SymbolModelImpl;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.ScriptTree;

import java.io.File;

import static org.fest.assertions.Assertions.assertThat;

public class FrameworkTest extends TypeTest {

  @Before
  public void setUp() throws Exception {
    ROOT_NODE = p.parse(new File("src/test/resources/ast/resolve/type/framework.js"));
    SYMBOL_MODEL = SymbolModelImpl.create((ScriptTree) ROOT_NODE, null, null, null);
  }

  @Test
  public void simple_jquery_object() {
    Symbol jqueryObject1 = getSymbol("jqueryObject1");
    assertThat(jqueryObject1.types()).containsOnly(ObjectType.FrameworkType.JQUERY_SELECTOR_OBJECT);

    Symbol jqueryObject2 = getSymbol("jqueryObject2");
    assertThat(jqueryObject2.types()).containsOnly(ObjectType.FrameworkType.JQUERY_SELECTOR_OBJECT);
  }

  @Test
  public void not_jquery_object() {
    Symbol jqueryObject = getSymbol("notJqueryObject");
    assertThat(jqueryObject.types()).excludes(ObjectType.FrameworkType.JQUERY_SELECTOR_OBJECT);
  }

  @Test
  public void backbone_model() {
    Symbol backboneClass = getSymbol("BackboneClass");
    assertThat(backboneClass.types()).containsOnly(ObjectType.FrameworkType.BACKBONE_MODEL);

    Symbol backboneObject = getSymbol("BackboneObject");
    assertThat(backboneObject.types()).containsOnly(ObjectType.FrameworkType.BACKBONE_MODEL_OBJECT);
  }

  @Test
  public void backbone_model_inheritance() {
    Symbol backboneClass = getSymbol("ChildBackboneClass");
    assertThat(backboneClass.types()).containsOnly(ObjectType.FrameworkType.BACKBONE_MODEL);

    Symbol backboneObject = getSymbol("childBackboneObject");
    assertThat(backboneObject.types()).containsOnly(ObjectType.FrameworkType.BACKBONE_MODEL_OBJECT);
  }

}
