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

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;

import static java.util.Collections.emptyList;

public class TsConfigFile implements Predicate<InputFile> {
  private static final Logger LOG = Loggers.get(TsConfigFile.class);

  public static final TsConfigFile UNMATCHED_CONFIG = new TsConfigFile("NO_CONFIG", emptyList(), emptyList());

  final String filename;
  final List<String> files;
  final List<String> projectReferences;

  public TsConfigFile(String filename, List<String> files, List<String> projectReferences) {
    this.filename = filename;
    this.files = files;
    this.projectReferences = projectReferences;
  }

  public String getFilename() {
    return filename;
  }

  public List<String> getFiles() {
    return files;
  }

  public List<String> getProjectReferences() {
    return projectReferences;
  }

  @Override
  public boolean test(InputFile inputFile) {
    return files.contains(inputFile.absolutePath());
  }

  // Visible for testing
  public static Map<TsConfigFile, List<InputFile>> inputFilesByTsConfig(List<TsConfigFile> tsConfigFiles, List<InputFile> inputFiles) {
    Map<TsConfigFile, List<InputFile>> result = new LinkedHashMap<>();
    inputFiles.forEach(inputFile -> {
      TsConfigFile tsconfig = tsConfigFiles.stream()
        .filter(tsConfigFile -> tsConfigFile.test(inputFile))
        .findFirst().orElse(UNMATCHED_CONFIG);
      LOG.debug("{} matched {}", inputFile.absolutePath(), tsconfig);
      result.computeIfAbsent(tsconfig, t -> new ArrayList<>()).add(inputFile);
    });
    return result;
  }

  @Override
  public String toString() {
    return filename;
  }
}
