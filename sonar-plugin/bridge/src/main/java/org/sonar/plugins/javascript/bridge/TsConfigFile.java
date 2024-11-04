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
package org.sonar.plugins.javascript.bridge;

import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public class TsConfigFile {

  private final String filename;
  private final Set<String> files;
  private final List<String> projectReferences;

  public TsConfigFile(String filename, List<String> files, List<String> projectReferences) {
    this.filename = filename;
    this.files = files.stream().map(TsConfigFile::normalizePath).collect(Collectors.toSet());
    this.projectReferences = projectReferences;
  }

  public List<String> getProjectReferences() {
    return projectReferences;
  }

  public String getFilename() {
    return filename;
  }

  public Set<String> getFiles() {
    return files;
  }

  @Override
  public String toString() {
    return filename;
  }

  private static String normalizePath(String path) {
    return Path
      .of(path)
      .toString()
      .replaceAll("[\\\\/]", "/");
  }
}
