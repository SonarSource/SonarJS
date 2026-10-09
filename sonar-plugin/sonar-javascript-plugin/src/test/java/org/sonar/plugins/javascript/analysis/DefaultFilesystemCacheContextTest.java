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
import org.junit.jupiter.api.Test;
import org.sonar.api.a3s.A3SContextCollector;

class DefaultFilesystemCacheContextTest {

  @Test
  void shouldSupportFilesystemCache() {
    assertThat(
      new DefaultFilesystemCacheContext(mock(A3SContextCollector.class)).isSupported()
    ).isTrue();
    assertThat(new NoOpFilesystemCacheContext().isSupported()).isFalse();
  }

  @Test
  void shouldCollectFilesystemArchiveAndAnalysisMetadata() {
    var collector = mock(A3SContextCollector.class);
    var filesystemItem = mock(A3SContextCollector.Item.class);
    var analysisMetadataItem = mock(A3SContextCollector.Item.class);
    var archive = Path.of("archive.pb.gz");
    var analysisMetadata = Path.of("analysis-metadata.pb.gz");
    when(collector.newFileItem(FilesystemCacheContext.ARCHIVE_ITEM_ID, archive)).thenReturn(
      filesystemItem
    );
    when(
      collector.newFileItem(FilesystemCacheContext.ANALYSIS_METADATA_ITEM_ID, analysisMetadata)
    ).thenReturn(analysisMetadataItem);

    var metadata = "{\"configuration\":{\"baseDir\":\"/project\"}}";
    new DefaultFilesystemCacheContext(collector).collect(archive, analysisMetadata, metadata);

    verify(collector).collect(
      FilesystemCacheContext.CONTEXT_KIND,
      metadata,
      java.util.List.of(filesystemItem, analysisMetadataItem)
    );
  }
}
