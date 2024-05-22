/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.analysis;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.issue.NewIssue;
import org.sonar.plugins.javascript.bridge.BridgeServer;

/**
 * QuickFix logic is separated here, because it can't be used directly in the plugin extension class, otherwise
 * pico container will fail when running in SQ environment where NewSonarLintIssue is not available.
 */
class QuickFixSupport {

  private static final Logger LOG = LoggerFactory.getLogger(QuickFixSupport.class);

  private QuickFixSupport() {
    // utility class
  }

  static void addQuickFixes(
    BridgeServer.Issue issue,
    NewIssue sonarLintIssue,
    InputFile file
  ) {
    issue.quickFixes().forEach(qf -> {
      LOG.debug("Adding quick fix for issue {} at line {}", issue.ruleId(), issue.line());
      var quickFix = sonarLintIssue.newQuickFix();
      var fileEdit = quickFix.newInputFileEdit();
      qf.edits().forEach(e -> {
        var textEdit = fileEdit.newTextEdit();
        textEdit
          .at(file.newRange(e.loc().line(), e.loc().column(), e.loc().endLine(), e.loc().endColumn()))
          .withNewText(e.text());
        fileEdit.on(file).addTextEdit(textEdit);
      });
      quickFix.addInputFileEdit(fileEdit).message(qf.message());
      sonarLintIssue.addQuickFix(quickFix);
    });
  }
}
