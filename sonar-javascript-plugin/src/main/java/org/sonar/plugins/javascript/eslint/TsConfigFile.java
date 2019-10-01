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

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.io.BufferedReader;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileSystem;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.PathMatcher;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Predicate;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.annotation.Nullable;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;

import static java.util.Collections.emptyList;
import static java.util.Collections.singletonList;

class TsConfigFile implements Predicate<InputFile> {
  private static final Logger LOG = Loggers.get(TsConfigFile.class);

  static final String UNMATCHED_CONFIG = "NO_CONFIG";
  private static final Gson GSON = new GsonBuilder().setLenient().create();

  final String filename;
  final Path baseDir;
  final Model model;
  final Predicate<InputFile> matchers;

  static class Model {
    List<String> files;
    List<String> include;
    List<String> exclude;
  }

  static class FilesMatcher implements Predicate<InputFile> {
    final Set<Path> files;

    FilesMatcher(Path baseDir, List<String> files) {
      this.files = files.stream()
        .filter(Objects::nonNull)
        .map(Paths::get)
        .map(p -> p.isAbsolute() ? p : baseDir.resolve(p))
        .map(Path::normalize)
        .collect(Collectors.toSet());
    }

    @Override
    public boolean test(InputFile file) {
      return files.contains(file.path());
    }
  }

  static class GlobMatcher implements Predicate<InputFile> {

    private static final String DEFAULT_PATTERN = "**.{ts,tsx}";
    final List<PathMatcher> includes;
    final List<PathMatcher> excludes;

    GlobMatcher(Path baseDir, Model model) {
      if (model.include != null) {
        this.includes = model.include.stream()
          .filter(Objects::nonNull)
          .flatMap(include -> defaultGlobPattern(baseDir, include))
          .collect(Collectors.toList());
      } else if (model.files == null) {
        this.includes = singletonList(globPattern(baseDir, DEFAULT_PATTERN));
      } else  {
        this.includes = emptyList();
      }
      if (model.exclude != null) {
        this.excludes = model.exclude.stream()
          .filter(Objects::nonNull)
          .flatMap(exclude -> defaultGlobPattern(baseDir, exclude))
          .collect(Collectors.toList());
      } else {
        this.excludes = emptyList();
      }
    }

    private static Stream<PathMatcher> defaultGlobPattern(Path basedir, String pattern) {
      if (pattern.endsWith("**/*")) {
        // drop ending "/*" to have same behavior as tsc
        pattern = pattern.substring(0, pattern.length() - 2);
      }
      Stream.Builder<PathMatcher> result = Stream.builder();
      result.add(globPattern(basedir, pattern));
      if (!pattern.endsWith("**")) {
        // when include/exclude contain a directory like "src" we actually want "src/**.{ts,tsx}"
        result.add(globPattern(basedir, pattern + File.separator + DEFAULT_PATTERN));
      }
      return result.build();
    }

    private static PathMatcher globPattern(Path baseDir, String pattern) {
      FileSystem fs = FileSystems.getDefault();
      return fs.getPathMatcher("glob:" + escape(baseDir.toString() + File.separator + pattern));
    }

    private static String escape(String s) {
      return s.replaceAll("\\\\", "\\\\\\\\");
    }

    @Override
    public boolean test(InputFile file) {
      if (excludes.stream().anyMatch(matcher -> matcher.matches(file.path()))) {
        return false;
      }
      return includes.stream().anyMatch(matcher -> matcher.matches(file.path()));
    }
  }

  TsConfigFile(String filename, Path baseDir, Model model) {
    this.filename = filename;
    this.baseDir = baseDir;
    this.model = model;
    Predicate<InputFile> globMatcher = new GlobMatcher(baseDir, model);
    if (model.files != null && !model.files.isEmpty()) {
      matchers = new FilesMatcher(baseDir, model.files).or(globMatcher);
    } else {
      matchers = globMatcher;
    }
  }

  @Override
  public boolean test(InputFile inputFile) {
    return matchers.test(inputFile);
  }

  static Map<String, List<InputFile>> inputFilesByTsConfig(List<String> tsconfigs, List<InputFile> inputFiles) {
    Map<String, List<InputFile>> result = new HashMap<>();
    List<TsConfigFile> tsConfigFiles = tsconfigs.stream()
      .map(TsConfigFile::load)
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
  static TsConfigFile load(String filename) {
    Path path = Paths.get(filename).toAbsolutePath();
    try (BufferedReader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
      Model model = GSON.fromJson(reader, Model.class);
      return new TsConfigFile(filename, path.getParent(), model);
    } catch (Exception e) {
      LOG.error("Failed to load tsconfig file from " + filename + ". It will be ignored!\n" + e.toString());
      return null;
    }
  }


}
