package main

import (
	"context"
	"errors"
	"log"
	"sync"

	pb "github.com/SonarSource/SonarJS/server-go/sonar-server/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const (
	concurrentAnalysisMessage   = "Another analysis is already running"
	leaseAlreadyAcquiredMessage = "Analyze-project lease already acquired"
	callCancelledMessage        = "Call cancelled"
)

var errAnalysisCancelled = errors.New("analysis cancelled")

type projectAnalysisRun struct {
	orderedFiles []string
	results      map[string]*pb.ProjectAnalysisFileResult
	meta         *pb.ProjectAnalysisMeta
	cancelled    bool
}

type projectAnalyzer func(ctx context.Context, input *NormalizedAnalyzeProjectInput) projectAnalysisRun

type serviceShutdown func(reason string)

type analyzerService struct {
	pb.UnimplementedAnalyzeProjectServiceServer

	analyze        projectAnalyzer
	shutdown       serviceShutdown
	sonarlintState *sonarlintState

	mu                 sync.Mutex
	nextAnalysisID     uint64
	activeAnalysisID   uint64
	analysisInProgress bool
	analysisCancel     context.CancelFunc
	nextLeaseID        uint64
	activeLeaseID      uint64
	leaseActive        bool
	shuttingDown       bool
}

type activeAnalysis struct {
	id     uint64
	ctx    context.Context
	cancel context.CancelFunc
}

func NewAnalyzerService() *analyzerService {
	return NewAnalyzerServiceWithShutdown(nil)
}

func NewAnalyzerServiceWithShutdown(shutdown serviceShutdown) *analyzerService {
	return newAnalyzerService(nil, shutdown)
}

func newAnalyzerService(analyze projectAnalyzer, shutdown serviceShutdown) *analyzerService {
	service := &analyzerService{
		shutdown:       shutdown,
		sonarlintState: newSonarlintState(),
	}
	if analyze == nil {
		service.analyze = service.runProjectAnalysis
	} else {
		service.analyze = analyze
	}
	return service
}

func (s *analyzerService) beginAnalysis(parent context.Context) (activeAnalysis, error) {
	if parent == nil {
		parent = context.Background()
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if s.analysisInProgress {
		return activeAnalysis{}, status.Error(codes.ResourceExhausted, concurrentAnalysisMessage)
	}

	ctx, cancel := context.WithCancel(parent)
	s.nextAnalysisID++
	analysis := activeAnalysis{
		id:     s.nextAnalysisID,
		ctx:    ctx,
		cancel: cancel,
	}

	s.activeAnalysisID = analysis.id
	s.analysisInProgress = true
	s.analysisCancel = cancel
	return analysis, nil
}

func (s *analyzerService) finishAnalysis(analysis activeAnalysis) {
	s.mu.Lock()
	if s.analysisInProgress && s.activeAnalysisID == analysis.id {
		s.analysisInProgress = false
		s.analysisCancel = nil
	}
	s.mu.Unlock()

	if analysis.cancel != nil {
		analysis.cancel()
	}
}

func (s *analyzerService) cancelActiveAnalysis() bool {
	s.mu.Lock()
	cancel := s.analysisCancel
	active := s.analysisInProgress && cancel != nil
	s.mu.Unlock()

	if cancel != nil {
		cancel()
	}
	return active
}

func (s *analyzerService) beginLease() (uint64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.leaseActive {
		return 0, status.Error(codes.ResourceExhausted, leaseAlreadyAcquiredMessage)
	}

	s.nextLeaseID++
	s.activeLeaseID = s.nextLeaseID
	s.leaseActive = true
	return s.activeLeaseID, nil
}

func (s *analyzerService) releaseLease(leaseID uint64, reason string) {
	s.mu.Lock()
	if !s.leaseActive || s.activeLeaseID != leaseID {
		s.mu.Unlock()
		return
	}
	s.leaseActive = false
	s.mu.Unlock()

	s.shutdownOnce(reason)
}

func (s *analyzerService) shutdownOnce(reason string) {
	s.mu.Lock()
	if s.shuttingDown {
		s.mu.Unlock()
		return
	}
	s.shuttingDown = true
	cancel := s.analysisCancel
	shutdown := s.shutdown
	s.mu.Unlock()

	if cancel != nil {
		cancel()
	}
	if shutdown == nil {
		return
	}

	go func() {
		log.Printf("Analyze-project server shutting down: %s", reason)
		shutdown(reason)
	}()
}

func checkAnalysisCancelled(ctx context.Context) error {
	if ctx == nil || ctx.Err() == nil {
		return nil
	}
	return errAnalysisCancelled
}

func grpcCallCancelled(ctx context.Context) error {
	if ctx == nil || ctx.Err() == nil {
		return nil
	}
	return status.Error(codes.Canceled, callCancelledMessage)
}
