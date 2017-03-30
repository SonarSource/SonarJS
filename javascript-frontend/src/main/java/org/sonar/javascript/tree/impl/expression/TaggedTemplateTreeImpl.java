/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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
import org.sonar.javascript.tree.symbols.type.TypableTree;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.symbols.TypeSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.TaggedTemplateTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateLiteralTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class TaggedTemplateTreeImpl extends JavaScriptTree implements TaggedTemplateTree, TypableTree {

  private ExpressionTree callee;
  private final TemplateLiteralTree template;

  public TaggedTemplateTreeImpl(ExpressionTree callee, TemplateLiteralTree template) {
    this.callee = callee;
    this.template = template;
  }

  @Override
  public ExpressionTree callee() {
    return callee;
  }

  @Override
  public TemplateLiteralTree template() {
    return template;
  }

  @Override
  public Kind getKind() {
    return Kind.TAGGED_TEMPLATE;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.<Tree>forArray(
      callee,
      template);
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitTaggedTemplate(this);
  }

  @Override
  public TypeSet types() {
    return TypeSet.emptyTypeSet();
  }

  @Override
  public void add(Type type) {
    throw new UnsupportedOperationException();
  }
}
