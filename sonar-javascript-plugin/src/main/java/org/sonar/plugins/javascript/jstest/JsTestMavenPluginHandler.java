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
package org.sonar.plugins.javascript.jstest;

import org.sonar.api.batch.maven.MavenPlugin;
import org.sonar.api.batch.maven.MavenPluginHandler;
import org.sonar.api.resources.Project;

public class JsTestMavenPluginHandler implements MavenPluginHandler {

  public static final String GROUP_ID = "net.awired.jstest";
  public static final String ARTIFACT_ID = "jstest-maven-plugin";
  public static final String VERSION = "0.1";

  public String getGroupId() {
    return GROUP_ID;
  }

  public String getArtifactId() {
    return ARTIFACT_ID;
  }

  public String getVersion() {
    return VERSION;
  }

  public boolean isFixedVersion() {
    return false;
  }

  public String[] getGoals() {
    return new String[] {"test"};
  }

  public void configure(Project project, MavenPlugin plugin) {
    plugin.setParameter("coverage", "true");
  }

  @Override
  public String toString() {
    return getClass().getSimpleName();
  }
}
