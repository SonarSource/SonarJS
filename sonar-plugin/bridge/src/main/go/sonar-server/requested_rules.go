package main

import (
	"encoding/json"

	pb "github.com/typescript-eslint/tsgolint/cmd/sonar-server/grpc"
	"google.golang.org/protobuf/types/known/structpb"
)

type requestedRuleConfig struct {
	Options any
}

func requestedRuleConfigs(rules []*pb.JsTsRule) map[string]requestedRuleConfig {
	requested := make(map[string]requestedRuleConfig, len(rules)+1)
	for _, requestedRule := range rules {
		ruleName := requestedRule.GetKey()
		options := optionsForRequestedRule(requestedRule)
		if mappedRuleName, ok := tsgolintRuleNameBySonarKey[ruleName]; ok {
			requested[mappedRuleName] = requestedRuleConfig{Options: options}
			if ruleName == "S6544" {
				requested["no-async-promise-executor"] = requestedRuleConfig{}
			}
			continue
		}
		if _, ok := allRulesByName[ruleName]; ok {
			requested[ruleName] = requestedRuleConfig{Options: options}
		}
	}
	return requested
}

func optionsForRequestedRule(requestedRule *pb.JsTsRule) any {
	configurations := configurationInterfaces(requestedRule.GetConfigurations())
	defaultOptions := defaultOptionsForRule(requestedRule.GetKey())
	merged := mergeOptionSlices(defaultOptions, configurations)
	switch len(merged) {
	case 0:
		return nil
	case 1:
		return cloneOptionValue(merged[0])
	default:
		return merged
	}
}

func configurationInterfaces(configurations []*structpb.Value) []any {
	interfaces := make([]any, 0, len(configurations))
	for _, configuration := range configurations {
		if configuration == nil {
			interfaces = append(interfaces, nil)
			continue
		}
		interfaces = append(interfaces, configuration.AsInterface())
	}
	return interfaces
}

func defaultOptionsForRule(sonarKey string) []any {
	ruleMeta := ruleMetadataBySonarKey[sonarKey]
	if ruleMeta.DefaultOptionsJSON == "" {
		return nil
	}
	var defaultOptions []any
	if err := json.Unmarshal([]byte(ruleMeta.DefaultOptionsJSON), &defaultOptions); err != nil {
		panic("invalid generated default options for rule " + sonarKey + ": " + err.Error())
	}
	return defaultOptions
}

func mergeOptionSlices(defaults, overrides []any) []any {
	switch {
	case len(defaults) == 0 && len(overrides) == 0:
		return nil
	case len(defaults) == 0:
		return cloneOptionSlice(overrides)
	}

	merged := cloneOptionSlice(defaults)
	for index, override := range overrides {
		if index < len(merged) {
			merged[index] = mergeOptionValues(merged[index], override)
			continue
		}
		merged = append(merged, cloneOptionValue(override))
	}
	return merged
}

func mergeOptionValues(defaultValue, override any) any {
	switch typedDefault := defaultValue.(type) {
	case map[string]any:
		if typedOverride, ok := override.(map[string]any); ok {
			merged := cloneOptionMap(typedDefault)
			for key, value := range typedOverride {
				merged[key] = mergeOptionValues(merged[key], value)
			}
			return merged
		}
	case []any:
		if typedOverride, ok := override.([]any); ok {
			return mergeOptionSlices(typedDefault, typedOverride)
		}
	}
	return cloneOptionValue(override)
}

func cloneOptionMap(optionMap map[string]any) map[string]any {
	cloned := make(map[string]any, len(optionMap))
	for key, value := range optionMap {
		cloned[key] = cloneOptionValue(value)
	}
	return cloned
}

func cloneOptionSlice(options []any) []any {
	if len(options) == 0 {
		return nil
	}
	cloned := make([]any, len(options))
	for index, value := range options {
		cloned[index] = cloneOptionValue(value)
	}
	return cloned
}

func cloneOptionValue(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		return cloneOptionMap(typed)
	case []any:
		return cloneOptionSlice(typed)
	default:
		return typed
	}
}

func boolOptionValue(options any, key string, defaultValue bool) bool {
	optionMap, ok := options.(map[string]any)
	if !ok {
		return defaultValue
	}
	value, ok := optionMap[key]
	if !ok {
		return defaultValue
	}
	boolValue, ok := value.(bool)
	if !ok {
		return defaultValue
	}
	return boolValue
}
