/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
package org.sonar.javascript.highlighter;

import com.google.common.io.Files;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import org.junit.Test;
import org.sonar.api.batch.fs.TextRange;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.DefaultTextPointer;
import org.sonar.api.batch.fs.internal.DefaultTextRange;
import org.sonar.api.batch.fs.internal.FileMetadata;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.batch.sensor.symbol.NewSymbolTable;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;

import static org.assertj.core.api.Assertions.assertThat;

public class HighlightSymbolTableBuilderTest extends JavaScriptTreeModelTest {

  private SensorContextTester sensorContext;
  private DefaultInputFile inputFile;

  private NewSymbolTable newSymbolTable(String filename) throws FileNotFoundException {
    File moduleBaseDir = new File("src/test/resources/highlighter/");
    sensorContext = SensorContextTester.create(moduleBaseDir);
    inputFile = new TestInputFileBuilder("moduleKey", filename)
      .setModuleBaseDir(moduleBaseDir.toPath())
      .setCharset(StandardCharsets.UTF_8).build();
    inputFile.setMetadata(new FileMetadata().readMetadata(new FileInputStream(inputFile.file()), inputFile.charset(), inputFile.absolutePath()));

    return sensorContext.newSymbolTable().onFile(inputFile);
  }

  private static DefaultTextRange textRange(int line, int startColumn, int endColumn) {
    return new DefaultTextRange(new DefaultTextPointer(line, startColumn), new DefaultTextPointer(line, endColumn));
  }

  private Collection<TextRange> references(String key, int line, int column) {
    return sensorContext.referencesForSymbolAt(key, line, column);
  }

  @Test
  public void sonar_symbol_table() throws Exception {
    String filename = "symbolHighlighting.js";
    String key = "moduleKey:" + filename;
    HighlightSymbolTableBuilder.build(newSymbolTable(filename), context(inputFile));

    // variable
    assertThat(references(key, 1, 4)).containsOnly(textRange(5, 0, 1), textRange(5, 6, 7));

    // function declaration
    assertThat(references(key, 3, 9)).containsOnly(textRange(5, 4, 5));

    // named function expression
    assertThat(references(key, 7, 9)).containsOnly(textRange(8, 9, 18));

    // function parameter
    assertThat(references(key, 7, 19)).containsOnly(textRange(8, 19, 20));

    // variable with several declarations
    assertThat(references(key, 11, 4)).containsOnly(textRange(13, 4, 5), textRange(12, 0, 1), textRange(14, 0, 1), textRange(16, 23, 24));

    // curly braces
    assertThat(references(key, 3, 13)).containsOnly(textRange(3, 14, 15));
    assertThat(references(key, 7, 22)).containsOnly(textRange(9, 0, 1));
    assertThat(references(key, 16, 22)).containsOnly(textRange(16, 28, 29));
    assertThat(references(key, 18, 4)).containsOnly(textRange(18, 9, 10));
  }

  @Test
  public void sonar_symbol_table_built_in() throws Exception {
    String filename = "symbolHighlightingBuiltIn.js";
    String key = "moduleKey:" + filename;
    HighlightSymbolTableBuilder.build(newSymbolTable(filename), context(inputFile));

    // arguments
    assertThat(references(key, 2, 14)).containsOnly(textRange(3, 2, 11), textRange(4, 2, 11));

    // eval
    assertThat(references(key, 11, 4)).containsOnly(textRange(9, 0, 4));
  }

  @Test
  public void byte_order_mark_should_not_increment_offset() throws Exception {
    String filename = "symbolHighlightingBom.js";

    HighlightSymbolTableBuilder.build(newSymbolTable(filename), context(inputFile));
    assertThat(Files.toString(inputFile.file(), inputFile.charset()).startsWith("\uFEFF")).isTrue();
    assertThat(references("moduleKey:" + filename, 1, 4)).containsOnly(textRange(3, 0, 1));
  }

  @Test
  public void test_properties() throws Exception {
    String filename = "symbolHighlightingProperties.js";
    String key = "moduleKey:" + filename;

    HighlightSymbolTableBuilder.build(newSymbolTable(filename), context(inputFile));

    // class
    assertThat(references(key, 1, 6)).containsOnly(textRange(7, 16, 17));

    // "foo" method
    assertThat(references(key, 2, 2)).containsOnly(textRange(8, 6, 9));

    // "bar" method
    assertThat(references(key, 6, 2)).containsOnly(textRange(3, 9, 12));

    // "a" variable
    assertThat(references(key, 7, 8)).containsOnly(textRange(8, 4, 5));

    // "this"
    assertThat(references(key, 3, 4)).isEmpty();
  }
}
