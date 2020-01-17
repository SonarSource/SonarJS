/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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

import com.google.common.base.Functions;
import com.google.common.collect.Iterators;
import java.util.Iterator;
import javax.annotation.Nullable;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.SeparatedList;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.flow.FlowObjectTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowPropertyDefinitionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class FlowObjectTypeTreeImpl extends JavaScriptTree implements FlowObjectTypeTree {
  private final SyntaxToken lcurlyToken;
  private final SyntaxToken lpipeToken;
  private final SeparatedList<FlowPropertyDefinitionTree> properties;
  private final SyntaxToken rpipeToken;
  private final SyntaxToken rcurlyToken;

  public FlowObjectTypeTreeImpl(
    SyntaxToken lcurlyToken, @Nullable SyntaxToken lpipeToken, SeparatedList<FlowPropertyDefinitionTree> properties, @Nullable SyntaxToken rpipeToken, SyntaxToken rcurlyToken
  ) {

    this.lcurlyToken = lcurlyToken;
    this.lpipeToken = lpipeToken;
    this.properties = properties;
    this.rpipeToken = rpipeToken;
    this.rcurlyToken = rcurlyToken;
  }

  @Override
  public Kind getKind() {
    return Kind.FLOW_OBJECT_TYPE;
  }

  @Override
  public SyntaxToken lcurlyToken() {
    return lcurlyToken;
  }

  @Nullable
  @Override
  public SyntaxToken lpipeToken() {
    return lpipeToken;
  }

  @Override
  public SeparatedList<FlowPropertyDefinitionTree> properties() {
    return properties;
  }

  @Nullable
  @Override
  public SyntaxToken rpipeToken() {
    return rpipeToken;
  }

  @Override
  public SyntaxToken rcurlyToken() {
    return rcurlyToken;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.concat(
      Iterators.forArray(lcurlyToken, lpipeToken),
      properties.elementsAndSeparators(Functions.identity()),
      Iterators.forArray(rpipeToken, rcurlyToken));
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitFlowObjectTypeTree(this);
  }
}
