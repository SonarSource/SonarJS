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
package org.sonar.javascript.checks.verifier;

import com.google.common.base.Throwables;
import com.sonar.sslr.api.typed.ActionParser;
import java.io.File;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.config.Configuration;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.javascript.tree.symbols.GlobalVariableNames;
import org.sonar.javascript.tree.symbols.type.JQuery;
import org.sonar.javascript.visitors.JavaScriptVisitorContext;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;


public class TestUtils {

  protected static final ActionParser<Tree> p = newParser();

  private TestUtils() {
    // utility class, forbidden constructor
  }

  private static ActionParser<Tree> newParser() {
    return JavaScriptParserBuilder.createParser();
  }

  public static JavaScriptVisitorContext createContext(InputFile file) {
    return createContext(file, p);
  }

  public static JavaScriptVisitorContext createParallelContext(InputFile file) {
    return createContext(file, newParser());
  }

  private static JavaScriptVisitorContext createContext(InputFile file, ActionParser<Tree> parser) {
    try {
      ScriptTree scriptTree = (ScriptTree) parser.parse(file.contents());
      return new JavaScriptVisitorContext(scriptTree, file, config());
    } catch (IOException e) {
      throw Throwables.propagate(e);
    }
  }

  private static Configuration config() {
    MapSettings settings = new MapSettings();

    Map<String, String> properties = new HashMap<>();
    properties.put(JQuery.JQUERY_OBJECT_ALIASES, JQuery.JQUERY_OBJECT_ALIASES_DEFAULT_VALUE);
    properties.put(GlobalVariableNames.ENVIRONMENTS_PROPERTY_KEY, GlobalVariableNames.ENVIRONMENTS_DEFAULT_VALUE);
    properties.put(GlobalVariableNames.GLOBALS_PROPERTY_KEY, GlobalVariableNames.GLOBALS_PROPERTY_KEY);
    settings.addProperties(properties);

    return settings.asConfig();
  }

  public static DefaultInputFile createTestInputFile(String baseDir, String relativePath) {
    return new TestInputFileBuilder("module1", relativePath)
      .setModuleBaseDir(Paths.get(baseDir))
      .setLanguage("js")
      .setCharset(StandardCharsets.UTF_8)
      .setType(InputFile.Type.MAIN).build();
  }

  public static DefaultInputFile createTestInputFile(File baseDir, String relativePath) {
    return createTestInputFile(baseDir.getAbsolutePath(), relativePath);
  }

  public static DefaultInputFile createTestInputFile(String relativePath) {
    return createTestInputFile("", relativePath);
  }

  public static DefaultInputFile createTestInputFile(File baseDir, String relativePath, Charset charset) {
    return new TestInputFileBuilder(baseDir.getAbsolutePath(), relativePath)
      .setModuleBaseDir(Paths.get(baseDir.getAbsolutePath()))
      .setLanguage("js")
      .setCharset(charset)
      .build();
  }
}
