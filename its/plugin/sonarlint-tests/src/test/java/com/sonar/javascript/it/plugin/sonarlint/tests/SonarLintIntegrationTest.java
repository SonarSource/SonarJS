/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2025 SonarSource Sàrl
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
package com.sonar.javascript.it.plugin.sonarlint.tests;

import static com.sonar.javascript.it.plugin.sonarlint.tests.TestUtils.usingEmbeddedNode;
import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import org.junit.jupiter.api.io.TempDir;
import org.sonarsource.sonarlint.core.rpc.protocol.backend.file.DidCloseFileParams;
import org.sonarsource.sonarlint.core.rpc.protocol.backend.file.DidOpenFileParams;
import org.sonarsource.sonarlint.core.rpc.protocol.backend.file.DidUpdateFileSystemParams;
import org.sonarsource.sonarlint.core.rpc.protocol.client.issue.QuickFixDto;
import org.sonarsource.sonarlint.core.rpc.protocol.client.issue.RaisedIssueDto;
import org.sonarsource.sonarlint.core.rpc.protocol.common.ClientFileDto;
import org.sonarsource.sonarlint.core.rpc.protocol.common.Language;
import org.sonarsource.sonarlint.core.rpc.protocol.common.TextRangeDto;
import org.sonarsource.sonarlint.core.test.utils.SonarLintBackendFixture;
import org.sonarsource.sonarlint.core.test.utils.SonarLintTestRpcServer;
import org.sonarsource.sonarlint.core.test.utils.junit5.SonarLintTest;
import org.sonarsource.sonarlint.core.test.utils.junit5.SonarLintTestHarness;
import org.sonarsource.sonarlint.core.test.utils.plugins.Plugin;

class SonarLintIntegrationTest {

  private static final String CONFIG_SCOPE_ID = "CONFIG_SCOPE_ID";
  private SonarLintBackendFixture.FakeSonarLintRpcClient client;
  private SonarLintTestRpcServer backend;

  @SonarLintTest
  void should_report_issues(SonarLintTestHarness harness, @TempDir Path baseDir) {
    var fileDTO = createFile(baseDir, "foo.ts", "x = true ? 42 : 42");
    initWithFiles(harness, baseDir, fileDTO);

    triggerAnalysisByFileOpened(fileDTO);

    assertResults(results -> {
      assertThat(results).hasSize(1);
      assertThat(results.get(0).getRuleKey()).isEqualTo("typescript:S3923");
    });
    assertThat(client.getLogMessages()).doesNotContain(
      "The bridge server is up, no need to start."
    );

    triggerAnalysisByFileChanged(fileDTO, "x = true ? 42 : 43");

    assertResults(results -> {
      assertThat(results).isEmpty();
    });

    assertThat(client.getLogMessages()).contains("The bridge server is up, no need to start.");
    if (!usingEmbeddedNode()) {
      assertThat(
        client
          .getLogMessages()
          .stream()
          .anyMatch(s ->
            s.matches("Using Node\\.js executable .* from property sonar\\.nodejs\\.executable\\.")
          )
      ).isTrue();
    }
  }

  @SonarLintTest
  void should_analyze_vue(SonarLintTestHarness harness, @TempDir Path baseDir) {
    var fileDTO = createFile(
      baseDir,
      "foo.vue",
      """
      <script>
      if (cond) {
        foo();
      } else {
        foo();
      }
      </script>
            """
    );
    initWithFiles(harness, baseDir, fileDTO);

    triggerAnalysisByFileOpened(fileDTO);

    assertResults(results -> {
      assertThat(results).hasSize(1);
      assertThat(results.get(0).getRuleKey()).isEqualTo("javascript:S3923");
    });
  }

  @SonarLintTest
  void should_analyze_js_with_typed_rules_except_vue(
    SonarLintTestHarness harness,
    @TempDir Path baseDir
  ) {
    var contents = "var xs = [\"a\", \"b\", \"c\", \"d\"];\ndelete xs[2];\n";
    var jsFileDTO = createFile(baseDir, "foo.js", contents);
    var vueFileDTO = createFile(baseDir, "foo.vue", "<script>" + contents + "</script>");
    initWithFiles(harness, baseDir, jsFileDTO, vueFileDTO);

    triggerAnalysisByFileOpened(vueFileDTO);

    assertResults(results -> {
      assertThat(results).hasSize(1);
      assertThat(results.get(0).getRuleKey()).isEqualTo("javascript:S3504");
    });

    triggerAnalysisByFileOpened(jsFileDTO);

    assertResults(results -> {
      assertThat(results).hasSize(2);
      assertThat(results.get(0).getRuleKey()).isEqualTo("javascript:S3504");
      assertThat(results.get(1).getRuleKey()).isEqualTo("javascript:S2870");
    });
  }

  @SonarLintTest
  void should_react_to_changes_in_tsconfigs(SonarLintTestHarness harness, @TempDir Path baseDir) {
    var jsFileDTO = createFile(
      baseDir,
      "foo.ts",
      "var xs = [\"a\", \"b\", \"c\", \"d\"];\ndelete xs[2];\n"
    );
    var tsconfigDTO = createFile(baseDir, "tsconfig.json", "{\"files\": [\"foo.ts\"]}");
    initWithFiles(harness, baseDir, jsFileDTO, tsconfigDTO);

    triggerAnalysisByFileOpened(jsFileDTO);

    assertResults(results -> {
      assertThat(results).hasSize(2);
      assertThat(client.getLogMessages()).contains("Resetting the TsConfigCache");
      assertThat(client.getLogMessages()).contains(
        "Using tsconfig " +
          tsconfigDTO.getFsPath().toFile().getAbsolutePath().replace('\\', '/') +
          " for " +
          jsFileDTO.getFsPath().toFile().getAbsolutePath().replace('\\', '/')
      );
      assertThat(results.get(0).getRuleKey()).isEqualTo("typescript:S3504");
      assertThat(results.get(1).getRuleKey()).isEqualTo("typescript:S2870");
    });
    backend
      .getFileService()
      .didCloseFile(new DidCloseFileParams(CONFIG_SCOPE_ID, jsFileDTO.getUri()));
    client.clearLogs();

    triggerAnalysisByFileOpened(jsFileDTO);

    assertResults(results -> {
      assertThat(results).hasSize(2);
      assertThat(client.getLogMessages()).doesNotContain("Resetting the TsConfigCache");
      assertThat(client.getLogMessages()).doesNotContain(
        "Using tsconfig " +
          tsconfigDTO.getFsPath().toFile().getAbsolutePath().replace('\\', '/') +
          "  for " +
          jsFileDTO.getFsPath().toFile().getAbsolutePath().replace('\\', '/')
      );
    });
    backend
      .getFileService()
      .didCloseFile(new DidCloseFileParams(CONFIG_SCOPE_ID, jsFileDTO.getUri()));
    client.clearLogs();

    // changed tsconfig to not contain the file
    triggerAnalysisByFileChanged(tsconfigDTO, "{\"files\": [\"another_foo.ts\"]}");

    assertResults(results -> {
      assertThat(client.getLogMessages()).contains(
        "Processing file event " +
          tsconfigDTO.getFsPath().toFile().getAbsolutePath().replace('\\', '/') +
          " with event MODIFIED"
      );
    });

    triggerAnalysisByFileOpened(jsFileDTO);

    assertResults(results -> {
      assertThat(results).hasSize(2);
      assertThat(client.getLogMessages()).contains("Resetting the TsConfigCache");
      assertThat(client.getLogMessages()).contains(
        "No tsconfig found for files, using default options"
      );
      assertThat(results.get(0).getRuleKey()).isEqualTo("typescript:S3504");
      assertThat(results.get(1).getRuleKey()).isEqualTo("typescript:S2870");
    });
  }

  @SonarLintTest
  void should_analyze_css(SonarLintTestHarness harness, @TempDir Path baseDir) {
    var fileDTO = createFile(
      baseDir,
      "foo.css",
      """
      @import "foo.css";
      @import "foo.css";    /* S1128 | no-duplicate-at-import-rules */
      a {
        color: pink;;       /* S1116 | no-extra-semicolons */
      }
      a::pseudo {           /* S4660 | selector-pseudo-element-no-unknown */
        color: red;
      }
            """
    );
    initWithFiles(harness, baseDir, fileDTO);

    triggerAnalysisByFileOpened(fileDTO);

    assertResults(results -> {
      assertThat(results)
        .extracting(RaisedIssueDto::getRuleKey)
        .containsExactlyInAnyOrder("css:S1116", "css:S1128", "css:S4660");
    });
  }

  @SonarLintTest
  void should_apply_quick_fix(SonarLintTestHarness harness, @TempDir Path baseDir) {
    var fileDTO = createFile(baseDir, "foo.js", "this.foo = 1;");
    initWithFiles(harness, baseDir, fileDTO);

    triggerAnalysisByFileOpened(fileDTO);

    assertResults(results -> {
      assertThat(results).hasSize(1);
      assertThat(results.get(0).getRuleKey()).isEqualTo("javascript:S2990");
      assertQuickFix(results.get(0).getQuickFixes().get(0), "Remove \"this\"", "foo", 1, 0, 1, 8);
    });
  }

  @SonarLintTest
  void should_apply_quick_fix_from_not_core_eslint_rule(
    SonarLintTestHarness harness,
    @TempDir Path baseDir
  ) {
    var fileDTO = createFile(baseDir, "foo.js", "for (;i < 0;) { foo(i); }");
    initWithFiles(harness, baseDir, fileDTO);

    triggerAnalysisByFileOpened(fileDTO);

    assertResults(results -> {
      assertThat(results).hasSize(1);
      assertThat(results.get(0).getRuleKey()).isEqualTo("javascript:S1264");
      assertQuickFix(
        results.get(0).getQuickFixes().get(0),
        "Replace with 'while' loop",
        "while (i < 0)",
        1,
        0,
        1,
        13
      );
    });
  }

  @SonarLintTest
  void should_apply_quickfix_from_suggestions(SonarLintTestHarness harness, @TempDir Path baseDir) {
    var fileDTO = createFile(baseDir, "foo.js", "if (!5 instanceof number) f()");
    initWithFiles(harness, baseDir, fileDTO);

    triggerAnalysisByFileOpened(fileDTO);

    assertResults(results -> {
      assertThat(results).hasSize(1);
      assertThat(results.get(0).getRuleKey()).isEqualTo("javascript:S3812");
      assertThat(results.get(0).getQuickFixes()).hasSize(2);
      assertQuickFix(
        results.get(0).getQuickFixes().get(0),
        "Negate 'instanceof' expression instead of its left operand. This changes the current behavior.",
        "(5 instanceof number)",
        1,
        5,
        1,
        24
      );
      assertQuickFix(
        results.get(0).getQuickFixes().get(1),
        "Wrap negation in '()' to make the intention explicit. This preserves the current behavior.",
        "(!5)",
        1,
        4,
        1,
        6
      );
    });
  }

  private static ClientFileDto createFile(Path folderPath, String fileName, String content) {
    var filePath = folderPath.resolve(fileName);
    try {
      Files.writeString(filePath, content);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
    return new ClientFileDto(
      filePath.toUri(),
      folderPath.relativize(filePath),
      CONFIG_SCOPE_ID,
      false,
      null,
      filePath,
      null,
      null,
      true
    );
  }

  private void triggerAnalysisByFileOpened(ClientFileDto fileDTO) {
    backend.getFileService().didOpenFile(new DidOpenFileParams(CONFIG_SCOPE_ID, fileDTO.getUri()));
  }

  private void triggerAnalysisByFileChanged(ClientFileDto fileDTO, String content) {
    try {
      Files.writeString(fileDTO.getFsPath(), content);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }

    backend
      .getFileService()
      .didUpdateFileSystem(new DidUpdateFileSystemParams(List.of(), List.of(fileDTO), List.of()));
  }

  private void initWithFiles(
    SonarLintTestHarness harness,
    Path baseDir,
    ClientFileDto... fileDTOs
  ) {
    client = harness
      .newFakeClient()
      .withInitialFs(CONFIG_SCOPE_ID, baseDir, Arrays.asList(fileDTOs))
      .build();

    backend = harness
      .newBackend()
      .withStandaloneEmbeddedPluginAndEnabledLanguage(
        new Plugin(
          Set.of(Language.JS, Language.TS, Language.CSS),
          TestUtils.JAVASCRIPT_PLUGIN_LOCATION,
          "",
          ""
        )
      )
      .withUnboundConfigScope(CONFIG_SCOPE_ID)
      .start(client);
  }

  private void assertResults(Consumer<List<RaisedIssueDto>> assertionLambda) {
    await()
      .atMost(15, TimeUnit.SECONDS)
      .untilAsserted(() -> {
        var results = client.getRaisedIssuesForScopeIdAsList(CONFIG_SCOPE_ID);
        assertionLambda.accept(results);
      });
  }

  private void assertQuickFix(
    QuickFixDto quickFix,
    String message,
    String code,
    int line,
    int column,
    int endLine,
    int endColumn
  ) {
    assertThat(quickFix.message()).isEqualTo(message);
    assertThat(quickFix.fileEdits()).hasSize(1);
    var fileEdit = quickFix.fileEdits().get(0);
    assertThat(fileEdit.textEdits()).hasSize(1);
    var textEdit = fileEdit.textEdits().get(0);
    assertThat(textEdit.newText()).isEqualTo(code);
    assertThat(textEdit.range())
      .extracting(
        TextRangeDto::getStartLine,
        TextRangeDto::getStartLineOffset,
        TextRangeDto::getEndLine,
        TextRangeDto::getEndLineOffset
      )
      .containsExactly(line, column, endLine, endColumn);
  }
}
