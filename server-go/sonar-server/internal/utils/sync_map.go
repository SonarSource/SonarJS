package utils

import "sync"

type syncMap[K comparable, V any] struct {
	raw sync.Map
}

func (m *syncMap[K, V]) Load(key K) (V, bool) {
	value, ok := m.raw.Load(key)
	if !ok {
		var zero V
		return zero, false
	}
	return value.(V), true
}

func (m *syncMap[K, V]) LoadOrStore(key K, value V) (V, bool) {
	actual, loaded := m.raw.LoadOrStore(key, value)
	return actual.(V), loaded
}
