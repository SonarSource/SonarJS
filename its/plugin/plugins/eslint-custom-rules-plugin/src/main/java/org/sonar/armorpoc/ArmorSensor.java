package org.sonar.armorpoc;

import org.sonar.api.batch.DependsUpon;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.api.scanner.sensor.ProjectSensor;
import org.sonar.plugins.javascript.api.JsFile;

@ScannerSide
@DependsUpon("js-analysis")
public class ArmorSensor implements ProjectSensor {

  private final ArmorConsumer consumer;

  public ArmorSensor(ArmorConsumer consumer) {
    this.consumer = consumer;
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor.name("Armor Sensor");
  }

  @Override
  public void execute(SensorContext context) {
    if (!consumer.isDone()) {
      throw new IllegalStateException("Consumer didn't consume all files yet");
    }
    for (JsFile jsFile : consumer.getFiles()) {
      // do something with jsFile
      System.out.println(jsFile.jsonAst());
    }
  }
}
