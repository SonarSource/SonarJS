package org.sonar.plugins.javascript.bridge;

import static org.sonarsource.api.sonarlint.SonarLintSide.INSTANCE;

import org.sonar.api.scanner.ScannerSide;
import org.sonarsource.api.sonarlint.SonarLintSide;

/**
 * Class to access host parameters.
 * This abstraction is necessary to mock it in tests.
 */
@ScannerSide
@SonarLintSide(lifespan = INSTANCE)
public class EnvironmentImpl implements Environment {

  public String getUserHome() {
    return System.getProperty("user.home");
  }

  public String getOsName() {
    return System.getProperty("os.name");
  }

  public String getOsArch() {
    return System.getProperty("os.arch");
  }
}
