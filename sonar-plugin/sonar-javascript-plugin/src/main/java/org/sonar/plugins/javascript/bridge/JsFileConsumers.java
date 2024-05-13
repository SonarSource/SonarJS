package org.sonar.plugins.javascript.bridge;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.plugins.javascript.api.JsFile;
import org.sonar.plugins.javascript.api.JsFileConsumer;


@ScannerSide
public class JsFileConsumers implements JsFileConsumer {

  private static final Logger LOG = LoggerFactory.getLogger(JsFileConsumers.class);

  private final List<JsFileConsumer> consumers;

  public JsFileConsumers() {
    consumers = Collections.emptyList();
    LOG.info("No registered consumers");
  }

  public JsFileConsumers(JsFileConsumer[] consumers) {
    this.consumers = List.of(consumers);
    LOG.info("Registered consumers {}", this.consumers);
  }

  @Override
  public void consume(JsFile jsFile) {
    consumers.forEach(c -> c.consume(jsFile));
  }

  @Override
  public void done() {
    consumers.forEach(JsFileConsumer::done);
  }
}
