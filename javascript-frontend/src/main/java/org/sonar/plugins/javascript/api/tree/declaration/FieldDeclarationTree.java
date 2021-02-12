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
package org.sonar.plugins.javascript.api.tree.declaration;

import com.google.common.annotations.Beta;
import java.util.List;
import javax.annotation.Nullable;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypeAnnotationTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

/**
 *  Interface for class fields and static properties.
 *  This syntax is in proposal currently. See https://github.com/jeffmo/es-class-fields-and-static-properties
 */
@Beta
public interface FieldDeclarationTree extends Tree {

  List<DecoratorTree> decorators();

  @Nullable
  SyntaxToken staticToken();

  Tree propertyName();

  @Nullable
  FlowTypeAnnotationTree typeAnnotation();

  @Nullable
  SyntaxToken equalToken();

  @Nullable
  ExpressionTree initializer();

  @Nullable
  SyntaxToken semicolonToken();
}
