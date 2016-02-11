/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
package org.sonar.javascript.highlighter;

import com.google.common.base.Charsets;
import com.google.common.io.Files;
import java.io.File;
import java.util.List;
import org.junit.Before;
import org.junit.Test;
import org.sonar.api.source.Symbolizable;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;

import static org.fest.assertions.Assertions.assertThat;
import static org.mockito.Matchers.any;
import static org.mockito.Matchers.anyInt;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.internal.verification.VerificationModeFactory.times;

public class HighlightSymbolTableBuilderTest extends JavaScriptTreeModelTest {

  private final Symbolizable symbolizable = mock(Symbolizable.class);
  private final Symbolizable.SymbolTableBuilder symbolTableBuilder = mock(Symbolizable.SymbolTableBuilder.class);

  private static final String EOL = "\n";
  private List<String> lines;

  @Before
  public void init() {
    when(symbolizable.newSymbolTableBuilder()).thenReturn(symbolTableBuilder);
  }

  @Test
  public void sonar_symbol_table() throws Exception {
    File file = new File("src/test/resources/highlighter/symbolHighlighting.js");
    lines = Files.readLines(file, Charsets.UTF_8);
    HighlightSymbolTableBuilder.build(symbolizable, symbolModel(file));

    // variable
    verify(symbolTableBuilder).newSymbol(offset(1, 5), offset(1, 6));
    verify(symbolTableBuilder).newReference(any(org.sonar.api.source.Symbol.class), eq(offset(5, 1)));
    verify(symbolTableBuilder).newReference(any(org.sonar.api.source.Symbol.class), eq(offset(5, 7)));

    // function declaration
    verify(symbolTableBuilder).newSymbol(offset(3, 10), offset(3, 11));
    verify(symbolTableBuilder).newReference(any(org.sonar.api.source.Symbol.class), eq(offset(5, 5)));

    // named function expression
    verify(symbolTableBuilder).newSymbol(offset(7, 10), offset(7, 19));
    verify(symbolTableBuilder).newReference(any(org.sonar.api.source.Symbol.class), eq(offset(8, 10)));

    // function parameter
    verify(symbolTableBuilder).newSymbol(offset(7, 20), offset(7, 21));
    verify(symbolTableBuilder).newReference(any(org.sonar.api.source.Symbol.class), eq(offset(8, 20)));

    // variable with several declarations
    verify(symbolTableBuilder).newSymbol(offset(11, 5), offset(11, 6));
    verify(symbolTableBuilder).newReference(any(org.sonar.api.source.Symbol.class), eq(offset(13, 5)));
    verify(symbolTableBuilder).newReference(any(org.sonar.api.source.Symbol.class), eq(offset(12, 1)));
    verify(symbolTableBuilder).newReference(any(org.sonar.api.source.Symbol.class), eq(offset(14, 1)));

    verify(symbolTableBuilder).build();
    verifyNoMoreInteractions(symbolTableBuilder);
  }

  @Test
  public void sonar_symbol_table_built_in() throws Exception {
    File file = new File("src/test/resources/highlighter/symbolHighlightingBuiltIn.js");
    HighlightSymbolTableBuilder.build(symbolizable, symbolModel(file));

    // no offsets are used as there is uncertainty about the order of usages of built-in symbols (and first usage used for newSymbol)
    verify(symbolTableBuilder, times(4)).newSymbol(anyInt(), anyInt());
    verify(symbolTableBuilder, times(4)).newReference(any(org.sonar.api.source.Symbol.class), anyInt());

    verify(symbolTableBuilder).build();
    verifyNoMoreInteractions(symbolTableBuilder);
  }

  @Test
  public void byte_order_mark_should_not_increment_offset() throws Exception {
    File file = new File("src/test/resources/highlighter/symbolHighlightingBom.js");
    assertThat(Files.toString(file, Charsets.UTF_8).startsWith("\uFEFF")).isTrue();
    HighlightSymbolTableBuilder.build(symbolizable, symbolModel(file));
    verify(symbolTableBuilder).newSymbol(4, 5);
  }

  @Test
  public void test_properties() throws Exception {
    File file = new File("src/test/resources/highlighter/symbolHighlightingProperties.js");
    lines = Files.readLines(file, Charsets.UTF_8);
    HighlightSymbolTableBuilder.build(symbolizable, symbolModel(file));

    // class
    verify(symbolTableBuilder).newSymbol(offset(1, 7), offset(1, 8));
    verify(symbolTableBuilder).newReference(any(org.sonar.api.source.Symbol.class), eq(offset(7, 17)));

    // "foo" method
    verify(symbolTableBuilder).newSymbol(offset(2, 3), offset(2, 6));
    verify(symbolTableBuilder).newReference(any(org.sonar.api.source.Symbol.class), eq(offset(8, 7)));

    // "bar" method
    verify(symbolTableBuilder).newSymbol(offset(6, 3), offset(6, 6));
    verify(symbolTableBuilder).newReference(any(org.sonar.api.source.Symbol.class), eq(offset(3, 10)));

    // "a" variable
    verify(symbolTableBuilder).newSymbol(offset(7, 9), offset(7, 10));
    verify(symbolTableBuilder).newReference(any(org.sonar.api.source.Symbol.class), eq(offset(8, 5)));

    // "this"
    verify(symbolTableBuilder).newSymbol(offset(3, 5), offset(3, 9));

    verify(symbolTableBuilder).build();
    verifyNoMoreInteractions(symbolTableBuilder);

  }

  private int offset(int line, int column) {
    int result = 0;
    for (int i = 0; i < line - 1; i++) {
      result += lines.get(i).length() + EOL.length();
    }
    result += column - 1;
    return result;
  }
}
