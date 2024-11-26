/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.issue.NewIssue;
import org.sonar.plugins.javascript.bridge.BridgeServer.Issue;

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
    Issue issue,
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
