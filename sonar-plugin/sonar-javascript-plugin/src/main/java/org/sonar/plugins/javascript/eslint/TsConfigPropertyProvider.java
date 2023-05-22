/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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

import static java.util.Collections.emptyList;
import static java.util.stream.Collectors.toList;

import java.io.File;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonarsource.analyzer.commons.FileProvider;

class TsConfigPropertyProvider {

  private static final Logger LOG = Loggers.get(TsConfigPropertyProvider.class);

  public static List<String> tsconfigs(SensorContext context) {
    if (
      !context.config().hasKey(JavaScriptPlugin.TSCONFIG_PATHS) &&
      !context.config().hasKey(JavaScriptPlugin.TSCONFIG_PATHS_ALIAS)
    ) {
      return emptyList();
    }

    String property = context.config().hasKey(JavaScriptPlugin.TSCONFIG_PATHS)
      ? JavaScriptPlugin.TSCONFIG_PATHS
      : JavaScriptPlugin.TSCONFIG_PATHS_ALIAS;
    Set<String> patterns = new HashSet<>(Arrays.asList(context.config().getStringArray(property)));

    LOG.info(
      "Resolving TSConfig files using '{}' from property {}",
      String.join(",", patterns),
      property
    );

    File baseDir = context.fileSystem().baseDir();

    List<String> tsconfigs = new ArrayList<>();
    for (String pattern : patterns) {
      LOG.debug("Using '{}' to resolve TSConfig file(s)", pattern);

      /* Resolving a TSConfig file based on a path */
      Path tsconfig = getFilePath(context, baseDir, pattern);
      if (tsconfig != null) {
        tsconfigs.add(tsconfig.toString());
        continue;
      }

      /* Resolving TSConfig files based on pattern matching */
      FileProvider fileProvider = new FileProvider(baseDir, pattern);
      List<File> matchingTsconfigs = fileProvider.getMatchingFiles();
      if (!matchingTsconfigs.isEmpty()) {
        tsconfigs.addAll(matchingTsconfigs.stream().map(File::getAbsolutePath).collect(toList()));
      }
    }

    LOG.info("Found " + tsconfigs.size() + " TSConfig file(s): " + tsconfigs);

    return tsconfigs;
  }

  private static Path getFilePath(SensorContext context, File baseDir, String path) {
    File file = new File(path);
    if (!file.isAbsolute()) {
      file = new File(baseDir, path);
    }

    // check context for tests, where files do not exist in FS
    var contextHasPath = false;
    try {
      contextHasPath =
        context
          .fileSystem()
          .hasFiles(context.fileSystem().predicates().hasAbsolutePath(file.getAbsolutePath()));
    } catch (InvalidPathException ignored) {
      //ignore exception due most probably to pattern instead of actual path
    }

    if (file.isFile() || contextHasPath) {
      return file.toPath();
    }

    return null;
  }
}
