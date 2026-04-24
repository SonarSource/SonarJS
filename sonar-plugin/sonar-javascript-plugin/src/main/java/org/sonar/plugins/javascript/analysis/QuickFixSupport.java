/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.issue.NewIssue;
import org.sonar.plugins.javascript.analyzeproject.grpc.Issue;

/**
 * QuickFix logic is separated here, because it can't be used directly in the plugin extension class, otherwise
 * pico container will fail when running in SQ environment where NewSonarLintIssue is not available.
 */
class QuickFixSupport {

  private static final Logger LOG = LoggerFactory.getLogger(QuickFixSupport.class);

  private QuickFixSupport() {
    // utility class
  }

  static void addQuickFixes(Issue issue, NewIssue sonarLintIssue, InputFile file) {
    for (var quickFixMessage : issue.getQuickFixesList()) {
      LOG.debug("Adding quick fix for issue {} at line {}", issue.getRuleId(), issue.getLine());
      var quickFix = sonarLintIssue.newQuickFix();
      var fileEdit = quickFix.newInputFileEdit();
      var hasValidEdit = false;

      for (var edit : quickFixMessage.getEditsList()) {
        var loc = edit.getLoc();
        if (!loc.hasLine() || !loc.hasColumn() || !loc.hasEndLine() || !loc.hasEndColumn()) {
          LOG.debug(
            "Skipping quick fix edit with incomplete location for rule {}",
            issue.getRuleId()
          );
          continue;
        }

        var textEdit = fileEdit.newTextEdit();
        textEdit
          .at(file.newRange(loc.getLine(), loc.getColumn(), loc.getEndLine(), loc.getEndColumn()))
          .withNewText(edit.getText());
        fileEdit.on(file).addTextEdit(textEdit);
        hasValidEdit = true;
      }

      if (!hasValidEdit) {
        LOG.debug("Skipping quick fix without valid edits for rule {}", issue.getRuleId());
        continue;
      }

      quickFix.addInputFileEdit(fileEdit).message(quickFixMessage.getMessage());
      sonarLintIssue.addQuickFix(quickFix);
    }
  }
}
