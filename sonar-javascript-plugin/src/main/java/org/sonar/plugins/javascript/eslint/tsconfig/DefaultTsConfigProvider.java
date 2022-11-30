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
package org.sonar.plugins.javascript.eslint.tsconfig;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;

import static java.util.Collections.emptyList;
import static java.util.Collections.singletonList;

class DefaultTsConfigProvider implements Provider {

  private static String getBaseDir(SensorContext context) {
    var projectBaseDir = context.fileSystem().baseDir().getAbsolutePath();
    return "/".equals(File.separator) ? projectBaseDir : projectBaseDir.replace(File.separator, "/");
  }

  private static final Logger LOG = Loggers.get(DefaultTsConfigProvider.class);

  private static final Map<String, List<String>> defaultWildcardTsConfig = new ConcurrentHashMap<>();

  final TsConfigFileCreator tsConfigFileCreator;

  DefaultTsConfigProvider(TsConfigFileCreator tsConfigFileCreator) {
    this.tsConfigFileCreator = tsConfigFileCreator;
  }

  @Override
  public List<String> tsconfigs(SensorContext context) {
    return defaultWildcardTsConfig.computeIfAbsent(getBaseDir(context), this::writeTsConfigFileFor);
  }

  List<String> writeTsConfigFileFor(String baseDir) {
    List<String> file = emptyList();
    try {
      file = singletonList(tsConfigFileCreator.createTsConfigFile(baseDir));
      LOG.debug("Using generated tsconfig.json file using wildcard {}", file);
    } catch (IOException e) {
      LOG.warn("Generating tsconfig.json failed", e);
    }
    return file;
  }
}
