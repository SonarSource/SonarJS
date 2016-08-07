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
package org.sonar.javascript.cfg;

import org.fxmisc.richtext.CodeArea;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;

import com.google.common.base.Charsets;
import com.sonar.sslr.api.RecognitionException;
import com.sonar.sslr.api.typed.ActionParser;

import javafx.animation.Animation;
import javafx.animation.KeyFrame;
import javafx.animation.Timeline;
import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.control.SplitPane;
import javafx.scene.web.WebEngine;
import javafx.scene.web.WebView;
import javafx.stage.Stage;
import javafx.util.Duration;

public class CfgViewer extends Application {

  private final ActionParser<Tree> parser = JavaScriptParserBuilder.createParser(Charsets.UTF_8);
  private final CodeArea codeArea = new CodeArea("if(a && b) {\n  foo(a);\n} else {\n  bar;\n}\nreturn;");
  private final WebView webView = new WebView();
  private String lastAnalysed = "";

  public static void main(String[] args) {
    launch(args);
  }

  @Override
  public void start(Stage primaryStage) throws Exception {
    codeArea.setStyle("-fx-padding: 10");

    primaryStage.setTitle("JavaScript CFG viewer");

    SplitPane splitPane = new SplitPane();
    splitPane.getItems().addAll(codeArea, webView);
    webView.getEngine().load(CfgViewer.class.getResource("/cfgviewer/cfg.html").toExternalForm());
    primaryStage.setScene(new Scene(splitPane, 900, 600));
    primaryStage.show();

    Timeline timeline = new Timeline(new KeyFrame(
      Duration.millis(500),
      ae -> checkForUpdate()));
    timeline.setCycleCount(Animation.INDEFINITE);
    timeline.play();
  }

  private void checkForUpdate() {
    String text = codeArea.getText();
    if (!text.equals(lastAnalysed)) {
      lastAnalysed = text;
      analyse(text);
    }
  }

  private void analyse(String jsSourceCode) {
    try {
      Tree tree = parser.parse(jsSourceCode);
      display(ControlFlowGraph.build((ScriptTree) tree));
    } catch (RecognitionException e) {
      // do nothing
    }
  }

  private void display(ControlFlowGraph cfg) {
    String dot = CfgPrinter.toDot(cfg);
    WebEngine webEngine = webView.getEngine();
    webEngine.executeScript("loadCfg('" + dot + "')");
  }

}
