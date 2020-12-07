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
import java.util.Iterator;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.SeparatedList;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowNamespacedTypeTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class FlowNamespacedTypeTreeImpl extends JavaScriptTree implements FlowNamespacedTypeTree {

  private final SeparatedList<IdentifierTree> identifiers;

  public FlowNamespacedTypeTreeImpl(SeparatedList<IdentifierTree> identifiers) {
    this.identifiers = identifiers;
  }

  @Override
  public Kind getKind() {
    return Kind.FLOW_NAMESPACED_TYPE;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return identifiers.elementsAndSeparators(Functions.identity());
  }

  @Override
  public SeparatedList<IdentifierTree> identifiers() {
    return identifiers;
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitFlowNamespacedType(this);
  }
}
