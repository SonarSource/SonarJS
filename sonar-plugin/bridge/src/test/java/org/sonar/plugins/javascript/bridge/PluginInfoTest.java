package org.sonar.plugins.javascript.bridge;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class PluginInfoTest {

  @Test
  void test() {
    PluginInfo.setVersion("1.0.0");
    assertEquals("1.0.0", PluginInfo.getVersion());
    PluginInfo.setUcfgPluginVersion("1.0.0");
    assertEquals("1.0.0", PluginInfo.getUcfgPluginVersion().get());
  }

}
