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
package org.sonar.javascript.tree.impl.typescript;

import com.google.common.base.Functions;
import com.google.common.collect.Iterators;
import java.util.Iterator;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.SeparatedList;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.typescript.TSTypeParameterTree;
import org.sonar.plugins.javascript.api.tree.typescript.TSTypeParametersTree;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;

public class TSTypeParametersTreeImpl extends JavaScriptTree implements TSTypeParametersTree {

  private InternalSyntaxToken openAngleBracketToken;
  private InternalSyntaxToken closeAngleBracketToken;
  private SeparatedList<TSTypeParameterTree> typeParameterList;

  public TSTypeParametersTreeImpl(InternalSyntaxToken openAngleBracketToken, SeparatedList<TSTypeParameterTree> typeParameterList, InternalSyntaxToken closeAngleBracketToken) {
    this.openAngleBracketToken = openAngleBracketToken;
    this.typeParameterList = typeParameterList;
    this.closeAngleBracketToken = closeAngleBracketToken;
  }

  @Override
  public Kind getKind() {
    return Kind.TS_TYPE_PARAMETERS;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.concat(
      Iterators.singletonIterator(openAngleBracketToken),
      typeParameterList.elementsAndSeparators(Functions.<TSTypeParameterTree>identity()),
      Iterators.singletonIterator(closeAngleBracketToken));
  }

  @Override
  public SyntaxToken openAngleBracketToken() {
    return openAngleBracketToken;
  }

  @Override
  public SeparatedList<TSTypeParameterTree> typeParameterList() {
    return typeParameterList;
  }

  @Override
  public SyntaxToken closeAngleBracketToken() {
    return closeAngleBracketToken;
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitTSTypeParameters(this);
  }
}
