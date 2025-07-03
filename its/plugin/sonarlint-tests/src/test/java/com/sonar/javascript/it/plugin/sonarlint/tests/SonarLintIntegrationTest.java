/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2025 SonarSource SA
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.filefilter.FalseFileFilter;
import org.apache.commons.io.filefilter.RegexFileFilter;
import org.junit.jupiter.api.io.TempDir;
import org.sonarsource.sonarlint.core.rpc.protocol.backend.file.DidOpenFileParams;
import org.sonarsource.sonarlint.core.rpc.protocol.backend.file.DidUpdateFileSystemParams;
import org.sonarsource.sonarlint.core.rpc.protocol.common.ClientFileDto;
import org.sonarsource.sonarlint.core.rpc.protocol.common.Language;
import org.sonarsource.sonarlint.core.test.utils.junit5.SonarLintTest;
import org.sonarsource.sonarlint.core.test.utils.junit5.SonarLintTestHarness;
import org.sonarsource.sonarlint.core.test.utils.plugins.Plugin;

class SonarLintIntegrationTest {

  private static final String CONFIG_SCOPE_ID = "CONFIG_SCOPE_ID";

  @SonarLintTest
  void it_should_report_multi_file_issues_for_files_added_after_initialization(
    SonarLintTestHarness harness,
    @TempDir Path baseDir
  ) {
    var fileIssue = createFile(baseDir, "foo.ts", "x = true ? 42 : 42");
    var fileIssueUri = fileIssue.toUri();

    var fileDTO = new ClientFileDto(
      fileIssueUri,
      baseDir.relativize(fileIssue),
      CONFIG_SCOPE_ID,
      false,
      null,
      fileIssue,
      null,
      null,
      true
    );

    var client = harness
      .newFakeClient()
      .withInitialFs(CONFIG_SCOPE_ID, baseDir, List.of(fileDTO))
      .build();

    var backend = harness
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

    backend.getFileService().didOpenFile(new DidOpenFileParams(CONFIG_SCOPE_ID, fileIssueUri));

    await()
      .atMost(15, TimeUnit.SECONDS)
      .untilAsserted(() ->
        assertThat(client.getRaisedIssuesForScopeIdAsList(CONFIG_SCOPE_ID)).isNotEmpty()
      );
    var raisedIssuesDto = client.getRaisedIssuesForScopeIdAsList(CONFIG_SCOPE_ID);
    assertThat(raisedIssuesDto).hasSize(1);
    assertThat(raisedIssuesDto.get(0).getRuleKey()).isEqualTo("typescript:S3923");

    editFile(baseDir, "foo.ts", "x = true ? 42 : 41;");

    backend
      .getFileService()
      .didUpdateFileSystem(new DidUpdateFileSystemParams(List.of(), List.of(fileDTO), List.of()));
    await()
      .atMost(15, TimeUnit.SECONDS)
      .untilAsserted(() ->
        assertThat(client.getRaisedIssuesForScopeIdAsList(CONFIG_SCOPE_ID)).isEmpty()
      );
  }

  private static Path createFile(Path folderPath, String fileName, String content) {
    var filePath = folderPath.resolve(fileName);
    try {
      Files.writeString(filePath, content);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
    return filePath;
  }

  private static void editFile(Path folderPath, String fileName, String content) {
    var filePath = folderPath.resolve(fileName);
    try {
      Files.writeString(filePath, content);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  private static void removeFile(Path folderPath, String fileName) {
    var filePath = folderPath.resolve(fileName);
    try {
      Files.deleteIfExists(filePath);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }
}
