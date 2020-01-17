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
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.util.Iterator;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.api.visitors.Issue;

public class ExpectedIssueCollector implements IssueCollector {

  private static final Logger LOGGER = Loggers.get(DifferentialIssueCollector.class);

  private final OutputStreamWriter writer;
  private final File expectedIssuesFile;
  private int nbIssues = 0;
  private int nbFiles = 0;

  public ExpectedIssueCollector(File expectedIssuesFile) throws IOException {
    this.writer = new OutputStreamWriter(new FileOutputStream(expectedIssuesFile), "UTF-8");
    this.expectedIssuesFile = expectedIssuesFile;
  }

  @Override
  public synchronized void writeIssues(Iterator<Issue> issues, File file) throws IOException {
    nbFiles++;
    while (issues.hasNext()) {
      final Issue issue = issues.next();
      nbIssues++;
      final String excerpt = IssueEntry.from(issue, file).createExcerpt();
      writer.write(excerpt);
      LOGGER.info(excerpt);
    }
  }

  @Override
  public void writeSummary() throws IOException {
    writer.write("\n\nTotal number of issues: " + nbIssues + " (on " + nbFiles + " scanned files)\n");
    LOGGER.info("Output dumped into file " + expectedIssuesFile.getAbsolutePath());
    writer.close();
  }
}
