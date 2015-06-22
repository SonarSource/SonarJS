/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
package org.sonar.javascript.ast.visitors;

import com.google.common.base.Preconditions;
import org.sonar.api.config.Settings;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.plugins.javascript.api.AstTreeVisitorContext;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.symbols.SymbolModel;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.squidbridge.api.CheckMessage;
import org.sonar.squidbridge.api.SourceFile;

import java.io.File;

public class AstTreeVisitorContextImpl implements AstTreeVisitorContext {
  private final ScriptTree tree;
  private final SourceFile sourceFile;
  private final File file;
  private final SymbolModel symbolModel;
  private final Settings settings;

  public AstTreeVisitorContextImpl(ScriptTree tree, SourceFile sourceFile, File file, SymbolModel symbolModel, Settings settings) {
    this.tree = tree;
    this.sourceFile = sourceFile;
    this.file = file;
    this.symbolModel = symbolModel;
    this.settings = settings;
  }

  @Override
  public ScriptTree getTopTree() {
    return tree;
  }

  @Override
  public void addIssue(JavaScriptCheck check, Tree tree, String message) {
    commonAddIssue(check, getLine(tree), message, -1);
  }

  @Override
  public void addIssue(JavaScriptCheck check, int line, String message) {
    commonAddIssue(check, line, message, -1);
  }

  @Override
  public void addIssue(JavaScriptCheck check, Tree tree, String message, double cost){
    commonAddIssue(check, getLine(tree), message, cost);
  }

  @Override
  public void addIssue(JavaScriptCheck check, int line, String message, double cost){
    commonAddIssue(check, line, message, cost);
  }

  @Override
  public String getFileKey() {
    return sourceFile.getKey();
  }

  @Override
  public File getFile() {
    return file;
  }

  /**
   * Cost is set if <code>cost<code/> is more than zero.
   * */
  private void commonAddIssue(JavaScriptCheck check, int line, String message, double cost){
    Preconditions.checkNotNull(check);
    Preconditions.checkNotNull(message);

    CheckMessage checkMessage = new CheckMessage(check, message);
    if (cost > 0) {
      checkMessage.setCost(cost);
    }

    if (line > 0) {
      checkMessage.setLine(line);
    }

    sourceFile.log(checkMessage);
  }

  private int getLine(Tree tree) {
    return ((JavaScriptTree)tree).getLine();
  }

  @Override
  public SymbolModel getSymbolModel() {
    return symbolModel;
  }

  @Override
  public String[] getPropertyValues(String name){
    return settings.getStringArray(name);
  }
}
