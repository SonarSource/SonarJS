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
import java.nio.file.Path;
import javax.annotation.Nullable;
import org.sonar.api.batch.sensor.cache.ReadCache;
import org.sonar.api.batch.sensor.cache.WriteCache;

class LazySerialization implements CacheWriter<GeneratedFiles, Void>, CacheReader<Path, Void> {

  private final JsonSerialization<FilesManifest> json = new JsonSerialization<>(FilesManifest.class);
  private final SequenceSerialization sequence = new SequenceSerialization();

  @Nullable
  @Override
  public Void writeCache(WriteCache cache, CacheKeyFactory cacheKeyFactory, @Nullable GeneratedFiles generatedFiles) throws IOException {
    var manifest = sequence.writeCache(cache, cacheKeyFactory, generatedFiles);
    json.writeCache(cache, cacheKeyFactory, manifest);
    return null;
  }

  @Override
  public boolean isFileInCache(ReadCache cache, CacheKeyFactory cacheKeyFactory) {
    return json.isFileInCache(cache, cacheKeyFactory) && sequence.isFileInCache(cache, cacheKeyFactory);
  }

  @Nullable
  @Override
  public Void readCache(ReadCache cache, CacheKeyFactory cacheKeyFactory, @Nullable Path workingDirectory) throws IOException {
    var manifest = json.readCache(cache, cacheKeyFactory, null);
    if (manifest == null) {
      throw new IOException("The manifest is null for key " + cacheKeyFactory);
    }

    var config = new SequenceConfig(workingDirectory, manifest);
    sequence.readCache(cache, cacheKeyFactory, config);
    return null;
  }

  @Override
  public void copyFromPrevious(WriteCache cache, CacheKeyFactory cacheKeyFactory) {
    json.copyFromPrevious(cache, cacheKeyFactory);
    sequence.copyFromPrevious(cache, cacheKeyFactory);
  }

}
