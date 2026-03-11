/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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

import java.io.ByteArrayInputStream;
import java.io.BufferedInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.scanner.ScannerSide;
import org.sonarsource.api.sonarlint.SonarLintSide;
import org.tukaani.xz.XZInputStream;

@ScannerSide
@SonarLintSide(lifespan = INSTANCE)
public class TsgolintBundle {

  private static final Logger LOG = LoggerFactory.getLogger(TsgolintBundle.class);
  private static final String DEPLOY_LOCATION = "js/tsgolint";

  private final EmbeddedNode.Platform platform;
  private final Path deployLocation;
  private boolean isAvailable;
  private Path deployedBinary;

  public TsgolintBundle(Environment env) {
    this.platform = EmbeddedNode.Platform.detect(env);
    this.deployLocation = env.getSonarUserHome().resolve(DEPLOY_LOCATION);
  }

  public void deploy() throws IOException {
    if (platform == EmbeddedNode.Platform.UNSUPPORTED) {
      LOG.info("tsgolint: unsupported platform, skipping deployment");
      return;
    }

    String binaryName = platform == EmbeddedNode.Platform.WIN_X64 ? "tsgolint.exe" : "tsgolint";
    String resourcePath = "/tsgolint" + platformDir() + binaryName + ".xz";

    var is = getClass().getResourceAsStream(resourcePath);
    if (is == null) {
      LOG.info("tsgolint binary not found in classpath at {}", resourcePath);
      return;
    }
    var archiveBytes = is.readAllBytes();
    var archiveHash = sha256(archiveBytes);

    Path targetBinary = deployLocation.resolve(archiveHash).resolve(binaryName);
    Files.createDirectories(targetBinary.getParent());
    deployedBinary = targetBinary;

    if (Files.exists(targetBinary)) {
      LOG.debug("tsgolint binary already deployed and up-to-date at {}", targetBinary);
      isAvailable = true;
      return;
    }

    LOG.info("Extracting tsgolint binary to {}", targetBinary);
    try (
      var stream = new BufferedInputStream(new ByteArrayInputStream(archiveBytes));
      var archive = new XZInputStream(stream);
      var os = Files.newOutputStream(targetBinary)
    ) {
      byte[] buf = new byte[8 * 1024 * 1024];
      int n;
      while ((n = archive.read(buf)) > -1) {
        os.write(buf, 0, n);
      }
    }

    if (platform != EmbeddedNode.Platform.WIN_X64) {
      Files.setPosixFilePermissions(
        targetBinary,
        Set.of(
          PosixFilePermission.OWNER_EXECUTE,
          PosixFilePermission.OWNER_READ,
          PosixFilePermission.OWNER_WRITE
        )
      );
    }

    isAvailable = true;
  }

  public boolean isAvailable() {
    return isAvailable;
  }

  public Path binary() {
    if (deployedBinary != null) {
      return deployedBinary;
    }
    String binaryName = platform == EmbeddedNode.Platform.WIN_X64 ? "tsgolint.exe" : "tsgolint";
    return deployLocation.resolve(binaryName);
  }

  private String platformDir() {
    return switch (platform) {
      case WIN_X64 -> "/win-x64/";
      case LINUX_ARM64 -> "/linux-arm64/";
      case LINUX_X64 -> "/linux-x64/";
      case LINUX_X64_MUSL -> "/linux-x64-musl/";
      case DARWIN_ARM64 -> "/darwin-arm64/";
      case DARWIN_X64 -> "/darwin-x64/";
      default -> "";
    };
  }

  private static String sha256(byte[] bytes) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 not available", e);
    }
  }
}
