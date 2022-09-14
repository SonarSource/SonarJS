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
import java.util.List;
import javax.annotation.Nullable;
import org.sonar.api.batch.sensor.SensorContext;

class UCFGFilesSerialization extends AbstractSerialization implements CacheWriter<List<String>, Void>, CacheReader<Void, Void> {

  static final String SEQ_PREFIX = "SEQ";
  static final String JSON_PREFIX = "JSON";

  private final JsonSerialization<FilesManifest> json;
  private final SequenceSerialization sequence;

  UCFGFilesSerialization(SensorContext context, CacheKey cacheKey) {
    super(context, cacheKey);
    json = new JsonSerialization<>(FilesManifest.class, context, cacheKey.withPrefix(JSON_PREFIX));
    sequence = new SequenceSerialization(context, cacheKey.withPrefix(SEQ_PREFIX));
  }

  private static Path getWorkingDirectoryAbsolutePath(SensorContext context) {
    return context.fileSystem().workDir().toPath();
  }

  @Nullable
  @Override
  public Void writeCache(@Nullable List<String> files) throws IOException {
    var workingDirectory = getWorkingDirectoryAbsolutePath(getContext());
    var generatedFiles = new GeneratedFiles(workingDirectory, files);
    var manifest = sequence.writeCache(generatedFiles);
    json.writeCache(manifest);
    return null;
  }

  @Override
  public boolean isKeyInCache() {
    if (!json.isKeyInCache()) {
      return false;
    } else {
      return sequence.isKeyInCache();
    }
  }

  @Nullable
  @Override
  public Void readCache(@Nullable Void config) throws IOException {
    var workingDirectory = getWorkingDirectoryAbsolutePath(getContext());
    var manifest = json.readCache(null);
    if (manifest == null) {
      throw new IOException("The manifest is null for key " + getCacheKey());
    }

    var sequenceConfig = new SequenceConfig(workingDirectory, manifest);
    sequence.readCache(sequenceConfig);
    return null;
  }

  @Override
  public void copyFromPrevious() {
    json.copyFromPrevious();
    sequence.copyFromPrevious();
  }

}
