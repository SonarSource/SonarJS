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
package org.sonar.javascript.highlighter;

import com.google.common.base.Charsets;
import com.google.common.io.Files;
import org.junit.Before;
import org.junit.Test;
import org.sonar.api.source.Symbolizable;
import org.sonar.javascript.ast.resolve.SymbolModelImpl;
import org.sonar.javascript.model.JavaScriptTreeModelTest;
import org.sonar.javascript.model.interfaces.declaration.ScriptTree;

import java.io.File;
import java.nio.charset.Charset;
import java.util.List;

import static org.mockito.Matchers.any;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class HighlightSymbolTableBuilderTest extends JavaScriptTreeModelTest {

  private final Symbolizable symbolizable = mock(Symbolizable.class);
  private final Symbolizable.SymbolTableBuilder symboltableBuilder = mock(Symbolizable.SymbolTableBuilder.class);

  private static final String EOL = "\n";
  private List<String> lines;

  @Before
  public void init() {
    when(symbolizable.newSymbolTableBuilder()).thenReturn(symboltableBuilder);
  }

  @Test
  public void sonar_symbol_table() throws Exception {
    File file = new File("src/test/resources/highlighter/symbolHighlighting.js");
    lines = Files.readLines(file, Charsets.UTF_8);
    SymbolModelImpl.create((ScriptTree) p.parse(file), symbolizable, new SourceFileOffsets(file, Charset.defaultCharset()));

    // variable
    verify(symboltableBuilder).newSymbol(offset(1, 5), offset(1, 6));
    verify(symboltableBuilder).newReference(any(org.sonar.api.source.Symbol.class), eq(offset(5, 1)));
    verify(symboltableBuilder).newReference(any(org.sonar.api.source.Symbol.class), eq(offset(5, 7)));

    // function declaration
    verify(symboltableBuilder).newSymbol(offset(3, 10), offset(3, 11));
    verify(symboltableBuilder).newReference(any(org.sonar.api.source.Symbol.class), eq(offset(5, 5)));

    // named function expression
    verify(symboltableBuilder).newSymbol(offset(7, 10), offset(7, 19));
    verify(symboltableBuilder).newReference(any(org.sonar.api.source.Symbol.class), eq(offset(8, 10)));

    // function parameter
    verify(symboltableBuilder).newSymbol(offset(7, 20), offset(7, 21));
    verify(symboltableBuilder).newReference(any(org.sonar.api.source.Symbol.class), eq(offset(8, 20)));
    // TODO: built-in symbols

    verify(symboltableBuilder).build();
    verifyNoMoreInteractions(symboltableBuilder);
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
