/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import static org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl.NODE_EXECUTABLE_PROPERTY;
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
import javax.annotation.Nullable;
import org.sonar.api.config.Configuration;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.nodejs.NodeVersion;
import org.sonar.plugins.javascript.nodejs.ProcessWrapper;
import org.sonarsource.api.sonarlint.SonarLintSide;
import org.tukaani.xz.XZInputStream;

/**
 * Class handling the extraction of the embedded Node.JS runtime
 */
@ScannerSide
@SonarLintSide(lifespan = INSTANCE)
public class EmbeddedNode {

  public static final String VERSION_FILENAME = "version.txt";
  private static final String DEPLOY_LOCATION = Path.of("js", "node-runtime").toString();
  private static final long EXTRACTION_LOCK_WAIT_TIME_MILLIS = 10000;
  private static final Logger LOG = Loggers.get(EmbeddedNode.class);
  private final Path deployLocation;
  private final Platform platform;
  private final Environment env;
  private final ProcessWrapper processWrapper;
  private boolean isAvailable;

  enum Platform {
    WIN_X64,
    LINUX_X64,
    DARWIN_ARM64,
    DARWIN_X64,
    UNSUPPORTED;

    private String pathInJar() {
      switch (this) {
        case WIN_X64:
          return "/win-x64/";
        case LINUX_X64:
          return "/linux-x64/";
        case DARWIN_ARM64:
          return "/darwin-arm64/";
        case DARWIN_X64:
          return "/darwin-x64/";
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
      } else if (lowerCaseOsName.contains("linux") && isX64(env) && !env.isAlpine()) {
        // alpine linux is using musl libc, which is not compatible with linux-x64
        return LINUX_X64;
      } else if (lowerCaseOsName.contains("mac os") && isARM64(env)) {
        return DARWIN_ARM64;
      } else if (lowerCaseOsName.contains("mac os") && isX64(env)) {
        return DARWIN_X64;
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

  public EmbeddedNode(ProcessWrapper processWrapper, Environment env) {
    this.platform = Platform.detect(env);
    this.deployLocation = runtimeCachePathFrom(env.getSonarUserHome());
    this.env = env;
    this.processWrapper = processWrapper;
  }

  /**
   * @return a path to `DEPLOY_LOCATION` from the given `baseDir`
   */
  private static Path runtimeCachePathFrom(Path baseDir) {
    return baseDir.resolve(DEPLOY_LOCATION);
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
  public void deploy(@Nullable Configuration configuration) throws IOException {
    LOG.info(
      "Detected os: {} arch: {} alpine: {}. Platform: {}",
      env.getOsName(),
      env.getOsArch(),
      env.isAlpine(),
      platform
    );
    if (platform == UNSUPPORTED) {
      return;
    }
    if (isNodejsExecutableSet(configuration)) {
      LOG.info(
        "'{}' is set. Skipping embedded Node.js runtime deployment.",
        NODE_EXECUTABLE_PROPERTY
      );
      return;
    }

    try {
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
      // we try to run 'node -v' to test that node is working
      var detected = NodeVersion.getVersion(processWrapper, binary().toString());
      LOG.debug("Deployed node version {}", detected);
      isAvailable = true;
    } catch (Exception e) {
      LOG.warn("Embedded Node.js failed to deploy. Will fallback to host Node.js.", e);
    }
  }

  private static boolean isNodejsExecutableSet(@Nullable Configuration configuration) {
    if (configuration == null) {
      return false;
    }
    return configuration.get(NODE_EXECUTABLE_PROPERTY).isPresent();
  }

  private static boolean isDifferent(InputStream newVersionIs, Path currentVersionPath)
    throws IOException {
    var newVersionString = new String(newVersionIs.readAllBytes(), StandardCharsets.UTF_8);
    var currentVersionString = Files.readString(currentVersionPath);
    LOG.debug(
      "Currently installed Node.js version: " +
      currentVersionString +
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
      var channel = fos.getChannel()
    ) {
      var lock = channel.tryLock();
      if (lock != null) {
        try {
          LOG.debug("Lock acquired for extraction");
          extract(source, targetRuntime);
          Files.copy(versionIs, deployLocation.resolve(VERSION_FILENAME), REPLACE_EXISTING);
        } finally {
          lock.release();
        }
      } else {
        try {
          LOG.debug(
            "Lock taken, waiting " +
            EXTRACTION_LOCK_WAIT_TIME_MILLIS +
            "ms for other process to extract node runtime."
          );
          Thread.sleep(EXTRACTION_LOCK_WAIT_TIME_MILLIS);
        } catch (InterruptedException e) {
          LOG.warn("Interrupted while waiting for another process to extract the node runtime.");
          Thread.currentThread().interrupt();
        }
      }
    }
  }

  /**
   * Expects an InputStream to a xz-compressed file ending in `.xz` like `node.xz` and
   * extracts it into the given target Path.
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
      var os = Files.newOutputStream(target)
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
