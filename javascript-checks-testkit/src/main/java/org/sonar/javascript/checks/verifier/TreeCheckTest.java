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

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.javascript.visitors.JavaScriptVisitorContext;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.visitors.FileIssue;
import org.sonar.plugins.javascript.api.visitors.Issue;
import org.sonar.plugins.javascript.api.visitors.LineIssue;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;

class TreeCheckTest {

  private TreeCheckTest() {
  }

  public static Collection<CheckMessage> getIssues(String relativePath, JavaScriptCheck check) {
    InputFile file = TestUtils.createTestInputFile(relativePath);

    JavaScriptVisitorContext context = TestUtils.createContext(file);
    List<Issue> issues = check.scanFile(context);

    return getCheckMessages(issues);
  }

  private static Collection<CheckMessage> getCheckMessages(List<Issue> issues) {
    List<CheckMessage> checkMessages = new ArrayList<>();
    for (Issue issue : issues) {
      CheckMessage checkMessage;
      if (issue instanceof FileIssue) {
        FileIssue fileIssue = (FileIssue)issue;
        checkMessage = new CheckMessage(fileIssue.check(), fileIssue.message());

      } else if (issue instanceof LineIssue) {
        LineIssue lineIssue = (LineIssue)issue;
        checkMessage = new CheckMessage(lineIssue.check(), lineIssue.message());
        checkMessage.setLine(lineIssue.line());

      } else {
        PreciseIssue preciseIssue = (PreciseIssue) issue;
        checkMessage = new CheckMessage(preciseIssue.check(), preciseIssue.primaryLocation().message());
        checkMessage.setLine(preciseIssue.primaryLocation().startLine());
      }

      if (issue.cost() != null) {
        checkMessage.setCost(issue.cost());
      }

      checkMessages.add(checkMessage);
    }

    return checkMessages;
  }

}
