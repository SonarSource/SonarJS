/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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

import java.io.IOException;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.api.utils.TempFolder;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.api.RulesBundle;
import org.sonarsource.api.sonarlint.SonarLintSide;

@ScannerSide
@SonarLintSide
public class RulesBundles {

  private static final Logger LOG = Loggers.get(RulesBundles.class);

  private final List<URL> bundles;
  private final TempFolder tempFolder;

  /**
   * This constructor is used by pico container when no RulesBundle is provided on classpath
   */
  public RulesBundles(TempFolder tempFolder) {
    this.tempFolder = tempFolder;
    this.bundles = Collections.emptyList();
  }

  public RulesBundles(RulesBundle[] rulesBundles, TempFolder tempFolder) {
    bundles = Arrays.stream(rulesBundles)
      .map(bundle -> {
        URL resource = bundle.getClass().getResource(bundle.bundlePath());
        if (resource == null) {
          throw new IllegalStateException(String.format("Resource for bundle %s from %s not found.", bundle.bundlePath(), bundle));
        }
        return resource;
      })
      .collect(Collectors.toList());
    this.tempFolder = tempFolder;
  }

  /**
   * Deploy bundles in temporary directory and return list of paths for deployed modules
   *
   */
  public List<Path> deploy() {
    List<Path> unpackedBundles = new ArrayList<>();
    bundles.forEach(bundle -> {
      Path target = tempFolder.newDir().toPath();
      try {
        LOG.info("Deploying custom rules bundle {} to {}", bundle, target);
        BundleUtils.extractFromClasspath(bundle.openStream(), target);
        Path deployedBundle = target.resolve("package").toAbsolutePath();
        if (!Files.exists(deployedBundle)) {
          // Inside tgz we expect "package" directory, this is npm contract.
          // see https://stackoverflow.com/questions/29717774/npm-pack-rename-package-directory
          throw new IllegalStateException("Failed to deploy bundle " + bundle + ". Didn't find 'package' dir.");
        }
        unpackedBundles.add(deployedBundle);
      } catch (IOException e) {
        LOG.error("Failed to extract bundle " + bundle, e);
      }
    });
    return unpackedBundles;
  }

}
