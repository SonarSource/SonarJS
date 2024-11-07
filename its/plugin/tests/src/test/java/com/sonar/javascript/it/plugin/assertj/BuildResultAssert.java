/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2024 SonarSource SA
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
package com.sonar.javascript.it.plugin.assertj;

import static java.lang.String.format;
import static java.util.regex.Pattern.compile;
import static org.assertj.core.api.Assertions.fail;
import static org.assertj.core.api.Assertions.tuple;

import com.sonar.orchestrator.build.BuildResult;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.List;
import java.util.Optional;
import java.util.function.Predicate;
import java.util.regex.Pattern;
import java.util.stream.IntStream;
import org.assertj.core.api.AbstractAssert;
import org.assertj.core.api.Assertions;
import org.assertj.core.api.HamcrestCondition;
import org.assertj.core.groups.Tuple;
import org.hamcrest.CustomMatcher;
import org.hamcrest.Matcher;

@SuppressWarnings({ "UnusedReturnValue", "SameParameterValue" })
public class BuildResultAssert extends AbstractAssert<BuildResultAssert, BuildResult> {

  private String projectKey;

  private BuildResultAssert(BuildResult actual) {
    super(actual, BuildResultAssert.class);
  }

  public static BuildResultAssert assertThat(BuildResult buildResult) {
    return new BuildResultAssert(buildResult);
  }

  private static Matcher<BuildResult> logMatcher(
    String description,
    Predicate<String> logPredicate,
    Predicate<Integer> linesPredicate
  ) {
    return new CustomMatcher<>(description) {
      @Override
      public boolean matches(Object item) {
        return Optional
          .ofNullable(item)
          .filter(BuildResult.class::isInstance)
          .map(BuildResult.class::cast)
          .map(result -> result.getLogsLines(logPredicate).size())
          .filter(linesPredicate)
          .isPresent();
      }
    };
  }

  private static List<Path> findUcfgFilesIn(Path projectPath) throws IOException {
    try (
      var stream = Files.find(projectPath.resolve(".scannerwork"), 3, BuildResultAssert::isUcfgFile)
    ) {
      return stream.toList();
    }
  }

  public static boolean isUcfgFile(Path path, BasicFileAttributes attrs) {
    return attrs.isRegularFile() && path.getFileName().toString().endsWith(".ucfgs");
  }

  public FileCacheStrategy cacheFileStrategy(String strategy) {
    return new FileCacheStrategy(strategy);
  }

  public BuildResultAssert withProjectKey(String projectKey) {
    this.projectKey = projectKey;
    return this;
  }

  public BuildResultAssert logsOnce(String... logs) {
    return logsTimes(1, logs);
  }

  public BuildResultAssert logsOnce(Pattern pattern) {
    return logsTimes(1, pattern);
  }

  public BuildResultAssert doesNotLog(String log) {
    return logsTimes(0, log);
  }

  public BuildResultAssert logsTimes(int times, String... logs) {
    for (var log : logs) {
      logsTimesWhere(
        format("has log \"%s\" %d time(s)", log, times),
        times,
        line -> line.contains(log)
      );
    }
    return this;
  }

  public BuildResultAssert logsTimes(int times, Pattern pattern) {
    return logsTimesWhere(
      format("contains regexp /%s/ %d time(s)", pattern.pattern(), times),
      times,
      pattern.asPredicate()
    );
  }

  private BuildResultAssert logsTimesWhere(
    String description,
    int times,
    Predicate<String> predicate
  ) {
    var matcher = logMatcher(description, predicate, n -> n == times);
    return has(new HamcrestCondition<>(matcher));
  }

  public BuildResultAssert logsAtLeastOnce(String log) {
    return has(
      new HamcrestCondition<>(
        logMatcher(format("has at least log [%s]", log), line -> line.contains(log), n -> n > 0)
      )
    );
  }

  public BuildResultAssert generatesUcfgFilesForAll(Path projectPath, String... filenames) {
    List<Path> ucfgFiles;
    try {
      ucfgFiles = findUcfgFilesIn(projectPath);
      for (var filename : filenames) {
        Assertions
          .assertThat(ucfgFiles)
          .filteredOn(file -> filename.replace('.', '_').contains(file.getFileName().toString().replaceFirst("[.][^.]+$", "")))
          .isNotEmpty();
      }
    } catch (IOException e) {
      fail("Failed", e);
    }
    return this;
  }

  public class FileCacheStrategy {

    private final String strategy;
    private List<String> files;
    private List<Integer> cachedFilesCounts;
    private String reason;

    FileCacheStrategy(String strategy) {
      this.strategy = strategy;
    }

    public FileCacheStrategy forFiles(String... files) {
      this.files = List.of(files);
      return this;
    }

    public FileCacheStrategy withCachedFilesCounts(int... cachedFilesCounts) {
      this.cachedFilesCounts = IntStream.of(cachedFilesCounts).boxed().toList();
      return this;
    }

    public FileCacheStrategy withReason(String reason) {
      this.reason = reason;
      return this;
    }

    public BuildResultAssert isUsed() {
      IntStream
        .range(0, files.size())
        .mapToObj(i -> tuple(files.get(i), cachedFilesCounts.get(i)))
        .forEach(this::check);
      return BuildResultAssert.this;
    }

    private void check(Tuple tuple) {
      var file = (String) tuple.toList().get(0);
      var cachedFileCount = (Integer) tuple.toList().get(1);

      if ("WRITE_ONLY".equals(strategy)) {
        logsOnce(format("Cache strategy set to '%s' for file '%s' as %s", strategy, file, reason));
        logsOnce(
          compile(
            format(
              "DEBUG: Cache entry created for key 'jssecurity:ucfgs:SEQ:(.+):%s:%s' containing %d file\\(s\\)",
              projectKey,
              file,
              cachedFileCount
            )
          )
        );
        logsOnce(
          compile(
            format(
              "DEBUG: Cache entry created for key 'jssecurity:ucfgs:JSON:(.+):%s:%s'",
              projectKey,
              file
            )
          )
        );
      } else if ("READ_AND_WRITE".equals(strategy)) {
        logsOnce(String.format("Cache strategy set to 'READ_AND_WRITE' for file '%s'", file));
        logsOnce(
          Pattern.compile(
            String.format(
              "DEBUG: Cache entry extracted for key 'jssecurity:ucfgs:SEQ:(.+):%s:%s' containing %d file\\(s\\)",
              projectKey,
              file,
              cachedFileCount
            )
          )
        );
        logsOnce(
          Pattern.compile(
            String.format(
              "DEBUG: Cache entry extracted for key 'jssecurity:ucfgs:JSON:(.+):%s:%s'",
              projectKey,
              file
            )
          )
        );
      } else {
        fail("Unknown strategy " + strategy);
      }
    }
  }
}
