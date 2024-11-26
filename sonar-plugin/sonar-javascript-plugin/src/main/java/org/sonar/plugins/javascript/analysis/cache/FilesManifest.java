/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.analysis.cache;

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
