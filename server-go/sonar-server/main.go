package main

import (
	"flag"
	"fmt"
	"log"
	"net"

	pb "github.com/SonarSource/SonarJS/server-go/sonar-server/grpc"
	"google.golang.org/grpc"
)

func main() {
	port := flag.Int("port", 0, "gRPC server port")
	project := flag.String("project", "", "Synthetic parity project directory")
	request := flag.String("request", "", "AnalyzeProjectRequest JSON file")
	baseDir := flag.String("base-dir", "", "Base directory for direct analyze-project runs")
	format := flag.String("format", "normalized-json", "CLI output format: normalized-json, protojson, or benchmark-json")
	pretty := flag.Bool("pretty", true, "Pretty-print CLI JSON output")
	flag.Parse()

	cliMode := *project != "" || *request != "" || *baseDir != ""
	if cliMode {
		if *port != 0 {
			log.Fatal("--port cannot be combined with --project, --request, or --base-dir")
		}
		if err := runAnalyzeProjectCLI(*project, *request, *baseDir, *format, *pretty); err != nil {
			log.Fatal(err)
		}
		return
	}

	if *port == 0 {
		log.Fatal("--port flag is required when not running the analyze-project CLI mode")
	}

	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", *port))
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	s := grpc.NewServer()
	pb.RegisterAnalyzeProjectServiceServer(s, NewAnalyzerServiceWithShutdown(func(reason string) {
		log.Printf("Analyze-project lease shutdown requested: %s", reason)
		s.Stop()
	}))

	log.Printf("jsts-go gRPC server listening on port %d", *port)
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
