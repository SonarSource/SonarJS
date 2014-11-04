/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
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
package org.sonar.plugins.javascript.unittest.surefireparser;

import com.google.common.collect.Maps;
import com.google.common.collect.Sets;

import java.util.Map;
import java.util.Set;

public class UnitTestIndex {

  private Map<String, UnitTestClassReport> indexByClassname;

  public UnitTestIndex() {
    this.indexByClassname = Maps.newHashMap();
  }

  public UnitTestClassReport index(String classname) {
    UnitTestClassReport classReport = indexByClassname.get(classname);
    if (classReport == null) {
      classReport = new UnitTestClassReport();
      indexByClassname.put(classname, classReport);
    }
    return classReport;
  }

  public UnitTestClassReport get(String classname) {
    return indexByClassname.get(classname);
  }

  public Set<String> getClassnames() {
    return Sets.newHashSet(indexByClassname.keySet());
  }

  public Map<String, UnitTestClassReport> getIndexByClassname() {
    return indexByClassname;
  }

  public int size() {
    return indexByClassname.size();
  }

  public UnitTestClassReport merge(String classname, String intoClassname) {
    UnitTestClassReport from = indexByClassname.get(classname);
    if (from != null) {
      UnitTestClassReport to = index(intoClassname);
      to.add(from);
      indexByClassname.remove(classname);
      return to;
    }
    return null;
  }

  public void remove(String classname) {
    indexByClassname.remove(classname);
  }


}
