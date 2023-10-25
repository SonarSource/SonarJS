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
package org.sonar.plugins.javascript.filter;

import java.io.IOException;
import java.io.InputStream;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.config.Configuration;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.css.CssLanguage;
import org.sonar.plugins.javascript.JavaScriptPlugin;

class SizeAssessor implements Assessor {

  private static final Logger LOG = Loggers.get(SizeAssessor.class);
  private static final long DEFAULT_MAX_FILE_SIZE_KB = 1000L; // 1MB

  /**
   * Note that in user-facing option handling the units are kilobytes, not bytes.
   */
  private long maxFileSizeKb = DEFAULT_MAX_FILE_SIZE_KB;

  SizeAssessor(Configuration configuration) {
    configuration
      .get(JavaScriptPlugin.PROPERTY_KEY_MAX_FILE_SIZE)
      .ifPresent(str -> {
        try {
          maxFileSizeKb = Long.parseLong(str);
          if (maxFileSizeKb <= 0) {
            fallbackToDefaultMaxFileSize(
              "Maximum file size (sonar.javascript.maxFileSize) is not strictly positive: " +
              maxFileSizeKb
            );
          }
        } catch (NumberFormatException nfe) {
          fallbackToDefaultMaxFileSize(
            "Maximum file size (sonar.javascript.maxFileSize) is not an integer: \"" + str + "\""
          );
        }
      });
  }

  final void fallbackToDefaultMaxFileSize(String reasonErrorMessage) {
    LOG.warn(reasonErrorMessage + ", falling back to " + DEFAULT_MAX_FILE_SIZE_KB + ".");
    maxFileSizeKb = DEFAULT_MAX_FILE_SIZE_KB;
  }

  /**
   * Note that this method accepts size in <em>bytes</em>, to keep it consistent with conventions in
   * <code>InputStream</code> or <code>IOUtils</code>.
   */
  static boolean hasExcessiveSize(InputFile file, Long maxFileSizeBytes) {
    // we ignore size limit for CSS files, because analyzing large CSS files takes a reasonable amount of time to analyze
    if (CssLanguage.KEY.equals(file.language())) {
      return false;
    }

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
