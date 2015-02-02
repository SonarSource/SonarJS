/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
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
package org.sonar.javascript.ast.visitors;

import java.io.File;

import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.ScriptTree;
import org.sonar.squidbridge.api.CheckMessage;
import org.sonar.squidbridge.api.CodeVisitor;
import org.sonar.squidbridge.api.SourceFile;

import com.google.common.base.Preconditions;

public class AstTreeVisitorContextImpl implements AstTreeVisitorContext {
  private final ScriptTree tree;
  private final SourceFile sourceFile;
  private final File file;

  public AstTreeVisitorContextImpl(ScriptTree tree, SourceFile sourceFile, File file) {
    this.tree = tree;
    this.sourceFile = sourceFile;
    this.file = file;
  }

  @Override
  public ScriptTree getTree() {
    return tree;
  }

  @Override
  public void addIssue(CodeVisitor check, Tree tree, String message) {
    addIssue(check, ((JavaScriptTree) tree).getLine(), message);
  }

  @Override
  public void addIssue(CodeVisitor check, int line, String message) {
    Preconditions.checkNotNull(check);
    Preconditions.checkNotNull(message);

    CheckMessage checkMessage = new CheckMessage(check, message);

    if (line > 0) {
      checkMessage.setLine(line);
    }

    sourceFile.log(checkMessage);
  }

  @Override
  public String getFileKey() {
    return sourceFile.getKey();
  }

  @Override
  public File getFile() {
    return file;
  }

}
