/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.analysis;

import com.google.gson.Gson;
import java.nio.file.Path;
import java.util.List;
import org.sonar.api.a3s.A3SContextCollector;
import org.sonar.plugins.javascript.bridge.PluginInfo;

public class DefaultFilesystemCacheContext implements FilesystemCacheContext {

  private static final Gson GSON = new Gson();

  private final A3SContextCollector collector;

  public DefaultFilesystemCacheContext(A3SContextCollector collector) {
    this.collector = collector;
  }

  @Override
  public boolean isSupported() {
    return true;
  }

  @Override
  public boolean isEnabled() {
    return collector.isEnabled();
  }

  @Override
  public void collect(Path archivePath) {
    var item = collector.newFileItem(ARCHIVE_ITEM_ID, archivePath);
    var metadata = GSON.toJson(new Metadata(METADATA_VERSION, PluginInfo.getVersion()));
    collector.collect(CONTEXT_KIND, metadata, List.of(item));
  }

  private record Metadata(int version, String analyzerVersion) {}
}
