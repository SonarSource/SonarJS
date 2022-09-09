/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2022 SonarSource SA
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
package com.sonar.javascript.it.plugin;

import com.sonar.orchestrator.build.BuildResult;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.List;
import java.util.Optional;
import java.util.function.Predicate;
import org.assertj.core.api.AbstractAssert;
import org.assertj.core.api.Assertions;
import org.assertj.core.api.HamcrestCondition;
import org.hamcrest.CustomMatcher;
import org.hamcrest.Matcher;

import static java.util.stream.Collectors.toList;
import static org.assertj.core.api.Assertions.fail;

class BuildResultAssert extends AbstractAssert<BuildResultAssert, BuildResult> {

  private BuildResultAssert(BuildResult actual) {
    super(actual, BuildResultAssert.class);
  }

  static BuildResultAssert assertThat(BuildResult buildResult) {
    return new BuildResultAssert(buildResult);
  }

  private static Matcher<BuildResult> logMatcher(String description, Predicate<String> logPredicate, Predicate<Integer> linesPredicate) {
    return new CustomMatcher<>(description) {
      @Override
      public boolean matches(Object item) {
        return Optional.ofNullable(item)
          .filter(BuildResult.class::isInstance)
          .map(BuildResult.class::cast)
          .map(result -> result.getLogsLines(logPredicate).size())
          .filter(linesPredicate)
          .isPresent();
      }
    };
  }

  private static List<Path> findUcfgFilesIn(Path projectPath) throws IOException {
    try (var stream = Files.find(projectPath.resolve(".scannerwork"), 3, BuildResultAssert::isUcfgFile)) {
      return stream.collect(toList());
    }
  }

  private static boolean isUcfgFile(Path path, BasicFileAttributes attrs) {
    return attrs.isRegularFile() && path.getFileName().toString().endsWith(".ucfg");
  }

  BuildResultAssert logsOnce(String log) {
    return logsTimes(log, 1);
  }

  BuildResultAssert doesNotLog(String log) {
    return logsTimes(log, 0);
  }

  BuildResultAssert logsTimes(String log, int times) {
    var matcher = logMatcher(String.format("has logs [%s] %d time(s)", log, times),
      line -> line.contains(log), n -> n == times);
    return has(new HamcrestCondition<>(matcher));
  }

  BuildResultAssert logsAtLeastOnce(String log) {
    return has(new HamcrestCondition<>(logMatcher(String.format("has at least log [%s]", log), line -> line.contains(log), n -> n > 0)));
  }

  BuildResultAssert generatesUcfgFilesForAll(Path projectPath, String... filenames) {
    List<Path> ucfgFiles;
    try {
      ucfgFiles = findUcfgFilesIn(projectPath);
      for (var filename : filenames) {
        Assertions.assertThat(ucfgFiles)
          .filteredOn(file -> file.getFileName().toString().contains(filename.replace('.', '_')))
          .isNotEmpty();
      }
    } catch (IOException e) {
      fail("Failed", e);
    }
    return this;
  }

}
