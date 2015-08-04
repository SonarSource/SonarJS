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
package org.sonar.plugins.javascript.api;

import com.google.common.annotations.Beta;
import org.sonar.plugins.javascript.api.symbols.SymbolModel;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;

import java.io.File;

@Beta
public interface AstTreeVisitorContext {

  /**
   * @return the top tree node of the current file AST representation.
   */
  ScriptTree getTopTree();

  /**
   * Creates an issue.
   *
   * @param check instance of the check that creates the issue.
   * @param tree the tree on which the issue should be raise. Means the issue will be raised on its corresponding line in the source code.
   * @param message the issue message.
   */
  void addIssue(JavaScriptCheck check, Tree tree, String message);

  /**
   * Creates an issue.
   *
   * @param check instance of the check that create the issue
   * @param line source line on which the issue should be raised
   * @param message the issue message
   */
  void addIssue(JavaScriptCheck check, int line, String message);

  /**
   * Creates an issue.
   *
   * @param check instance of the check that create the issue
   * @param tree the tree on which the issue should be raise. Means the issue will be raised on its corresponding line in the source code.
   * @param message the issue message
   * @param cost specific remediation cost for the issue, used to compute the technical debt
   */
  void addIssue(JavaScriptCheck check, Tree tree, String message, double cost);

  /**
   * Creates an issue.
   *
   * @param check instance of the check that create the issue
   * @param line source line on which the issue should be raised
   * @param message the issue message
   * @param cost specific remediation cost for the issue, used to compute the technical debt
   */
  void addIssue(JavaScriptCheck check, int line, String message, double cost);

  /**
   * Creates an issue at a file level.
   *
   * @param check instance of the check that create the issue
   * @param message the issue message
   */
  void addFileIssue(JavaScriptCheck check, String message);

  /**
   * @return the current SonarQube file key
   */
  String getFileKey();

  /**
   * @return the current file
   */
  File getFile();

  /**
   * @return the symbol model that allows to access the symbols declared in the current file
   */
  SymbolModel getSymbolModel();

  /**
   * Fetch project property
   *
   * @param name property key
   *
   * @return the value for the given key
   */
  String[] getPropertyValues(String name);

  int getComplexity(Tree tree);

}
