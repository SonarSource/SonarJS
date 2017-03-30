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
package org.sonar.javascript.tree.impl.declaration;

import com.google.common.base.Functions;
import com.google.common.collect.Iterators;
import java.util.Iterator;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.SeparatedList;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.SpecifierListTree;
import org.sonar.plugins.javascript.api.tree.declaration.SpecifierTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class SpecifierListTreeImpl extends JavaScriptTree implements SpecifierListTree {

  private SyntaxToken openCurlyBraceToken;
  private final SeparatedList<SpecifierTree> specifiers;
  private SyntaxToken closeCurlyBraceToken;
  private final Kind kind;

  public SpecifierListTreeImpl(Kind kind, InternalSyntaxToken openCurlyBraceToken, SeparatedList<SpecifierTree> specifiers, InternalSyntaxToken closeCurlyBraceToken) {
    this.kind = kind;
    this.openCurlyBraceToken = openCurlyBraceToken;
    this.specifiers = specifiers;
    this.closeCurlyBraceToken = closeCurlyBraceToken;

  }

  @Override
  public SyntaxToken openCurlyBraceToken() {
    return openCurlyBraceToken;
  }

  @Override
  public SeparatedList<SpecifierTree> specifiers() {
    return specifiers;
  }

  @Override
  public SyntaxToken closeCurlyBraceToken() {
    return closeCurlyBraceToken;
  }

  @Override
  public Kind getKind() {
    return kind;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    if (specifiers == null) {
      return Iterators.<Tree>forArray(openCurlyBraceToken, closeCurlyBraceToken);
    }
    return Iterators.<Tree>concat(
      Iterators.singletonIterator(openCurlyBraceToken),
      specifiers.elementsAndSeparators(Functions.<SpecifierTree>identity()),
      Iterators.singletonIterator(closeCurlyBraceToken)
    );
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitSpecifierList(this);
  }
}
