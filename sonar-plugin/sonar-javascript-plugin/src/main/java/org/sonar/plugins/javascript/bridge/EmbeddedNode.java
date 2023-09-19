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

import static java.nio.file.StandardCopyOption.REPLACE_EXISTING;
import static java.nio.file.attribute.PosixFilePermission.OWNER_EXECUTE;
import static java.nio.file.attribute.PosixFilePermission.OWNER_READ;
import static org.sonar.plugins.javascript.bridge.EmbeddedNode.Platform.UNSUPPORTED;
import static org.sonarsource.api.sonarlint.SonarLintSide.INSTANCE;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Set;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonarsource.api.sonarlint.SonarLintSide;
import org.tukaani.xz.XZInputStream;

/**
 * Class handling the extraction of the embedded Node.JS runtime
 */
@ScannerSide
@SonarLintSide(lifespan = INSTANCE)
public class EmbeddedNode {

  private static final String DEPLOY_LOCATION = Path.of(".sonar", "js", "node-runtime").toString();
  public static final String VERSION_FILENAME = "version.txt";
  private static final Logger LOG = Loggers.get(EmbeddedNode.class);
  private Path deployLocation;
  private final Platform platform;
  private boolean isAvailable;
  private Environment env;

  enum Platform {
    WIN_X64,
    LINUX_X64,
    DARWIN_ARM64,
    UNSUPPORTED;

    private String pathInJar() {
      switch (this) {
        case WIN_X64:
          return "/win-x64/";
        case LINUX_X64:
          return "/linux-x64/";
        case DARWIN_ARM64:
          return "/darwin-arm64/";
        default:
          return "";
      }
    }

    /**
     * @return the path of the node compressed node runtime in the JAR
     */
    String archivePathInJar() {
      return pathInJar() + binary() + ".xz";
    }

    /**
     * @return the path of the file storing the version of the node runtime in the JAR
     */
    String versionPathInJar() {
      return pathInJar() + VERSION_FILENAME;
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

    /**
     * @return The platform where this code is running
     */
    static Platform detect(Environment env) {
      var osName = env.getOsName();
      var lowerCaseOsName = osName.toLowerCase(Locale.ROOT);
      if (osName.contains("Windows") && isX64(env)) {
        return WIN_X64;
      } else if (lowerCaseOsName.contains("linux") && isX64(env)) {
        return LINUX_X64;
      } else if (lowerCaseOsName.contains("mac os") && isARM64(env)) {
        return DARWIN_ARM64;
      }
      return UNSUPPORTED;
    }

    private static boolean isX64(Environment env) {
      return env.getOsArch().contains("amd64");
    }

    private static boolean isARM64(Environment env) {
      return env.getOsArch().contains("aarch64");
    }
  }

  public EmbeddedNode(Environment env) {
    this.platform = Platform.detect(env);
    this.deployLocation = getPluginCache(env.getUserHome());
    this.env = env;
  }

  /**
   * @return a path to `DEPLOY_LOCATION` from the given `baseDir`
   */
  private static Path getPluginCache(String baseDir) {
    return Path.of(baseDir).resolve(DEPLOY_LOCATION);
  }

  public boolean isAvailable() {
    return platform != UNSUPPORTED && isAvailable;
  }

  /**
   * Extracts the node runtime from the JAR to the given `deployLocation`.
   * Skips the operation if the platform is unsupported, already extracted or missing from the JAR (legacy).
   *
   * @throws IOException
   */
  public void deploy() throws IOException {
    LOG.debug("Detected os: {} arch: {} platform: {}", env.getOsName(), env.getOsArch(), platform);
    if (platform == UNSUPPORTED || isAvailable) {
      return;
    }
    var is = getClass().getResourceAsStream(platform.archivePathInJar());
    if (is == null) {
      LOG.debug("Embedded node not found for platform {}", platform.archivePathInJar());
      return;
    }

    var targetArchive = deployLocation.resolve(platform.binary() + ".xz");
    var targetDirectory = targetArchive.getParent();
    var targetVersion = targetDirectory.resolve(VERSION_FILENAME);
    // we assume that since the archive exists, the version file must as well
    var versionIs = getClass().getResourceAsStream(platform.versionPathInJar());

    if (!Files.exists(targetVersion) || isDifferent(versionIs, targetVersion)) {
      LOG.debug("Copy embedded node to {}", targetArchive);
      Files.createDirectories(targetDirectory);
      Files.copy(is, targetArchive, REPLACE_EXISTING);
      extract(targetArchive);
      Files.copy(versionIs, deployLocation.resolve(VERSION_FILENAME), REPLACE_EXISTING);
    } else {
      LOG.debug("Skipping node deploy. Deployed node has latest version.");
    }

    isAvailable = true;
  }

  private static boolean isDifferent(InputStream newVersionIs, Path currentVersionPath)
    throws IOException {
    var newVersionString = new String(newVersionIs.readAllBytes(), StandardCharsets.UTF_8);
    var currentVersionString = Files.readString(currentVersionPath);
    return !newVersionString.equals(currentVersionString);
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
