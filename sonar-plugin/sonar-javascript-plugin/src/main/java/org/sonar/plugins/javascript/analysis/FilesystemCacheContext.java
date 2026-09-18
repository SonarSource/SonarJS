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

import java.nio.file.Path;
import org.sonar.api.scanner.ScannerSide;
import org.sonarsource.api.sonarlint.SonarLintSide;

/**
 * Isolates the optional SQAA context-collection API from the analysis sensor. Implementations are
 * selected according to the host product and API version, so SonarQube for IDE never loads the
 * SQAA API type.
 */
@ScannerSide
@SonarLintSide
public interface FilesystemCacheContext {
  String CONTEXT_KIND = "javascript";
  String ARCHIVE_ITEM_ID = "filesystem-cache";
  String PROGRAM_SELECTION_ITEM_ID = "typescript-program-selection";
  int METADATA_VERSION = 2;

  /** Internal property set by SQAA after restoring the context item locally. */
  String RESTORED_ARCHIVE_PATH_PROPERTY = "sonar.javascript.internal.filesystemCacheArchivePath";
  String RESTORED_PROGRAM_SELECTION_PATH_PROPERTY =
    "sonar.javascript.internal.programSelectionArchivePath";

  boolean isSupported();

  boolean isEnabled();

  void collect(Path archivePath, Path programSelectionPath);
}
