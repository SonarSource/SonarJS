package main

import (
	pb "github.com/typescript-eslint/tsgolint/cmd/sonar-server/grpc"
	"google.golang.org/protobuf/types/known/structpb"
)

var s6544DefaultOptions = map[string]any{
	"checksVoidReturn": map[string]any{
		"attributes": false,
		"arguments":  false,
		"properties": false,
	},
	"ignoreIIFE": true,
}

var s131DefaultOptions = map[string]any{
	"considerDefaultExhaustiveForUnions": true,
	"requireDefaultForNonUnion":          true,
}

var s6606DefaultOptions = map[string]any{
	allowNoStrictNullChecksOption:   true,
	"ignoreConditionalTests":        true,
	"ignoreMixedLogicalExpressions": true,
	"ignorePrimitives":              true,
	"ignoreTernaryTests":            false,
}

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
	var options any
	switch len(configurations) {
	case 0:
		options = nil
	case 1:
		options = configurations[0]
	default:
		options = configurations
	}

	switch requestedRule.GetKey() {
	case "S131":
		return mergeDefaultObjectOptions(s131DefaultOptions, options)
	case "S6544":
		return mergeDefaultObjectOptions(s6544DefaultOptions, options)
	case "S6606":
		return mergeDefaultObjectOptions(s6606DefaultOptions, options)
	default:
		return options
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

func mergeDefaultObjectOptions(defaultOptions map[string]any, options any) map[string]any {
	mergedOptions := cloneOptionMap(defaultOptions)
	optionMap, ok := options.(map[string]any)
	if !ok {
		return mergedOptions
	}
	mergeOptionMaps(mergedOptions, optionMap)
	return mergedOptions
}

func cloneOptionMap(optionMap map[string]any) map[string]any {
	cloned := make(map[string]any, len(optionMap))
	for key, value := range optionMap {
		cloned[key] = cloneOptionValue(value)
	}
	return cloned
}

func cloneOptionValue(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		return cloneOptionMap(typed)
	case []any:
		cloned := make([]any, len(typed))
		for index, entry := range typed {
			cloned[index] = cloneOptionValue(entry)
		}
		return cloned
	default:
		return typed
	}
}

func mergeOptionMaps(dst, src map[string]any) {
	for key, value := range src {
		if dstMap, ok := dst[key].(map[string]any); ok {
			if srcMap, ok := value.(map[string]any); ok {
				mergeOptionMaps(dstMap, srcMap)
				continue
			}
		}
		dst[key] = cloneOptionValue(value)
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
