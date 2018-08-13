/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2013-2018 SonarSource SA
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
import com.sonar.orchestrator.build.BuildResult;
import com.sonar.orchestrator.build.SonarScanner;
import com.sonar.orchestrator.locator.FileLocation;
import java.io.File;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.assertj.core.api.Assertions;
import org.junit.ClassRule;
import org.junit.Test;

import static org.assertj.core.api.Assertions.offset;

public class JavaScriptPerformanceTest {

  @ClassRule
  public static final Orchestrator ORCHESTRATOR = Orchestrator.builderEnv()
    .setSonarVersion(System.getProperty("sonar.runtimeVersion", "LATEST_RELEASE[6.7]"))
    .restoreProfileAtStartup(FileLocation.of("src/test/resources/no_rules.xml"))
    .restoreProfileAtStartup(FileLocation.of("src/test/resources/se_profile.xml"))
    .addPlugin(FileLocation.byWildcardMavenFilename(
      new File("../../sonar-javascript-plugin/target"), "sonar-javascript-plugin-*.jar"))
    .build();

  @Test
  public void test_parsing_performance() {
    test_performance("parsing-project", "no-rules", 157.0);
  }

  @Test
  public void test_symbolic_engine_performance() {
    test_performance("se-project", "se-profile", 235.0);
  }

  private static void test_performance(String projectKey, String profile, double expectedTime) {
    ORCHESTRATOR.getServer().provisionProject(projectKey, projectKey);
    ORCHESTRATOR.getServer().associateProjectToQualityProfile(projectKey, "js", profile);

    SonarScanner build = getSonarScanner(projectKey);
    BuildResult buildResult = ORCHESTRATOR.executeBuild(build);

    double time = sensorTime(buildResult.getLogs());
    Assertions.assertThat(time).isEqualTo(expectedTime, offset(expectedTime * 0.04));
  }

  private static SonarScanner getSonarScanner(String projectKey) {
    return SonarScanner.create(FileLocation.of("../sources/src").getFile())
      .setEnvironmentVariable("SONAR_RUNNER_OPTS", "-Xmx1024m")
      .setProperty("sonar.importSources", "false")
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

  private static double sensorTime(String logs) {
    Pattern pattern = Pattern.compile("Sensor SonarJS \\[javascript\\] \\(done\\) \\| time=(\\d++)ms");
    Matcher matcher = pattern.matcher(logs);

    Preconditions.checkArgument(matcher.find(), "Unable to extract the timing of sensor \"SonarJS\" from the logs");
    double result = (double) TimeUnit.MILLISECONDS.toSeconds(Integer.parseInt(matcher.group(1)));
    Preconditions.checkArgument(!matcher.find(), "Found several potential timings of sensor \"SonarJS\" in the logs");
    return result;
  }
}
