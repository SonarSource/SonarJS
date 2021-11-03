/*
 * SonarCSS
 * Copyright (C) 2018-2021 SonarSource SA
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
package org.sonar.css.plugin.server.bundle;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

public class Zip {

  private Zip() {
    // utility class
  }

  public static void extract(InputStream bundle, Path destination) throws IOException {
    try (ZipInputStream zip = new ZipInputStream(bundle)) {
      ZipEntry entry = zip.getNextEntry();
      if (entry == null) {
        throw new IllegalStateException("At least one entry expected.");
      }
      while (entry != null) {
        Path entryDestination = entryPath(destination, entry);
        if (entry.isDirectory()) {
          Files.createDirectories(entryDestination);
        } else {
          Files.copy(zip, entryDestination, StandardCopyOption.REPLACE_EXISTING);
        }
        zip.closeEntry();
        entry = zip.getNextEntry();
      }
    }
  }

  private static Path entryPath(Path targetPath, ZipEntry entry) {
    Path entryPath = targetPath.resolve(entry.getName()).normalize();
    if (!entryPath.startsWith(targetPath)) {
      throw new IllegalStateException("Archive entry " + entry.getName() + " is not within " + targetPath);
    }
    return entryPath;
  }
}
