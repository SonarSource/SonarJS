package org.sonar.plugins.javascript.analysis.cache;

import java.io.IOException;
import java.util.Optional;
import javax.annotation.Nullable;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.plugins.javascript.bridge.AstProtoUtils;
import org.sonar.plugins.javascript.bridge.protobuf.Node;

public class AstProtobufSerialization extends CacheSerialization {

  AstProtobufSerialization(SensorContext context, CacheKey cacheKey) {
    super(context, cacheKey);
  }

  Optional<Node> readFromCache() throws IOException {
    byte[] bytes = readBytesFromCache();
    if (bytes.length == 0) {
      return Optional.empty();
    }
    Node node = AstProtoUtils.readProtobufFromBytes(bytes);
    if (node == null) {
      throw new IOException("The AST is null for key " + getCacheKey());
    }
    return Optional.of(node);
  }

  void writeToCache(@Nullable Node node) {
    byte[] bytes;
    if (node == null) {
      bytes = new byte[0];
    } else {
      // TODO: do we need to do something with recursion limit here too?
      bytes = node.toByteArray();
    }
    writeToCache(bytes);
  }
}
