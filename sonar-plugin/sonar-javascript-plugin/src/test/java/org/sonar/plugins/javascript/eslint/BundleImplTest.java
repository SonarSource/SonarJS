/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
package org.sonar.plugins.javascript.eslint;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
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
}
