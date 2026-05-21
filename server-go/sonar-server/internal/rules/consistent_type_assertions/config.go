package consistent_type_assertions

import "github.com/go-json-experiment/json"

type ConsistentTypeAssertionsOptions struct {
	AssertionStyle string `json:"assertionStyle,omitempty"`

	ObjectLiteralTypeAssertions string `json:"objectLiteralTypeAssertions,omitempty"`

	ArrayLiteralTypeAssertions string `json:"arrayLiteralTypeAssertions,omitempty"`
}

// UnmarshalJSON applies the upstream rule defaults when options omit a field.
func (j *ConsistentTypeAssertionsOptions) UnmarshalJSON(value []byte) error {
	var raw map[string]interface{}
	if err := json.Unmarshal(value, &raw); err != nil {
		return err
	}
	type Plain ConsistentTypeAssertionsOptions
	var plain Plain
	if err := json.Unmarshal(value, &plain); err != nil {
		return err
	}
	if v, ok := raw["assertionStyle"]; !ok || v == nil {
		plain.AssertionStyle = "as"
	}
	if v, ok := raw["objectLiteralTypeAssertions"]; !ok || v == nil {
		plain.ObjectLiteralTypeAssertions = "allow"
	}
	if v, ok := raw["arrayLiteralTypeAssertions"]; !ok || v == nil {
		plain.ArrayLiteralTypeAssertions = "allow"
	}
	*j = ConsistentTypeAssertionsOptions(plain)
	return nil
}
