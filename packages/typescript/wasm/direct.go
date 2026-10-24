//go:build js && wasm

package main

import (
	"fmt"
	"unsafe"
)

// These roots keep every exposed address alive across calls and Go GC. JS must
// consume/copy a response before reserving the next input or calling Go again.
var requestBuffer []byte
var responseBuffer []byte
var responseDescriptor [3]uint32 // pointer, length, error flag; little endian

//go:wasmexport sonarReserve
func reserve(size uint32) uint32 {
	if size == 0 || size > 1<<30 {
		return 0
	}
	if uint32(cap(requestBuffer)) < size {
		capacity := uint32(4096)
		for capacity < size {
			capacity *= 2
		}
		requestBuffer = make([]byte, capacity)
	}
	return uint32(uintptr(unsafe.Pointer(&requestBuffer[0])))
}

//go:wasmexport sonarRequest
func directRequest(id, methodLength, payloadLength uint32) (descriptor uint32) {
	failed := uint32(0)
	defer func() {
		if p := recover(); p != nil {
			responseBuffer = []byte(fmt.Sprint(p))
			failed = 1
		}
		pointer := uint32(0)
		if len(responseBuffer) != 0 {
			pointer = uint32(uintptr(unsafe.Pointer(&responseBuffer[0])))
		}
		responseDescriptor = [3]uint32{pointer, uint32(len(responseBuffer)), failed}
		descriptor = uint32(uintptr(unsafe.Pointer(&responseDescriptor[0])))
	}()
	if uint64(methodLength)+uint64(payloadLength) > uint64(len(requestBuffer)) {
		panic("WASM request exceeds reserved input buffer")
	}
	method := string(requestBuffer[:methodLength])
	var err error
	responseBuffer, err = handleRequest(int(id), method, requestBuffer[methodLength:methodLength+payloadLength])
	if err != nil {
		responseBuffer = []byte(err.Error())
		failed = 1
	}
	return
}
