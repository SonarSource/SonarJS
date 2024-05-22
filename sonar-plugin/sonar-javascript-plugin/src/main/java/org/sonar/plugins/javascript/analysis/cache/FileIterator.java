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
package org.sonar.plugins.javascript.analysis.cache;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import org.apache.commons.compress.utils.CountingInputStream;

// This class is necessary to open files lazily and avoiding opening all files simultaneously.
class FileIterator implements Iterator<InputStream> {

  private final Iterator<Path> iterator;
  private final Map<Path, Long> fileSizes;

  FileIterator(Iterable<Path> files) {
    iterator = files.iterator();
    fileSizes = new LinkedHashMap<>();
  }

  List<Path> getFiles() {
    return List.copyOf(fileSizes.keySet());
  }

  int getCount() {
    return fileSizes.size();
  }

  long getFileSize(Path file) {
    return fileSizes.get(file);
  }

  @Override
  public boolean hasNext() {
    return iterator.hasNext();
  }

  @Override
  public InputStream next() {
    if (!hasNext()) {
      throw new NoSuchElementException();
    }
    return openNextFile();
  }

  private CountingInputStream openNextFile() {
    try {
      var file = iterator.next();
      return new CountingInputStream(new BufferedInputStream(Files.newInputStream(file))) {
        @Override
        public void close() throws IOException {
          super.close();
          fileSizes.put(file, getBytesRead());
        }
      };
    } catch (IOException e) {
      throw new UncheckedIOException("Failure when opening file", e);
    }
  }
}
