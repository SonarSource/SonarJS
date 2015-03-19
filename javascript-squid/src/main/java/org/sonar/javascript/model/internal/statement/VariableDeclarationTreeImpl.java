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
package org.sonar.javascript.model.internal.statement;

import com.google.common.collect.Iterators;
import com.google.common.collect.Lists;
import com.sonar.sslr.api.AstNode;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.javascript.model.internal.SeparatedList;
import org.sonar.javascript.model.internal.declaration.ArrayBindingPatternTreeImpl;
import org.sonar.javascript.model.internal.declaration.InitializedBindingElementTreeImpl;
import org.sonar.javascript.model.internal.declaration.ObjectBindingPatternTreeImpl;
import org.sonar.javascript.model.internal.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.VariableDeclarationTree;

import java.util.Iterator;
import java.util.List;

public class VariableDeclarationTreeImpl extends JavaScriptTree implements VariableDeclarationTree {

  private final Kind kind;
  private final InternalSyntaxToken token;
  private final SeparatedList<BindingElementTree> variables;

  public VariableDeclarationTreeImpl(Kind kind, InternalSyntaxToken token, SeparatedList<BindingElementTree> variables, List<AstNode> children) {
    super(kind);

    this.kind = kind;
    this.token = token;
    this.variables = variables;

    addChild(token);
    for (AstNode child : children) {
      addChild(child);
    }
  }

  @Override
  public Kind getKind() {
    return kind;
  }

  @Override
  public SyntaxToken token() {
    return token;
  }

  @Override
  public SeparatedList<BindingElementTree> variables() {
    return variables;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.<Tree>concat(variables.iterator());
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitVariableDeclaration(this);
  }

  public List<IdentifierTree> variableIdentifiers() {
    List<IdentifierTree> identifiers = Lists.newArrayList();

    for (Tree parameter : variables) {

      if (parameter.is(Tree.Kind.BINDING_IDENTIFIER)) {
        identifiers.add((IdentifierTree) parameter);

      } else if (parameter.is(Tree.Kind.INITIALIZED_BINDING_ELEMENT)) {
        identifiers.addAll(((InitializedBindingElementTreeImpl) parameter).bindingIdentifiers());

      } else if (parameter.is(Tree.Kind.OBJECT_BINDING_PATTERN)) {
        identifiers.addAll(((ObjectBindingPatternTreeImpl) parameter).bindingIdentifiers());

      } else {
        identifiers.addAll(((ArrayBindingPatternTreeImpl) parameter).bindingIdentifiers());
      }
    }
    return identifiers;
  }
}
