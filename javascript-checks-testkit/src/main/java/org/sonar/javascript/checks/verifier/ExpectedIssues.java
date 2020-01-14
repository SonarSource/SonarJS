/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
package org.sonar.javascript.checks.verifier;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class ExpectedIssues {
  private Map<String, Boolean> expectedEntries = new HashMap<>();

  public static ExpectedIssues parse(File expectedIssuesFile) throws IOException {
    final ExpectedIssues expectedIssues = new ExpectedIssues();
    final Pattern pattern = Pattern.compile(".*" + IssueEntry.TAG_START + "(.*)" + IssueEntry.TAG_END + ".*");
    if (expectedIssuesFile.exists()) {
      try (Stream<String> lines = Files.lines(expectedIssuesFile.toPath())) {
        lines.forEach(line -> {
          Matcher matcher = pattern.matcher(line);
          if (matcher.matches()) {
            expectedIssues.addExpectation(matcher.group(1));
          }
        });
      }
    } else {
      expectedIssuesFile.createNewFile();
    }
    return expectedIssues;
  }

  final void addExpectation(String id) {
    expectedEntries.put(id, false);
  }

  public boolean expects(IssueEntry issueEntry) {
    if (expectedEntries.containsKey(issueEntry.toId())) {
      expectedEntries.put(issueEntry.toId(), true);
      return true;
    } else {
      return false;
    }
  }

  public String describeMissingExpectations() {
    final String missingExpectations = expectedEntries.entrySet().stream().filter(entry -> !entry.getValue()).map(Map.Entry::getKey).collect(Collectors.joining("\n"));
    return "MISSING EXPECTATIONS : \n" + missingExpectations;
  }
}
