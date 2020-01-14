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
package org.sonar.plugins.javascript.api.tree.declaration;

import com.google.common.annotations.Beta;
import java.util.Optional;
import org.sonar.plugins.javascript.api.tree.SeparatedList;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

/**
 * Common interface for all types of
 * <a href="https://people.mozilla.org/~jorendorff/es6-draft.html#sec-destructuring-binding-patterns">Array Binding Pattern</a>
 * (<a href="http://wiki.ecmascript.org/doku.php?id=harmony:specification_drafts">ES6</a>)
 * <pre>
 *   [ ]
 *   [  {@link #elements()} ]
 * </pre>
 */
@Beta
public interface ArrayBindingPatternTree extends DeclarationTree, BindingElementTree {

  SyntaxToken openBracketToken();

  SeparatedList<Optional<BindingElementTree>> elements();

  SyntaxToken closeBracketToken();

}
