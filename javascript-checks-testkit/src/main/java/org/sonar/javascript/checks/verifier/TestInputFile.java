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
package org.sonar.javascript.checks.verifier;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;
import org.sonar.api.batch.fs.internal.DefaultInputFile;

public class TestInputFile extends DefaultInputFile {
  public TestInputFile(String relativePath) {
    this("", relativePath);
  }

  public TestInputFile(String baseDir, String relativePath) {
    super("module1", relativePath);
    this.setModuleBaseDir(Paths.get(baseDir))
      .setLanguage("js")
      .setCharset(StandardCharsets.UTF_8)
      .setType(Type.MAIN);
  }

  public TestInputFile(File baseDir, String relativePath) {
    this(baseDir.getAbsolutePath(), relativePath);
  }
}
