/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis
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

package org.sonar.plugins.javascript;

import java.io.File;
import java.util.List;

import org.sonar.api.batch.AbstractSourceImporter;
import org.sonar.api.resources.Resource;

public class JavaScriptSourceImporter extends AbstractSourceImporter {

  public JavaScriptSourceImporter(JavaScript javascript) {
    super(javascript);
  }

  @Override
  protected Resource createResource(File file, List<File> sourceDirs, boolean unitTest) {
    return file != null ? JavaScriptFile.fromIOFile(file, sourceDirs, unitTest) : null;
  }

  @Override
  public String toString() {
    return getClass().getSimpleName();
  }
}
