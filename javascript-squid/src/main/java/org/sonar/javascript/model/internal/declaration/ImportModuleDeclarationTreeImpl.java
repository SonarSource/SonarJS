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
package org.sonar.javascript.model.internal.declaration;

import com.google.common.collect.Iterators;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.javascript.model.internal.expression.LiteralTreeImpl;
import org.sonar.javascript.model.internal.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.internal.statement.EndOfStatementTreeImpl;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.ImportModuleDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.EndOfStatementTree;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;

import java.util.Iterator;

public class ImportModuleDeclarationTreeImpl extends JavaScriptTree implements ImportModuleDeclarationTree {

  private SyntaxToken importToken;
  private LiteralTree moduleName;
  private final EndOfStatementTree eos;

  public ImportModuleDeclarationTreeImpl(InternalSyntaxToken importToken, LiteralTreeImpl moduleName, EndOfStatementTreeImpl eos) {
    super(Kind.IMPORT_MODULE_DECLARATION);
    this.importToken = importToken;
    this.moduleName = moduleName;
    this.eos = eos;

    addChildren(importToken, moduleName, eos);
  }

  @Override
  public SyntaxToken importToken() {
    return importToken;
  }

  @Override
  public LiteralTree moduleName() {
    return moduleName;
  }

  @Override
  public EndOfStatementTree endOfStatement() {
    return eos;
  }

  @Override
  public Kind getKind() {
    return Kind.IMPORT_MODULE_DECLARATION;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(importToken, moduleName);
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitImportModuletDeclaration(this);
  }
}
