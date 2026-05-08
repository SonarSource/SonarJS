package main

import (
	"context"
	"io"
	"testing"
	"time"

	pb "github.com/SonarSource/SonarJS/server-go/sonar-server/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

const testTimeout = 2 * time.Second

type testServerStream struct {
	ctx context.Context
}

func (s *testServerStream) SetHeader(metadata.MD) error  { return nil }
func (s *testServerStream) SendHeader(metadata.MD) error { return nil }
func (s *testServerStream) SetTrailer(metadata.MD)       {}
func (s *testServerStream) Context() context.Context {
	if s.ctx == nil {
		return context.Background()
	}
	return s.ctx
}
func (s *testServerStream) SendMsg(any) error { return nil }
func (s *testServerStream) RecvMsg(any) error { return nil }

type testAnalyzeProjectStream struct {
	testServerStream
	sent []*pb.AnalyzeProjectStreamResponse
}

func (s *testAnalyzeProjectStream) Send(response *pb.AnalyzeProjectStreamResponse) error {
	s.sent = append(s.sent, response)
	return nil
}

type testLeaseStream struct {
	testServerStream
	recvFn func() (*pb.LeaseRequest, error)
}

func (s *testLeaseStream) Recv() (*pb.LeaseRequest, error) {
	if s.recvFn == nil {
		return nil, io.EOF
	}
	return s.recvFn()
}

func (s *testLeaseStream) Send(*pb.LeaseResponse) error {
	return nil
}

func TestAnalyzeProjectRejectsConcurrentUnaryWhileStreamActive(t *testing.T) {
	request := createTestAnalyzeProjectRequest(t)
	started := make(chan struct{})
	release := make(chan struct{})
	service := newAnalyzerService(func(ctx context.Context, input *NormalizedAnalyzeProjectInput) projectAnalysisRun {
		close(started)
		<-release
		return createProjectAnalysisRun(input.OrderedFiles, false)
	}, nil)
	stream := &testAnalyzeProjectStream{testServerStream: testServerStream{ctx: context.Background()}}

	errCh := make(chan error, 1)
	go func() {
		errCh <- service.AnalyzeProject(request, stream)
	}()

	waitForSignal(t, started, "stream analysis start")

	_, err := service.AnalyzeProjectUnary(context.Background(), request)
	if status.Code(err) != codes.ResourceExhausted {
		t.Fatalf("expected concurrent unary call to be rejected with RESOURCE_EXHAUSTED, got %v", err)
	}

	close(release)
	if err := waitForError(t, errCh, "stream analysis completion"); err != nil {
		t.Fatalf("expected stream analysis to complete successfully, got %v", err)
	}
}

func TestAnalyzeProjectRejectsConcurrentStreamWhileUnaryActive(t *testing.T) {
	request := createTestAnalyzeProjectRequest(t)
	started := make(chan struct{})
	release := make(chan struct{})
	service := newAnalyzerService(func(ctx context.Context, input *NormalizedAnalyzeProjectInput) projectAnalysisRun {
		close(started)
		<-release
		return createProjectAnalysisRun(input.OrderedFiles, false)
	}, nil)

	responseCh := make(chan *pb.AnalyzeProjectUnaryResponse, 1)
	errCh := make(chan error, 1)
	go func() {
		response, err := service.AnalyzeProjectUnary(context.Background(), request)
		if err != nil {
			errCh <- err
			return
		}
		responseCh <- response
	}()

	waitForSignal(t, started, "unary analysis start")

	stream := &testAnalyzeProjectStream{testServerStream: testServerStream{ctx: context.Background()}}
	err := service.AnalyzeProject(request, stream)
	if status.Code(err) != codes.ResourceExhausted {
		t.Fatalf("expected concurrent stream call to be rejected with RESOURCE_EXHAUSTED, got %v", err)
	}

	close(release)

	select {
	case response := <-responseCh:
		if response == nil {
			t.Fatal("expected unary response")
		}
	case err := <-errCh:
		t.Fatalf("expected unary analysis to succeed, got %v", err)
	case <-time.After(testTimeout):
		t.Fatal("timed out waiting for unary analysis completion")
	}
}

func TestAnalyzeProjectCancelsActiveStreamAndEmitsCancelledMessage(t *testing.T) {
	request := createTestAnalyzeProjectRequest(t)
	started := make(chan struct{})
	service := newAnalyzerService(func(ctx context.Context, input *NormalizedAnalyzeProjectInput) projectAnalysisRun {
		close(started)
		<-ctx.Done()
		return createProjectAnalysisRun(input.OrderedFiles, true)
	}, nil)
	stream := &testAnalyzeProjectStream{testServerStream: testServerStream{ctx: context.Background()}}

	errCh := make(chan error, 1)
	go func() {
		errCh <- service.AnalyzeProject(request, stream)
	}()

	waitForSignal(t, started, "stream analysis start")

	response, err := service.CancelAnalysis(context.Background(), &pb.CancelAnalysisRequest{})
	if err != nil {
		t.Fatalf("expected cancel RPC to succeed, got %v", err)
	}
	if !response.Cancelled {
		t.Fatal("expected cancel RPC to report an active analysis")
	}

	if err := waitForError(t, errCh, "stream analysis completion"); err != nil {
		t.Fatalf("expected stream analysis to complete after cancellation, got %v", err)
	}

	if len(stream.sent) != 2 {
		t.Fatalf("expected one file result plus one cancelled message, got %d message(s)", len(stream.sent))
	}
	if got := stream.sent[0].GetFileResult(); got == nil {
		t.Fatal("expected first message to be a file result")
	}
	if got := stream.sent[1].GetCancelled(); got == nil {
		t.Fatal("expected final message to be cancelled")
	}
	if got := stream.sent[1].GetMeta(); got != nil {
		t.Fatalf("expected no meta after cancellation, got %#v", got)
	}
}

func TestAnalyzeProjectUnaryReturnsPartialResultsWhenCancelled(t *testing.T) {
	request := createTestAnalyzeProjectRequest(t)
	expectedInput, err := NormalizeAnalyzeProjectRequest(request)
	if err != nil {
		t.Fatalf("expected test request to normalize, got %v", err)
	}

	started := make(chan struct{})
	service := newAnalyzerService(func(ctx context.Context, input *NormalizedAnalyzeProjectInput) projectAnalysisRun {
		close(started)
		<-ctx.Done()
		run := createProjectAnalysisRun(input.OrderedFiles, true)
		run.meta = &pb.ProjectAnalysisMeta{Warnings: []string{"partial"}}
		return run
	}, nil)

	type unaryResult struct {
		response *pb.AnalyzeProjectUnaryResponse
		err      error
	}
	resultCh := make(chan unaryResult, 1)
	go func() {
		response, err := service.AnalyzeProjectUnary(context.Background(), request)
		resultCh <- unaryResult{response: response, err: err}
	}()

	waitForSignal(t, started, "unary analysis start")

	cancelResponse, err := service.CancelAnalysis(context.Background(), &pb.CancelAnalysisRequest{})
	if err != nil {
		t.Fatalf("expected cancel RPC to succeed, got %v", err)
	}
	if !cancelResponse.Cancelled {
		t.Fatal("expected cancel RPC to report an active unary analysis")
	}

	select {
	case result := <-resultCh:
		if result.err != nil {
			t.Fatalf("expected unary cancellation to return partial success, got %v", result.err)
		}
		if result.response == nil {
			t.Fatal("expected unary response")
		}
		if got := result.response.Files[expectedInput.OrderedFiles[0]]; got == nil {
			t.Fatalf("expected partial unary response to include %s", expectedInput.OrderedFiles[0])
		}
		if len(result.response.Meta.GetWarnings()) != 1 || result.response.Meta.GetWarnings()[0] != "partial" {
			t.Fatalf("expected partial warning metadata, got %#v", result.response.Meta.GetWarnings())
		}
	case <-time.After(testTimeout):
		t.Fatal("timed out waiting for unary cancellation result")
	}
}

func TestCancelAnalysisReturnsFalseWithoutActiveAnalysis(t *testing.T) {
	service := newAnalyzerService(nil, nil)

	response, err := service.CancelAnalysis(context.Background(), &pb.CancelAnalysisRequest{})
	if err != nil {
		t.Fatalf("expected cancel RPC to succeed, got %v", err)
	}
	if response.Cancelled {
		t.Fatal("expected cancel RPC to report no active analysis")
	}
}

func TestAnalyzeProjectStreamsDiscoveredFilesWhenRequestOmitsFiles(t *testing.T) {
	baseDir := t.TempDir()
	discoveredFile := baseDir + "/discovered.ts"
	service := newAnalyzerService(func(ctx context.Context, input *NormalizedAnalyzeProjectInput) projectAnalysisRun {
		return createProjectAnalysisRun([]string{discoveredFile}, false)
	}, nil)
	stream := &testAnalyzeProjectStream{testServerStream: testServerStream{ctx: context.Background()}}

	err := service.AnalyzeProject(&pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:             baseDir,
			CanAccessFileSystem: testBoolPtr(true),
		},
	}, stream)
	if err != nil {
		t.Fatalf("expected discovered-file stream to succeed, got %v", err)
	}

	if len(stream.sent) != 2 {
		t.Fatalf("expected one file result plus meta, got %d message(s)", len(stream.sent))
	}
	if got := stream.sent[0].GetFileResult(); got == nil || got.FilePath != discoveredFile {
		t.Fatalf("expected discovered file result for %s, got %#v", discoveredFile, got)
	}
	if got := stream.sent[1].GetMeta(); got == nil {
		t.Fatal("expected final meta message")
	}
}

func TestLeaseRejectsSecondAcquisition(t *testing.T) {
	started := make(chan struct{})
	release := make(chan struct{})
	service := newAnalyzerService(nil, nil)
	firstLease := &testLeaseStream{
		testServerStream: testServerStream{ctx: context.Background()},
		recvFn: func() (*pb.LeaseRequest, error) {
			select {
			case <-started:
			default:
				close(started)
			}
			<-release
			return nil, io.EOF
		},
	}

	errCh := make(chan error, 1)
	go func() {
		errCh <- service.Lease(firstLease)
	}()

	waitForSignal(t, started, "first lease acquisition")

	secondLease := &testLeaseStream{testServerStream: testServerStream{ctx: context.Background()}}
	err := service.Lease(secondLease)
	if status.Code(err) != codes.ResourceExhausted {
		t.Fatalf("expected second lease acquisition to be rejected with RESOURCE_EXHAUSTED, got %v", err)
	}

	close(release)
	if err := waitForError(t, errCh, "first lease completion"); err != nil {
		t.Fatalf("expected first lease to complete successfully, got %v", err)
	}
}

func TestLeaseCompletionTriggersShutdownCallback(t *testing.T) {
	reasons := make(chan string, 1)
	service := newAnalyzerService(nil, func(reason string) {
		reasons <- reason
	})

	err := service.Lease(&testLeaseStream{testServerStream: testServerStream{ctx: context.Background()}})
	if err != nil {
		t.Fatalf("expected lease to complete successfully, got %v", err)
	}

	select {
	case reason := <-reasons:
		if reason != "lease completed" {
			t.Fatalf("expected shutdown reason 'lease completed', got %q", reason)
		}
	case <-time.After(testTimeout):
		t.Fatal("timed out waiting for lease shutdown callback")
	}
}

func createTestAnalyzeProjectRequest(t *testing.T) *pb.AnalyzeProjectRequest {
	t.Helper()

	baseDir := t.TempDir()
	content := "const answer: number = 42;\n"
	return &pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir: baseDir,
		},
		Files: map[string]*pb.ProjectFileInput{
			"src/main.ts": {
				FileContent: &content,
				FileType:    pb.FileType_FILE_TYPE_MAIN,
			},
		},
	}
}

func createProjectAnalysisRun(filePaths []string, cancelled bool) projectAnalysisRun {
	results := make(map[string]*pb.ProjectAnalysisFileResult, len(filePaths))
	for _, filePath := range filePaths {
		results[filePath] = &pb.ProjectAnalysisFileResult{}
	}
	return projectAnalysisRun{
		orderedFiles: append([]string(nil), filePaths...),
		results:      results,
		meta:         &pb.ProjectAnalysisMeta{},
		cancelled:    cancelled,
	}
}

func waitForSignal(t *testing.T, ch <-chan struct{}, label string) {
	t.Helper()

	select {
	case <-ch:
	case <-time.After(testTimeout):
		t.Fatalf("timed out waiting for %s", label)
	}
}

func waitForError(t *testing.T, ch <-chan error, label string) error {
	t.Helper()

	select {
	case err := <-ch:
		return err
	case <-time.After(testTimeout):
		t.Fatalf("timed out waiting for %s", label)
		return nil
	}
}

func testBoolPtr(value bool) *bool {
	return &value
}
