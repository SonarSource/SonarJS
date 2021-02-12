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
import java.util.List;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.flow.FlowDeclareTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowModuleTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class FlowModuleTreeImpl extends JavaScriptTree implements FlowModuleTree {

  private final SyntaxToken moduleToken;
  private final SyntaxToken moduleName;
  private final SyntaxToken openCurlyBraceToken;
  private final List<FlowDeclareTree> elements;
  private final SyntaxToken closeCurlyBraceToken;

  public FlowModuleTreeImpl(
    SyntaxToken moduleToken, SyntaxToken moduleName,
    SyntaxToken openCurlyBraceToken, List<FlowDeclareTree> elements, SyntaxToken closeCurlyBraceToken
  ) {
    this.moduleToken = moduleToken;
    this.moduleName = moduleName;
    this.openCurlyBraceToken = openCurlyBraceToken;
    this.elements = elements;
    this.closeCurlyBraceToken = closeCurlyBraceToken;
  }

  @Override
  public Kind getKind() {
    return Kind.FLOW_MODULE;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.concat(Iterators.forArray(moduleToken, moduleName, openCurlyBraceToken), elements.iterator(), Iterators.forArray(closeCurlyBraceToken));
  }

  @Override
  public SyntaxToken moduleToken() {
    return moduleToken;
  }

  @Override
  public SyntaxToken moduleName() {
    return moduleName;
  }

  @Override
  public SyntaxToken openCurlyBraceToken() {
    return openCurlyBraceToken;
  }

  @Override
  public List<FlowDeclareTree> elements() {
    return elements;
  }

  @Override
  public SyntaxToken closeCurlyBraceToken() {
    return closeCurlyBraceToken;
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitFlowModule(this);
  }
}
