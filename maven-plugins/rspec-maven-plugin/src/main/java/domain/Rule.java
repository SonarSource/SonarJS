package domain;

import java.util.List;
import java.util.Map;

public interface Rule {
  String name();

  String htmlDocumentation();

  String type();

  String defaultSeverity();

  List<String> tags();

  String scope();

  Remediation remediation();

  String title();

  List<Parameter> parameters();

  List<String> compatibleLanguages();

  List<String> qualityProfiles();

  String status();

  Code code();
}
