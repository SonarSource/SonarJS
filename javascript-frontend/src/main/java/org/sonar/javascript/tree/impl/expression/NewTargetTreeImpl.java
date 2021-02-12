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
package org.sonar.javascript.tree.impl.expression;

import com.google.common.collect.Iterators;
import java.util.Iterator;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.symbols.TypeSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.NewTargetTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class NewTargetTreeImpl extends JavaScriptTree implements NewTargetTree {

  private final SyntaxToken newKeyword;

  private final SyntaxToken dot;

  private final SyntaxToken target;

  public NewTargetTreeImpl(SyntaxToken newKeyword, SyntaxToken dot, SyntaxToken target) {
    this.newKeyword = newKeyword;
    this.dot = dot;
    this.target = target;
  }

  @Override
  public SyntaxToken newKeyword() {
    return newKeyword;
  }

  @Override
  public SyntaxToken dotToken() {
    return dot;
  }

  @Override
  public SyntaxToken targetKeyword() {
    return target;
  }

  @Override
  public Kind getKind() {
    return Kind.NEW_TARGET;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(newKeyword, dot, target);
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitNewTarget(this);
  }

  @Override
  public TypeSet types() {
    return TypeSet.emptyTypeSet();
  }

}
