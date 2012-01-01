/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis
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

import java.io.File;
import java.net.URISyntaxException;
import java.util.List;

import net.sourceforge.pmd.cpd.SourceCode;
import net.sourceforge.pmd.cpd.TokenEntry;
import net.sourceforge.pmd.cpd.Tokens;

import org.junit.Test;
import static org.junit.Assert.assertArrayEquals;

public class JavaScriptTokenizerTest {

  @Test
  public void testTokenizer() throws URISyntaxException {

    File file = new File(getClass().getResource("/org/sonar/plugins/javascript/cpd/Cpd.js").toURI());

    SourceCode source = new SourceCode(new SourceCode.FileCodeLoader(file, "fileKey"));
    Tokens cpdTokens = new Tokens();
    JavaScriptTokenizer tokenizer = new JavaScriptTokenizer();
    tokenizer.tokenize(source, cpdTokens);
    List<TokenEntry> list = cpdTokens.getTokens();

    int[] expectedTokenStream = new int[] { 1, 2, 3, 2, 4, 5, 6, 7, 2, 8, 2, 9, 2, 10, 11, 12, 2, 8, 11, 13, 0 };
    int[] actualTokenStream = new int[list.size()];

    int i = 0;
    for (TokenEntry token : list) {
      actualTokenStream[i] = token.getIdentifier();
      i++;
    }

    assertArrayEquals(expectedTokenStream, actualTokenStream);
  }
}
