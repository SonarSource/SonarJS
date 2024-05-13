package org.sonar.samples.javascript;

import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.api.scanner.sensor.ProjectSensor;
import org.sonar.plugins.javascript.api.JsFile;
import org.sonar.plugins.javascript.api.SonarJsContext;

@ScannerSide
public class ArmorSensor implements ProjectSensor {

  private final SonarJsContext sonarJsContext;

  public ArmorSensor(SonarJsContext sonarJsContext) {
    this.sonarJsContext = sonarJsContext;
  }


  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor.name("Armor Sensor");
  }

  @Override
  public void execute(SensorContext context) {
    for (JsFile jsFile : sonarJsContext.getJsFiles()) {
      // do something with jsFile
      System.out.println(jsFile.getProgram());
    }
  }
}
