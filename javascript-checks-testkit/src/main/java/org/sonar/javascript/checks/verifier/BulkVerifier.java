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
package org.sonar.javascript.checks.verifier;

import com.sonar.sslr.api.RecognitionException;
import java.io.File;
import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.util.Collection;
import java.util.Collections;
import java.util.Iterator;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.filefilter.DirectoryFileFilter;
import org.apache.commons.io.filefilter.WildcardFileFilter;
import org.apache.commons.lang.time.StopWatch;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.javascript.visitors.JavaScriptVisitorContext;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.visitors.Issue;

/**
 * Class to test one single rule on a wide set of JavaScript files.
 */
public class BulkVerifier {

  private static final Logger LOGGER = Loggers.get(BulkVerifier.class);
  static int margin = 2;
  private final Class<? extends JavaScriptCheck> checkClass;
  private final IssueCollector issueCollector;

  public BulkVerifier(Class<? extends JavaScriptCheck> checkClass, IssueCollector issueCollector) {
    this.checkClass = checkClass;
    this.issueCollector = issueCollector;
  }

  /**
   * For the specified rule only, scan all JavaScript files in the specified
   * directory and dumps all found issues in a text file.
   */
  public void scanDirectory(File directory) throws IOException {
    StopWatch timer = new StopWatch();
    timer.start();

    Collection<File> files = FileUtils.listFiles(
      directory,
      new WildcardFileFilter("*.js"),
      DirectoryFileFilter.DIRECTORY);

    AtomicInteger nbFiles = new AtomicInteger();
    LOGGER.info("Starting to scan the files");
    files.parallelStream().forEach(file -> {
      JavaScriptCheck check = instantiateCheck(checkClass);
      LOGGER.debug("Processing file " + file);
      InputFile inputFile = TestUtils.createTestInputFile(directory, directory.toPath().relativize(file.toPath()).toString());
      Iterator<Issue> issues = getIssues(check, inputFile);
      try {
        issueCollector.writeIssues(issues, file);
      } catch (IOException e) {
        LOGGER.error("Failed to generate report for file " + file.getAbsolutePath(), e);
      }
      nbFiles.getAndIncrement();
      if (nbFiles.get() % 200 == 0) {
        LOGGER.info("Processed " + nbFiles + " files. Last file was " + file);
      }
    });
    issueCollector.writeSummary();
    timer.stop();
    LOGGER.info("Execution time: " + timer.toString());
  }

  private static Iterator<Issue> getIssues(JavaScriptCheck check, InputFile file) {
    try {
      JavaScriptVisitorContext context = TestUtils.createParallelContext(file);
      return JavaScriptCheckVerifier.getActualIssues(check, context);
    } catch (RecognitionException e) {
      LOGGER.info("Parsing failed on file " + file + ". The file is ignored");
      return Collections.emptyIterator();
    }
  }

  private static JavaScriptCheck instantiateCheck(Class<? extends JavaScriptCheck> checkClass) {
    try {
      return checkClass.getDeclaredConstructor().newInstance();
    } catch (IllegalAccessException | InstantiationException | NoSuchMethodException | InvocationTargetException e) {
      throw new IllegalArgumentException(e);
    }
  }

}
