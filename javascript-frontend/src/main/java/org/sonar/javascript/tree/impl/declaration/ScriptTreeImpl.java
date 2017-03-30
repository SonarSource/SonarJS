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
package org.sonar.javascript.tree.impl.declaration;

import com.google.common.collect.Iterators;
import java.util.Iterator;
import javax.annotation.Nullable;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.ModuleTree;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class ScriptTreeImpl extends JavaScriptTree implements ScriptTree {

  private final InternalSyntaxToken shebangToken;
  private final ModuleTree items;
  private final InternalSyntaxToken eof;

  public ScriptTreeImpl(@Nullable InternalSyntaxToken shebangToken, @Nullable ModuleTree items, InternalSyntaxToken eof) {
    this.shebangToken = shebangToken;
    this.items = items;
    this.eof = eof;

  }

  @Override
  @Nullable
  public SyntaxToken shebangToken() {
    return shebangToken;
  }

  @Override
  public ModuleTree items() {
    return items;
  }

  @Override
  public SyntaxToken EOFToken() {
    return eof;
  }

  @Override
  public Kind getKind() {
    return Kind.SCRIPT;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.<Tree>forArray(shebangToken, items, eof);
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitScript(this);
  }
}
