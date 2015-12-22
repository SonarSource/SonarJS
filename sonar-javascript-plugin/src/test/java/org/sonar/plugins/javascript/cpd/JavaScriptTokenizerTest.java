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
package org.sonar.plugins.javascript.cpd;

import java.io.File;
import java.nio.charset.Charset;
import net.sourceforge.pmd.cpd.SourceCode;
import net.sourceforge.pmd.cpd.TokenEntry;
import net.sourceforge.pmd.cpd.Tokens;
import org.junit.Test;
import org.sonar.plugins.javascript.JavaScriptPlugin;

import static org.fest.assertions.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class JavaScriptTokenizerTest {

  @Test
  public void test() {
    JavaScriptTokenizer tokenizer = new JavaScriptTokenizer(Charset.forName("UTF-8"), JavaScriptPlugin.EXCLUDE_MINIFIED_FILES_DEFAULT_VALUE);
    SourceCode source = mock(SourceCode.class);
    when(source.getFileName()).thenReturn(new File("src/test/resources/cpd/Person.js").getAbsolutePath());
    Tokens tokens = new Tokens();
    tokenizer.tokenize(source, tokens);
    assertThat(tokens.getTokens().size()).isGreaterThan(1);
    assertThat(tokens.getTokens().get(tokens.size() - 1)).isEqualTo(TokenEntry.getEOF());
  }

}
