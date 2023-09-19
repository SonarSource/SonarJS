package org.sonar.plugins.javascript.bridge;

public interface Environment {
  String getUserHome();

  String getOsName();

  String getOsArch();
}
