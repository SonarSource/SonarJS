/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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
package org.sonar.javascript.cfg;

import com.sonar.sslr.api.RecognitionException;
import com.sonar.sslr.api.typed.ActionParser;
import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.web.WebEngine;
import javafx.scene.web.WebView;
import javafx.stage.Stage;
import netscape.javascript.JSObject;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;

public class CfgViewer extends Application {

  private final WebView webView = new WebView();

  public static void main(String[] args) {
    launch(args);
  }

  @Override
  public void start(Stage primaryStage) throws Exception {
    primaryStage.setTitle("JavaScript CFG viewer");

    WebEngine webEngine = webView.getEngine();
    webEngine.load(CfgViewer.class.getResource("/cfgviewer/cfg.html").toExternalForm());
    JSObject win = (JSObject) webEngine.executeScript("window");
    win.setMember("analyzer", new Analyzer());
    primaryStage.setScene(new Scene(webView, 900, 600));
    primaryStage.show();
  }

  public static class Analyzer {

    private final ActionParser<Tree> parser = JavaScriptParserBuilder.createParser();

    public String analyze(String jsSourceCode) {
      try {
        System.out.println("Source : " + jsSourceCode);
        Tree tree = parser.parse(jsSourceCode);
        ControlFlowGraph cfg = ControlFlowGraph.build((ScriptTree) tree);
        return CfgPrinter.toDot(cfg);
      } catch (RecognitionException e) {
        return null;
      }
    }

  }

}
