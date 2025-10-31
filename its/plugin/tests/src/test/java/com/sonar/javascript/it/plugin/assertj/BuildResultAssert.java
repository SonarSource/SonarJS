/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
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
        return Optional.ofNullable(item)
          .filter(BuildResult.class::isInstance)
          .map(BuildResult.class::cast)
          .map(result -> result.getLogsLines(logPredicate).size())
          .filter(linesPredicate)
          .isPresent();
      }
    };
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
      logsTimesWhere(format("has log \"%s\" %d time(s)", log, times), times, line ->
        line.contains(log)
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
      IntStream.range(0, files.size())
        .mapToObj(i -> tuple(files.get(i), cachedFilesCounts.get(i)))
        .forEach(this::check);
      return BuildResultAssert.this;
    }

    private void check(Tuple tuple) {
      var file = (String) tuple.toList().get(0);

      if ("WRITE_ONLY".equals(strategy)) {
        logsOnce(format("Cache strategy set to '%s' for file '%s' as %s", strategy, file, reason));
      } else if ("READ_AND_WRITE".equals(strategy)) {
        logsOnce(String.format("Cache strategy set to 'READ_AND_WRITE' for file '%s'", file));
      } else {
        fail("Unknown strategy " + strategy);
      }
    }
  }
}
