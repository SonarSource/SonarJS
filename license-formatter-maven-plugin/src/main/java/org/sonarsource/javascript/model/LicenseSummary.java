package org.sonarsource.javascript.model;

import jakarta.xml.bind.annotation.*;
import java.util.List;

@XmlRootElement(name = "licenseSummary")
@XmlAccessorType(XmlAccessType.FIELD)
public class LicenseSummary {

  @XmlElementWrapper(name = "dependencies")
  @XmlElement(name = "dependency")
  private List<org.sonarsource.javascript.model.Dependency> dependencies;

  public List<org.sonarsource.javascript.model.Dependency> getDependencies() {
    return dependencies;
  }
}
