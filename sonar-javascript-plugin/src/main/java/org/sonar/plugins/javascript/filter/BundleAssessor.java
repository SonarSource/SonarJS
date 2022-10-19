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
package org.sonar.plugins.javascript.filter;

import java.io.IOException;
import java.io.InputStreamReader;
import java.util.regex.Pattern;
import org.apache.commons.io.IOUtils;
import org.apache.commons.io.input.BoundedReader;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;

import static java.util.regex.Pattern.DOTALL;

public class BundleAssessor implements Assessor {

  private static final Logger LOG = Loggers.get(BundleAssessor.class);
  static final String PROPERTY = "sonar.javascript.detectBundles";
  private static final Pattern COMMENT_OPERATOR_FUNCTION = Pattern.compile("/\\*.*\\*/\\s*[!;+(]function ?(?: [_$a-zA-Z][_$a-zA-Z0-9]*)?\\(", DOTALL);
  private static final int READ_CHARACTERS_LIMIT = 2048;

  private boolean triggered;

  @Override
  public boolean test(InputFile inputFile) {
    try (var reader = new BoundedReader(new InputStreamReader(inputFile.inputStream(), inputFile.charset()), READ_CHARACTERS_LIMIT)) {
      var content = IOUtils.toString(reader);
      var matcher = COMMENT_OPERATOR_FUNCTION.matcher(content);
      if (matcher.find()) {
        LOG.debug("File {} was excluded because it looks like a bundle. (Disable detection with " + PROPERTY + "=false)", inputFile);
        triggered = true;
        return true;
      }
    } catch (IOException e) {
      return true;
    }
    return false;
  }

  boolean triggered() {
    return triggered;
  }
}
