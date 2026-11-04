/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.analysis.cache;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.EOFException;
import java.io.IOException;
import java.io.InputStream;
import java.io.SequenceInputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.SonarProduct;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.Version;
import org.sonar.plugins.javascript.bridge.PluginInfo;

/** One generation of recorded context, transported exclusively through the sensor-cache API. */
public final class ContextSnapshotCache {

  private static final Logger LOG = LoggerFactory.getLogger(ContextSnapshotCache.class);
  private static final int FORMAT_VERSION = 2;
  private static final int MAGIC = 0x4A534300 | FORMAT_VERSION;

  private ContextSnapshotCache() {}

  public record Snapshot(
    Path archive,
    Path analysisMetadata,
    Path manifest,
    String contextMetadata
  ) {}

  static String key() {
    return "js:sqaa-context:" + FORMAT_VERSION + ":" + PluginInfo.getVersion();
  }

  private static boolean enabled(SensorContext context) {
    return (
      context.runtime().getProduct() != SonarProduct.SONARLINT &&
      context.runtime().getApiVersion().isGreaterThanOrEqual(Version.create(9, 4)) &&
      context.isCacheEnabled() &&
      PluginInfo.getVersion() != null
    );
  }

  public static Optional<Snapshot> restore(SensorContext context, Path directory) {
    if (!enabled(context)) return Optional.empty();
    try {
      var cache = context.previousCache();
      if (!cache.contains(key())) return Optional.empty();
      try (var stream = cache.read(key())) {
        if (stream == null) throw new IOException("Missing context snapshot stream");
        var input = new DataInputStream(stream);
        if (input.readInt() != MAGIC) throw new IOException("Unsupported context snapshot format");
        int metadataSize = input.readInt();
        if (metadataSize < 0 || metadataSize > 16 * 1024 * 1024) throw new IOException(
          "Invalid context metadata size"
        );
        var bytes = input.readNBytes(metadataSize);
        if (bytes.length != metadataSize) throw new EOFException("Truncated context metadata");
        String metadata = new String(bytes, StandardCharsets.UTF_8);
        Files.createDirectories(directory);
        Path archive = directory.resolve("archive.pb.gz");
        Path analysisMetadata = directory.resolve("analysis-metadata.pb.gz");
        Path manifest = directory.resolve("manifest.json");
        for (Path file : List.of(archive, analysisMetadata)) {
          restoreItem(input, file);
        }
        Path compressedManifest = Files.createTempFile(directory, "manifest-", ".json.gz");
        try {
          restoreItem(input, compressedManifest);
          try (
            var compressed = Files.newInputStream(compressedManifest);
            var gzip = new GZIPInputStream(compressed)
          ) {
            Files.copy(gzip, manifest, StandardCopyOption.REPLACE_EXISTING);
          }
        } finally {
          Files.deleteIfExists(compressedManifest);
        }
        if (input.read() != -1) throw new IOException("Unexpected context snapshot data");
        return Optional.of(new Snapshot(archive, analysisMetadata, manifest, metadata));
      }
    } catch (IOException | RuntimeException e) {
      LOG.debug(
        "Cannot restore the sensor-cache context snapshot; recording without a baseline",
        e
      );
      return Optional.empty();
    }
  }

  private static void restoreItem(DataInputStream input, Path file) throws IOException {
    long length = input.readLong();
    if (length <= 0) throw new IOException("Invalid context snapshot item size");
    try (var output = Files.newOutputStream(file)) {
      byte[] buffer = new byte[8192];
      while (length > 0) {
        int count = input.read(buffer, 0, (int) Math.min(length, buffer.length));
        if (count < 0) throw new EOFException("Truncated context snapshot");
        output.write(buffer, 0, count);
        length -= count;
      }
    }
  }

  public static void write(SensorContext context, Snapshot snapshot) {
    if (!enabled(context)) return;
    try {
      Path compressedManifest = Files.createTempFile(
        snapshot.manifest().toAbsolutePath().getParent(),
        "manifest-",
        ".json.gz"
      );
      try {
        try (
          var compressed = Files.newOutputStream(compressedManifest);
          var gzip = new GZIPOutputStream(compressed)
        ) {
          Files.copy(snapshot.manifest(), gzip);
        }
        write(context, snapshot, compressedManifest);
      } finally {
        Files.deleteIfExists(compressedManifest);
      }
    } catch (IOException | RuntimeException e) {
      LOG.warn("Could not write the sensor-cache context snapshot", e);
    }
  }

  private static void write(SensorContext context, Snapshot snapshot, Path compressedManifest)
    throws IOException {
    byte[] metadata = snapshot.contextMetadata().getBytes(StandardCharsets.UTF_8);
    var header = new ByteArrayOutputStream();
    var data = new DataOutputStream(header);
    data.writeInt(MAGIC);
    data.writeInt(metadata.length);
    data.write(metadata);
    try (
      var archive = Files.newInputStream(snapshot.archive());
      var selection = Files.newInputStream(snapshot.analysisMetadata());
      var manifest = Files.newInputStream(compressedManifest)
    ) {
      var streams = List.of(
        new ByteArrayInputStream(header.toByteArray()),
        lengthPrefix(snapshot.archive()),
        archive,
        lengthPrefix(snapshot.analysisMetadata()),
        selection,
        lengthPrefix(compressedManifest),
        manifest
      );
      try (var stream = new SequenceInputStream(Collections.enumeration(streams))) {
        // The platform owns branch/reference selection and PR no-op writers. Never append to
        // previousCache or depend on a working directory persisting between scanner invocations.
        context.nextCache().write(key(), stream);
      }
    }
  }

  private static InputStream lengthPrefix(Path file) throws IOException {
    var bytes = new ByteArrayOutputStream();
    new DataOutputStream(bytes).writeLong(Files.size(file));
    return new ByteArrayInputStream(bytes.toByteArray());
  }
}
