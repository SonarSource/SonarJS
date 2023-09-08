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
import static org.sonarsource.api.sonarlint.SonarLintSide.INSTANCE;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Set;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonarsource.api.sonarlint.SonarLintSide;
import org.tukaani.xz.XZInputStream;

@ScannerSide
@SonarLintSide(lifespan = INSTANCE)
public class EmbeddedNode {

  private static final Logger LOG = Loggers.get(EmbeddedNode.class);
  private Path deployLocation;

  enum Platform {
    WIN_X64,
    LINUX_X64,
    MACOS_ARM64,
    UNSUPPORTED;

    String pathInJar() {
      switch (this) {
        case WIN_X64:
          return "/win-x64/node.exe.xz";
        case LINUX_X64:
          return "/linux-x64/node.xz";
        case MACOS_ARM64:
          return "/macos-arm64/node.xz";
        default:
          return "";
      }
    }

    /**
     * @return the correct binary name depending on the platform: `node` or `node.exe`
     */
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

  public void deployNode(Path deployLocation) throws IOException {
    LOG.debug(
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
      LOG.debug("Embedded node not found for platform {}", platform.pathInJar());
      return;
    }
    var target = deployLocation.resolve(platform.binary() + ".xz");
    LOG.debug("Copy embedded node to {}", target);
    Files.copy(is, target);
    extract(target);
    isAvailable = true;
  }

  /**
   * Expects a path to a xz-compressed file ending in `.xz` like `node.xz` and
   * extracts it into the same place as `node`.
   * <p>
   * Skips extraction if target file already exists.
   *
   * @param source Path for the file to extract
   * @throws IOException
   */
  private void extract(Path source) throws IOException {
    var sourceAsString = source.toString();
    var target = Path.of(sourceAsString.substring(0, sourceAsString.length() - 3));
    if (Files.exists(target)) {
      // TODO drop this skip if it prevents us from upgrading the runtime
      LOG.debug("Skipping decompression. " + target.toString() + " already exists.");
      return;
    }
    LOG.debug("Decompressing " + source.toAbsolutePath() + " into " + target);
    try (
      var is = Files.newInputStream(source);
      var stream = new BufferedInputStream(is);
      var archive = new XZInputStream(stream);
      var os = Files.newOutputStream(target);
    ) {
      int nextBytes;
      byte[] buf = new byte[8 * 1024 * 1024];
      while ((nextBytes = archive.read(buf)) > -1) {
        System.out.println("read " + nextBytes + " bytes");
        os.write(buf, 0, nextBytes);
      }
      if (platform != Platform.WIN_X64) {
        Files.setPosixFilePermissions(target, Set.of(OWNER_EXECUTE, OWNER_READ));
      }
    }
  }

  /**
   * @return the path to the binary once it has been decompressed
   */
  public Path binary() {
    return deployLocation.resolve(platform.binary());
  }
}
