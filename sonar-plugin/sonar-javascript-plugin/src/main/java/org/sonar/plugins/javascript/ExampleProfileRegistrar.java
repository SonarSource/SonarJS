package org.sonar.plugins.javascript;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.server.ServerSide;
import org.sonar.plugins.javascript.api.ProfileRegistrar;

@ServerSide
public class ExampleProfileRegistrar implements ProfileRegistrar {

  private static final Logger LOG = LoggerFactory.getLogger(ExampleProfileRegistrar.class);

  @Override
  public void register(RegistrarContext registrarContext) {
    LOG.info("##### Hello from ExampleProfileRegistrar!");
  }
}
