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
package org.sonar.javascript.parser.grammar;

import com.sonar.sslr.impl.Parser;
import com.sonar.sslr.impl.analysis.GrammarAnalyser;
import com.sonar.sslr.impl.analysis.GrammarAnalyserStream;
import org.junit.Test;
import org.sonar.javascript.api.EcmaScriptGrammar;
import org.sonar.javascript.parser.EcmaScriptParser;

import java.io.PrintStream;

import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;

public class EcmaScriptGrammarAnalyserTest {

  @Test
  public void test() {
    Parser<EcmaScriptGrammar> parser = EcmaScriptParser.create();
    GrammarAnalyser analyser = new GrammarAnalyser(parser.getGrammar());

    if (analyser.hasIssues()) {
      GrammarAnalyserStream.print(analyser, new PrintStream(System.err));
    }

    assertThat(analyser.hasIssues(), is(false));
  }

}
