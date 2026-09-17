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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.file.Path;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.sonar.api.a3s.A3SContextCollector;
import org.sonar.plugins.javascript.bridge.PluginInfo;

class DefaultFilesystemCacheContextTest {

  @AfterEach
  void resetPluginVersion() {
    PluginInfo.setVersion(null);
  }

  @Test
  void shouldSupportFilesystemCache() {
    assertThat(
      new DefaultFilesystemCacheContext(mock(A3SContextCollector.class)).isSupported()
    ).isTrue();
    assertThat(new NoOpFilesystemCacheContext().isSupported()).isFalse();
  }

  @Test
  void shouldCollectVersionedFilesystemArchive() {
    PluginInfo.setVersion("1.2.3.456");
    var collector = mock(A3SContextCollector.class);
    var item = mock(A3SContextCollector.Item.class);
    var archive = Path.of("archive.pb.gz");
    when(collector.newFileItem(FilesystemCacheContext.ARCHIVE_ITEM_ID, archive)).thenReturn(item);

    new DefaultFilesystemCacheContext(collector).collect(archive);

    verify(collector).collect(
      FilesystemCacheContext.CONTEXT_KIND,
      "{\"version\":1,\"analyzerVersion\":\"1.2.3.456\"}",
      java.util.List.of(item)
    );
  }
}
