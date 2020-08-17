/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
package org.sonar.plugins.javascript;

import java.io.IOException;
import java.io.InputStream;
import org.sonar.api.batch.fs.InputFile;

public class SizeAssessor {

  private SizeAssessor() {}

  public static final long SIZE_THRESHOLD_BYTES = 5000_000L; // 5MB

  public static boolean hasExcessiveSize(InputFile file) {
    return hasExcessiveSize(file::inputStream);
  }

  @FunctionalInterface
  interface SupplierThrowing<A, E extends Exception> {
    A get() throws E;
  }

  static boolean hasExcessiveSize(SupplierThrowing<InputStream, IOException> inputStreamSupplier) {
    try (InputStream inputStream = inputStreamSupplier.get()) {
      return canSkipAtLeast(inputStream, SIZE_THRESHOLD_BYTES);
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
      // Avoid `InputStream.skip` because of the bizarrely vague specification.
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
