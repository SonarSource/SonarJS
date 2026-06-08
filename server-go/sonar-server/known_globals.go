package main

func knownGlobalsForConfiguration(config NormalizedProjectConfiguration) map[string]bool {
	knownGlobals := map[string]bool{}

	if config.Globals != nil {
		for _, name := range *config.Globals {
			if name != "" {
				knownGlobals[name] = true
			}
		}
	}

	if config.Environments != nil {
		for _, environment := range *config.Environments {
			if environment == "" {
				continue
			}
			for name := range environmentGlobalsByName[environment] {
				if name != "" {
					knownGlobals[name] = true
				}
			}
		}
	}

	if len(knownGlobals) == 0 {
		return nil
	}
	return knownGlobals
}
