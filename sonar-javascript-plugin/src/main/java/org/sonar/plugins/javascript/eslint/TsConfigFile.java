/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
package org.sonar.plugins.javascript.eslint;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Predicate;
import java.util.stream.Collectors;
import javax.annotation.Nullable;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;

class TsConfigFile implements Predicate<InputFile> {
  private static final Logger LOG = Loggers.get(TsConfigFile.class);

  static final String UNMATCHED_CONFIG = "NO_CONFIG";

  private final String filename;
  private final List<String> files;

  private TsConfigFile(String filename, List<String> files) {
    this.filename = filename;
    this.files = files;
  }

  @Override
  public boolean test(InputFile inputFile) {
    return files.contains(inputFile.absolutePath());
  }

  static Map<String, List<InputFile>> inputFilesByTsConfig(List<String> tsconfigs, List<InputFile> inputFiles, EslintBridgeServer eslintBridgeServer) {
    Map<String, List<InputFile>> result = new HashMap<>();
    List<TsConfigFile> tsConfigFiles = tsconfigs.stream()
      .map(filename -> TsConfigFile.load(filename, eslintBridgeServer))
      .filter(Objects::nonNull)
      .collect(Collectors.toList());

    inputFiles.forEach(inputFile -> {
      String tsconfig = tsConfigFiles.stream()
        .filter(tsConfigFile -> tsConfigFile.test(inputFile))
        .map(tsConfigFile -> tsConfigFile.filename)
        .findFirst().orElse(UNMATCHED_CONFIG);
      LOG.debug("{} matched {}", inputFile.absolutePath(), tsconfig);
      result.computeIfAbsent(tsconfig, t -> new ArrayList<>()).add(inputFile);
    });
    return result;
  }

  @Nullable
  private static TsConfigFile load(String filename, EslintBridgeServer eslintBridgeServer) {
    try {
      return new TsConfigFile(filename, Arrays.asList(eslintBridgeServer.tsConfigFiles(filename)));
    } catch (Exception e) {
      LOG.warn("Failed to load tsconfig file from " + filename + ", it will be ignored.", e);
      return null;
    }
  }

}
