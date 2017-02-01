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
package org.sonar.plugins.javascript.api.visitors;

import com.google.common.annotations.Beta;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.javascript.compat.CompatibleInputFile;
import org.sonar.plugins.javascript.api.symbols.SymbolModel;
import org.sonar.plugins.javascript.api.tree.ScriptTree;

@Beta
public interface TreeVisitorContext {

  /**
   * @return the top tree node of the current file AST representation.
   */
  ScriptTree getTopTree();

  /**
   * @return the current InputFile
   */
  InputFile getInputFile();

  /**
   * @return the CompatibleInputFile wrapper of the underlying current InputFile
   */
  CompatibleInputFile getCompatibleInputFile();

  /**
   * @return the symbol model that allows to access the symbols declared in the current file
   */
  SymbolModel getSymbolModel();

  /**
   * @return The name of the current file
   */
  String getFileName();

}
