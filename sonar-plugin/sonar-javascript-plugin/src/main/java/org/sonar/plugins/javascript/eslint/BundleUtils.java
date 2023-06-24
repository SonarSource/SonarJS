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
package org.sonar.plugins.javascript.eslint;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.EnumSet;
import java.util.Objects;
import java.util.Set;
import java.util.zip.GZIPInputStream;
import org.apache.commons.compress.archivers.ArchiveEntry;
import org.apache.commons.compress.archivers.ArchiveInputStream;
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream;
import org.apache.commons.compress.utils.IOUtils;
import org.tukaani.xz.XZInputStream;

class BundleUtils {

  private BundleUtils() {
    // utility class
  }

  static void extractFromClasspath(InputStream resource, Path targetPath) throws IOException {
    Objects.requireNonNull(resource);
    try (
      InputStream stream = new BufferedInputStream(resource);
      XZInputStream archive = new XZInputStream(stream);
    ) {
      int nextBytes;
      byte[] buf = new byte[8 * 1024 * 1024];
      Path entryFile = entryPath(targetPath);
      try (OutputStream os = Files.newOutputStream(entryFile)) {
        while ((nextBytes = archive.read(buf)) > -1) {
          System.out.println("read " + nextBytes + " bytes");
          os.write(buf, 0, nextBytes);
        }
        stream.close();
        Set<PosixFilePermission> executable = EnumSet.of(
          PosixFilePermission.OWNER_READ,
          PosixFilePermission.OWNER_WRITE,
          PosixFilePermission.OWNER_EXECUTE,
          PosixFilePermission.GROUP_READ,
          PosixFilePermission.GROUP_WRITE,
          PosixFilePermission.OTHERS_READ,
          PosixFilePermission.OTHERS_EXECUTE);
        Files.setPosixFilePermissions(entryFile, executable);
      }
    }
  }

  private static Path entryPath(Path targetPath) {
    Path entryPath = targetPath.resolve("sonarjs").normalize();
    if (!entryPath.startsWith(targetPath)) {
      throw new IllegalStateException("Archive entry 'sonarjs' is not within " + targetPath);
    }
    return entryPath;
  }

  static void oldExtractFromClasspath(InputStream resource, Path targetPath) throws IOException {
    Objects.requireNonNull(resource);
    try (
      InputStream stream = new GZIPInputStream(new BufferedInputStream(resource));
      ArchiveInputStream archive = new TarArchiveInputStream(stream)
    ) {
      ArchiveEntry entry;
      while ((entry = archive.getNextEntry()) != null) {
        if (!archive.canReadEntryData(entry)) {
          throw new IllegalStateException("Failed to extract bundle");
        }
        Path entryFile = oldEntryPath(targetPath, entry);
        if (entry.isDirectory()) {
          Files.createDirectories(entryFile);
        } else {
          Path parent = entryFile.getParent();
          Files.createDirectories(parent);
          try (OutputStream os = Files.newOutputStream(entryFile)) {
            IOUtils.copy(archive, os);
          }
        }
      }
    }
  }

  private static Path oldEntryPath(Path targetPath, ArchiveEntry entry) {
    Path entryPath = targetPath.resolve(entry.getName()).normalize();
    if (!entryPath.startsWith(targetPath)) {
      throw new IllegalStateException(
        "Archive entry " + entry.getName() + " is not within " + targetPath
      );
    }
    return entryPath;
  }
}
