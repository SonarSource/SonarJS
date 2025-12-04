/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.sonarlint;

import java.util.List;
import java.util.Map;
import org.sonar.api.batch.fs.InputFile;
import org.sonarsource.sonarlint.plugin.api.module.file.ModuleFileEvent;

public interface FSListener {
  List<Map.Entry<InputFile, ModuleFileEvent.Type>> listFSEvents();
  List<Map.Entry<String, String>> listFSEventsStringified();
}
