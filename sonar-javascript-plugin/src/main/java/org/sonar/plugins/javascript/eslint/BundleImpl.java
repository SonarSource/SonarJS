/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import java.util.Objects;
import java.util.zip.GZIPInputStream;
import org.apache.commons.compress.archivers.ArchiveEntry;
import org.apache.commons.compress.archivers.ArchiveInputStream;
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream;
import org.apache.commons.compress.utils.IOUtils;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.api.utils.TempFolder;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.api.utils.log.Profiler;
import org.sonarsource.api.sonarlint.SonarLintSide;

import static org.sonarsource.api.sonarlint.SonarLintSide.MULTIPLE_ANALYSES;

@ScannerSide
@SonarLintSide(lifespan = MULTIPLE_ANALYSES)
public class BundleImpl implements Bundle {

  private static final Logger LOG = Loggers.get(BundleImpl.class);
  private static final Profiler PROFILER = Profiler.createIfDebug(LOG);

  // this archive is created in eslint-bridge module
  private static final String BUNDLE_LOCATION = "/eslint-bridge-1.0.0.tgz";
  private static final String DEPLOY_LOCATION = "eslint-bridge-bundle";
  private static final String DEFAULT_STARTUP_SCRIPT = "package/bin/server";
  private final Path deployLocation;
  private final String bundleLocation;

  public BundleImpl(TempFolder tempFolder) {
    this(tempFolder, BUNDLE_LOCATION);
  }

  BundleImpl(TempFolder tempFolder, String bundleLocation) {
    this.bundleLocation = bundleLocation;
    this.deployLocation = tempFolder.newDir(DEPLOY_LOCATION).toPath();
  }

  @Override
  public void deploy() throws IOException {
    PROFILER.startDebug("Deploying bundle");
    LOG.debug("Deploying eslint-bridge into {}", deployLocation);
    InputStream bundle = getClass().getResourceAsStream(bundleLocation);
    if (bundle == null) {
      throw new IllegalStateException("eslint-bridge not found in plugin jar");
    }
    extractFromClasspath(bundle, deployLocation);
    PROFILER.stopDebug();
  }

  @Override
  public String startServerScript() {
    return resolve(DEFAULT_STARTUP_SCRIPT);
  }

  @Override
  public String resolve(String relativePath) {
    return deployLocation.resolve(relativePath).toAbsolutePath().toString();
  }

  private static void extractFromClasspath(InputStream resource, Path targetPath) throws IOException {
    Objects.requireNonNull(resource);
    try (InputStream stream = new GZIPInputStream(new BufferedInputStream(resource));
         ArchiveInputStream archive = new TarArchiveInputStream(stream)) {
      ArchiveEntry entry;
      while ((entry = archive.getNextEntry()) != null) {
        if (!archive.canReadEntryData(entry)) {
          throw new IllegalStateException("Failed to extract bundle");
        }
        Path entryFile = entryPath(targetPath, entry);
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

  private static Path entryPath(Path targetPath, ArchiveEntry entry) {
    Path entryPath = targetPath.resolve(entry.getName()).normalize();
    if (!entryPath.startsWith(targetPath)) {
      throw new IllegalStateException("Archive entry " + entry.getName() + " is not within " + targetPath);
    }
    return entryPath;
  }
}
