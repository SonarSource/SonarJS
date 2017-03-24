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
package org.sonar.javascript.utils;

import com.google.common.base.Throwables;
import java.io.IOException;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.config.MapSettings;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.javascript.visitors.JavaScriptVisitorContext;
import org.sonar.plugins.javascript.api.tree.ScriptTree;

import static org.sonar.javascript.compat.CompatibilityHelper.wrap;

public class TestUtils {

  public static JavaScriptVisitorContext createContext(InputFile file) {
    try {
      ScriptTree scriptTree = (ScriptTree) JavaScriptParserBuilder.createParser().parse(file.contents());
      return new JavaScriptVisitorContext(scriptTree, wrap(file), new MapSettings());
    } catch (IOException e) {
      throw Throwables.propagate(e);
    }
  }
}
