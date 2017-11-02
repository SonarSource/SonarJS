/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2013-2017 SonarSource SA
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

import com.google.common.base.Preconditions;
import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.SonarScanner;
import com.sonar.orchestrator.locator.FileLocation;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.Properties;
import java.util.concurrent.TimeUnit;
import org.assertj.core.api.Assertions;
import org.junit.ClassRule;
import org.junit.Test;

import static org.assertj.core.api.Assertions.offset;

public class JavaScriptPerformanceTest {

  private static final String SENSOR = "JavaScript Squid Sensor";

  @ClassRule
  public static final Orchestrator ORCHESTRATOR = Orchestrator.builderEnv()
    .restoreProfileAtStartup(FileLocation.of("src/test/resources/no_rules.xml"))
    .restoreProfileAtStartup(FileLocation.of("src/test/resources/se_profile.xml"))
    .addPlugin(FileLocation.byWildcardMavenFilename(
      new File("../../sonar-javascript-plugin/target"), "sonar-javascript-plugin-*.jar"))
    .build();

  @Test
  public void test_parsing_performance() throws IOException {
    test_performance("parsing-project", "no-rules", 157.0);
  }

  @Test
  public void test_symbolic_engine_performance() throws IOException {
    test_performance("se-project", "se-profile", 235.0);
  }

  private static void test_performance(String projectKey, String profile, double expectedTime) throws IOException {
    ORCHESTRATOR.getServer().provisionProject(projectKey, projectKey);
    ORCHESTRATOR.getServer().associateProjectToQualityProfile(projectKey, "js", profile);

    SonarScanner build = getSonarScanner(projectKey);
    ORCHESTRATOR.executeBuild(build);

    double time = sensorTime(build.getProjectDir(), SENSOR, projectKey);
    Assertions.assertThat(time).isEqualTo(expectedTime, offset(expectedTime * 0.04));
  }

  private static SonarScanner getSonarScanner(String projectKey) {
    return SonarScanner.create(FileLocation.of("../sources/src").getFile())
      .setEnvironmentVariable("SONAR_RUNNER_OPTS", "-Xmx1024m")
      .setProperty("sonar.importSources", "false")
      .setProperty("sonar.showProfiling", "true")
      .setProperty("sonar.analysis.mode", "preview")
      .setProperty("sonar.issuesReport.console.enable", "true")
      .setProperty("sonar.preloadFileMetadata", "true")
      .setProperty("sonar.exclusions", "**/jest/**/*, **/babylon/**/*")
      .setProjectKey(projectKey)
      .setProjectName(projectKey)
      .setProjectVersion("1")
      .setLanguage("js")
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".");
  }

  private static double sensorTime(File projectDir, String sensor, String projectKey) throws IOException {
    File profilingFile = new File(projectDir, ".sonar/profiling/" + projectKey + "-profiler.properties");
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

}
