package org.sonar.plugins.javascript.bridge;

public interface Environment {
  public String getUserHome();

  public String getOsName();

  public String getOsArch();
}
