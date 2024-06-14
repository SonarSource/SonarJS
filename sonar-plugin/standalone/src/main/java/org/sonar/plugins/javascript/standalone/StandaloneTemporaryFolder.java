/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.standalone;

import java.io.File;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import javax.annotation.Nullable;

public class StandaloneTemporaryFolder implements org.sonar.api.utils.TempFolder {

  @Override
  public File newDir() {
    return newDir("sonarjs");
  }

  @Override
  public File newDir(String name) {
    try {
      return Files.createTempDirectory(name).toFile();
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  @Override
  public File newFile() {
    return newFile(null, null);
  }

  @Override
  public File newFile(@Nullable String prefix, @Nullable String suffix) {
    try {
      return Files.createTempFile(prefix, suffix).toFile();
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }
}
