//go:build js && wasm

package main

import (
	"context"
	"fmt"
	"syscall/js"
	"time"

	"github.com/microsoft/TypeScript/tsc/internal/api"
	"github.com/microsoft/TypeScript/tsc/internal/json"
	"github.com/microsoft/TypeScript/tsc/internal/tspath"
)

type connection struct{ callback js.Value }

var sessions = map[int]*api.Session{}
var timings = map[int]*timing{}

type timing struct {
	Enabled bool `json:"enabled"`
	Totals  struct {
		RequestCount          int     `json:"requestCount"`
		TotalProcessingTimeMs float64 `json:"totalProcessingTimeMs"`
	} `json:"totals"`
	RecentRequests []map[string]any `json:"recentRequests"`
}

func (c *connection) Run(context.Context) error { return nil }
func (c *connection) Notify(ctx context.Context, method string, params any) error {
	_, err := c.Call(ctx, method, params)
	return err
}
func (c *connection) Call(_ context.Context, method string, params any) (result json.Value, err error) {
	defer func() {
		if p := recover(); p != nil {
			err = fmt.Errorf("WASM callback %s: %v", method, p)
		}
	}()
	encoded, err := json.Marshal(params)
	if err != nil {
		return nil, err
	}
	response := c.callback.Invoke(method, string(encoded))
	if failure := response.Get("error"); failure.Type() == js.TypeString {
		return nil, fmt.Errorf("%s", failure.String())
	}
	return json.Value(response.Get("value").String()), nil
}

func main() {
	next := 0
	wrap := func(fn func([]js.Value) any) js.Func {
		return js.FuncOf(func(_ js.Value, args []js.Value) (result any) {
			defer func() {
				if p := recover(); p != nil {
					result = map[string]any{"error": fmt.Sprint(p)}
				}
			}()
			return fn(args)
		})
	}
	open := wrap(func(args []js.Value) any {
		var options struct {
			Cwd           string   `json:"cwd"`
			Library       string   `json:"library"`
			Callbacks     []string `json:"callbacks"`
			CaseSensitive bool     `json:"caseSensitive"`
			CollectTiming bool     `json:"collectTiming"`
		}
		if err := json.Unmarshal([]byte(args[0].String()), &options); err != nil {
			return map[string]any{"error": err.Error()}
		}
		next++
		timings[next] = &timing{Enabled: options.CollectTiming, RecentRequests: []map[string]any{}}
		sessions[next] = api.NewSonarWasmSession(&api.StdioServerOptions{
			Cwd:                       tspath.RootedDirectoryPath(options.Cwd),
			DefaultLibraryPath:        tspath.RootedDirectoryPath(options.Library),
			Callbacks:                 options.Callbacks,
			UseCaseSensitiveFileNames: &options.CaseSensitive,
		}, &connection{callback: args[1]})
		return map[string]any{"id": next}
	})
	request := wrap(func(args []js.Value) any {
		id := args[0].Int()
		method := args[1].String()
		input := args[2]
		payload := make([]byte, input.Length())
		js.CopyBytesToGo(payload, input)
		bytes, err := handleRequest(id, method, payload)
		if err != nil {
			return map[string]any{"error": err.Error()}
		}
		output := js.Global().Get("Uint8Array").New(len(bytes))
		js.CopyBytesToJS(output, bytes)
		return map[string]any{"value": output}
	})
	close := wrap(func(args []js.Value) any {
		id := args[0].Int()
		if session := sessions[id]; session != nil {
			session.Close()
			delete(sessions, id)
			delete(timings, id)
		}
		return nil
	})
	js.Global().Set("__sonarjsWasm", map[string]any{"open": open, "request": request, "close": close})
	select {}
}

func handleRequest(id int, method string, payload []byte) ([]byte, error) {
	session := sessions[id]
	if session == nil {
		return nil, fmt.Errorf("WASM session is closed")
	}
	stats := timings[id]
	var value any
	var err error
	switch method {
	case "getServerTiming":
		value = stats
	case "resetServerTiming":
		timings[id] = &timing{Enabled: stats.Enabled, RecentRequests: []map[string]any{}}
		value = api.RawBinary(nil)
	default:
		start := time.Now()
		value, err = session.HandleRequest(context.Background(), method, json.Value(payload))
		if stats.Enabled {
			ms := float64(time.Since(start).Nanoseconds()) / 1e6
			stats.Totals.RequestCount++
			stats.Totals.TotalProcessingTimeMs += ms
			stats.RecentRequests = append(stats.RecentRequests, map[string]any{"method": method, "processingTimeMs": ms})
			if len(stats.RecentRequests) > 5 {
				stats.RecentRequests = stats.RecentRequests[1:]
			}
		}
	}
	if err != nil {
		return nil, err
	}
	var bytes []byte
	if raw, ok := value.(api.RawBinary); ok {
		bytes = raw
	} else {
		bytes, err = json.Marshal(value)
		if err != nil {
			return nil, err
		}
	}
	return bytes, nil
}
