/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
package org.sonar.javascript.tree.impl.declaration;

import com.google.common.collect.Iterators;
import java.util.Iterator;
import javax.annotation.Nullable;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.FromClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.ImportClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.ImportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class ImportDeclarationTreeImpl extends JavaScriptTree implements ImportDeclarationTree {

  private final SyntaxToken importToken;
  private final SyntaxToken flowImportTypeOfTypeOfToken;
  private final ImportClauseTree importClause;
  private final FromClauseTree fromClause;
  private final SyntaxToken semicolonToken;

  public ImportDeclarationTreeImpl(
    InternalSyntaxToken importToken,
    @Nullable SyntaxToken flowImportTypeOfTypeOfToken,
    ImportClauseTree importClause,
    FromClauseTree fromClause,
    @Nullable SyntaxToken semicolonToken
  ) {
    this.importToken = importToken;
    this.flowImportTypeOfTypeOfToken = flowImportTypeOfTypeOfToken;
    this.importClause = importClause;
    this.fromClause = fromClause;
    this.semicolonToken = semicolonToken;
  }

  @Override
  public SyntaxToken importToken() {
    return importToken;
  }

  @Nullable
  @Override
  public SyntaxToken flowImportTypeOrTypeOfToken() {
    return flowImportTypeOfTypeOfToken;
  }

  @Override
  public ImportClauseTree importClause() {
    return importClause;
  }

  @Override
  public FromClauseTree fromClause() {
    return fromClause;
  }

  @Nullable
  @Override
  public SyntaxToken semicolonToken() {
    return semicolonToken;
  }

  @Override
  public Kind getKind() {
    return Kind.IMPORT_DECLARATION;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(importToken, flowImportTypeOfTypeOfToken, importClause, fromClause, semicolonToken);
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitImportDeclaration(this);
  }
}
