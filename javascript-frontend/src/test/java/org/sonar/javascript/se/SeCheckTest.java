/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
package org.sonar.javascript.se;

import java.util.List;
import org.junit.Test;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.visitors.FileIssue;
import org.sonar.plugins.javascript.api.visitors.Issue;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.failBecauseExceptionWasNotThrown;

public class SeCheckTest {
  @Test
  public void should_not_keep_old_issues_after_exception() throws Exception {
    final SeCheck check = new ExceptionThrowerSeCheck();
    try {
      check.afterBlockElement(null, null);
      failBecauseExceptionWasNotThrown(IllegalStateException.class);
    } catch (IllegalStateException e) {
      // Do nothing
    }
    check.cleanupAndStartFileAnalysis(null);
    final List<Issue> issues = check.scanFile(null);
    assertThat(issues).isEmpty();
  }

  private class ExceptionThrowerSeCheck extends SeCheck {
    private boolean exceptionThrown = false;

    @Override
    public void afterBlockElement(ProgramState currentState, Tree element) {
      this.addIssue(new FileIssue(this, "some issue"));
      if (!exceptionThrown) {
        exceptionThrown = true;
        throw new IllegalStateException();
      }
    }
  }
}
