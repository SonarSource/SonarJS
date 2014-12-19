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
package org.sonar.javascript.model.implementations.expression;

import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.SeparatedList;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.expression.ObjectLiteralTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;

import java.util.Iterator;
import java.util.List;

public class ObjectLiteralTreeImpl extends JavaScriptTree implements ObjectLiteralTree {

  private final SyntaxToken openCurlyBrace;
  private final SeparatedList<ExpressionTree> properties;
  private final SyntaxToken closeCurlyBrace;

  public ObjectLiteralTreeImpl(InternalSyntaxToken openCurlyBrace, List<ExpressionTree> properties, List<InternalSyntaxToken> commas, InternalSyntaxToken closeCurlyBrace, List<AstNode> children) {
    super(Kind.ARRAY_LITERAL);
    this.openCurlyBrace = openCurlyBrace;
    this.closeCurlyBrace = closeCurlyBrace;
    this.properties = new SeparatedList<ExpressionTree>(properties, commas);

    for (AstNode child : children) {
      addChild(child);
    }
  }

  @Override
  public SyntaxToken openCurlyBrace() {
    return openCurlyBrace;
  }

  @Override
  public SeparatedList<ExpressionTree> properties() {
    return properties;
  }

  @Override
  public SyntaxToken closeCurlyBrace() {
    return closeCurlyBrace;
  }

  @Override
  public Kind getKind() {
    return Kind.OBJECT_LITERAL;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(properties.toArray(new Tree[properties.size()]));
  }

}
