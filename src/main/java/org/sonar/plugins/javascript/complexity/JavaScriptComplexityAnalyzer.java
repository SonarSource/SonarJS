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

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import org.antlr.runtime.ANTLRInputStream;
import org.antlr.runtime.RecognitionException;
import org.antlr.runtime.Token;
import org.antlr.runtime.TokenRewriteStream;
import org.antlr.runtime.tree.CommonTree;
import org.antlr.runtime.tree.CommonTreeAdaptor;
import org.antlr.runtime.tree.Tree;
import org.antlr.runtime.tree.TreeAdaptor;
import org.sonar.plugins.javascript.cpd.antlr.ES3Lexer;
import org.sonar.plugins.javascript.cpd.antlr.ES3Parser;

public class JavaScriptComplexityAnalyzer {

  private List<JavaScriptFunction> functions = new ArrayList<JavaScriptFunction>();
  private int anonymousFunctionCounter = 0;

  private final static String ANONYMOUS_FUNCTION_NAME = "anonymousFunction";
  private final static int[] BRANCHING_NODES = { ES3Parser.IF, ES3Parser.FOR, ES3Parser.WHILE, ES3Parser.SWITCH, ES3Parser.CASE,
      ES3Parser.CATCH, ES3Parser.QUE, ES3Parser.DO, ES3Parser.LAND, ES3Parser.LOR };
  
  

  private boolean isBranchingNode(int nodeCode) {
    for (int code : BRANCHING_NODES) {
      if (code == nodeCode) {
        return true;
      }
    }
    return false;
  }

  private void countBranchingStatements(CommonTree tree, JavaScriptFunction function) {
    if (tree != null) {
      if (tree.getType() == ES3Parser.FUNCTION) {
        function = new JavaScriptFunction();
        function.setLine(tree.getLine());
        function.setColumn(tree.getCharPositionInLine());
        function.setName(calculateFunctionName(tree));

        functions.add(function);
      }

      if (function != null && isBranchingNode(tree.getType())) {
        function.increaseComplexity();
      }

      for (int i = 0; i < tree.getChildCount(); i++) {
        countBranchingStatements((CommonTree) tree.getChild(i), function);
      }
    }
  }

  private String calculateFunctionName(CommonTree tree) {

    Tree node;

    // function name1 () {};
    node = tree.getChild(0);
    if (node != null && node.getType() == ES3Parser.Identifier) {
      return node.getText();
    }

    // var name2 = function () {}
    // name3 = function () {}
    // var a = {name3 : function (){}}
    node = tree.getParent();
    if (node != null && node.getChild(0) != null && node.getChild(0).getType() == ES3Parser.Identifier) {
      return node.getChild(0).getText();
    }

    // someClass.someMember1.someMember2.someMethodDeep = function() {}
    node = tree.getParent();
    if (node != null && node.getChild(0) != null && node.getChild(0).getType() == ES3Parser.BYFIELD) {
      Tree nameNode = node.getChild(0).getChild(1);
      if (nameNode != null) {
        return nameNode.getText();
      }
    }
    
    // functionCall(function(o){})
    // var a[0] = function(){}
    // var b["abc"] = function(){}
    // var c['abc'] = function(){}
    return ANONYMOUS_FUNCTION_NAME + anonymousFunctionCounter++;

  }

  public List<JavaScriptFunction> analyzeComplexity(InputStream inputStream) throws JavaScriptPluginException {

    CommonTree tree = getJavaScriptAst(inputStream);
    countBranchingStatements(tree, null);

    return functions;
  }

  protected CommonTree getJavaScriptAst(InputStream inputStream) throws JavaScriptPluginException {

    CommonTree tree = null;
    try {
      ES3Lexer lexer = new ES3Lexer(new ANTLRInputStream(inputStream));
      TokenRewriteStream tokens = new TokenRewriteStream(lexer);
      ES3Parser parser = new ES3Parser(tokens);

      parser.setTreeAdaptor(adaptor);
      ES3Parser.program_return ret = parser.program();
      tree = (CommonTree) ret.getTree();

    } catch (IOException e) {
      throw new JavaScriptPluginException("Could not read file", e);
    } catch (RecognitionException e) {
      throw new JavaScriptPluginException("Could not parse file", e);
    }
    return tree;
  }

  private static TreeAdaptor adaptor = new CommonTreeAdaptor() {

    public Object create(Token payload) {
      return new CommonTree(payload);
    }
  };
}
