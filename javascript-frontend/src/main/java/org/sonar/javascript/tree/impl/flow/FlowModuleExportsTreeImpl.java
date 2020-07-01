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
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.flow.FlowModuleExportsTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypeAnnotationTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class FlowModuleExportsTreeImpl extends JavaScriptTree implements FlowModuleExportsTree {

  private final SyntaxToken moduleToken;
  private final SyntaxToken dotToken;
  private final SyntaxToken exportsToken;
  private final FlowTypeAnnotationTree typeAnnotation;

  public FlowModuleExportsTreeImpl(SyntaxToken moduleToken, SyntaxToken dotToken, SyntaxToken exportsToken, FlowTypeAnnotationTree typeAnnotation) {
    this.moduleToken = moduleToken;
    this.dotToken = dotToken;
    this.exportsToken = exportsToken;
    this.typeAnnotation = typeAnnotation;
  }

  @Override
  public Kind getKind() {
    return Kind.FLOW_MODULE_EXPORTS;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(moduleToken, dotToken, exportsToken, typeAnnotation);
  }

  @Override
  public SyntaxToken moduleToken() {
    return moduleToken;
  }

  @Override
  public SyntaxToken dotToken() {
    return dotToken;
  }

  @Override
  public SyntaxToken exportsToken() {
    return exportsToken;
  }

  @Override
  public FlowTypeAnnotationTree typeAnnotation() {
    return typeAnnotation;
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitFlowModuleExports(this);
  }
}
