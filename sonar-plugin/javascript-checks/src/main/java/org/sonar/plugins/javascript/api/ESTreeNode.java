package org.sonar.plugins.javascript.api;

public abstract sealed interface ESTreeNode {

  record Program(String type) implements ESTreeNode {

  }

}
