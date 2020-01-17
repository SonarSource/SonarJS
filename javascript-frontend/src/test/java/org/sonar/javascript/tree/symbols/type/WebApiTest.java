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
import org.sonar.plugins.javascript.api.symbols.Type;

import static org.assertj.core.api.Assertions.assertThat;

public class WebApiTest extends TypeTest {

  @Before
  public void setUp() throws Exception {
    super.setUp("webAPI.js");
  }

  @Test
  public void window() {
    Symbol window = getSymbol("window");
    assertThat(window.external()).isTrue();

    Symbol windowCopy = getSymbol("windowCopy");
    assertThat(windowCopy.types().containsOnlyAndUnique(Type.Kind.WINDOW)).isTrue();

    Symbol newWindow = getSymbol("newWindow");
    assertThat(newWindow.types().containsOnlyAndUnique(Type.Kind.WINDOW)).isTrue();

    Symbol frames = getSymbol("frames");
    assertThat(frames.types().containsOnlyAndUnique(Type.Kind.WINDOW)).isTrue();
  }

  @Test
  public void dom_elements() {
    Symbol documentCopy = getSymbol("documentCopy");
    assertThat(documentCopy.types().containsOnlyAndUnique(Type.Kind.DOCUMENT)).isTrue();

    Symbol element = getSymbol("element1");
    assertThat(element.types().containsOnlyAndUnique(Type.Kind.DOM_ELEMENT)).isTrue();
    element = getSymbol("element2");
    assertThat(element.types().containsOnlyAndUnique(Type.Kind.DOM_ELEMENT)).isTrue();
    element = getSymbol("element3");
    assertThat(element.types().containsOnlyAndUnique(Type.Kind.DOM_ELEMENT)).isTrue();
    element = getSymbol("element4");
    assertThat(element.types().containsOnlyAndUnique(Type.Kind.DOM_ELEMENT)).isTrue();
    element = getSymbol("element5");
    assertThat(element.types().containsOnlyAndUnique(Type.Kind.DOM_ELEMENT)).isTrue();
    element = getSymbol("element6");
    assertThat(element.types().containsOnlyAndUnique(Type.Kind.DOM_ELEMENT)).isTrue();

    Symbol elements = getSymbol("elementList");
    assertThat(((ArrayType) elements.types().getUniqueType(Type.Kind.ARRAY)).elementType().kind()).isEqualTo(Type.Kind.DOM_ELEMENT);
  }
}
