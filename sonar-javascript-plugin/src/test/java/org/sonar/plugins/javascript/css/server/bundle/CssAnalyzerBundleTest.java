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
package org.sonar.css.plugin.server.bundle;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.junit.Rule;
import org.junit.Test;
import org.sonar.api.utils.internal.JUnitTempFolder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

public class CssAnalyzerBundleTest {

  @Rule
  public JUnitTempFolder tempFolder = new JUnitTempFolder();

  @Test
  public void default_css_bundle_location() throws Exception {
    CssAnalyzerBundle bundle = new CssAnalyzerBundle();
    assertThat(bundle.bundleLocation).isEqualTo("/css-bundle.zip");
  }

  @Test
  public void almost_empty_css_bundle() throws Exception {
    Bundle bundle = new CssAnalyzerBundle("/bundle/test-css-bundle.zip");
    Path deployLocation = tempFolder.newDir().toPath();
    String expectedStartServer = deployLocation.resolve(Paths.get("css-bundle", "bin", "server")).toString();
    bundle.deploy(deployLocation);
    String script = bundle.startServerScript();
    assertThat(script).isEqualTo(expectedStartServer);
    File scriptFile = new File(script);
    assertThat(scriptFile).exists();
    String content = new String(Files.readAllBytes(scriptFile.toPath()), StandardCharsets.UTF_8);
    assertThat(content).startsWith("#!/usr/bin/env node");
  }

  @Test
  public void missing_bundle() throws Exception {
    Bundle bundle = new CssAnalyzerBundle("/bundle/invalid-bundle-path.zip");
    assertThatThrownBy(() -> bundle.deploy(tempFolder.newDir().toPath()))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("css-bundle not found in /bundle/invalid-bundle-path.zip");
  }

  @Test
  public void invalid_bundle_zip() throws Exception {
    Bundle bundle = new CssAnalyzerBundle("/bundle/invalid-zip-file.zip");
    assertThatThrownBy(() -> bundle.deploy(tempFolder.newDir().toPath()))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("Failed to deploy css-bundle (with classpath '/bundle/invalid-zip-file.zip')");
  }

  @Test
  public void should_not_fail_when_deployed_twice() throws Exception {
    Bundle bundle = new CssAnalyzerBundle("/bundle/test-css-bundle.zip");
    Path deployLocation = tempFolder.newDir().toPath();
    assertThatCode(() -> {
      bundle.deploy(deployLocation);
      bundle.deploy(deployLocation);
    }).doesNotThrowAnyException();
  }

  @Test
  public void test_resolve() {
    Bundle bundle = new CssAnalyzerBundle("/bundle/test-css-bundle.zip");
    Path deployLocation = tempFolder.newDir().toPath();
    bundle.deploy(deployLocation);
    assertThat(bundle.resolve("relative/path"))
      .contains("css-bundle")
      .endsWith("path")
      .startsWith(deployLocation.toString());

  }
}
