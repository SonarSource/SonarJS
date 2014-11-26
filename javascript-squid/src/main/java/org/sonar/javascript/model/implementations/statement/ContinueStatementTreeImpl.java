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
package org.sonar.javascript.model.implementations.statement;

import com.google.common.base.Preconditions;
import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.lexical.IdentifierTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;
import org.sonar.javascript.model.interfaces.statement.ContinueStatementTree;

import javax.annotation.Nullable;
import java.util.Iterator;

public class ContinueStatementTreeImpl extends JavaScriptTree implements ContinueStatementTree {

  private SyntaxToken continueKeyword;
  @Nullable
  private final IdentifierTree label;

  public ContinueStatementTreeImpl(AstNode eos) {
    super(Kind.CONTINUE_STATEMENT);
    this.label = null;

    addChild(eos);
  }

  public ContinueStatementTreeImpl(IdentifierTree label, AstNode eos) {
    super(Kind.CONTINUE_STATEMENT);
    this.label = label;

    addChild((AstNode) label);
    addChild(eos);
  }

  public ContinueStatementTreeImpl complete(InternalSyntaxToken continueKeyword) {
    Preconditions.checkState(this.continueKeyword == null, "Already completed");
    this.continueKeyword = continueKeyword;

    prependChildren(continueKeyword);
    return this;
  }

  @Override
  public Kind getKind() {
    return Kind.CONTINUE_STATEMENT;
  }

  @Override
  public SyntaxToken continueKeyword() {
    return continueKeyword;
  }

  @Nullable
  @Override
  public IdentifierTree label() {
    return label;
  }

  @Override
  public Tree endOfStatement() {
    throw new UnsupportedOperationException("Not supported yet in the strongly typed AST.");
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.<Tree>singletonIterator(
      label);
  }

}
