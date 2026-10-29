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
package org.sonar.plugins.javascript.api;

import java.util.List;
import java.util.Objects;
import org.sonar.api.batch.fs.InputFile;

/**
 * AST delivery outcomes for the effective JS/TS inputs of one sensor invocation.
 * A complete invocation can still contain failed inputs; consumers must inspect the outcomes
 * for their relevant files. Missing or unusable ASTs are failures, not intentional exclusions.
 */
public record JsAnalysisSummary(List<FileResult> files, boolean complete) {
  public JsAnalysisSummary {
    files = List.copyOf(files);
  }

  public enum Status {
    DELIVERED,
    EXCLUDED,
    FAILED,
  }

  /** The reason is empty for delivered inputs and explains exclusions or failures otherwise. */
  public record FileResult(InputFile inputFile, Status status, String reason) {
    public FileResult {
      Objects.requireNonNull(inputFile);
      Objects.requireNonNull(status);
      Objects.requireNonNull(reason);
    }
  }
}
