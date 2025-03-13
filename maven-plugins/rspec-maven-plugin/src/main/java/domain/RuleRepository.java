package domain;

import com.sonarsource.ruleapi.domain.RuleFiles;
import java.util.List;

public interface RuleRepository {
  List<Rule> getRulesByLanguage(String languageKey);
  List<RuleFiles> getRuleManifestsByRuleSubdirectory(String ruleSubdirectory);
}
