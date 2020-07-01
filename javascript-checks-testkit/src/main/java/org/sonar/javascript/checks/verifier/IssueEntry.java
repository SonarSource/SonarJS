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
import java.util.List;
import java.util.stream.Collectors;
import org.apache.commons.io.FileUtils;
import org.sonar.plugins.javascript.api.visitors.FileIssue;
import org.sonar.plugins.javascript.api.visitors.Issue;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.LineIssue;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;

public class IssueEntry {
  static final String TAG_END = "#";
  static final String TAG_START = "EXPECTED#";
  private final int startLine;
  private final int endLine;
  private final String message;
  private final File file;
  private final String locationBlurb;

  private IssueEntry(int startLine, int endLine, String message, String locationBlurb, File file) {
    this.startLine = startLine;
    this.endLine = endLine;
    this.message = message;
    this.locationBlurb = locationBlurb;
    this.file = file;
  }

  public static IssueEntry from(Issue issue, File file) {
    if (issue instanceof PreciseIssue) {
      final PreciseIssue preciseIssue = (PreciseIssue) issue;
      final IssueLocation primaryLocation = preciseIssue.primaryLocation();
      String locationBlurb = "P[" + primaryLocation.startLine() + "/" + primaryLocation.startLineOffset() + ","
        + primaryLocation.endLine() + "/" + primaryLocation.endLineOffset() + "]";
      return new IssueEntry(primaryLocation.startLine(), primaryLocation.endLine(), primaryLocation.message(), locationBlurb, file);
    }
    if (issue instanceof LineIssue) {
      final LineIssue lineIssue = (LineIssue) issue;
      return new IssueEntry(lineIssue.line(), lineIssue.line(), lineIssue.message(), "L[" + lineIssue.line() + "]", file);
    }
    if (issue instanceof FileIssue) {
      final FileIssue fileIssue = (FileIssue) issue;
      return new IssueEntry(0, 0, fileIssue.message(), "F", file);
    }
    throw new IllegalArgumentException("Unsupported issue type : " + issue.getClass());
  }

  String createExcerpt() {
    List<String> lines;
    try {
      lines = FileUtils.readLines(file, "UTF-8");
    } catch (IOException e) {
      throw new IllegalStateException("File " + file.getAbsolutePath() + " was not available for read", e);
    }
    int excerptStart = Math.max(0, startLine - BulkVerifier.margin);
    int excerptEnd = Math.min(lines.size(), endLine + BulkVerifier.margin);
    lines.set(startLine - 1, lines.get(startLine - 1) + "\t\t//" + message);
    List<String> excerptLines = lines.subList(excerptStart, excerptEnd);
    excerptLines.add(0, printIgnoreTag());
    return excerptLines.stream().collect(Collectors.joining("\n", "\n", "\n"));
  }

  String toId() {
    return file.getAbsolutePath() + ": " + locationBlurb;
  }

  private String printIgnoreTag() {
    return TAG_START + toId() + TAG_END;
  }
}
