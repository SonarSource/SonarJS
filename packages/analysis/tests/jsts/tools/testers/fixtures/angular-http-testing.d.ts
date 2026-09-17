declare module '@angular/common/http/testing' {
  export class HttpTestingController {
    expectOne(): void;
    expectNone(): void;
    match(): void;
    verify(): void;
  }
}
