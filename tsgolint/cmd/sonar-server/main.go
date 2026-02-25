package main

import (
	"flag"
	"fmt"
	"log"
	"net"

	pb "github.com/nicolo-ribaudo/tsgolint/cmd/sonar-server/grpc"
	"google.golang.org/grpc"
)

func main() {
	port := flag.Int("port", 0, "gRPC server port")
	flag.Parse()

	if *port == 0 {
		log.Fatal("--port flag is required")
	}

	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", *port))
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	s := grpc.NewServer()
	pb.RegisterAnalyzerServiceServer(s, NewAnalyzerService())

	log.Printf("tsgolint gRPC server listening on port %d", *port)
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
