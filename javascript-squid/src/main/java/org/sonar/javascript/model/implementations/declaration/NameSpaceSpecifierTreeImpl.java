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
package org.sonar.javascript.model.implementations.declaration;

import com.google.common.collect.Iterators;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.expression.IdentifierTreeImpl;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.SpecifierTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;

import javax.annotation.Nullable;
import java.util.Iterator;

public class NameSpaceSpecifierTreeImpl extends JavaScriptTree implements SpecifierTree {

  private final SyntaxToken starToken;
  private final SyntaxToken asToken;
  private final IdentifierTree localName;

  public NameSpaceSpecifierTreeImpl(InternalSyntaxToken starToken, InternalSyntaxToken asToken, IdentifierTreeImpl localName) {
    super(Kind.NAMESPACE_IMPORT_SPECIFIER);
    this.starToken = starToken;
    this.asToken = asToken;
    this.localName = localName;

    addChildren(asToken, localName);
  }

  @Override
  public SyntaxToken name() {
    return starToken;
  }

  @Nullable
  @Override
  public SyntaxToken asToken() {
    return asToken;
  }

  @Nullable
  @Override
  public IdentifierTree localName() {
    return localName;
  }

  @Override
  public Kind getKind() {
    return Kind.NAMESPACE_IMPORT_SPECIFIER;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.<Tree>singletonIterator(localName);
  }

}
