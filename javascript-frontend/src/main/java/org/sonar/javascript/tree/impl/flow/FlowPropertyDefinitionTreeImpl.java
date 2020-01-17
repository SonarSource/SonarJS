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

import com.google.common.collect.Iterators;
import java.util.Iterator;
import javax.annotation.Nullable;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.flow.FlowPropertyDefinitionKeyTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowPropertyDefinitionTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypeAnnotationTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class FlowPropertyDefinitionTreeImpl extends JavaScriptTree implements FlowPropertyDefinitionTree {

  private final SyntaxToken staticToken;
  private final SyntaxToken plusOrMinusToken;
  private final FlowPropertyDefinitionKeyTree key;
  private final FlowTypeAnnotationTree typeAnnotation;

  public FlowPropertyDefinitionTreeImpl(
    @Nullable SyntaxToken staticToken, @Nullable SyntaxToken plusOrMinusToken, FlowPropertyDefinitionKeyTree key, FlowTypeAnnotationTree typeAnnotation
  ) {
    this.staticToken = staticToken;
    this.plusOrMinusToken = plusOrMinusToken;
    this.key = key;
    this.typeAnnotation = typeAnnotation;
  }

  @Override
  public Kind getKind() {
    return Kind.FLOW_PROPERTY_DEFINITION;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(staticToken, plusOrMinusToken, key, typeAnnotation);
  }

  @Nullable
  @Override
  public SyntaxToken staticToken() {
    return staticToken;
  }

  @Nullable
  @Override
  public SyntaxToken plusOrMinusToken() {
    return plusOrMinusToken;
  }

  @Override
  public FlowPropertyDefinitionKeyTree key() {
    return key;
  }

  @Override
  public FlowTypeAnnotationTree typeAnnotation() {
    return typeAnnotation;
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitFlowPropertyType(this);
  }
}
