/**
 * Sonar JavaScript Plugin
 * Extension for Sonar, open source software quality management tool.
 * Copyright (C) 2011 Eriks Nukis
 * mailto: eriks.nukis@gmail.com
 *
 * Sonar JavaScript Plugin is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * Sonar JavaScript Plugin is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with Sonar JavaScript Plugin; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */

package org.sonar.plugins.javascript.complexity;

import static org.junit.Assert.assertEquals;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

import org.antlr.runtime.tree.CommonTree;
import org.junit.Test;

public class JavaScriptComplexityAnalyzerTest {

  public static void printTree(CommonTree t, int indent) {
    if (t != null) {
      StringBuffer sb = new StringBuffer(indent);
      for (int i = 0; i < indent; i++)
        sb = sb.append("   ");
      for (int i = 0; i < t.getChildCount(); i++) {
        System.out.println(sb.toString() + t.getChild(i).toString() + "[line:" + t.getChild(i).getLine() + "] " + t.getChild(i).getType());
        printTree((CommonTree) t.getChild(i), indent + 1);
      }
    }
  }

  @Test
  public void functionNameRecognitionTest() throws JavaScriptPluginException, IOException {

    String fileName = "/org/sonar/plugins/javascript/complexity/FunctionNames.js";
    
    JavaScriptComplexityAnalyzer analyzer = new JavaScriptComplexityAnalyzer();
    List<JavaScriptFunction> functions = analyzer.analyzeComplexity(JavaScriptComplexityAnalyzerTest.class
        .getResourceAsStream(fileName));
    
    //CommonTree tree = analyzer.getJavaScriptAst(JavaScriptComplexityAnalyzerTest.class.getResourceAsStream(fileName));
    //printTree(tree, 0);

    assertEquals(11, functions.size());
    assertEquals("name1", functions.get(0).getName());
    assertEquals("name2", functions.get(1).getName());
    assertEquals("someMethodSimple", functions.get(2).getName());
    assertEquals("someMethodDeep", functions.get(3).getName());
    assertEquals("anonymousFunction0", functions.get(4).getName());
    assertEquals("name3", functions.get(5).getName());
    assertEquals("anonymousFunction1", functions.get(6).getName());
    assertEquals("anonymousFunction2", functions.get(7).getName());
    assertEquals("anonymousFunction3", functions.get(8).getName());
    assertEquals("anonymousFunction4", functions.get(9).getName());

  }

  @Test
  public void complexityTest() throws JavaScriptPluginException {
    String fileName = "/org/sonar/plugins/javascript/complexity/Complexity.js";
    JavaScriptComplexityAnalyzer analyzer = new JavaScriptComplexityAnalyzer();

    //CommonTree tree = analyzer.getJavaScriptAst(JavaScriptComplexityAnalyzerTest.class.getResourceAsStream(fileName));
    //printTree(tree, 0);

    List<JavaScriptFunction> functions = analyzer.analyzeComplexity(JavaScriptComplexityAnalyzerTest.class
        .getResourceAsStream(fileName));

    assertEquals("name1", functions.get(0).getName());
    assertEquals(3, functions.get(0).getComplexity());

    assertEquals("name2", functions.get(1).getName());
    assertEquals(5, functions.get(1).getComplexity());

    assertEquals("innerFunction", functions.get(2).getName());
    assertEquals(3, functions.get(2).getComplexity());

    assertEquals("name3", functions.get(3).getName());
    assertEquals(2, functions.get(3).getComplexity());

    assertEquals("name4", functions.get(4).getName());
    assertEquals(12, functions.get(4).getComplexity());

    assertEquals("name5", functions.get(5).getName());
    assertEquals(2, functions.get(5).getComplexity());

    assertEquals("name6", functions.get(6).getName());
    assertEquals(6, functions.get(6).getComplexity());

  }
}
