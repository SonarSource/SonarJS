/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis and SonarSource
 * dev@sonar.codehaus.org
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.plugins.javascript.utils;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

import org.apache.commons.io.FileUtils;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.io.filefilter.HiddenFileFilter;
import org.apache.commons.io.filefilter.IOFileFilter;
import org.apache.commons.lang.StringUtils;
import org.sonar.api.utils.WildcardPattern;

public final class ReportScanner {

  private ReportScanner() {}
  
  private static class InclusionFilter implements IOFileFilter {
    private File sourceDir;
    private WildcardPattern[] patterns;

    InclusionFilter(File sourceDir, String[] paths) {
      this.sourceDir = sourceDir;
      this.patterns = WildcardPattern.create(paths);
    }

    public boolean accept(File file) {
      String relativePath = getRelativePath(file, sourceDir);
      if (relativePath == null) {
        return false;
      }
      for (WildcardPattern pattern : patterns) {
        if (pattern.match(relativePath)) {
          return true;
        }
      }
      return false;
    }

    public boolean accept(File file, String name) {
      return accept(file);
    }
    public static String getRelativePath(File file, File dir) {
      List<String> stack = new ArrayList<String>();
      String path = FilenameUtils.normalize(file.getAbsolutePath());
      File cursor = new File(path);
      while (cursor != null) {
        if (FilenameUtils.equalsNormalizedOnSystem(dir.getAbsolutePath(), cursor.getAbsolutePath())) {
          return StringUtils.join(stack, "/");
        }
        stack.add(0, cursor.getName());
        cursor = cursor.getParentFile();
      }
      return null;
    }
  }
  
  public static List<File> scanForReports(File baseDir, String[] paths) {
    List<File> result = new ArrayList<File>();

    IOFileFilter filter = new InclusionFilter(baseDir, paths);
   
    if (baseDir.exists()) {
      List<File> files = (List<File>) FileUtils.listFiles(baseDir, filter, HiddenFileFilter.VISIBLE);
      for (File file : files) {
        result.add(file);
      }
    }
    return result;
  }
}
