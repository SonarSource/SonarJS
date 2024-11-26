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
package org.sonar.plugins.javascript.bridge;

import static org.sonarsource.api.sonarlint.SonarLintSide.INSTANCE;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.scanner.ScannerSide;
import org.sonarsource.api.sonarlint.SonarLintSide;

@ScannerSide
@SonarLintSide(lifespan = INSTANCE)
public class BundleImpl implements Bundle {

  private static final Logger LOG = LoggerFactory.getLogger(BundleImpl.class);

  // this archive is created in the bridge module
  private static final String BUNDLE_LOCATION = "/sonarjs-1.0.0.tgz";
  private static final String DEFAULT_STARTUP_SCRIPT = "package/bin/server.cjs";
  private Path deployLocation;
  private final String bundleLocation;

  public BundleImpl() {
    this(BUNDLE_LOCATION);
  }

  BundleImpl(String bundleLocation) {
    this.bundleLocation = bundleLocation;
  }

  @Override
  public void deploy(Path deployLocation) throws IOException {
    LOG.debug("Deploying the bridge server into {}", deployLocation);
    InputStream bundle = getClass().getResourceAsStream(bundleLocation);
    if (bundle == null) {
      throw new IllegalStateException("The bridge server was not found in the plugin jar");
    }
    BundleUtils.extractFromClasspath(bundle, deployLocation);
    this.deployLocation = deployLocation;
  }

  @Override
  public String startServerScript() {
    return resolve(DEFAULT_STARTUP_SCRIPT);
  }

  @Override
  public String resolve(String relativePath) {
    return deployLocation.resolve(relativePath).toAbsolutePath().toString();
  }
}
