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
package org.sonar.javascript.model.implementations.lexical;

import com.sonar.sslr.api.AstNode;
import org.sonar.javascript.ast.visitors.TreeVisitor;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxTrivia;

import java.util.Iterator;

public class InternalSyntaxTrivia extends JavaScriptTree implements SyntaxTrivia {

  private final String comment;
  private int startLine;

  public InternalSyntaxTrivia(String comment, int startLine) {
    super((AstNode) null);
    this.comment = comment;
    this.startLine = startLine;
  }

  @Override
  public String comment() {
    return comment;
  }

  @Override
  public int startLine() {
    return startLine;
  }

  @Override
  public Kind getKind() {
    return Kind.TRIVIA;
  }

  @Override
  public boolean isLeaf() {
    return true;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    throw new UnsupportedOperationException();
  }

  public static SyntaxTrivia create(String comment, int startLine) {
    return new InternalSyntaxTrivia(comment, startLine);
  }

  @Override
  public int getLine() {
    return startLine;
  }

  @Override
  public void accept(TreeVisitor visitor) {
    //FIXME do nothing
  }
}
