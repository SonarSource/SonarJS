/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
import java.io.BufferedOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.function.Function;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;

import static java.util.stream.Collectors.toList;

class CacheAnalysisWrapper implements Function<InputFile, List<String>> {
  private final SensorContext context;
  private final Function<InputFile, List<String>> function;

  CacheAnalysisWrapper(SensorContext context, Function<InputFile, List<String>> function) {
    this.context = context;
    this.function = function;
  }

  @Override
  public List<String> apply(InputFile inputFile) {
    var cacheKey = createCacheKey(inputFile);
    var filePaths = getFilePaths(function.apply(inputFile));
    writeFilesToCache(cacheKey, filePaths);
    return function.apply(inputFile);
  }

  private void writeFilesToCache(String cacheKey, List<Path> filePaths) {
    try {
      writeArchiveToCache(cacheKey, filePaths);
    } catch (IOException e) {
      throw new UncheckedIOException("Failure when writing UCFG files to cache", e);
    }
  }

  private List<Path> getFilePaths(List<String> ucfgFilePaths) {
    return ucfgFilePaths.stream().map(Path::of).collect(toList());
  }

  private void writeArchiveToCache(String cacheKey, List<Path> filePaths) throws IOException {
    Path zipFile = null;
    try {
      zipFile = Files.createTempFile("jssecurity-ucfgs", ".zip");
      createZipArchive(zipFile, filePaths);
      writeFileToCache(cacheKey, zipFile);
    } finally {
      if (zipFile != null) {
        Files.deleteIfExists(zipFile);
      }
    }
  }

  private void writeFileToCache(String cacheKey, Path zipFile) throws IOException {
    try (var archive = new BufferedInputStream(Files.newInputStream(zipFile))) {
      context.nextCache().write(cacheKey, archive);
    }
  }

  private void createZipArchive(Path zipFile, List<Path> ucfgFilePaths) throws IOException {
    try (var zipArchive = new ZipOutputStream(new BufferedOutputStream(Files.newOutputStream(zipFile)))) {
      for (var ucfgFilePath : ucfgFilePaths) {
        zipArchive.putNextEntry(new ZipEntry(ucfgFilePath.getFileName().toString()));
        Files.copy(ucfgFilePath, zipArchive);
      }
    }
  }

  private String createCacheKey(InputFile inputFile) {
    return "jssecurity:ucfgs:".concat(inputFile.key());
  }
}
