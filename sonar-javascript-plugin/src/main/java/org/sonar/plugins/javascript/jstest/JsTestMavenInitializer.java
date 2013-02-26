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

import org.sonar.api.batch.Initializer;
import org.sonar.api.batch.maven.DependsUponMavenPlugin;
import org.sonar.api.batch.maven.MavenPluginHandler;
import org.sonar.api.resources.Project;
import org.sonar.plugins.javascript.core.JavaScript;

public class JsTestMavenInitializer extends Initializer implements DependsUponMavenPlugin {

  private JsTestMavenPluginHandler handler;
  private JavaScript javascript;

  public JsTestMavenInitializer(JsTestMavenPluginHandler handler, JavaScript javascript) {
    this.handler = handler;
    this.javascript = javascript;
  }

  @Override
  public boolean shouldExecuteOnProject(Project project) {
    return project.getAnalysisType().isDynamic(true)
      && javascript.equals(project.getLanguage());
  }

  public MavenPluginHandler getMavenPluginHandler(Project project) {
    if (!"pom".equals(project.getPackaging())) {
      return handler;
    }
    return null;
  }

  @Override
  public void execute(Project project) {
    // empty
  }

}
