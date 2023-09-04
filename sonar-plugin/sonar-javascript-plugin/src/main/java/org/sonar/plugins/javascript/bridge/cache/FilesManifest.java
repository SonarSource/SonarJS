/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
package org.sonar.plugins.javascript.bridge.cache;

import java.util.List;

class FilesManifest {

  private final List<FileSize> fileSizes;

  FilesManifest(List<FileSize> fileSizes) {
    this.fileSizes = List.copyOf(fileSizes);
  }

  List<FileSize> getFileSizes() {
    return fileSizes;
  }

  static class FileSize {

    private final String name;
    private final long size;

    FileSize(String name, long size) {
      this.name = name;
      this.size = size;
    }

    String getName() {
      return name;
    }

    long getSize() {
      return size;
    }
  }
}
