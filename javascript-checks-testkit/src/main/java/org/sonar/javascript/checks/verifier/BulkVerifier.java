/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
import java.io.FileWriter;
import java.io.IOException;
import java.io.Writer;
import java.util.Collection;
import java.util.Iterator;
import java.util.LinkedList;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.io.filefilter.DirectoryFileFilter;
import org.apache.commons.io.filefilter.WildcardFileFilter;
import org.apache.commons.lang.time.StopWatch;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.javascript.visitors.JavaScriptVisitorContext;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.visitors.FileIssue;
import org.sonar.plugins.javascript.api.visitors.Issue;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.LineIssue;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;

/**
 * Class to test one single rule on a wide set of JavaScript files.
 * TODO unit test this class
 */
public class BulkVerifier {

  private static final Logger LOGGER = Loggers.get(BulkVerifier.class);

  File outputDirectory = new File("./target");

  /**
   * For the specified rule only, scan all JavaScript files in the specified
   * directory and dumps all found issues in a text file.
   */
  public void scanDirectory(String checkClassName, File directory) {
    StopWatch timer = new StopWatch();
    timer.start();
    
    JavaScriptCheck check = getCheckForName(checkClassName);

    Collection<File> files = FileUtils.listFiles(
      directory, 
      new WildcardFileFilter("*.js"),
      DirectoryFileFilter.DIRECTORY
    );

    int nbFiles = 0;
    try (Writer writer = getOutputWriter()) {
      LOGGER.info("Starting to scan the files");
      int totalNbIssues = 0;
      for (File file : files) {
        LOGGER.debug("Processing file " + file);
        Iterator<Issue> issues = getIssues(check, file);
        int nbIssues = writeIssues(writer, issues, file);
        totalNbIssues += nbIssues;
        ++nbFiles;
        if (nbFiles % 200 == 0) {
          LOGGER.info("Processed " + nbFiles + " files. Last file was " + file);
        }
      }
      write(writer, "\n\nTotal number of issues: " + totalNbIssues + " (on " + nbFiles + " scanned files)\n");
    } catch (IOException | SecurityException e) {
      throw new VerificationException(e);
    }

    timer.stop();
    LOGGER.info("Output dumped into file " + FilenameUtils.normalize(getOutputFile().getAbsolutePath()) + ". Execution time: " + timer.toString());
  }

  private static Iterator<Issue> getIssues(JavaScriptCheck check, File file) {
    Iterator<Issue> issues = null;
    try {
      JavaScriptVisitorContext context = TestUtils.createContext(file);
      issues = JavaScriptCheckVerifier.getActualIssues(check, context);
    } catch (RecognitionException e) {
      LOGGER.info("Parsing failed on file " + file + ". The file is ignored");
      issues = new LinkedList<Issue>().iterator();
    }

    return issues;
  }

  private static int writeIssues(Writer w, Iterator<Issue> issues, File file) {
    String header = "\nIssue ";
    int nbIssues = 0;

    while (issues.hasNext()) {
      if (nbIssues == 0) {
        write(w, "\n\nFile " + file);
      }
      Issue issue = issues.next();
      if (issue instanceof PreciseIssue) {
        PreciseIssue preciseIssue = (PreciseIssue)issue;
        IssueLocation loc = preciseIssue.primaryLocation();
        write(w, header + "[" + loc.message() + "]" 
             + " from line " + loc.startLine() + ", column " + loc.startLineOffset()
             + " to line " + loc.endLine() + ", column " + loc.endLineOffset());
      } else if (issue instanceof LineIssue) {
        LineIssue lineIssue = (LineIssue)issue;
        write(w, header + "[" + lineIssue.message() + "]" + " at line " + lineIssue.line());
      } else if (issue instanceof FileIssue) {
        FileIssue fileIssue = (FileIssue)issue;
        write(w, header + "[" + fileIssue.message() + "]");
      } else {
        throw new VerificationException("Unexpected issue type [" + issue.getClass().getSimpleName() + "]");
      }
      nbIssues++;
    }
    return nbIssues;
  }
  
  /**
   * Returns an instance of the specified class.
   */
  private static JavaScriptCheck getCheckForName(String checkClassName) {
    // get the class
    Class<?> clazz = null;
    try {
      clazz = Class.forName(checkClassName);
    } catch (ClassNotFoundException e) {
      throw new VerificationException(e); 
    }

    // get an instance of the class
    @SuppressWarnings("unchecked")
    Class<JavaScriptCheck> checkClass = (Class<JavaScriptCheck>)clazz;
    JavaScriptCheck check = null;
    try {
      check = checkClass.newInstance();
    } catch (IllegalAccessException | InstantiationException e) {
      throw new VerificationException(e);
    }
    return check;
  }

  private Writer getOutputWriter() {
    try {
      return new FileWriter(getOutputFile());
    } catch (IOException e) {
      throw new VerificationException(e);
    }
  }

  private File getOutputFile() {
    return new File(outputDirectory, "issues.txt"); 
  }

  private static void write(Writer writer, String s) {
    try {
      writer.append(s);
    } catch (IOException e) {
      throw new VerificationException(e);
    }
  }
  
  private static class VerificationException extends RuntimeException {

    private static final long serialVersionUID = 7548925403978362292L;

    public VerificationException(String msg) {
      super(msg);
    }

    public VerificationException(Exception cause) {
      super(cause);
    }
    
  }

}
