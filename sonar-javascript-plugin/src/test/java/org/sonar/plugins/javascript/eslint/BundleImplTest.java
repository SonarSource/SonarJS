/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import org.junit.Rule;
import org.junit.Test;
import org.sonar.api.utils.internal.JUnitTempFolder;

import static org.assertj.core.api.Assertions.assertThat;

public class BundleImplTest {

  @Rule
  public JUnitTempFolder tempFolder = new JUnitTempFolder();

  @Test
  public void test() throws Exception {
    BundleImpl bundle = new BundleImpl(tempFolder, "/test-bundle.tgz");
    bundle.deploy();
    String script = bundle.startServerScript();
    File scriptFile = new File(script);
    assertThat(scriptFile).exists();
    String content = new String(Files.readAllBytes(scriptFile.toPath()), StandardCharsets.UTF_8);
    assertThat(content).startsWith("#!/usr/bin/env node");
  }

  @Test
  public void should_not_fail_when_deployed_twice() throws Exception {
    BundleImpl bundle = new BundleImpl(tempFolder, "/test-bundle.tgz");
    bundle.deploy();
    bundle.deploy();
    // no exception expected
  }
}
