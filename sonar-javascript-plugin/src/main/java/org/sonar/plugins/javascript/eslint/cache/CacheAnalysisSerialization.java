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
package org.sonar.plugins.javascript.eslint.cache;

import java.io.IOException;
import java.util.Objects;
import java.util.Optional;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer;
import org.sonar.plugins.javascript.eslint.PluginInfo;

import static java.util.Arrays.asList;

public class CacheAnalysisSerialization extends CacheSerialization {

  private final UCFGFilesSerialization ucfgFileSerialization;
  private final CpdSerialization cpdSerialization;
  private final JsonSerialization<FileMetadata> fileMetadataSerialization;

  CacheAnalysisSerialization(SensorContext context, CacheKey cacheKey) {
    super(context, cacheKey);
    ucfgFileSerialization = new UCFGFilesSerialization(context, cacheKey.forUcfg());
    cpdSerialization = new CpdSerialization(context, cacheKey.forCpd());
    fileMetadataSerialization = new JsonSerialization<>(FileMetadata.class, context, cacheKey.forFileMetadata());
  }

  @Override
  boolean isInCache() {
    return ucfgFileSerialization.isInCache() && cpdSerialization.isInCache();
  }

  Optional<FileMetadata> fileMetadata() throws IOException {
    if (fileMetadataSerialization.isInCache()) {
      return Optional.of(fileMetadataSerialization.readFromCache());
    } else {
      return Optional.empty();
    }
  }

  CacheAnalysis readFromCache() throws IOException {
    ucfgFileSerialization.readFromCache();

    var cpdData = cpdSerialization.readFromCache();
    validateCpdData(cpdData);

    return CacheAnalysis.fromCache(cpdData.getCpdTokens().toArray(new EslintBridgeServer.CpdToken[0]));
  }

  private static void validateCpdData(CpdData cpdData) throws IOException {
    if (cpdData == null || cpdData.getCpdTokens() == null) {
      throw new IOException("The CPD token list is empty");
    } else if (!Objects.equals(PluginInfo.getVersion(), cpdData.getPluginVersion())) {
      throw new IOException(String.format("The CPD plugin version [%s] doesn't match the plugin version [%s]", cpdData.getPluginVersion(), PluginInfo.getVersion()));
    }
  }

  void writeToCache(CacheAnalysis analysis, InputFile file) throws IOException {
    ucfgFileSerialization.writeToCache(analysis.getUcfgPaths());
    cpdSerialization.writeToCache(new CpdData(asList(analysis.getCpdTokens()), PluginInfo.getVersion()));
    fileMetadataSerialization.writeToCache(FileMetadata.from(file));
  }

  @Override
  void copyFromPrevious() {
    ucfgFileSerialization.copyFromPrevious();
    cpdSerialization.copyFromPrevious();
  }

}
