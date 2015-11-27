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
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;

public class SpecifierListTreeImpl extends JavaScriptTree implements SpecifierListTree {

  private SyntaxToken openCurlyBraceToken;
  private final SeparatedList<SpecifierTree> specifiers;
  private SyntaxToken closeCurlyBraceToken;
  private final Kind kind;

  public SpecifierListTreeImpl(Kind kind, InternalSyntaxToken openCurlyBraceToken, InternalSyntaxToken closeCurlyBraceToken) {
    this.kind = kind;
    this.openCurlyBraceToken = openCurlyBraceToken;
    this.specifiers = null;
    this.closeCurlyBraceToken = closeCurlyBraceToken;

  }

  public SpecifierListTreeImpl(Kind kind, SeparatedList<SpecifierTree> specifiers) {
    this.kind = kind;
    this.specifiers = specifiers;

  }

  public SpecifierListTreeImpl complete(InternalSyntaxToken openCurlyBraceToken, InternalSyntaxToken closeCurlyBraceToken) {
    this.openCurlyBraceToken = openCurlyBraceToken;
    this.closeCurlyBraceToken = closeCurlyBraceToken;
    return this;
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
  public void accept(TreeVisitor visitor) {
    visitor.visitSpecifierList(this);
  }
}
