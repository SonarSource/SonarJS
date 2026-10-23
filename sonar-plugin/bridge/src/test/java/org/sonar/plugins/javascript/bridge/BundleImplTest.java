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
package org.sonar.plugins.javascript.bridge;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.zip.GZIPOutputStream;
import org.apache.commons.compress.archivers.tar.TarArchiveEntry;
import org.apache.commons.compress.archivers.tar.TarArchiveOutputStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class BundleImplTest {

  @TempDir
  Path deployLocation;

  @Test
  void test() throws Exception {
    BundleImpl bundle = new BundleImpl("/test-bundle.tgz");
    bundle.deploy(deployLocation);
    String script = bundle.startServerScript();
    File scriptFile = new File(script);
    assertThat(scriptFile).exists();
    String content = new String(Files.readAllBytes(scriptFile.toPath()), StandardCharsets.UTF_8);
    assertThat(content).startsWith("#!/usr/bin/env node");
  }

  @Test
  void should_not_fail_when_deployed_twice() throws Exception {
    BundleImpl bundle = new BundleImpl("/test-bundle.tgz");
    bundle.deploy(deployLocation);
    bundle.deploy(deployLocation);
    // no exception expected
  }

  @Test
  void should_preserve_executable_bundle_assets() throws Exception {
    byte[] content = "#!/bin/sh\nexit 0\n".getBytes(StandardCharsets.UTF_8);
    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    try (TarArchiveOutputStream archive = new TarArchiveOutputStream(new GZIPOutputStream(bytes))) {
      TarArchiveEntry entry = new TarArchiveEntry("package/bin/tsgo/tsc-test");
      entry.setSize(content.length);
      entry.setMode(0755);
      archive.putArchiveEntry(entry);
      archive.write(content);
      archive.closeArchiveEntry();
    }
    for (int deployment = 0; deployment < 2; deployment++) {
      BundleUtils.extractFromClasspath(
        new ByteArrayInputStream(bytes.toByteArray()),
        deployLocation
      );
      Path executable = deployLocation.resolve("package/bin/tsgo/tsc-test");
      assertThat(Files.readAllBytes(executable)).isEqualTo(content);
      assertThat(Files.isExecutable(executable)).isTrue();
    }
  }

  @Test
  void should_save_deploy_location() {
    BundleImpl bundle = new BundleImpl();
    bundle.setDeployLocation(deployLocation);
    String scriptPath = bundle.startServerScript();
    assertThat(scriptPath).isEqualTo(
      deployLocation.resolve(BundleImpl.DEFAULT_STARTUP_SCRIPT).toString()
    );
  }
}
