/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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

import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonarsource.api.sonarlint.SonarLintSide;
import org.sonarsource.sonarlint.plugin.api.module.file.ModuleFileEvent;
import org.sonarsource.sonarlint.plugin.api.module.file.ModuleFileListener;

@SonarLintSide(lifespan = SonarLintSide.MODULE)
public class FSListenerImpl implements FSListener, ModuleFileListener {

  private static final Logger LOG = LoggerFactory.getLogger(FSListenerImpl.class);

  Map<String, String> changedFilesMap = new HashMap<>();

  public Map<String, String> listFSEvents() {
    var result = new HashMap<>(changedFilesMap);
    changedFilesMap.clear();
    return result;
  }

  @Override
  public void process(ModuleFileEvent moduleFileEvent) {
    var file = moduleFileEvent.getTarget();
    var filename = file.absolutePath();
    LOG.debug("Processing file event {} with event {}", filename, moduleFileEvent.getType());
    changedFilesMap.put(filename, moduleFileEvent.getType().name());
  }
}
