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
package org.sonar.javascript.compat;

import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.Version;

/**
 * Provides helper methods to support newer APIs when running in older runtimes.
 *
 * Use "wrap" for objects on which you will want to call methods that may not be available in older runtimes.
 * This helper will use a suitable class depending on the runtime version to implement missing features.
 * Important: do not pass a wrapped object back to the platform, for example in .on(InputFile) calls
 * when creating metrics. The platform expects the original objects back, and passing a wrapped
 * object may result in class cast exceptions. Pass the original object by getting it from InputFileWrapper.orig().
 *
 * Alternative approaches considered:
 *
 * 1. Wrap instances in a class that extends the implementation of the platform (DefaultInputFile).
 * The problem with that is the platform implementation class is internal and should not be used,
 * breaking its encapsulation would be very fragile and therefore dangerous.
 *
 * 2. Instead of wrapping, check the version at each use.
 * The problem with that is the widespread use of if-else statements,
 * that would be hard to keep track of (=> spaghetti), and very ugly.
 * Also, often the sensor context (to get the runtime version) is hard to access.
 */
public class CompatibilityHelper {

  public static final Version V6_0 = Version.create(6, 0);
  public static final Version V6_2 = Version.create(6, 2);

  private CompatibilityHelper() {
    // utility class, forbidden constructor
  }

  public static Iterable<InputFileWrapper> wrap(Iterable<InputFile> inputFiles, SensorContext context) {
    Version version = context.getSonarQubeVersion();
    if (version.isGreaterThanOrEqual(V6_2)) {
      return inputFileStream(inputFiles).map(InputFileWrapper::new).collect(Collectors.toList());
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
