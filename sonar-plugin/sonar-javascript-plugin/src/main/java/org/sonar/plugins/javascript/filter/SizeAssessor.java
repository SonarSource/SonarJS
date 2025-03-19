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
package org.sonar.plugins.javascript.filter;

import java.io.IOException;
import java.io.InputStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.config.Configuration;
import org.sonar.plugins.javascript.analysis.JsTsContext;

class SizeAssessor implements Assessor {

  private static final Logger LOG = LoggerFactory.getLogger(SizeAssessor.class);
  /**
   * Note that in user-facing option handling the units are kilobytes, not bytes.
   */
  private final long maxFileSizeKb;

  SizeAssessor(Configuration configuration) {
    maxFileSizeKb = JsTsContext.getMaxFileSizeProperty(configuration);
  }

  /**
   * Note that this method accepts size in <em>bytes</em>, to keep it consistent with conventions in
   * <code>InputStream</code> or <code>IOUtils</code>.
   */
  static boolean hasExcessiveSize(InputFile file, Long maxFileSizeBytes) {
    return hasExcessiveSize(file::inputStream, maxFileSizeBytes);
  }

  @Override
  public boolean test(InputFile inputFile) {
    if (SizeAssessor.hasExcessiveSize(inputFile, maxFileSizeKb * 1000)) {
      LOG.debug("File {} was excluded because of excessive size", inputFile);
      return true;
    }
    return false;
  }

  @FunctionalInterface
  interface SupplierThrowing<A, E extends Exception> {
    A get() throws E;
  }

  static boolean hasExcessiveSize(
    SupplierThrowing<InputStream, IOException> inputStreamSupplier,
    long maxFileSizeKb
  ) {
    try (InputStream inputStream = inputStreamSupplier.get()) {
      return canSkipAtLeast(inputStream, maxFileSizeKb);
    } catch (IOException ioe) {
      // Size is not too large, but for whatever reason we cannot read the file; skip
      return true;
    }
  }

  private static final int BUFFER_SIZE = 2048;
  private static final byte[] BUFFER = new byte[BUFFER_SIZE];
  private static final int MAX_NO_PROGRESS = 10000;

  // Based on IOUtils.skip
  // https://github.com/apache/commons-io/blob/946a5b73fc0b10221e3a36dd98c749b90a571e5b/src/main/java/org/apache/commons/io/IOUtils.java#L1957
  // but without unnecessarily precise computations: we don't care about skipping exact number of bytes, we care
  // about greater-or-equal number of bytes.
  @SuppressWarnings("SameParameterValue")
  private static boolean canSkipAtLeast(InputStream is, long numBytes) throws IOException {
    long toSkip = numBytes;
    int noProgressSince = 0;
    while (toSkip > 0) {
      long skipped = is.read(BUFFER, 0, BUFFER_SIZE);
      if (skipped < 0) {
        // EOF
        return false;
      } else if (skipped == 0) {
        noProgressSince++;
        if (noProgressSince > MAX_NO_PROGRESS) {
          throw new IOException("Too many iterations without progress; Exit.");
        }
      } else {
        // skipped > 0, we're making progress, reset `noProgressSince`-counter.
        noProgressSince = 0;
      }
      toSkip -= skipped;
    }
    return true;
  }
}
