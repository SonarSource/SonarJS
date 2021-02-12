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
package org.sonar.javascript.utils;

import com.google.common.base.Throwables;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.FileMetadata;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.javascript.visitors.JavaScriptVisitorContext;
import org.sonar.plugins.javascript.api.tree.ScriptTree;


public class TestUtils {

  public static JavaScriptVisitorContext createContext(InputFile file) {
    try {
      ScriptTree scriptTree = (ScriptTree) JavaScriptParserBuilder.createParser().parse(file.contents());
      return new JavaScriptVisitorContext(scriptTree, file, new MapSettings().asConfig());
    } catch (IOException e) {
      throw Throwables.propagate(e);
    }
  }

  public static DefaultInputFile createTestInputFile(File file, String contents, Charset encoding) {
    final DefaultInputFile inputFile = new TestInputFileBuilder("module1", file.getName()).setCharset(encoding).build();
    try {
      Files.write(file.toPath(), contents.getBytes(encoding));
      inputFile.setMetadata(new FileMetadata().readMetadata(new FileInputStream(file), encoding, file.getAbsolutePath()));
    } catch (IOException e) {
      throw Throwables.propagate(e);
    }
    return inputFile;
  }

  public static DefaultInputFile createTestInputFile(String baseDir, String relativePath) {
    return new TestInputFileBuilder("module1", relativePath)
      .setModuleBaseDir(Paths.get(baseDir))
      .setLanguage("js")
      .setCharset(StandardCharsets.UTF_8)
      .setType(InputFile.Type.MAIN).build();
  }

  public static DefaultInputFile createTestInputFile(String relativePath) {
    return createTestInputFile("", relativePath);
  }
}
