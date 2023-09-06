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
package org.sonar.plugins.javascript.bridge;

import static java.nio.file.attribute.PosixFilePermission.OWNER_EXECUTE;
import static java.nio.file.attribute.PosixFilePermission.OWNER_READ;
import static org.sonar.plugins.javascript.bridge.EmbeddedNode.Platform.UNSUPPORTED;
import static org.sonar.plugins.javascript.bridge.EmbeddedNode.Platform.WIN_X64;
import static org.sonarsource.api.sonarlint.SonarLintSide.INSTANCE;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Set;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonarsource.api.sonarlint.SonarLintSide;

@ScannerSide
@SonarLintSide(lifespan = INSTANCE)
public class EmbeddedNode {

  private static final Logger LOG = Loggers.get(EmbeddedNode.class);
  private Path deployLocation;

  enum Platform {
    WIN_X64,
    LINUX_X64,
    MACOS_ARM64,
    LINUX_X64_ALPINE,
    UNSUPPORTED;

    String pathInJar() {
      switch (this) {
        case WIN_X64:
          return "/win-x64/node.exe";
        case LINUX_X64:
          return "/linux-x64/node";
        case MACOS_ARM64:
          return "/macos-arm64/node";
        case LINUX_X64_ALPINE:
          return "/linux-x64-alpine/node";
        default:
          return "";
      }
    }

    String binary() {
      if (this == WIN_X64) {
        return "node.exe";
      } else {
        return "node";
      }
    }

    static Platform detect() {
      var osName = System.getProperty("os.name");
      var lowerCaseOsName = osName.toLowerCase(Locale.ROOT);
      if (osName.contains("Windows") && isX64()) {
        return WIN_X64;
      } else if (lowerCaseOsName.contains("linux") && isX64()) {
        return LINUX_X64;
      } else if (lowerCaseOsName.contains("mac os") && (isARM64())) {
        return MACOS_ARM64;
      }
      return UNSUPPORTED;
    }

    static boolean isX64() {
      var arch = System.getProperty("os.arch");
      return arch.contains("amd64");
    }

    static boolean isARM64() {
      var arch = System.getProperty("os.arch");
      return arch.contains("aarch64");
    }
  }

  private final Platform platform = Platform.detect();

  private boolean isAvailable;

  public boolean isAvailable() {
    return platform != UNSUPPORTED && isAvailable;
  }

  void deployNode(Path deployLocation) throws IOException {
    LOG.info(
      "Detected os: {} arch: {} platform: {}",
      System.getProperty("os.name"),
      System.getProperty("os.arch"),
      platform
    );
    if (platform == UNSUPPORTED || isAvailable) {
      return;
    }
    this.deployLocation = deployLocation;
    var is = getClass().getResourceAsStream(platform.pathInJar());
    if (is == null) {
      return;
    }
    var target = deployLocation.resolve(platform.binary());
    LOG.debug("Copy embedded node to {}", target);
    Files.copy(is, target);
    if (platform != WIN_X64) {
      Files.setPosixFilePermissions(target, Set.of(OWNER_EXECUTE, OWNER_READ));
    }
    isAvailable = true;
  }

  public Path binary() {
    return deployLocation.resolve(platform.binary());
  }
}
