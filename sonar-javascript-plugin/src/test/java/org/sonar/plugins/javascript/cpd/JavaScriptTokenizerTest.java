/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis and SonarSource
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
package org.sonar.plugins.javascript.cpd;

import net.sourceforge.pmd.cpd.SourceCode;
import net.sourceforge.pmd.cpd.TokenEntry;
import net.sourceforge.pmd.cpd.Tokens;
import org.junit.Test;

import java.io.File;
import java.nio.charset.Charset;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class JavaScriptTokenizerTest {

  @Test
  public void test() {
    JavaScriptTokenizer tokenizer = new JavaScriptTokenizer(Charset.forName("UTF-8"));
    SourceCode source = mock(SourceCode.class);
    when(source.getFileName()).thenReturn(new File("src/test/resources/cpd/Person.js").getAbsolutePath());
    Tokens tokens = new Tokens();
    tokenizer.tokenize(source, tokens);
    assertThat(tokens.getTokens().size(), greaterThan(1));
    assertThat(tokens.getTokens().get(tokens.size() - 1), is(TokenEntry.getEOF()));
  }

}
