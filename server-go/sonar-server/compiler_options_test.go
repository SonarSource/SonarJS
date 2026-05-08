package main

import (
	"reflect"
	"testing"

	"github.com/microsoft/typescript-go/shim/core"
)

func TestParseMaxNodeMajor(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		version string
		want    int
		ok      bool
	}{
		{name: "simple", version: "18.0.0", want: 18, ok: true},
		{name: "caret", version: "^18.0.0", want: 18, ok: true},
		{name: "or range", version: ">=16 || >=18 || 22", want: 22, ok: true},
		{name: "x range", version: "14.x", want: 14, ok: true},
		{name: "wildcard", version: "*", ok: false},
		{name: "latest", version: "latest", ok: false},
		{name: "too old", version: "6.0.0", ok: false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, ok := parseMaxNodeMajor(tc.version)
			if ok != tc.ok || got != tc.want {
				t.Fatalf("expected (%d, %t), got (%d, %t)", tc.want, tc.ok, got, ok)
			}
		})
	}
}

func TestNodeMajorToEcmaYear(t *testing.T) {
	t.Parallel()

	cases := []struct {
		major int
		want  int
	}{
		{major: 22, want: 2024},
		{major: 18, want: 2022},
		{major: 16, want: 2021},
		{major: 99, want: 2024},
		{major: 8, want: 2017},
	}

	for _, tc := range cases {
		if got := nodeMajorToEcmaYear(tc.major); got != tc.want {
			t.Fatalf("expected Node %d to map to %d, got %d", tc.major, tc.want, got)
		}
	}
}

func TestComputedLibFilesUsesMaxTargetAndNodeSignal(t *testing.T) {
	t.Parallel()

	got := computedLibFiles(nil, core.ScriptTargetES2020, "^18.0.0")
	want := []string{mustLibFileName("es2022"), mustLibFileName("dom")}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("expected %#v, got %#v", want, got)
	}
}

func TestComputedLibFilesPrefersEcmaOverride(t *testing.T) {
	t.Parallel()

	override := "ES2021"
	got := computedLibFiles(&override, core.ScriptTargetES2024, "^22.0.0")
	want := []string{mustLibFileName("es2021"), mustLibFileName("dom")}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("expected %#v, got %#v", want, got)
	}
}
