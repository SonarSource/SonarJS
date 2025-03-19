/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
package org.sonar.plugins.javascript.analysis;

import static java.util.Arrays.stream;

import java.nio.file.Path;
import java.util.HashSet;
import java.util.Set;
import java.util.function.Predicate;
import org.sonar.api.utils.WildcardPattern;
import org.sonar.plugins.javascript.filter.JavaScriptExclusionsFileFilter;

/**
 * This class partially reproduces the behavior of JavaScriptExclusionsFileFilter's implementation.
 *
 * The support of JavaScript type-checking in SonarLint context depends on the project size, which
 * is manually computed by walking the file system. During the traversal, we need to replicate the
 * plugin's file filtering logic to consider the same set of files during counting.
 *
 * The replication is partial; it limits itself to consider files with the expected extensions and
 * located in directories that should not be excluded. However, minified files and files that are
 * too big are not excluded, as they would require reading their content. Furthermore, TypeScript
 * compiler would consider them regardless on program creation.
 *
 * @see JavaScriptExclusionsFileFilter
 */
public class LookupConfigProviderFilter {

  private LookupConfigProviderFilter() {}

  static class FileFilter implements Predicate<Path> {

    private final Set<String> extensions = new HashSet<>();

    public FileFilter(JsTsContext<?> context) {
      extensions.addAll(context.getJsTsExtensions());
    }

    @Override
    public boolean test(Path path) {
      return extensions.stream().anyMatch(ext -> path.toString().endsWith(ext));
    }
  }

  static class PathFilter implements Predicate<Path> {

    private final WildcardPattern[] exclusions;

    public PathFilter(JsTsContext<?> context) {
      exclusions = stream(context.getExcludedPaths())
        .map(WildcardPattern::create)
        .toArray(WildcardPattern[]::new);
    }

    @Override
    public boolean test(Path path) {
      return !WildcardPattern.match(exclusions, path.toString().replaceAll("[\\\\/]", "/"));
    }
  }
}
