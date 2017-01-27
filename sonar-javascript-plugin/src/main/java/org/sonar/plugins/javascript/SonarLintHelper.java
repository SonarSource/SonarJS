/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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
package org.sonar.plugins.javascript;

import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.Version;

import static org.sonar.plugins.javascript.JavaScriptSquidSensor.V6_0;
import static org.sonar.plugins.javascript.JavaScriptSquidSensor.V6_2;

public class SonarLintHelper {

  private SonarLintHelper() {
    // utility class, forbidden constructor
  }

  public static Iterable<InputFile> compatibleInputFiles(Iterable<InputFile> inputFiles, SensorContext context) {
    Version version = context.getSonarQubeVersion();
    if (version.isGreaterThanOrEqual(V6_2)) {
      return inputFiles;
    }
    if (version.isGreaterThanOrEqual(V6_0)) {
      return inputFileStream(inputFiles).map(InputFileV60Compat::new).collect(Collectors.toList());
    }
    return inputFileStream(inputFiles).map(f -> new InputFileV56Compat(f, context)).collect(Collectors.toList());
  }

  private static Stream<InputFile> inputFileStream(Iterable<InputFile> inputFiles) {
    return StreamSupport.stream(inputFiles.spliterator(), false);
  }
}
