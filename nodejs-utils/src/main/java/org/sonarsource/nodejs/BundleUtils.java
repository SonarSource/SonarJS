/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
package org.sonarsource.nodejs;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Objects;
import org.apache.commons.compress.archivers.ArchiveEntry;
import org.apache.commons.compress.archivers.ArchiveInputStream;
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream;
import org.apache.commons.compress.compressors.xz.XZCompressorInputStream;
import org.apache.commons.compress.utils.IOUtils;

public class BundleUtils {

  private BundleUtils() {
    // do not instantiate - utility class
  }

  public static void extractFromClasspath(InputStream resource, Path targetPath) throws IOException {
    Objects.requireNonNull(resource);
    try (InputStream xzi = new XZCompressorInputStream(new BufferedInputStream(resource));
         ArchiveInputStream archive = new TarArchiveInputStream(xzi)) {
      ArchiveEntry entry;
      while ((entry = archive.getNextEntry()) != null) {
        if (!archive.canReadEntryData(entry)) {
          throw new IllegalStateException("Failed to extract bundle");
        }
        File entryFile = entryPath(targetPath, entry).toFile();
        if (entry.isDirectory()) {
          if (!entryFile.isDirectory() && !entryFile.mkdirs()) {
            throw new IOException("failed to create directory " + entryFile);
          }
        } else {
          File parent = entryFile.getParentFile();
          if (!parent.isDirectory() && !parent.mkdirs()) {
            throw new IOException("failed to create directory " + parent);
          }
          try (OutputStream os = Files.newOutputStream(entryFile.toPath())) {
            IOUtils.copy(archive, os);
          }
        }
      }
    }
  }

  private static Path entryPath(Path targetPath, ArchiveEntry entry) {
    Path entryPath = targetPath.resolve(entry.getName());
    if (!entryPath.startsWith(targetPath)) {
      throw new IllegalStateException("Archive entry " + entry.getName() + " is not within " + targetPath);
    }
    return entryPath;
  }
}
