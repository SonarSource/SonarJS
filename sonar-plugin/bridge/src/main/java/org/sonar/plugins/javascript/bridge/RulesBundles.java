/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
package org.sonar.plugins.javascript.bridge;

import java.io.IOException;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.plugins.javascript.api.RulesBundle;
import org.sonarsource.api.sonarlint.SonarLintSide;

@ScannerSide
@SonarLintSide(lifespan = SonarLintSide.INSTANCE)
public class RulesBundles {

  private static final Logger LOG = LoggerFactory.getLogger(RulesBundles.class);

  private final List<URL> bundleUrls;
  private final List<RulesBundle> bundles;

  /**
   * This constructor is used by pico container when no RulesBundle is provided on classpath
   */
  public RulesBundles() {
    this.bundles = Collections.emptyList();
    this.bundleUrls = Collections.emptyList();
  }

  public RulesBundles(RulesBundle[] rulesBundles) {
    bundles = List.of(rulesBundles);
    bundleUrls = Arrays.stream(rulesBundles)
      .map(bundle -> {
        URL resource = bundle.getClass().getResource(bundle.bundlePath());
        if (resource == null) {
          throw new IllegalStateException(
            String.format("Resource for bundle %s from %s not found.", bundle.bundlePath(), bundle)
          );
        }
        return resource;
      })
      .toList();
  }

  /**
   * Deploy bundles in temporary directory and return list of paths for deployed modules
   *
   */
  public List<Path> deploy(Path target) {
    List<Path> unpackedBundles = new ArrayList<>();
    bundleUrls.forEach(bundle -> {
      try {
        Path location = Files.createTempDirectory(target, "custom-rules");
        LOG.debug("Deploying custom rules bundle {} to {}", bundle, location);
        BundleUtils.extractFromClasspath(bundle.openStream(), location);
        Path deployedBundle = location.resolve("package").toAbsolutePath();
        if (!Files.exists(deployedBundle)) {
          // Inside tgz we expect "package" directory, this is npm contract.
          // see https://stackoverflow.com/questions/29717774/npm-pack-rename-package-directory
          throw new IllegalStateException(
            "Failed to deploy bundle " + bundle + ". Didn't find 'package' dir."
          );
        }
        unpackedBundles.add(Paths.get(deployedBundle.toString(), "dist", "rules.js"));
      } catch (IOException e) {
        LOG.error("Failed to extract bundle " + bundle, e);
      }
    });
    return unpackedBundles;
  }
}
