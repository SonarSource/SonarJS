/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2013 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
import com.google.common.base.Preconditions;
import com.google.common.collect.Iterables;
import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.SonarRunner;
import com.sonar.orchestrator.locator.FileLocation;
import java.io.File;
import java.io.FileInputStream;
import java.io.FilenameFilter;
import java.io.IOException;
import java.util.Arrays;
import java.util.Properties;
import java.util.concurrent.TimeUnit;
import org.fest.assertions.Assertions;
import org.fest.assertions.Delta;
import org.junit.ClassRule;
import org.junit.Test;

public class JavaScriptPerformanceTest {

  private static final String SENSOR = "JavaScriptSquidSensor";

  @ClassRule
  public static final Orchestrator ORCHESTRATOR = Orchestrator.builderEnv()
    .restoreProfileAtStartup(FileLocation.of("src/test/profile.xml"))
    .addPlugin(localJarPath("../../sonar-javascript-plugin/target"))
    .build();

  @Test
  public void perform() throws IOException {
    SonarRunner build = SonarRunner.create(FileLocation.of("../sources/src").getFile())
      .setEnvironmentVariable("SONAR_RUNNER_OPTS", "-Xmx1024m")
      .setProperty("sonar.importSources", "false")
      .setProperty("sonar.showProfiling", "true")
      .setProperty("sonar.exclusions", "**/ecmascript6/**,**/frameworks/**")
      .setProjectKey("project")
      .setProjectName("project")
      .setProjectVersion("1")
      .setLanguage("js")
      .setProfile("no-rules")
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".");

    ORCHESTRATOR.executeBuild(build);
    double time = sensorTime(build.getProjectDir(), SENSOR);

    double expected = 85;
    Assertions.assertThat(time).isEqualTo(expected, Delta.delta(expected * 0.04));
  }

  private static double sensorTime(File projectDir, String sensor) throws IOException {
    File profilingFile = new File(projectDir, ".sonar/profiling/project-profiler.properties");
    Preconditions.checkArgument(profilingFile.isFile(), "Cannot find profiling file to extract time for sensor " + sensor + ": " + profilingFile.getAbsolutePath());
    Properties properties = new Properties();
    properties.load(new FileInputStream(profilingFile));
    String time = properties.getProperty(sensor);
    Preconditions.checkNotNull(time, "Could not find a value for property : " + sensor);
    return toMilliseconds(time);
  }

  private static double toMilliseconds(String time) {
    return TimeUnit.MILLISECONDS.toSeconds(Integer.parseInt(time));
  }

  private static FileLocation localJarPath(String directory) {
    return FileLocation.of(Iterables.getOnlyElement(Arrays.asList(new File(directory).listFiles(new FilenameFilter() {
      @Override
      public boolean accept(File dir, String name) {
        return name.endsWith(".jar") && !name.endsWith("-sources.jar");
      }
    }))).getAbsolutePath());
  }

}
