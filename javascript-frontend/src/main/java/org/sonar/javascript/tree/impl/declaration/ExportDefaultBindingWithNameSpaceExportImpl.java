/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.ExportDefaultBindingWithNameSpaceExport;
import org.sonar.plugins.javascript.api.tree.declaration.FromClauseTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class ExportDefaultBindingWithNameSpaceExportImpl extends JavaScriptTree implements ExportDefaultBindingWithNameSpaceExport {

  private final IdentifierTree exportedDefaultIdentifier;
  private final SyntaxToken commaToken;
  private final SyntaxToken starToken;
  private final SyntaxToken asToken;
  private final IdentifierTree synonymIdentifier;
  private final FromClauseTree fromClause;
  private final SyntaxToken semicolonToken;

  public ExportDefaultBindingWithNameSpaceExportImpl(
    IdentifierTree exportedDefaultIdentifier, SyntaxToken commaToken,
    SyntaxToken starToken, SyntaxToken asToken, IdentifierTree synonymIdentifier,
    FromClauseTree fromClause, @Nullable SyntaxToken semicolonToken
  ) {
    this.exportedDefaultIdentifier = exportedDefaultIdentifier;
    this.commaToken = commaToken;
    this.starToken = starToken;
    this.asToken = asToken;
    this.synonymIdentifier = synonymIdentifier;
    this.fromClause = fromClause;
    this.semicolonToken = semicolonToken;
  }

  @Override
  public Kind getKind() {
    return Kind.EXPORT_DEFAULT_BINDING_WITH_NAMESPACE_EXPORT;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(exportedDefaultIdentifier, commaToken, starToken, asToken, synonymIdentifier, fromClause, semicolonToken);
  }

  @Override
  public IdentifierTree exportedDefaultIdentifier() {
    return exportedDefaultIdentifier;
  }

  @Override
  public SyntaxToken commaToken() {
    return commaToken;
  }

  @Override
  public SyntaxToken starToken() {
    return starToken;
  }

  @Override
  public SyntaxToken asToken() {
    return asToken;
  }

  @Override
  public IdentifierTree synonymIdentifier() {
    return synonymIdentifier;
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
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitExportDefaultBindingWithNameSpaceExport(this);
  }
}
