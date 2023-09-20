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
import static java.nio.file.attribute.PosixFilePermission.OWNER_WRITE;
import static org.sonar.plugins.javascript.bridge.EmbeddedNode.Platform.UNSUPPORTED;
import static org.sonarsource.api.sonarlint.SonarLintSide.INSTANCE;

import java.io.BufferedInputStream;
import java.io.FileOutputStream;
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
  private final long TEN_SECONDS_MILLIS = 10000;

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
    this.deployLocation = runtimeCachePathFrom(env.getUserHome());
    this.env = env;
  }

  /**
   * @return a path to `DEPLOY_LOCATION` from the given `baseDir`
   */
  private static Path runtimeCachePathFrom(String baseDir) {
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

    var targetRuntime = deployLocation.resolve(platform.binary());
    var targetDirectory = targetRuntime.getParent();
    var targetVersion = targetDirectory.resolve(VERSION_FILENAME);
    // we assume that since the archive exists, the version file must as well
    var versionIs = getClass().getResourceAsStream(platform.versionPathInJar());

    if (Files.exists(targetVersion) && !isDifferent(versionIs, targetVersion)) {
      LOG.debug("Skipping node deploy. Deployed node has latest version.");
    } else {
      extractWithLocking(is, versionIs, targetRuntime, targetDirectory);
    }

    isAvailable = true;
  }

  private static boolean isDifferent(InputStream newVersionIs, Path currentVersionPath)
    throws IOException {
    var newVersionString = new String(newVersionIs.readAllBytes(), StandardCharsets.UTF_8);
    var currentVersionString = Files.readString(currentVersionPath);
    LOG.debug(
      "Currently installed Node.JS version: " +
      currentVersionString +
      " at " +
      currentVersionPath +
      ". Available version in analyzer: " +
      newVersionString
    );
    return !newVersionString.equals(currentVersionString);
  }

  /**
   * Creates the `targetDirectory` and extracts the `source` to `targetRuntime`
   * Writes the version from `versionIs` to `targetDirectory`/VERSION_FILENAME
   *
   * @param source
   * @param versionIs
   * @param targetRuntime
   * @param targetDirectory
   * @throws IOException
   */
  private void extractWithLocking(
    InputStream source,
    InputStream versionIs,
    Path targetRuntime,
    Path targetDirectory
  ) throws IOException {
    var targetLockFile = targetDirectory.resolve("lockfile");
    Files.createDirectories(targetDirectory);
    try (
      var fos = new FileOutputStream(targetLockFile.toString());
      var channel = fos.getChannel();
    ) {
      var lock = channel.tryLock();
      if (lock != null) {
        try {
          LOG.debug("Locked file: " + targetRuntime + " using lock " + lock);
          extract(source, targetRuntime);
          Files.copy(versionIs, deployLocation.resolve(VERSION_FILENAME), REPLACE_EXISTING);
        } finally {
          lock.release();
        }
      } else {
        try {
          LOG.debug("Waiting");
          Thread.sleep(TEN_SECONDS_MILLIS);
        } catch (InterruptedException e) {
          LOG.error("Interrupted while waiting for another process to extract the node runtime");
        }
      }
    }
  }

  /**
   * Expects an InputStream to a xz-compressed file ending in `.xz` like `node.xz` and
   * extracts it into the the given target Path.
   * <p>
   * Skips extraction if target file already exists.
   *
   * @param source Path for the file to extract
   * @throws IOException
   */
  private void extract(InputStream source, Path target) throws IOException {
    try (
      var stream = new BufferedInputStream(source);
      var archive = new XZInputStream(stream);
      var os = Files.newOutputStream(target);
    ) {
      LOG.debug("Extracting embedded node to {}", target);
      int nextBytes;
      byte[] buf = new byte[8 * 1024 * 1024];
      while ((nextBytes = archive.read(buf)) > -1) {
        os.write(buf, 0, nextBytes);
      }
      if (platform != Platform.WIN_X64) {
        Files.setPosixFilePermissions(target, Set.of(OWNER_EXECUTE, OWNER_READ, OWNER_WRITE));
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
