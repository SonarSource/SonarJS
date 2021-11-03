/*
 * SonarCSS
 * Copyright (C) 2018-2021 SonarSource SA
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
package org.sonar.css.plugin;

import java.io.IOException;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFileFilter;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;

public class MinifiedFilesFilter implements InputFileFilter {

  private static final int AVERAGE_LINE_LENGTH_THRESHOLD = 200;

  private static final Logger LOG = Loggers.get(MinifiedFilesFilter.class);

  @Override
  public boolean accept(InputFile file) {
    if (!CssLanguage.KEY.equals(file.language())) {
      return true;
    }

    try {
      boolean isMinified = hasMinifiedFileName(file) || hasExcessiveAverageLineLength(file);
      if (isMinified) {
        LOG.debug("File [" + file.uri() + "] looks like a minified file and will not be analyzed");
      }
      return !isMinified;

    } catch (IOException e) {
      throw new IllegalStateException("Failed to read input file", e);
    }
  }

  private static boolean hasMinifiedFileName(InputFile file) {
    String fileName = file.filename();
    return fileName.endsWith("-min.css") || fileName.endsWith(".min.css");
  }

  private static boolean hasExcessiveAverageLineLength(InputFile file) throws IOException {
    int averageLineLength = file.contents().length() / file.lines();
    return averageLineLength > AVERAGE_LINE_LENGTH_THRESHOLD;
  }

}
