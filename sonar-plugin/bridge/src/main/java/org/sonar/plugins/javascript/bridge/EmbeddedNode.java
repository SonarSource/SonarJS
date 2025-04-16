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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.scanner.ScannerSide;
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
  private static final Logger LOG = LoggerFactory.getLogger(EmbeddedNode.class);
  private final Path deployLocation;
  private final Platform platform;
  private final Environment env;
  private final ProcessWrapper processWrapper;
  private boolean isAvailable;

  enum Platform {
    WIN_X64,
    LINUX_ARM64,
    LINUX_X64,
    LINUX_X64_MUSL,
    DARWIN_ARM64,
    DARWIN_X64,
    UNSUPPORTED;

    private String pathInJar() {
      return switch (this) {
        case WIN_X64 -> "/win-x64/";
        case LINUX_ARM64 -> "/linux-arm64/";
        case LINUX_X64 -> "/linux-x64/";
        case LINUX_X64_MUSL -> "/linux-x64-musl/";
        case DARWIN_ARM64 -> "/darwin-arm64/";
        case DARWIN_X64 -> "/darwin-x64/";
        default -> "";
      };
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
      } else if (lowerCaseOsName.contains("linux") && isARM64(env)) {
        return LINUX_ARM64;
      } else if (lowerCaseOsName.contains("linux") && isX64(env)) {
        return env.isAlpine() ? LINUX_X64_MUSL : LINUX_X64;
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
  public void deploy() throws IOException {
    LOG.info(
      "Detected os: {} arch: {} alpine: {}. Platform: {}",
      env.getOsName(),
      env.getOsArch(),
      env.isAlpine(),
      platform
    );
    if (platform == UNSUPPORTED) {
      LOG.debug(
        "Your platform is not supported for embedded Node.js. Falling back to host Node.js."
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
      LOG.info(
        "Deploy location {}, tagetRuntime: {},  version: {}",
        deployLocation,
        targetRuntime,
        targetVersion
      );
      // we assume that since the archive exists, the version file must as well
      var versionIs = getClass().getResourceAsStream(platform.versionPathInJar());

      if (Files.exists(targetVersion) && !isDifferent(versionIs, targetVersion)) {
        LOG.debug("Skipping node deploy. Deployed node has latest version.");
      } else {
        extractWithLocking(is, versionIs, targetRuntime, targetDirectory);
      }
      // we try to run 'node -v' to test that node is working
      var detected = NodeVersion.getVersion(processWrapper, binary().toString(), false);
      LOG.debug("Deployed node version {}", detected);
      isAvailable = true;
    } catch (Exception e) {
      LOG.warn(
        """
        Embedded Node.js failed to deploy in {}.
        You can change the location by setting the option `sonar.userHome` or the environment variable `SONAR_USER_HOME`.
        Otherwise, it will default to {}.
        Will fallback to host Node.js.""",
        Environment.defaultSonarUserHome(),
        deployLocation,
        e
      );
    }
  }

  private static boolean isDifferent(InputStream newVersionIs, Path currentVersionPath)
    throws IOException {
    var newVersionString = new String(newVersionIs.readAllBytes(), StandardCharsets.UTF_8);
    var currentVersionString = Files.readString(currentVersionPath);
    LOG.debug(
      "Currently installed Node.js version: {}. Available version in analyzer: {}",
      currentVersionString,
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
