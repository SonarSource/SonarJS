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

import org.sonar.api.rule.RuleKey;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.ScriptTree;
import org.sonar.squidbridge.api.CheckMessage;
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
  public void addIssue(Tree tree, RuleKey ruleKey, String message) {
    addIssue(((JavaScriptTree) tree).getLine(), ruleKey, message);
  }

  @Override
  public void addIssueOnFile(RuleKey ruleKey, String message) {
    addIssue(-1, ruleKey, message);
  }

  @Override
  public void addIssue(int line, RuleKey ruleKey, String message) {
    Preconditions.checkNotNull(ruleKey);
    Preconditions.checkNotNull(message);

    CheckMessage checkMessage = new CheckMessage(ruleKey, message);

    if (line > 0) {
      checkMessage.setLine(line);
    }

    checkMessage.setBypassExclusion("NoSonar".equals(ruleKey.rule()));
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
