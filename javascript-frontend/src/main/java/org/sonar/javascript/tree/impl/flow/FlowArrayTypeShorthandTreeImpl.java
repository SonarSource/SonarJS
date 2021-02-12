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
package org.sonar.javascript.tree.impl.flow;

import com.google.common.collect.Iterators;
import java.util.Iterator;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.flow.FlowArrayTypeShorthandTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypeTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class FlowArrayTypeShorthandTreeImpl extends JavaScriptTree implements FlowArrayTypeShorthandTree {

  private final FlowTypeTree type;
  private final SyntaxToken lBracketToken;
  private final SyntaxToken rBracketToken;

  public FlowArrayTypeShorthandTreeImpl(FlowTypeTree type, SyntaxToken lBracketToken, SyntaxToken rBracketToken) {
    this.type = type;
    this.lBracketToken = lBracketToken;
    this.rBracketToken = rBracketToken;
  }

  @Override
  public Kind getKind() {
    return Kind.FLOW_ARRAY_TYPE_SHORTHAND;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(type, lBracketToken, rBracketToken);
  }

  @Override
  public FlowTypeTree type() {
    return type;
  }

  @Override
  public SyntaxToken lBracketToken() {
    return lBracketToken;
  }

  @Override
  public SyntaxToken rBracketToken() {
    return rBracketToken;
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitFlowArrayTypeShorthand(this);
  }
}
