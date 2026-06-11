import * as $protobuf from 'protobufjs';
import Long = require('long');

/** Namespace sonarjs. */
export namespace sonarjs {
  /** Namespace analyzeproject. */
  namespace analyzeproject {
    /** Namespace v1. */
    namespace v1 {
      /** Represents an AnalyzeProjectService */
      class AnalyzeProjectService extends $protobuf.rpc.Service {
        /**
         * Constructs a new AnalyzeProjectService service.
         * @param rpcImpl RPC implementation
         * @param [requestDelimited=false] Whether requests are length-delimited
         * @param [responseDelimited=false] Whether responses are length-delimited
         */
        constructor(
          rpcImpl: $protobuf.RPCImpl,
          requestDelimited?: boolean,
          responseDelimited?: boolean,
        );

        /**
         * Creates new AnalyzeProjectService service using the specified rpc implementation.
         * @param rpcImpl RPC implementation
         * @param [requestDelimited=false] Whether requests are length-delimited
         * @param [responseDelimited=false] Whether responses are length-delimited
         * @returns RPC service. Useful where requests and/or responses are streamed.
         */
        static create(
          rpcImpl: $protobuf.RPCImpl,
          requestDelimited?: boolean,
          responseDelimited?: boolean,
        ): AnalyzeProjectService;

        /** Calls AnalyzeProject. */
        analyzeProject: sonarjs.analyzeproject.v1.AnalyzeProjectService.AnalyzeProject;

        /** Calls AnalyzeProjectUnary. */
        analyzeProjectUnary: sonarjs.analyzeproject.v1.AnalyzeProjectService.AnalyzeProjectUnary;

        /** Calls CancelAnalysis. */
        cancelAnalysis: sonarjs.analyzeproject.v1.AnalyzeProjectService.CancelAnalysis;

        /** Calls Lease. */
        lease: sonarjs.analyzeproject.v1.AnalyzeProjectService.Lease;
      }

      namespace AnalyzeProjectService {
        /**
         * Callback as used by {@link sonarjs.analyzeproject.v1.AnalyzeProjectService#analyzeProject}.
         * @param error Error, if any
         * @param [response] AnalyzeProjectStreamResponse
         */
        type AnalyzeProjectCallback = (
          error: Error | null,
          response?: sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse,
        ) => void;

        /** Calls AnalyzeProject. */
        type AnalyzeProject = {
          (
            request: sonarjs.analyzeproject.v1.IAnalyzeProjectRequest,
            callback: sonarjs.analyzeproject.v1.AnalyzeProjectService.AnalyzeProjectCallback,
          ): void;
          (
            request: sonarjs.analyzeproject.v1.IAnalyzeProjectRequest,
          ): Promise<sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse>;
          readonly name: 'AnalyzeProject';
          readonly path: '/sonarjs.analyzeproject.v1.AnalyzeProjectService/AnalyzeProject';
          readonly requestType: 'AnalyzeProjectRequest';
          readonly responseType: 'AnalyzeProjectStreamResponse';
          readonly requestStream: undefined;
          readonly responseStream: true;
        };

        /**
         * Callback as used by {@link sonarjs.analyzeproject.v1.AnalyzeProjectService#analyzeProjectUnary}.
         * @param error Error, if any
         * @param [response] AnalyzeProjectUnaryResponse
         */
        type AnalyzeProjectUnaryCallback = (
          error: Error | null,
          response?: sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse,
        ) => void;

        /** Calls AnalyzeProjectUnary. */
        type AnalyzeProjectUnary = {
          (
            request: sonarjs.analyzeproject.v1.IAnalyzeProjectRequest,
            callback: sonarjs.analyzeproject.v1.AnalyzeProjectService.AnalyzeProjectUnaryCallback,
          ): void;
          (
            request: sonarjs.analyzeproject.v1.IAnalyzeProjectRequest,
          ): Promise<sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse>;
          readonly name: 'AnalyzeProjectUnary';
          readonly path: '/sonarjs.analyzeproject.v1.AnalyzeProjectService/AnalyzeProjectUnary';
          readonly requestType: 'AnalyzeProjectRequest';
          readonly responseType: 'AnalyzeProjectUnaryResponse';
          readonly requestStream: undefined;
          readonly responseStream: undefined;
        };

        /**
         * Callback as used by {@link sonarjs.analyzeproject.v1.AnalyzeProjectService#cancelAnalysis}.
         * @param error Error, if any
         * @param [response] CancelAnalysisResponse
         */
        type CancelAnalysisCallback = (
          error: Error | null,
          response?: sonarjs.analyzeproject.v1.CancelAnalysisResponse,
        ) => void;

        /** Calls CancelAnalysis. */
        type CancelAnalysis = {
          (
            request: sonarjs.analyzeproject.v1.ICancelAnalysisRequest,
            callback: sonarjs.analyzeproject.v1.AnalyzeProjectService.CancelAnalysisCallback,
          ): void;
          (
            request: sonarjs.analyzeproject.v1.ICancelAnalysisRequest,
          ): Promise<sonarjs.analyzeproject.v1.CancelAnalysisResponse>;
          readonly name: 'CancelAnalysis';
          readonly path: '/sonarjs.analyzeproject.v1.AnalyzeProjectService/CancelAnalysis';
          readonly requestType: 'CancelAnalysisRequest';
          readonly responseType: 'CancelAnalysisResponse';
          readonly requestStream: undefined;
          readonly responseStream: undefined;
        };

        /**
         * Callback as used by {@link sonarjs.analyzeproject.v1.AnalyzeProjectService#lease}.
         * @param error Error, if any
         * @param [response] LeaseResponse
         */
        type LeaseCallback = (
          error: Error | null,
          response?: sonarjs.analyzeproject.v1.LeaseResponse,
        ) => void;

        /** Calls Lease. */
        type Lease = {
          (
            request: sonarjs.analyzeproject.v1.ILeaseRequest,
            callback: sonarjs.analyzeproject.v1.AnalyzeProjectService.LeaseCallback,
          ): void;
          (
            request: sonarjs.analyzeproject.v1.ILeaseRequest,
          ): Promise<sonarjs.analyzeproject.v1.LeaseResponse>;
          readonly name: 'Lease';
          readonly path: '/sonarjs.analyzeproject.v1.AnalyzeProjectService/Lease';
          readonly requestType: 'LeaseRequest';
          readonly responseType: 'LeaseResponse';
          readonly requestStream: true;
          readonly responseStream: true;
        };
      }

      /**
       * Properties of an AnalyzeProjectRequest.
       * @deprecated Use sonarjs.analyzeproject.v1.AnalyzeProjectRequest.$Properties instead.
       */
      interface IAnalyzeProjectRequest
        extends sonarjs.analyzeproject.v1.AnalyzeProjectRequest.$Properties {}

      /** Represents an AnalyzeProjectRequest. */
      class AnalyzeProjectRequest {
        /**
         * Constructs a new AnalyzeProjectRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.AnalyzeProjectRequest.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /** AnalyzeProjectRequest configuration. */
        configuration?: sonarjs.analyzeproject.v1.ProjectConfiguration.$Properties | null;

        /** AnalyzeProjectRequest files. */
        files: { [k: string]: sonarjs.analyzeproject.v1.ProjectFileInput.$Properties };

        /** AnalyzeProjectRequest rules. */
        rules: sonarjs.analyzeproject.v1.JsTsRule.$Properties[];

        /** AnalyzeProjectRequest cssRules. */
        cssRules: sonarjs.analyzeproject.v1.CssRule.$Properties[];

        /** AnalyzeProjectRequest bundles. */
        bundles: string[];

        /** AnalyzeProjectRequest rulesWorkdir. */
        rulesWorkdir?: string | null;

        /**
         * Creates a new AnalyzeProjectRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns AnalyzeProjectRequest instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.AnalyzeProjectRequest.$Shape,
        ): sonarjs.analyzeproject.v1.AnalyzeProjectRequest &
          sonarjs.analyzeproject.v1.AnalyzeProjectRequest.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.AnalyzeProjectRequest.$Properties,
        ): sonarjs.analyzeproject.v1.AnalyzeProjectRequest;

        /**
         * Encodes the specified AnalyzeProjectRequest message. Does not implicitly {@link sonarjs.analyzeproject.v1.AnalyzeProjectRequest.verify|verify} messages.
         * @param message AnalyzeProjectRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.AnalyzeProjectRequest.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified AnalyzeProjectRequest message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.AnalyzeProjectRequest.verify|verify} messages.
         * @param message AnalyzeProjectRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.AnalyzeProjectRequest.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes an AnalyzeProjectRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.AnalyzeProjectRequest & sonarjs.analyzeproject.v1.AnalyzeProjectRequest.$Shape} AnalyzeProjectRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.AnalyzeProjectRequest &
          sonarjs.analyzeproject.v1.AnalyzeProjectRequest.$Shape;

        /**
         * Decodes an AnalyzeProjectRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.AnalyzeProjectRequest & sonarjs.analyzeproject.v1.AnalyzeProjectRequest.$Shape} AnalyzeProjectRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.AnalyzeProjectRequest &
          sonarjs.analyzeproject.v1.AnalyzeProjectRequest.$Shape;

        /**
         * Verifies an AnalyzeProjectRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates an AnalyzeProjectRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns AnalyzeProjectRequest
         */
        static fromObject(object: {
          [k: string]: any;
        }): sonarjs.analyzeproject.v1.AnalyzeProjectRequest;

        /**
         * Creates a plain object from an AnalyzeProjectRequest message. Also converts values to other types if specified.
         * @param message AnalyzeProjectRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.AnalyzeProjectRequest,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this AnalyzeProjectRequest to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for AnalyzeProjectRequest
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace AnalyzeProjectRequest {
        /** Properties of an AnalyzeProjectRequest. */
        interface $Properties {
          /** AnalyzeProjectRequest configuration */
          configuration?: sonarjs.analyzeproject.v1.ProjectConfiguration.$Properties | null;

          /** AnalyzeProjectRequest files */
          files?: { [k: string]: sonarjs.analyzeproject.v1.ProjectFileInput.$Properties } | null;

          /** AnalyzeProjectRequest rules */
          rules?: sonarjs.analyzeproject.v1.JsTsRule.$Properties[] | null;

          /** AnalyzeProjectRequest cssRules */
          cssRules?: sonarjs.analyzeproject.v1.CssRule.$Properties[] | null;

          /** AnalyzeProjectRequest bundles */
          bundles?: string[] | null;

          /** AnalyzeProjectRequest rulesWorkdir */
          rulesWorkdir?: string | null;

          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of an AnalyzeProjectRequest. */
        type $Shape = {
          configuration?: sonarjs.analyzeproject.v1.ProjectConfiguration.$Shape | null;
          files?: { [k: string]: sonarjs.analyzeproject.v1.ProjectFileInput.$Shape } | null;
          rules?: sonarjs.analyzeproject.v1.JsTsRule.$Shape[] | null;
          cssRules?: sonarjs.analyzeproject.v1.CssRule.$Shape[] | null;
          bundles?: string[] | null;
          rulesWorkdir?: string | null;
          $unknowns?: Uint8Array[];
        };
      }

      /**
       * Properties of an AnalyzeProjectStreamResponse.
       * @deprecated Use sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.$Properties instead.
       */
      interface IAnalyzeProjectStreamResponse
        extends sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.$Properties {}

      /** Represents an AnalyzeProjectStreamResponse. */
      class AnalyzeProjectStreamResponse {
        /**
         * Constructs a new AnalyzeProjectStreamResponse.
         * @param [properties] Properties to set
         */
        constructor(
          properties?: sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.$Properties,
        );

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /** AnalyzeProjectStreamResponse fileResult. */
        fileResult?: sonarjs.analyzeproject.v1.FileResultMessage.$Properties | null;

        /** AnalyzeProjectStreamResponse meta. */
        meta?: sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Properties | null;

        /** AnalyzeProjectStreamResponse cancelled. */
        cancelled?: google.protobuf.Empty.$Properties | null;

        /** AnalyzeProjectStreamResponse message. */
        message?: 'fileResult' | 'meta' | 'cancelled';

        /**
         * Creates a new AnalyzeProjectStreamResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns AnalyzeProjectStreamResponse instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.$Shape,
        ): sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse &
          sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.$Properties,
        ): sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse;

        /**
         * Encodes the specified AnalyzeProjectStreamResponse message. Does not implicitly {@link sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.verify|verify} messages.
         * @param message AnalyzeProjectStreamResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified AnalyzeProjectStreamResponse message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.verify|verify} messages.
         * @param message AnalyzeProjectStreamResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes an AnalyzeProjectStreamResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse & sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.$Shape} AnalyzeProjectStreamResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse &
          sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.$Shape;

        /**
         * Decodes an AnalyzeProjectStreamResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse & sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.$Shape} AnalyzeProjectStreamResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse &
          sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.$Shape;

        /**
         * Verifies an AnalyzeProjectStreamResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates an AnalyzeProjectStreamResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns AnalyzeProjectStreamResponse
         */
        static fromObject(object: {
          [k: string]: any;
        }): sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse;

        /**
         * Creates a plain object from an AnalyzeProjectStreamResponse message. Also converts values to other types if specified.
         * @param message AnalyzeProjectStreamResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this AnalyzeProjectStreamResponse to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for AnalyzeProjectStreamResponse
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace AnalyzeProjectStreamResponse {
        /** Properties of an AnalyzeProjectStreamResponse. */
        interface $Properties {
          /** AnalyzeProjectStreamResponse fileResult */
          fileResult?: sonarjs.analyzeproject.v1.FileResultMessage.$Properties | null;

          /** AnalyzeProjectStreamResponse meta */
          meta?: sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Properties | null;

          /** AnalyzeProjectStreamResponse cancelled */
          cancelled?: google.protobuf.Empty.$Properties | null;

          /** AnalyzeProjectStreamResponse message */
          message?: 'fileResult' | 'meta' | 'cancelled';

          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Narrowed shape of an AnalyzeProjectStreamResponse. */
        type $Shape = {
          fileResult?: sonarjs.analyzeproject.v1.FileResultMessage.$Shape | null;
          meta?: sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Shape | null;
          cancelled?: google.protobuf.Empty.$Shape | null;
          $unknowns?: Uint8Array[];
        } & (
          | { message?: undefined; fileResult?: null; meta?: null; cancelled?: null }
          | {
              message?: 'fileResult';
              fileResult: sonarjs.analyzeproject.v1.FileResultMessage.$Shape;
              meta?: null;
              cancelled?: null;
            }
          | {
              message?: 'meta';
              fileResult?: null;
              meta: sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Shape;
              cancelled?: null;
            }
          | {
              message?: 'cancelled';
              fileResult?: null;
              meta?: null;
              cancelled: google.protobuf.Empty.$Shape;
            }
        );
      }

      /**
       * Properties of an AnalyzeProjectUnaryResponse.
       * @deprecated Use sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.$Properties instead.
       */
      interface IAnalyzeProjectUnaryResponse
        extends sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.$Properties {}

      /** Represents an AnalyzeProjectUnaryResponse. */
      class AnalyzeProjectUnaryResponse {
        /**
         * Constructs a new AnalyzeProjectUnaryResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /** AnalyzeProjectUnaryResponse files. */
        files: { [k: string]: sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Properties };

        /** AnalyzeProjectUnaryResponse meta. */
        meta?: sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Properties | null;

        /**
         * Creates a new AnalyzeProjectUnaryResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns AnalyzeProjectUnaryResponse instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.$Shape,
        ): sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse &
          sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.$Properties,
        ): sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse;

        /**
         * Encodes the specified AnalyzeProjectUnaryResponse message. Does not implicitly {@link sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.verify|verify} messages.
         * @param message AnalyzeProjectUnaryResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified AnalyzeProjectUnaryResponse message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.verify|verify} messages.
         * @param message AnalyzeProjectUnaryResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes an AnalyzeProjectUnaryResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse & sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.$Shape} AnalyzeProjectUnaryResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse &
          sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.$Shape;

        /**
         * Decodes an AnalyzeProjectUnaryResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse & sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.$Shape} AnalyzeProjectUnaryResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse &
          sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.$Shape;

        /**
         * Verifies an AnalyzeProjectUnaryResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates an AnalyzeProjectUnaryResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns AnalyzeProjectUnaryResponse
         */
        static fromObject(object: {
          [k: string]: any;
        }): sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse;

        /**
         * Creates a plain object from an AnalyzeProjectUnaryResponse message. Also converts values to other types if specified.
         * @param message AnalyzeProjectUnaryResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this AnalyzeProjectUnaryResponse to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for AnalyzeProjectUnaryResponse
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace AnalyzeProjectUnaryResponse {
        /** Properties of an AnalyzeProjectUnaryResponse. */
        interface $Properties {
          /** AnalyzeProjectUnaryResponse files */
          files?: {
            [k: string]: sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Properties;
          } | null;

          /** AnalyzeProjectUnaryResponse meta */
          meta?: sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Properties | null;

          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of an AnalyzeProjectUnaryResponse. */
        type $Shape = sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.$Properties;
      }

      /**
       * Properties of a CancelAnalysisRequest.
       * @deprecated Use sonarjs.analyzeproject.v1.CancelAnalysisRequest.$Properties instead.
       */
      interface ICancelAnalysisRequest
        extends sonarjs.analyzeproject.v1.CancelAnalysisRequest.$Properties {}

      /** Represents a CancelAnalysisRequest. */
      class CancelAnalysisRequest {
        /**
         * Constructs a new CancelAnalysisRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.CancelAnalysisRequest.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /**
         * Creates a new CancelAnalysisRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns CancelAnalysisRequest instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.CancelAnalysisRequest.$Shape,
        ): sonarjs.analyzeproject.v1.CancelAnalysisRequest &
          sonarjs.analyzeproject.v1.CancelAnalysisRequest.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.CancelAnalysisRequest.$Properties,
        ): sonarjs.analyzeproject.v1.CancelAnalysisRequest;

        /**
         * Encodes the specified CancelAnalysisRequest message. Does not implicitly {@link sonarjs.analyzeproject.v1.CancelAnalysisRequest.verify|verify} messages.
         * @param message CancelAnalysisRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.CancelAnalysisRequest.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified CancelAnalysisRequest message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.CancelAnalysisRequest.verify|verify} messages.
         * @param message CancelAnalysisRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.CancelAnalysisRequest.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes a CancelAnalysisRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.CancelAnalysisRequest & sonarjs.analyzeproject.v1.CancelAnalysisRequest.$Shape} CancelAnalysisRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.CancelAnalysisRequest &
          sonarjs.analyzeproject.v1.CancelAnalysisRequest.$Shape;

        /**
         * Decodes a CancelAnalysisRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.CancelAnalysisRequest & sonarjs.analyzeproject.v1.CancelAnalysisRequest.$Shape} CancelAnalysisRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.CancelAnalysisRequest &
          sonarjs.analyzeproject.v1.CancelAnalysisRequest.$Shape;

        /**
         * Verifies a CancelAnalysisRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates a CancelAnalysisRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns CancelAnalysisRequest
         */
        static fromObject(object: {
          [k: string]: any;
        }): sonarjs.analyzeproject.v1.CancelAnalysisRequest;

        /**
         * Creates a plain object from a CancelAnalysisRequest message. Also converts values to other types if specified.
         * @param message CancelAnalysisRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.CancelAnalysisRequest,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this CancelAnalysisRequest to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for CancelAnalysisRequest
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace CancelAnalysisRequest {
        /** Properties of a CancelAnalysisRequest. */
        interface $Properties {
          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of a CancelAnalysisRequest. */
        type $Shape = sonarjs.analyzeproject.v1.CancelAnalysisRequest.$Properties;
      }

      /**
       * Properties of a CancelAnalysisResponse.
       * @deprecated Use sonarjs.analyzeproject.v1.CancelAnalysisResponse.$Properties instead.
       */
      interface ICancelAnalysisResponse
        extends sonarjs.analyzeproject.v1.CancelAnalysisResponse.$Properties {}

      /** Represents a CancelAnalysisResponse. */
      class CancelAnalysisResponse {
        /**
         * Constructs a new CancelAnalysisResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.CancelAnalysisResponse.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /** CancelAnalysisResponse cancelled. */
        cancelled: boolean;

        /**
         * Creates a new CancelAnalysisResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns CancelAnalysisResponse instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.CancelAnalysisResponse.$Shape,
        ): sonarjs.analyzeproject.v1.CancelAnalysisResponse &
          sonarjs.analyzeproject.v1.CancelAnalysisResponse.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.CancelAnalysisResponse.$Properties,
        ): sonarjs.analyzeproject.v1.CancelAnalysisResponse;

        /**
         * Encodes the specified CancelAnalysisResponse message. Does not implicitly {@link sonarjs.analyzeproject.v1.CancelAnalysisResponse.verify|verify} messages.
         * @param message CancelAnalysisResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.CancelAnalysisResponse.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified CancelAnalysisResponse message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.CancelAnalysisResponse.verify|verify} messages.
         * @param message CancelAnalysisResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.CancelAnalysisResponse.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes a CancelAnalysisResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.CancelAnalysisResponse & sonarjs.analyzeproject.v1.CancelAnalysisResponse.$Shape} CancelAnalysisResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.CancelAnalysisResponse &
          sonarjs.analyzeproject.v1.CancelAnalysisResponse.$Shape;

        /**
         * Decodes a CancelAnalysisResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.CancelAnalysisResponse & sonarjs.analyzeproject.v1.CancelAnalysisResponse.$Shape} CancelAnalysisResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.CancelAnalysisResponse &
          sonarjs.analyzeproject.v1.CancelAnalysisResponse.$Shape;

        /**
         * Verifies a CancelAnalysisResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates a CancelAnalysisResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns CancelAnalysisResponse
         */
        static fromObject(object: {
          [k: string]: any;
        }): sonarjs.analyzeproject.v1.CancelAnalysisResponse;

        /**
         * Creates a plain object from a CancelAnalysisResponse message. Also converts values to other types if specified.
         * @param message CancelAnalysisResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.CancelAnalysisResponse,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this CancelAnalysisResponse to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for CancelAnalysisResponse
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace CancelAnalysisResponse {
        /** Properties of a CancelAnalysisResponse. */
        interface $Properties {
          /** CancelAnalysisResponse cancelled */
          cancelled?: boolean | null;

          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of a CancelAnalysisResponse. */
        type $Shape = sonarjs.analyzeproject.v1.CancelAnalysisResponse.$Properties;
      }

      /**
       * Properties of a LeaseRequest.
       * @deprecated Use sonarjs.analyzeproject.v1.LeaseRequest.$Properties instead.
       */
      interface ILeaseRequest extends sonarjs.analyzeproject.v1.LeaseRequest.$Properties {}

      /** Represents a LeaseRequest. */
      class LeaseRequest {
        /**
         * Constructs a new LeaseRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.LeaseRequest.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /**
         * Creates a new LeaseRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns LeaseRequest instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.LeaseRequest.$Shape,
        ): sonarjs.analyzeproject.v1.LeaseRequest & sonarjs.analyzeproject.v1.LeaseRequest.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.LeaseRequest.$Properties,
        ): sonarjs.analyzeproject.v1.LeaseRequest;

        /**
         * Encodes the specified LeaseRequest message. Does not implicitly {@link sonarjs.analyzeproject.v1.LeaseRequest.verify|verify} messages.
         * @param message LeaseRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.LeaseRequest.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified LeaseRequest message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.LeaseRequest.verify|verify} messages.
         * @param message LeaseRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.LeaseRequest.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes a LeaseRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.LeaseRequest & sonarjs.analyzeproject.v1.LeaseRequest.$Shape} LeaseRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.LeaseRequest & sonarjs.analyzeproject.v1.LeaseRequest.$Shape;

        /**
         * Decodes a LeaseRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.LeaseRequest & sonarjs.analyzeproject.v1.LeaseRequest.$Shape} LeaseRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.LeaseRequest & sonarjs.analyzeproject.v1.LeaseRequest.$Shape;

        /**
         * Verifies a LeaseRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates a LeaseRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns LeaseRequest
         */
        static fromObject(object: { [k: string]: any }): sonarjs.analyzeproject.v1.LeaseRequest;

        /**
         * Creates a plain object from a LeaseRequest message. Also converts values to other types if specified.
         * @param message LeaseRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.LeaseRequest,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this LeaseRequest to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for LeaseRequest
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace LeaseRequest {
        /** Properties of a LeaseRequest. */
        interface $Properties {
          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of a LeaseRequest. */
        type $Shape = sonarjs.analyzeproject.v1.LeaseRequest.$Properties;
      }

      /**
       * Properties of a LeaseResponse.
       * @deprecated Use sonarjs.analyzeproject.v1.LeaseResponse.$Properties instead.
       */
      interface ILeaseResponse extends sonarjs.analyzeproject.v1.LeaseResponse.$Properties {}

      /** Represents a LeaseResponse. */
      class LeaseResponse {
        /**
         * Constructs a new LeaseResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.LeaseResponse.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /**
         * Creates a new LeaseResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns LeaseResponse instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.LeaseResponse.$Shape,
        ): sonarjs.analyzeproject.v1.LeaseResponse & sonarjs.analyzeproject.v1.LeaseResponse.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.LeaseResponse.$Properties,
        ): sonarjs.analyzeproject.v1.LeaseResponse;

        /**
         * Encodes the specified LeaseResponse message. Does not implicitly {@link sonarjs.analyzeproject.v1.LeaseResponse.verify|verify} messages.
         * @param message LeaseResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.LeaseResponse.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified LeaseResponse message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.LeaseResponse.verify|verify} messages.
         * @param message LeaseResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.LeaseResponse.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes a LeaseResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.LeaseResponse & sonarjs.analyzeproject.v1.LeaseResponse.$Shape} LeaseResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.LeaseResponse & sonarjs.analyzeproject.v1.LeaseResponse.$Shape;

        /**
         * Decodes a LeaseResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.LeaseResponse & sonarjs.analyzeproject.v1.LeaseResponse.$Shape} LeaseResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.LeaseResponse & sonarjs.analyzeproject.v1.LeaseResponse.$Shape;

        /**
         * Verifies a LeaseResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates a LeaseResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns LeaseResponse
         */
        static fromObject(object: { [k: string]: any }): sonarjs.analyzeproject.v1.LeaseResponse;

        /**
         * Creates a plain object from a LeaseResponse message. Also converts values to other types if specified.
         * @param message LeaseResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.LeaseResponse,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this LeaseResponse to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for LeaseResponse
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace LeaseResponse {
        /** Properties of a LeaseResponse. */
        interface $Properties {
          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of a LeaseResponse. */
        type $Shape = sonarjs.analyzeproject.v1.LeaseResponse.$Properties;
      }

      /**
       * Properties of a ProjectConfiguration.
       * @deprecated Use sonarjs.analyzeproject.v1.ProjectConfiguration.$Properties instead.
       */
      interface IProjectConfiguration
        extends sonarjs.analyzeproject.v1.ProjectConfiguration.$Properties {}

      /** Represents a ProjectConfiguration. */
      class ProjectConfiguration {
        /**
         * Constructs a new ProjectConfiguration.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.ProjectConfiguration.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /** ProjectConfiguration baseDir. */
        baseDir: string;

        /** ProjectConfiguration sonarlint. */
        sonarlint?: boolean | null;

        /** ProjectConfiguration fsEvents. */
        fsEvents: string[];

        /** ProjectConfiguration allowTsParserJsFiles. */
        allowTsParserJsFiles?: boolean | null;

        /** ProjectConfiguration analysisMode. */
        analysisMode: sonarjs.analyzeproject.v1.AnalysisMode;

        /** ProjectConfiguration skipAst. */
        skipAst?: boolean | null;

        /** ProjectConfiguration ignoreHeaderComments. */
        ignoreHeaderComments?: boolean | null;

        /** ProjectConfiguration maxFileSize. */
        maxFileSize?: number | Long | null;

        /** ProjectConfiguration environments. */
        environments?: sonarjs.analyzeproject.v1.StringList.$Properties | null;

        /** ProjectConfiguration globals. */
        globals?: sonarjs.analyzeproject.v1.StringList.$Properties | null;

        /** ProjectConfiguration tsSuffixes. */
        tsSuffixes?: sonarjs.analyzeproject.v1.StringList.$Properties | null;

        /** ProjectConfiguration jsSuffixes. */
        jsSuffixes?: sonarjs.analyzeproject.v1.StringList.$Properties | null;

        /** ProjectConfiguration cssSuffixes. */
        cssSuffixes?: sonarjs.analyzeproject.v1.StringList.$Properties | null;

        /** ProjectConfiguration htmlSuffixes. */
        htmlSuffixes?: sonarjs.analyzeproject.v1.StringList.$Properties | null;

        /** ProjectConfiguration yamlSuffixes. */
        yamlSuffixes?: sonarjs.analyzeproject.v1.StringList.$Properties | null;

        /** ProjectConfiguration cssAdditionalSuffixes. */
        cssAdditionalSuffixes?: sonarjs.analyzeproject.v1.StringList.$Properties | null;

        /** ProjectConfiguration tsConfigPaths. */
        tsConfigPaths: string[];

        /** ProjectConfiguration jsTsExclusions. */
        jsTsExclusions?: sonarjs.analyzeproject.v1.StringList.$Properties | null;

        /** ProjectConfiguration sources. */
        sources: string[];

        /** ProjectConfiguration inclusions. */
        inclusions: string[];

        /** ProjectConfiguration exclusions. */
        exclusions: string[];

        /** ProjectConfiguration tests. */
        tests: string[];

        /** ProjectConfiguration testInclusions. */
        testInclusions: string[];

        /** ProjectConfiguration testExclusions. */
        testExclusions: string[];

        /** ProjectConfiguration detectBundles. */
        detectBundles?: boolean | null;

        /** ProjectConfiguration canAccessFileSystem. */
        canAccessFileSystem?: boolean | null;

        /** ProjectConfiguration createTsProgramForOrphanFiles. */
        createTsProgramForOrphanFiles?: boolean | null;

        /** ProjectConfiguration disableTypeChecking. */
        disableTypeChecking?: boolean | null;

        /** ProjectConfiguration skipNodeModuleLookupOutsideBaseDir. */
        skipNodeModuleLookupOutsideBaseDir?: boolean | null;

        /** ProjectConfiguration ecmaScriptVersion. */
        ecmaScriptVersion?: string | null;

        /** ProjectConfiguration clearDependenciesCache. */
        clearDependenciesCache?: boolean | null;

        /** ProjectConfiguration clearTsConfigCache. */
        clearTsConfigCache?: boolean | null;

        /** ProjectConfiguration reportNclocForTestFiles. */
        reportNclocForTestFiles?: boolean | null;

        /** ProjectConfiguration detectGeneratedCode. */
        detectGeneratedCode?: boolean | null;

        /**
         * Creates a new ProjectConfiguration instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ProjectConfiguration instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.ProjectConfiguration.$Shape,
        ): sonarjs.analyzeproject.v1.ProjectConfiguration &
          sonarjs.analyzeproject.v1.ProjectConfiguration.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.ProjectConfiguration.$Properties,
        ): sonarjs.analyzeproject.v1.ProjectConfiguration;

        /**
         * Encodes the specified ProjectConfiguration message. Does not implicitly {@link sonarjs.analyzeproject.v1.ProjectConfiguration.verify|verify} messages.
         * @param message ProjectConfiguration message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.ProjectConfiguration.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified ProjectConfiguration message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.ProjectConfiguration.verify|verify} messages.
         * @param message ProjectConfiguration message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.ProjectConfiguration.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes a ProjectConfiguration message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.ProjectConfiguration & sonarjs.analyzeproject.v1.ProjectConfiguration.$Shape} ProjectConfiguration
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.ProjectConfiguration &
          sonarjs.analyzeproject.v1.ProjectConfiguration.$Shape;

        /**
         * Decodes a ProjectConfiguration message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.ProjectConfiguration & sonarjs.analyzeproject.v1.ProjectConfiguration.$Shape} ProjectConfiguration
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.ProjectConfiguration &
          sonarjs.analyzeproject.v1.ProjectConfiguration.$Shape;

        /**
         * Verifies a ProjectConfiguration message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates a ProjectConfiguration message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ProjectConfiguration
         */
        static fromObject(object: {
          [k: string]: any;
        }): sonarjs.analyzeproject.v1.ProjectConfiguration;

        /**
         * Creates a plain object from a ProjectConfiguration message. Also converts values to other types if specified.
         * @param message ProjectConfiguration
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.ProjectConfiguration,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this ProjectConfiguration to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for ProjectConfiguration
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace ProjectConfiguration {
        /** Properties of a ProjectConfiguration. */
        interface $Properties {
          /** ProjectConfiguration baseDir */
          baseDir?: string | null;

          /** ProjectConfiguration sonarlint */
          sonarlint?: boolean | null;

          /** ProjectConfiguration fsEvents */
          fsEvents?: string[] | null;

          /** ProjectConfiguration allowTsParserJsFiles */
          allowTsParserJsFiles?: boolean | null;

          /** ProjectConfiguration analysisMode */
          analysisMode?: sonarjs.analyzeproject.v1.AnalysisMode | null;

          /** ProjectConfiguration skipAst */
          skipAst?: boolean | null;

          /** ProjectConfiguration ignoreHeaderComments */
          ignoreHeaderComments?: boolean | null;

          /** ProjectConfiguration maxFileSize */
          maxFileSize?: number | Long | null;

          /** ProjectConfiguration environments */
          environments?: sonarjs.analyzeproject.v1.StringList.$Properties | null;

          /** ProjectConfiguration globals */
          globals?: sonarjs.analyzeproject.v1.StringList.$Properties | null;

          /** ProjectConfiguration tsSuffixes */
          tsSuffixes?: sonarjs.analyzeproject.v1.StringList.$Properties | null;

          /** ProjectConfiguration jsSuffixes */
          jsSuffixes?: sonarjs.analyzeproject.v1.StringList.$Properties | null;

          /** ProjectConfiguration cssSuffixes */
          cssSuffixes?: sonarjs.analyzeproject.v1.StringList.$Properties | null;

          /** ProjectConfiguration htmlSuffixes */
          htmlSuffixes?: sonarjs.analyzeproject.v1.StringList.$Properties | null;

          /** ProjectConfiguration yamlSuffixes */
          yamlSuffixes?: sonarjs.analyzeproject.v1.StringList.$Properties | null;

          /** ProjectConfiguration cssAdditionalSuffixes */
          cssAdditionalSuffixes?: sonarjs.analyzeproject.v1.StringList.$Properties | null;

          /** ProjectConfiguration tsConfigPaths */
          tsConfigPaths?: string[] | null;

          /** ProjectConfiguration jsTsExclusions */
          jsTsExclusions?: sonarjs.analyzeproject.v1.StringList.$Properties | null;

          /** ProjectConfiguration sources */
          sources?: string[] | null;

          /** ProjectConfiguration inclusions */
          inclusions?: string[] | null;

          /** ProjectConfiguration exclusions */
          exclusions?: string[] | null;

          /** ProjectConfiguration tests */
          tests?: string[] | null;

          /** ProjectConfiguration testInclusions */
          testInclusions?: string[] | null;

          /** ProjectConfiguration testExclusions */
          testExclusions?: string[] | null;

          /** ProjectConfiguration detectBundles */
          detectBundles?: boolean | null;

          /** ProjectConfiguration canAccessFileSystem */
          canAccessFileSystem?: boolean | null;

          /** ProjectConfiguration createTsProgramForOrphanFiles */
          createTsProgramForOrphanFiles?: boolean | null;

          /** ProjectConfiguration disableTypeChecking */
          disableTypeChecking?: boolean | null;

          /** ProjectConfiguration skipNodeModuleLookupOutsideBaseDir */
          skipNodeModuleLookupOutsideBaseDir?: boolean | null;

          /** ProjectConfiguration ecmaScriptVersion */
          ecmaScriptVersion?: string | null;

          /** ProjectConfiguration clearDependenciesCache */
          clearDependenciesCache?: boolean | null;

          /** ProjectConfiguration clearTsConfigCache */
          clearTsConfigCache?: boolean | null;

          /** ProjectConfiguration reportNclocForTestFiles */
          reportNclocForTestFiles?: boolean | null;

          /** ProjectConfiguration detectGeneratedCode */
          detectGeneratedCode?: boolean | null;

          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of a ProjectConfiguration. */
        type $Shape = sonarjs.analyzeproject.v1.ProjectConfiguration.$Properties;
      }

      /**
       * Properties of a StringList.
       * @deprecated Use sonarjs.analyzeproject.v1.StringList.$Properties instead.
       */
      interface IStringList extends sonarjs.analyzeproject.v1.StringList.$Properties {}

      /** Represents a StringList. */
      class StringList {
        /**
         * Constructs a new StringList.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.StringList.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /** StringList values. */
        values: string[];

        /**
         * Creates a new StringList instance using the specified properties.
         * @param [properties] Properties to set
         * @returns StringList instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.StringList.$Shape,
        ): sonarjs.analyzeproject.v1.StringList & sonarjs.analyzeproject.v1.StringList.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.StringList.$Properties,
        ): sonarjs.analyzeproject.v1.StringList;

        /**
         * Encodes the specified StringList message. Does not implicitly {@link sonarjs.analyzeproject.v1.StringList.verify|verify} messages.
         * @param message StringList message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.StringList.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified StringList message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.StringList.verify|verify} messages.
         * @param message StringList message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.StringList.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes a StringList message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.StringList & sonarjs.analyzeproject.v1.StringList.$Shape} StringList
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.StringList & sonarjs.analyzeproject.v1.StringList.$Shape;

        /**
         * Decodes a StringList message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.StringList & sonarjs.analyzeproject.v1.StringList.$Shape} StringList
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.StringList & sonarjs.analyzeproject.v1.StringList.$Shape;

        /**
         * Verifies a StringList message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates a StringList message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns StringList
         */
        static fromObject(object: { [k: string]: any }): sonarjs.analyzeproject.v1.StringList;

        /**
         * Creates a plain object from a StringList message. Also converts values to other types if specified.
         * @param message StringList
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.StringList,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this StringList to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for StringList
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace StringList {
        /** Properties of a StringList. */
        interface $Properties {
          /** StringList values */
          values?: string[] | null;

          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of a StringList. */
        type $Shape = sonarjs.analyzeproject.v1.StringList.$Properties;
      }

      /**
       * Properties of a ProjectFileInput.
       * @deprecated Use sonarjs.analyzeproject.v1.ProjectFileInput.$Properties instead.
       */
      interface IProjectFileInput extends sonarjs.analyzeproject.v1.ProjectFileInput.$Properties {}

      /** Represents a ProjectFileInput. */
      class ProjectFileInput {
        /**
         * Constructs a new ProjectFileInput.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.ProjectFileInput.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /** ProjectFileInput fileContent. */
        fileContent?: string | null;

        /** ProjectFileInput fileType. */
        fileType: sonarjs.analyzeproject.v1.FileType;

        /** ProjectFileInput fileStatus. */
        fileStatus: sonarjs.analyzeproject.v1.FileStatus;

        /**
         * Creates a new ProjectFileInput instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ProjectFileInput instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.ProjectFileInput.$Shape,
        ): sonarjs.analyzeproject.v1.ProjectFileInput &
          sonarjs.analyzeproject.v1.ProjectFileInput.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.ProjectFileInput.$Properties,
        ): sonarjs.analyzeproject.v1.ProjectFileInput;

        /**
         * Encodes the specified ProjectFileInput message. Does not implicitly {@link sonarjs.analyzeproject.v1.ProjectFileInput.verify|verify} messages.
         * @param message ProjectFileInput message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.ProjectFileInput.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified ProjectFileInput message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.ProjectFileInput.verify|verify} messages.
         * @param message ProjectFileInput message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.ProjectFileInput.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes a ProjectFileInput message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.ProjectFileInput & sonarjs.analyzeproject.v1.ProjectFileInput.$Shape} ProjectFileInput
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.ProjectFileInput &
          sonarjs.analyzeproject.v1.ProjectFileInput.$Shape;

        /**
         * Decodes a ProjectFileInput message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.ProjectFileInput & sonarjs.analyzeproject.v1.ProjectFileInput.$Shape} ProjectFileInput
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.ProjectFileInput &
          sonarjs.analyzeproject.v1.ProjectFileInput.$Shape;

        /**
         * Verifies a ProjectFileInput message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates a ProjectFileInput message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ProjectFileInput
         */
        static fromObject(object: { [k: string]: any }): sonarjs.analyzeproject.v1.ProjectFileInput;

        /**
         * Creates a plain object from a ProjectFileInput message. Also converts values to other types if specified.
         * @param message ProjectFileInput
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.ProjectFileInput,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this ProjectFileInput to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for ProjectFileInput
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace ProjectFileInput {
        /** Properties of a ProjectFileInput. */
        interface $Properties {
          /** ProjectFileInput fileContent */
          fileContent?: string | null;

          /** ProjectFileInput fileType */
          fileType?: sonarjs.analyzeproject.v1.FileType | null;

          /** ProjectFileInput fileStatus */
          fileStatus?: sonarjs.analyzeproject.v1.FileStatus | null;

          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of a ProjectFileInput. */
        type $Shape = sonarjs.analyzeproject.v1.ProjectFileInput.$Properties;
      }

      /** FileType enum. */
      enum FileType {
        /** FILE_TYPE_UNSPECIFIED value */
        FILE_TYPE_UNSPECIFIED = 0,

        /** FILE_TYPE_MAIN value */
        FILE_TYPE_MAIN = 1,

        /** FILE_TYPE_TEST value */
        FILE_TYPE_TEST = 2,
      }

      /** FileStatus enum. */
      enum FileStatus {
        /** FILE_STATUS_UNSPECIFIED value */
        FILE_STATUS_UNSPECIFIED = 0,

        /** FILE_STATUS_SAME value */
        FILE_STATUS_SAME = 1,

        /** FILE_STATUS_CHANGED value */
        FILE_STATUS_CHANGED = 2,

        /** FILE_STATUS_ADDED value */
        FILE_STATUS_ADDED = 3,
      }

      /** AnalysisMode enum. */
      enum AnalysisMode {
        /** ANALYSIS_MODE_UNSPECIFIED value */
        ANALYSIS_MODE_UNSPECIFIED = 0,

        /** ANALYSIS_MODE_DEFAULT value */
        ANALYSIS_MODE_DEFAULT = 1,

        /** ANALYSIS_MODE_SKIP_UNCHANGED value */
        ANALYSIS_MODE_SKIP_UNCHANGED = 2,
      }

      /** JsTsLanguage enum. */
      enum JsTsLanguage {
        /** JS_TS_LANGUAGE_UNSPECIFIED value */
        JS_TS_LANGUAGE_UNSPECIFIED = 0,

        /** JS_TS_LANGUAGE_JS value */
        JS_TS_LANGUAGE_JS = 1,

        /** JS_TS_LANGUAGE_TS value */
        JS_TS_LANGUAGE_TS = 2,
      }

      /** AnalysisLanguage enum. */
      enum AnalysisLanguage {
        /** ANALYSIS_LANGUAGE_UNSPECIFIED value */
        ANALYSIS_LANGUAGE_UNSPECIFIED = 0,

        /** ANALYSIS_LANGUAGE_JS value */
        ANALYSIS_LANGUAGE_JS = 1,

        /** ANALYSIS_LANGUAGE_TS value */
        ANALYSIS_LANGUAGE_TS = 2,

        /** ANALYSIS_LANGUAGE_CSS value */
        ANALYSIS_LANGUAGE_CSS = 3,
      }

      /** ParsingErrorCode enum. */
      enum ParsingErrorCode {
        /** PARSING_ERROR_CODE_UNSPECIFIED value */
        PARSING_ERROR_CODE_UNSPECIFIED = 0,

        /** PARSING_ERROR_CODE_PARSING value */
        PARSING_ERROR_CODE_PARSING = 1,

        /** PARSING_ERROR_CODE_FAILING_TYPESCRIPT value */
        PARSING_ERROR_CODE_FAILING_TYPESCRIPT = 2,

        /** PARSING_ERROR_CODE_LINTER_INITIALIZATION value */
        PARSING_ERROR_CODE_LINTER_INITIALIZATION = 3,
      }

      /** TextType enum. */
      enum TextType {
        /** TEXT_TYPE_UNSPECIFIED value */
        TEXT_TYPE_UNSPECIFIED = 0,

        /** TEXT_TYPE_CONSTANT value */
        TEXT_TYPE_CONSTANT = 1,

        /** TEXT_TYPE_COMMENT value */
        TEXT_TYPE_COMMENT = 2,

        /** TEXT_TYPE_STRUCTURED_COMMENT value */
        TEXT_TYPE_STRUCTURED_COMMENT = 3,

        /** TEXT_TYPE_KEYWORD value */
        TEXT_TYPE_KEYWORD = 4,

        /** TEXT_TYPE_STRING value */
        TEXT_TYPE_STRING = 5,
      }

      /**
       * Properties of a JsTsRule.
       * @deprecated Use sonarjs.analyzeproject.v1.JsTsRule.$Properties instead.
       */
      interface IJsTsRule extends sonarjs.analyzeproject.v1.JsTsRule.$Properties {}

      /** Represents a JsTsRule. */
      class JsTsRule {
        /**
         * Constructs a new JsTsRule.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.JsTsRule.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /** JsTsRule key. */
        key: string;

        /** JsTsRule configurations. */
        configurations: google.protobuf.Value.$Properties[];

        /** JsTsRule fileTypeTargets. */
        fileTypeTargets: sonarjs.analyzeproject.v1.FileType[];

        /** JsTsRule language. */
        language: sonarjs.analyzeproject.v1.JsTsLanguage;

        /** JsTsRule analysisModes. */
        analysisModes: sonarjs.analyzeproject.v1.AnalysisMode[];

        /** JsTsRule blacklistedExtensions. */
        blacklistedExtensions: string[];

        /**
         * Creates a new JsTsRule instance using the specified properties.
         * @param [properties] Properties to set
         * @returns JsTsRule instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.JsTsRule.$Shape,
        ): sonarjs.analyzeproject.v1.JsTsRule & sonarjs.analyzeproject.v1.JsTsRule.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.JsTsRule.$Properties,
        ): sonarjs.analyzeproject.v1.JsTsRule;

        /**
         * Encodes the specified JsTsRule message. Does not implicitly {@link sonarjs.analyzeproject.v1.JsTsRule.verify|verify} messages.
         * @param message JsTsRule message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.JsTsRule.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified JsTsRule message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.JsTsRule.verify|verify} messages.
         * @param message JsTsRule message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.JsTsRule.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes a JsTsRule message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.JsTsRule & sonarjs.analyzeproject.v1.JsTsRule.$Shape} JsTsRule
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.JsTsRule & sonarjs.analyzeproject.v1.JsTsRule.$Shape;

        /**
         * Decodes a JsTsRule message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.JsTsRule & sonarjs.analyzeproject.v1.JsTsRule.$Shape} JsTsRule
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.JsTsRule & sonarjs.analyzeproject.v1.JsTsRule.$Shape;

        /**
         * Verifies a JsTsRule message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates a JsTsRule message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns JsTsRule
         */
        static fromObject(object: { [k: string]: any }): sonarjs.analyzeproject.v1.JsTsRule;

        /**
         * Creates a plain object from a JsTsRule message. Also converts values to other types if specified.
         * @param message JsTsRule
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.JsTsRule,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this JsTsRule to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for JsTsRule
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace JsTsRule {
        /** Properties of a JsTsRule. */
        interface $Properties {
          /** JsTsRule key */
          key?: string | null;

          /** JsTsRule configurations */
          configurations?: google.protobuf.Value.$Properties[] | null;

          /** JsTsRule fileTypeTargets */
          fileTypeTargets?: sonarjs.analyzeproject.v1.FileType[] | null;

          /** JsTsRule language */
          language?: sonarjs.analyzeproject.v1.JsTsLanguage | null;

          /** JsTsRule analysisModes */
          analysisModes?: sonarjs.analyzeproject.v1.AnalysisMode[] | null;

          /** JsTsRule blacklistedExtensions */
          blacklistedExtensions?: string[] | null;

          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of a JsTsRule. */
        type $Shape = {
          key?: string | null;
          configurations?: google.protobuf.Value.$Shape[] | null;
          fileTypeTargets?: sonarjs.analyzeproject.v1.FileType[] | null;
          language?: sonarjs.analyzeproject.v1.JsTsLanguage | null;
          analysisModes?: sonarjs.analyzeproject.v1.AnalysisMode[] | null;
          blacklistedExtensions?: string[] | null;
          $unknowns?: Uint8Array[];
        };
      }

      /**
       * Properties of a CssRule.
       * @deprecated Use sonarjs.analyzeproject.v1.CssRule.$Properties instead.
       */
      interface ICssRule extends sonarjs.analyzeproject.v1.CssRule.$Properties {}

      /** Represents a CssRule. */
      class CssRule {
        /**
         * Constructs a new CssRule.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.CssRule.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /** CssRule key. */
        key: string;

        /** CssRule configurations. */
        configurations: google.protobuf.Value.$Properties[];

        /**
         * Creates a new CssRule instance using the specified properties.
         * @param [properties] Properties to set
         * @returns CssRule instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.CssRule.$Shape,
        ): sonarjs.analyzeproject.v1.CssRule & sonarjs.analyzeproject.v1.CssRule.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.CssRule.$Properties,
        ): sonarjs.analyzeproject.v1.CssRule;

        /**
         * Encodes the specified CssRule message. Does not implicitly {@link sonarjs.analyzeproject.v1.CssRule.verify|verify} messages.
         * @param message CssRule message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.CssRule.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified CssRule message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.CssRule.verify|verify} messages.
         * @param message CssRule message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.CssRule.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes a CssRule message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.CssRule & sonarjs.analyzeproject.v1.CssRule.$Shape} CssRule
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.CssRule & sonarjs.analyzeproject.v1.CssRule.$Shape;

        /**
         * Decodes a CssRule message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.CssRule & sonarjs.analyzeproject.v1.CssRule.$Shape} CssRule
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.CssRule & sonarjs.analyzeproject.v1.CssRule.$Shape;

        /**
         * Verifies a CssRule message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates a CssRule message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns CssRule
         */
        static fromObject(object: { [k: string]: any }): sonarjs.analyzeproject.v1.CssRule;

        /**
         * Creates a plain object from a CssRule message. Also converts values to other types if specified.
         * @param message CssRule
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.CssRule,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this CssRule to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for CssRule
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace CssRule {
        /** Properties of a CssRule. */
        interface $Properties {
          /** CssRule key */
          key?: string | null;

          /** CssRule configurations */
          configurations?: google.protobuf.Value.$Properties[] | null;

          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of a CssRule. */
        type $Shape = {
          key?: string | null;
          configurations?: google.protobuf.Value.$Shape[] | null;
          $unknowns?: Uint8Array[];
        };
      }

      /**
       * Properties of a FileResultMessage.
       * @deprecated Use sonarjs.analyzeproject.v1.FileResultMessage.$Properties instead.
       */
      interface IFileResultMessage
        extends sonarjs.analyzeproject.v1.FileResultMessage.$Properties {}

      /** Represents a FileResultMessage. */
      class FileResultMessage {
        /**
         * Constructs a new FileResultMessage.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.FileResultMessage.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /** FileResultMessage filePath. */
        filePath: string;

        /** FileResultMessage result. */
        result?: sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Properties | null;

        /**
         * Creates a new FileResultMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns FileResultMessage instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.FileResultMessage.$Shape,
        ): sonarjs.analyzeproject.v1.FileResultMessage &
          sonarjs.analyzeproject.v1.FileResultMessage.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.FileResultMessage.$Properties,
        ): sonarjs.analyzeproject.v1.FileResultMessage;

        /**
         * Encodes the specified FileResultMessage message. Does not implicitly {@link sonarjs.analyzeproject.v1.FileResultMessage.verify|verify} messages.
         * @param message FileResultMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.FileResultMessage.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified FileResultMessage message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.FileResultMessage.verify|verify} messages.
         * @param message FileResultMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.FileResultMessage.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes a FileResultMessage message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.FileResultMessage & sonarjs.analyzeproject.v1.FileResultMessage.$Shape} FileResultMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.FileResultMessage &
          sonarjs.analyzeproject.v1.FileResultMessage.$Shape;

        /**
         * Decodes a FileResultMessage message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.FileResultMessage & sonarjs.analyzeproject.v1.FileResultMessage.$Shape} FileResultMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.FileResultMessage &
          sonarjs.analyzeproject.v1.FileResultMessage.$Shape;

        /**
         * Verifies a FileResultMessage message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates a FileResultMessage message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns FileResultMessage
         */
        static fromObject(object: {
          [k: string]: any;
        }): sonarjs.analyzeproject.v1.FileResultMessage;

        /**
         * Creates a plain object from a FileResultMessage message. Also converts values to other types if specified.
         * @param message FileResultMessage
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.FileResultMessage,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this FileResultMessage to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for FileResultMessage
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace FileResultMessage {
        /** Properties of a FileResultMessage. */
        interface $Properties {
          /** FileResultMessage filePath */
          filePath?: string | null;

          /** FileResultMessage result */
          result?: sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Properties | null;

          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of a FileResultMessage. */
        type $Shape = sonarjs.analyzeproject.v1.FileResultMessage.$Properties;
      }

      /**
       * Properties of a ProjectAnalysisFileResult.
       * @deprecated Use sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Properties instead.
       */
      interface IProjectAnalysisFileResult
        extends sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Properties {}

      /** Represents a ProjectAnalysisFileResult. */
      class ProjectAnalysisFileResult {
        /**
         * Constructs a new ProjectAnalysisFileResult.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /** ProjectAnalysisFileResult parsingErrors. */
        parsingErrors: sonarjs.analyzeproject.v1.ParsingError.$Properties[];

        /** ProjectAnalysisFileResult issues. */
        issues: sonarjs.analyzeproject.v1.Issue.$Properties[];

        /** ProjectAnalysisFileResult highlights. */
        highlights: sonarjs.analyzeproject.v1.Highlight.$Properties[];

        /** ProjectAnalysisFileResult highlightedSymbols. */
        highlightedSymbols: sonarjs.analyzeproject.v1.HighlightedSymbol.$Properties[];

        /** ProjectAnalysisFileResult metrics. */
        metrics?: sonarjs.analyzeproject.v1.Metrics.$Properties | null;

        /** ProjectAnalysisFileResult cpdTokens. */
        cpdTokens: sonarjs.analyzeproject.v1.CpdToken.$Properties[];

        /** ProjectAnalysisFileResult ast. */
        ast: Uint8Array;

        /** ProjectAnalysisFileResult error. */
        error?: string | null;

        /** ProjectAnalysisFileResult sonarResolveComments. */
        sonarResolveComments: sonarjs.analyzeproject.v1.SonarResolveComment.$Properties[];

        /** ProjectAnalysisFileResult suppressedIssues. */
        suppressedIssues: sonarjs.analyzeproject.v1.Issue.$Properties[];

        /**
         * Creates a new ProjectAnalysisFileResult instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ProjectAnalysisFileResult instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Shape,
        ): sonarjs.analyzeproject.v1.ProjectAnalysisFileResult &
          sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Properties,
        ): sonarjs.analyzeproject.v1.ProjectAnalysisFileResult;

        /**
         * Encodes the specified ProjectAnalysisFileResult message. Does not implicitly {@link sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.verify|verify} messages.
         * @param message ProjectAnalysisFileResult message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified ProjectAnalysisFileResult message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.verify|verify} messages.
         * @param message ProjectAnalysisFileResult message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes a ProjectAnalysisFileResult message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.ProjectAnalysisFileResult & sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Shape} ProjectAnalysisFileResult
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.ProjectAnalysisFileResult &
          sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Shape;

        /**
         * Decodes a ProjectAnalysisFileResult message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.ProjectAnalysisFileResult & sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Shape} ProjectAnalysisFileResult
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.ProjectAnalysisFileResult &
          sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Shape;

        /**
         * Verifies a ProjectAnalysisFileResult message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates a ProjectAnalysisFileResult message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ProjectAnalysisFileResult
         */
        static fromObject(object: {
          [k: string]: any;
        }): sonarjs.analyzeproject.v1.ProjectAnalysisFileResult;

        /**
         * Creates a plain object from a ProjectAnalysisFileResult message. Also converts values to other types if specified.
         * @param message ProjectAnalysisFileResult
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.ProjectAnalysisFileResult,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this ProjectAnalysisFileResult to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for ProjectAnalysisFileResult
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace ProjectAnalysisFileResult {
        /** Properties of a ProjectAnalysisFileResult. */
        interface $Properties {
          /** ProjectAnalysisFileResult parsingErrors */
          parsingErrors?: sonarjs.analyzeproject.v1.ParsingError.$Properties[] | null;

          /** ProjectAnalysisFileResult issues */
          issues?: sonarjs.analyzeproject.v1.Issue.$Properties[] | null;

          /** ProjectAnalysisFileResult highlights */
          highlights?: sonarjs.analyzeproject.v1.Highlight.$Properties[] | null;

          /** ProjectAnalysisFileResult highlightedSymbols */
          highlightedSymbols?: sonarjs.analyzeproject.v1.HighlightedSymbol.$Properties[] | null;

          /** ProjectAnalysisFileResult metrics */
          metrics?: sonarjs.analyzeproject.v1.Metrics.$Properties | null;

          /** ProjectAnalysisFileResult cpdTokens */
          cpdTokens?: sonarjs.analyzeproject.v1.CpdToken.$Properties[] | null;

          /** ProjectAnalysisFileResult ast */
          ast?: Uint8Array | null;

          /** ProjectAnalysisFileResult error */
          error?: string | null;

          /** ProjectAnalysisFileResult sonarResolveComments */
          sonarResolveComments?: sonarjs.analyzeproject.v1.SonarResolveComment.$Properties[] | null;

          /** ProjectAnalysisFileResult suppressedIssues */
          suppressedIssues?: sonarjs.analyzeproject.v1.Issue.$Properties[] | null;

          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of a ProjectAnalysisFileResult. */
        type $Shape = sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Properties;
      }

      /**
       * Properties of a ParsingError.
       * @deprecated Use sonarjs.analyzeproject.v1.ParsingError.$Properties instead.
       */
      interface IParsingError extends sonarjs.analyzeproject.v1.ParsingError.$Properties {}

      /** Represents a ParsingError. */
      class ParsingError {
        /**
         * Constructs a new ParsingError.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.ParsingError.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /** ParsingError message. */
        message: string;

        /** ParsingError line. */
        line?: number | null;

        /** ParsingError column. */
        column?: number | null;

        /** ParsingError code. */
        code: sonarjs.analyzeproject.v1.ParsingErrorCode;

        /** ParsingError language. */
        language: sonarjs.analyzeproject.v1.AnalysisLanguage;

        /**
         * Creates a new ParsingError instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ParsingError instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.ParsingError.$Shape,
        ): sonarjs.analyzeproject.v1.ParsingError & sonarjs.analyzeproject.v1.ParsingError.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.ParsingError.$Properties,
        ): sonarjs.analyzeproject.v1.ParsingError;

        /**
         * Encodes the specified ParsingError message. Does not implicitly {@link sonarjs.analyzeproject.v1.ParsingError.verify|verify} messages.
         * @param message ParsingError message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.ParsingError.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified ParsingError message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.ParsingError.verify|verify} messages.
         * @param message ParsingError message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.ParsingError.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes a ParsingError message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.ParsingError & sonarjs.analyzeproject.v1.ParsingError.$Shape} ParsingError
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.ParsingError & sonarjs.analyzeproject.v1.ParsingError.$Shape;

        /**
         * Decodes a ParsingError message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.ParsingError & sonarjs.analyzeproject.v1.ParsingError.$Shape} ParsingError
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.ParsingError & sonarjs.analyzeproject.v1.ParsingError.$Shape;

        /**
         * Verifies a ParsingError message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates a ParsingError message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ParsingError
         */
        static fromObject(object: { [k: string]: any }): sonarjs.analyzeproject.v1.ParsingError;

        /**
         * Creates a plain object from a ParsingError message. Also converts values to other types if specified.
         * @param message ParsingError
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.ParsingError,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this ParsingError to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for ParsingError
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace ParsingError {
        /** Properties of a ParsingError. */
        interface $Properties {
          /** ParsingError message */
          message?: string | null;

          /** ParsingError line */
          line?: number | null;

          /** ParsingError column */
          column?: number | null;

          /** ParsingError code */
          code?: sonarjs.analyzeproject.v1.ParsingErrorCode | null;

          /** ParsingError language */
          language?: sonarjs.analyzeproject.v1.AnalysisLanguage | null;

          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of a ParsingError. */
        type $Shape = sonarjs.analyzeproject.v1.ParsingError.$Properties;
      }

      /**
       * Properties of an Issue.
       * @deprecated Use sonarjs.analyzeproject.v1.Issue.$Properties instead.
       */
      interface IIssue extends sonarjs.analyzeproject.v1.Issue.$Properties {}

      /** Represents an Issue. */
      class Issue {
        /**
         * Constructs a new Issue.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.Issue.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /** Issue line. */
        line: number;

        /** Issue column. */
        column: number;

        /** Issue endLine. */
        endLine?: number | null;

        /** Issue endColumn. */
        endColumn?: number | null;

        /** Issue message. */
        message: string;

        /** Issue ruleId. */
        ruleId: string;

        /** Issue language. */
        language: sonarjs.analyzeproject.v1.AnalysisLanguage;

        /** Issue secondaryLocations. */
        secondaryLocations: sonarjs.analyzeproject.v1.IssueLocation.$Properties[];

        /** Issue cost. */
        cost?: number | null;

        /** Issue quickFixes. */
        quickFixes: sonarjs.analyzeproject.v1.QuickFix.$Properties[];

        /** Issue ruleEslintKeys. */
        ruleEslintKeys: string[];

        /** Issue filePath. */
        filePath: string;

        /** Issue resolutionComment. */
        resolutionComment?: string | null;

        /**
         * Creates a new Issue instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Issue instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.Issue.$Shape,
        ): sonarjs.analyzeproject.v1.Issue & sonarjs.analyzeproject.v1.Issue.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.Issue.$Properties,
        ): sonarjs.analyzeproject.v1.Issue;

        /**
         * Encodes the specified Issue message. Does not implicitly {@link sonarjs.analyzeproject.v1.Issue.verify|verify} messages.
         * @param message Issue message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.Issue.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified Issue message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.Issue.verify|verify} messages.
         * @param message Issue message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.Issue.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes an Issue message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.Issue & sonarjs.analyzeproject.v1.Issue.$Shape} Issue
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.Issue & sonarjs.analyzeproject.v1.Issue.$Shape;

        /**
         * Decodes an Issue message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.Issue & sonarjs.analyzeproject.v1.Issue.$Shape} Issue
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.Issue & sonarjs.analyzeproject.v1.Issue.$Shape;

        /**
         * Verifies an Issue message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates an Issue message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Issue
         */
        static fromObject(object: { [k: string]: any }): sonarjs.analyzeproject.v1.Issue;

        /**
         * Creates a plain object from an Issue message. Also converts values to other types if specified.
         * @param message Issue
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.Issue,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this Issue to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for Issue
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace Issue {
        /** Properties of an Issue. */
        interface $Properties {
          /** Issue line */
          line?: number | null;

          /** Issue column */
          column?: number | null;

          /** Issue endLine */
          endLine?: number | null;

          /** Issue endColumn */
          endColumn?: number | null;

          /** Issue message */
          message?: string | null;

          /** Issue ruleId */
          ruleId?: string | null;

          /** Issue language */
          language?: sonarjs.analyzeproject.v1.AnalysisLanguage | null;

          /** Issue secondaryLocations */
          secondaryLocations?: sonarjs.analyzeproject.v1.IssueLocation.$Properties[] | null;

          /** Issue cost */
          cost?: number | null;

          /** Issue quickFixes */
          quickFixes?: sonarjs.analyzeproject.v1.QuickFix.$Properties[] | null;

          /** Issue ruleEslintKeys */
          ruleEslintKeys?: string[] | null;

          /** Issue filePath */
          filePath?: string | null;

          /** Issue resolutionComment */
          resolutionComment?: string | null;

          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of an Issue. */
        type $Shape = sonarjs.analyzeproject.v1.Issue.$Properties;
      }

      /**
       * Properties of a QuickFix.
       * @deprecated Use sonarjs.analyzeproject.v1.QuickFix.$Properties instead.
       */
      interface IQuickFix extends sonarjs.analyzeproject.v1.QuickFix.$Properties {}

      /** Represents a QuickFix. */
      class QuickFix {
        /**
         * Constructs a new QuickFix.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.QuickFix.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /** QuickFix message. */
        message: string;

        /** QuickFix edits. */
        edits: sonarjs.analyzeproject.v1.QuickFixEdit.$Properties[];

        /**
         * Creates a new QuickFix instance using the specified properties.
         * @param [properties] Properties to set
         * @returns QuickFix instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.QuickFix.$Shape,
        ): sonarjs.analyzeproject.v1.QuickFix & sonarjs.analyzeproject.v1.QuickFix.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.QuickFix.$Properties,
        ): sonarjs.analyzeproject.v1.QuickFix;

        /**
         * Encodes the specified QuickFix message. Does not implicitly {@link sonarjs.analyzeproject.v1.QuickFix.verify|verify} messages.
         * @param message QuickFix message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.QuickFix.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified QuickFix message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.QuickFix.verify|verify} messages.
         * @param message QuickFix message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.QuickFix.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes a QuickFix message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.QuickFix & sonarjs.analyzeproject.v1.QuickFix.$Shape} QuickFix
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.QuickFix & sonarjs.analyzeproject.v1.QuickFix.$Shape;

        /**
         * Decodes a QuickFix message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.QuickFix & sonarjs.analyzeproject.v1.QuickFix.$Shape} QuickFix
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.QuickFix & sonarjs.analyzeproject.v1.QuickFix.$Shape;

        /**
         * Verifies a QuickFix message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates a QuickFix message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns QuickFix
         */
        static fromObject(object: { [k: string]: any }): sonarjs.analyzeproject.v1.QuickFix;

        /**
         * Creates a plain object from a QuickFix message. Also converts values to other types if specified.
         * @param message QuickFix
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.QuickFix,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this QuickFix to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for QuickFix
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace QuickFix {
        /** Properties of a QuickFix. */
        interface $Properties {
          /** QuickFix message */
          message?: string | null;

          /** QuickFix edits */
          edits?: sonarjs.analyzeproject.v1.QuickFixEdit.$Properties[] | null;

          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of a QuickFix. */
        type $Shape = sonarjs.analyzeproject.v1.QuickFix.$Properties;
      }

      /**
       * Properties of a QuickFixEdit.
       * @deprecated Use sonarjs.analyzeproject.v1.QuickFixEdit.$Properties instead.
       */
      interface IQuickFixEdit extends sonarjs.analyzeproject.v1.QuickFixEdit.$Properties {}

      /** Represents a QuickFixEdit. */
      class QuickFixEdit {
        /**
         * Constructs a new QuickFixEdit.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.QuickFixEdit.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /** QuickFixEdit text. */
        text: string;

        /** QuickFixEdit loc. */
        loc?: sonarjs.analyzeproject.v1.IssueLocation.$Properties | null;

        /**
         * Creates a new QuickFixEdit instance using the specified properties.
         * @param [properties] Properties to set
         * @returns QuickFixEdit instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.QuickFixEdit.$Shape,
        ): sonarjs.analyzeproject.v1.QuickFixEdit & sonarjs.analyzeproject.v1.QuickFixEdit.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.QuickFixEdit.$Properties,
        ): sonarjs.analyzeproject.v1.QuickFixEdit;

        /**
         * Encodes the specified QuickFixEdit message. Does not implicitly {@link sonarjs.analyzeproject.v1.QuickFixEdit.verify|verify} messages.
         * @param message QuickFixEdit message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.QuickFixEdit.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified QuickFixEdit message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.QuickFixEdit.verify|verify} messages.
         * @param message QuickFixEdit message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.QuickFixEdit.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes a QuickFixEdit message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.QuickFixEdit & sonarjs.analyzeproject.v1.QuickFixEdit.$Shape} QuickFixEdit
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.QuickFixEdit & sonarjs.analyzeproject.v1.QuickFixEdit.$Shape;

        /**
         * Decodes a QuickFixEdit message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.QuickFixEdit & sonarjs.analyzeproject.v1.QuickFixEdit.$Shape} QuickFixEdit
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.QuickFixEdit & sonarjs.analyzeproject.v1.QuickFixEdit.$Shape;

        /**
         * Verifies a QuickFixEdit message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates a QuickFixEdit message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns QuickFixEdit
         */
        static fromObject(object: { [k: string]: any }): sonarjs.analyzeproject.v1.QuickFixEdit;

        /**
         * Creates a plain object from a QuickFixEdit message. Also converts values to other types if specified.
         * @param message QuickFixEdit
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.QuickFixEdit,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this QuickFixEdit to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for QuickFixEdit
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace QuickFixEdit {
        /** Properties of a QuickFixEdit. */
        interface $Properties {
          /** QuickFixEdit text */
          text?: string | null;

          /** QuickFixEdit loc */
          loc?: sonarjs.analyzeproject.v1.IssueLocation.$Properties | null;

          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of a QuickFixEdit. */
        type $Shape = sonarjs.analyzeproject.v1.QuickFixEdit.$Properties;
      }

      /**
       * Properties of an IssueLocation.
       * @deprecated Use sonarjs.analyzeproject.v1.IssueLocation.$Properties instead.
       */
      interface IIssueLocation extends sonarjs.analyzeproject.v1.IssueLocation.$Properties {}

      /** Represents an IssueLocation. */
      class IssueLocation {
        /**
         * Constructs a new IssueLocation.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.IssueLocation.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /** IssueLocation line. */
        line?: number | null;

        /** IssueLocation column. */
        column?: number | null;

        /** IssueLocation endLine. */
        endLine?: number | null;

        /** IssueLocation endColumn. */
        endColumn?: number | null;

        /** IssueLocation message. */
        message?: string | null;

        /**
         * Creates a new IssueLocation instance using the specified properties.
         * @param [properties] Properties to set
         * @returns IssueLocation instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.IssueLocation.$Shape,
        ): sonarjs.analyzeproject.v1.IssueLocation & sonarjs.analyzeproject.v1.IssueLocation.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.IssueLocation.$Properties,
        ): sonarjs.analyzeproject.v1.IssueLocation;

        /**
         * Encodes the specified IssueLocation message. Does not implicitly {@link sonarjs.analyzeproject.v1.IssueLocation.verify|verify} messages.
         * @param message IssueLocation message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.IssueLocation.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified IssueLocation message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.IssueLocation.verify|verify} messages.
         * @param message IssueLocation message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.IssueLocation.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes an IssueLocation message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.IssueLocation & sonarjs.analyzeproject.v1.IssueLocation.$Shape} IssueLocation
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.IssueLocation & sonarjs.analyzeproject.v1.IssueLocation.$Shape;

        /**
         * Decodes an IssueLocation message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.IssueLocation & sonarjs.analyzeproject.v1.IssueLocation.$Shape} IssueLocation
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.IssueLocation & sonarjs.analyzeproject.v1.IssueLocation.$Shape;

        /**
         * Verifies an IssueLocation message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates an IssueLocation message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns IssueLocation
         */
        static fromObject(object: { [k: string]: any }): sonarjs.analyzeproject.v1.IssueLocation;

        /**
         * Creates a plain object from an IssueLocation message. Also converts values to other types if specified.
         * @param message IssueLocation
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.IssueLocation,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this IssueLocation to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for IssueLocation
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace IssueLocation {
        /** Properties of an IssueLocation. */
        interface $Properties {
          /** IssueLocation line */
          line?: number | null;

          /** IssueLocation column */
          column?: number | null;

          /** IssueLocation endLine */
          endLine?: number | null;

          /** IssueLocation endColumn */
          endColumn?: number | null;

          /** IssueLocation message */
          message?: string | null;

          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of an IssueLocation. */
        type $Shape = sonarjs.analyzeproject.v1.IssueLocation.$Properties;
      }

      /**
       * Properties of a Location.
       * @deprecated Use sonarjs.analyzeproject.v1.Location.$Properties instead.
       */
      interface ILocation extends sonarjs.analyzeproject.v1.Location.$Properties {}

      /** Represents a Location. */
      class Location {
        /**
         * Constructs a new Location.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.Location.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /** Location startLine. */
        startLine: number;

        /** Location startCol. */
        startCol: number;

        /** Location endLine. */
        endLine: number;

        /** Location endCol. */
        endCol: number;

        /**
         * Creates a new Location instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Location instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.Location.$Shape,
        ): sonarjs.analyzeproject.v1.Location & sonarjs.analyzeproject.v1.Location.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.Location.$Properties,
        ): sonarjs.analyzeproject.v1.Location;

        /**
         * Encodes the specified Location message. Does not implicitly {@link sonarjs.analyzeproject.v1.Location.verify|verify} messages.
         * @param message Location message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.Location.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified Location message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.Location.verify|verify} messages.
         * @param message Location message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.Location.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes a Location message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.Location & sonarjs.analyzeproject.v1.Location.$Shape} Location
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.Location & sonarjs.analyzeproject.v1.Location.$Shape;

        /**
         * Decodes a Location message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.Location & sonarjs.analyzeproject.v1.Location.$Shape} Location
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.Location & sonarjs.analyzeproject.v1.Location.$Shape;

        /**
         * Verifies a Location message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates a Location message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Location
         */
        static fromObject(object: { [k: string]: any }): sonarjs.analyzeproject.v1.Location;

        /**
         * Creates a plain object from a Location message. Also converts values to other types if specified.
         * @param message Location
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.Location,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this Location to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for Location
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace Location {
        /** Properties of a Location. */
        interface $Properties {
          /** Location startLine */
          startLine?: number | null;

          /** Location startCol */
          startCol?: number | null;

          /** Location endLine */
          endLine?: number | null;

          /** Location endCol */
          endCol?: number | null;

          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of a Location. */
        type $Shape = sonarjs.analyzeproject.v1.Location.$Properties;
      }

      /**
       * Properties of a Highlight.
       * @deprecated Use sonarjs.analyzeproject.v1.Highlight.$Properties instead.
       */
      interface IHighlight extends sonarjs.analyzeproject.v1.Highlight.$Properties {}

      /** Represents a Highlight. */
      class Highlight {
        /**
         * Constructs a new Highlight.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.Highlight.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /** Highlight location. */
        location?: sonarjs.analyzeproject.v1.Location.$Properties | null;

        /** Highlight textType. */
        textType: sonarjs.analyzeproject.v1.TextType;

        /**
         * Creates a new Highlight instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Highlight instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.Highlight.$Shape,
        ): sonarjs.analyzeproject.v1.Highlight & sonarjs.analyzeproject.v1.Highlight.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.Highlight.$Properties,
        ): sonarjs.analyzeproject.v1.Highlight;

        /**
         * Encodes the specified Highlight message. Does not implicitly {@link sonarjs.analyzeproject.v1.Highlight.verify|verify} messages.
         * @param message Highlight message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.Highlight.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified Highlight message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.Highlight.verify|verify} messages.
         * @param message Highlight message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.Highlight.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes a Highlight message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.Highlight & sonarjs.analyzeproject.v1.Highlight.$Shape} Highlight
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.Highlight & sonarjs.analyzeproject.v1.Highlight.$Shape;

        /**
         * Decodes a Highlight message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.Highlight & sonarjs.analyzeproject.v1.Highlight.$Shape} Highlight
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.Highlight & sonarjs.analyzeproject.v1.Highlight.$Shape;

        /**
         * Verifies a Highlight message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates a Highlight message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Highlight
         */
        static fromObject(object: { [k: string]: any }): sonarjs.analyzeproject.v1.Highlight;

        /**
         * Creates a plain object from a Highlight message. Also converts values to other types if specified.
         * @param message Highlight
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.Highlight,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this Highlight to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for Highlight
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace Highlight {
        /** Properties of a Highlight. */
        interface $Properties {
          /** Highlight location */
          location?: sonarjs.analyzeproject.v1.Location.$Properties | null;

          /** Highlight textType */
          textType?: sonarjs.analyzeproject.v1.TextType | null;

          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of a Highlight. */
        type $Shape = sonarjs.analyzeproject.v1.Highlight.$Properties;
      }

      /**
       * Properties of a HighlightedSymbol.
       * @deprecated Use sonarjs.analyzeproject.v1.HighlightedSymbol.$Properties instead.
       */
      interface IHighlightedSymbol
        extends sonarjs.analyzeproject.v1.HighlightedSymbol.$Properties {}

      /** Represents a HighlightedSymbol. */
      class HighlightedSymbol {
        /**
         * Constructs a new HighlightedSymbol.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.HighlightedSymbol.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /** HighlightedSymbol declaration. */
        declaration?: sonarjs.analyzeproject.v1.Location.$Properties | null;

        /** HighlightedSymbol references. */
        references: sonarjs.analyzeproject.v1.Location.$Properties[];

        /**
         * Creates a new HighlightedSymbol instance using the specified properties.
         * @param [properties] Properties to set
         * @returns HighlightedSymbol instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.HighlightedSymbol.$Shape,
        ): sonarjs.analyzeproject.v1.HighlightedSymbol &
          sonarjs.analyzeproject.v1.HighlightedSymbol.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.HighlightedSymbol.$Properties,
        ): sonarjs.analyzeproject.v1.HighlightedSymbol;

        /**
         * Encodes the specified HighlightedSymbol message. Does not implicitly {@link sonarjs.analyzeproject.v1.HighlightedSymbol.verify|verify} messages.
         * @param message HighlightedSymbol message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.HighlightedSymbol.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified HighlightedSymbol message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.HighlightedSymbol.verify|verify} messages.
         * @param message HighlightedSymbol message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.HighlightedSymbol.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes a HighlightedSymbol message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.HighlightedSymbol & sonarjs.analyzeproject.v1.HighlightedSymbol.$Shape} HighlightedSymbol
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.HighlightedSymbol &
          sonarjs.analyzeproject.v1.HighlightedSymbol.$Shape;

        /**
         * Decodes a HighlightedSymbol message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.HighlightedSymbol & sonarjs.analyzeproject.v1.HighlightedSymbol.$Shape} HighlightedSymbol
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.HighlightedSymbol &
          sonarjs.analyzeproject.v1.HighlightedSymbol.$Shape;

        /**
         * Verifies a HighlightedSymbol message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates a HighlightedSymbol message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns HighlightedSymbol
         */
        static fromObject(object: {
          [k: string]: any;
        }): sonarjs.analyzeproject.v1.HighlightedSymbol;

        /**
         * Creates a plain object from a HighlightedSymbol message. Also converts values to other types if specified.
         * @param message HighlightedSymbol
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.HighlightedSymbol,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this HighlightedSymbol to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for HighlightedSymbol
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace HighlightedSymbol {
        /** Properties of a HighlightedSymbol. */
        interface $Properties {
          /** HighlightedSymbol declaration */
          declaration?: sonarjs.analyzeproject.v1.Location.$Properties | null;

          /** HighlightedSymbol references */
          references?: sonarjs.analyzeproject.v1.Location.$Properties[] | null;

          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of a HighlightedSymbol. */
        type $Shape = sonarjs.analyzeproject.v1.HighlightedSymbol.$Properties;
      }

      /**
       * Properties of a Metrics.
       * @deprecated Use sonarjs.analyzeproject.v1.Metrics.$Properties instead.
       */
      interface IMetrics extends sonarjs.analyzeproject.v1.Metrics.$Properties {}

      /** Represents a Metrics. */
      class Metrics {
        /**
         * Constructs a new Metrics.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.Metrics.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /** Metrics ncloc. */
        ncloc: number[];

        /** Metrics commentLines. */
        commentLines: number[];

        /** Metrics nosonarLines. */
        nosonarLines: number[];

        /** Metrics executableLines. */
        executableLines: number[];

        /** Metrics functions. */
        functions: number;

        /** Metrics statements. */
        statements: number;

        /** Metrics classes. */
        classes: number;

        /** Metrics complexity. */
        complexity: number;

        /** Metrics cognitiveComplexity. */
        cognitiveComplexity: number;

        /**
         * Creates a new Metrics instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Metrics instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.Metrics.$Shape,
        ): sonarjs.analyzeproject.v1.Metrics & sonarjs.analyzeproject.v1.Metrics.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.Metrics.$Properties,
        ): sonarjs.analyzeproject.v1.Metrics;

        /**
         * Encodes the specified Metrics message. Does not implicitly {@link sonarjs.analyzeproject.v1.Metrics.verify|verify} messages.
         * @param message Metrics message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.Metrics.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified Metrics message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.Metrics.verify|verify} messages.
         * @param message Metrics message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.Metrics.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes a Metrics message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.Metrics & sonarjs.analyzeproject.v1.Metrics.$Shape} Metrics
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.Metrics & sonarjs.analyzeproject.v1.Metrics.$Shape;

        /**
         * Decodes a Metrics message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.Metrics & sonarjs.analyzeproject.v1.Metrics.$Shape} Metrics
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.Metrics & sonarjs.analyzeproject.v1.Metrics.$Shape;

        /**
         * Verifies a Metrics message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates a Metrics message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Metrics
         */
        static fromObject(object: { [k: string]: any }): sonarjs.analyzeproject.v1.Metrics;

        /**
         * Creates a plain object from a Metrics message. Also converts values to other types if specified.
         * @param message Metrics
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.Metrics,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this Metrics to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for Metrics
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace Metrics {
        /** Properties of a Metrics. */
        interface $Properties {
          /** Metrics ncloc */
          ncloc?: number[] | null;

          /** Metrics commentLines */
          commentLines?: number[] | null;

          /** Metrics nosonarLines */
          nosonarLines?: number[] | null;

          /** Metrics executableLines */
          executableLines?: number[] | null;

          /** Metrics functions */
          functions?: number | null;

          /** Metrics statements */
          statements?: number | null;

          /** Metrics classes */
          classes?: number | null;

          /** Metrics complexity */
          complexity?: number | null;

          /** Metrics cognitiveComplexity */
          cognitiveComplexity?: number | null;

          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of a Metrics. */
        type $Shape = sonarjs.analyzeproject.v1.Metrics.$Properties;
      }

      /**
       * Properties of a CpdToken.
       * @deprecated Use sonarjs.analyzeproject.v1.CpdToken.$Properties instead.
       */
      interface ICpdToken extends sonarjs.analyzeproject.v1.CpdToken.$Properties {}

      /** Represents a CpdToken. */
      class CpdToken {
        /**
         * Constructs a new CpdToken.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.CpdToken.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /** CpdToken location. */
        location?: sonarjs.analyzeproject.v1.Location.$Properties | null;

        /** CpdToken image. */
        image: string;

        /**
         * Creates a new CpdToken instance using the specified properties.
         * @param [properties] Properties to set
         * @returns CpdToken instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.CpdToken.$Shape,
        ): sonarjs.analyzeproject.v1.CpdToken & sonarjs.analyzeproject.v1.CpdToken.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.CpdToken.$Properties,
        ): sonarjs.analyzeproject.v1.CpdToken;

        /**
         * Encodes the specified CpdToken message. Does not implicitly {@link sonarjs.analyzeproject.v1.CpdToken.verify|verify} messages.
         * @param message CpdToken message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.CpdToken.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified CpdToken message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.CpdToken.verify|verify} messages.
         * @param message CpdToken message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.CpdToken.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes a CpdToken message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.CpdToken & sonarjs.analyzeproject.v1.CpdToken.$Shape} CpdToken
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.CpdToken & sonarjs.analyzeproject.v1.CpdToken.$Shape;

        /**
         * Decodes a CpdToken message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.CpdToken & sonarjs.analyzeproject.v1.CpdToken.$Shape} CpdToken
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.CpdToken & sonarjs.analyzeproject.v1.CpdToken.$Shape;

        /**
         * Verifies a CpdToken message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates a CpdToken message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns CpdToken
         */
        static fromObject(object: { [k: string]: any }): sonarjs.analyzeproject.v1.CpdToken;

        /**
         * Creates a plain object from a CpdToken message. Also converts values to other types if specified.
         * @param message CpdToken
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.CpdToken,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this CpdToken to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for CpdToken
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace CpdToken {
        /** Properties of a CpdToken. */
        interface $Properties {
          /** CpdToken location */
          location?: sonarjs.analyzeproject.v1.Location.$Properties | null;

          /** CpdToken image */
          image?: string | null;

          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of a CpdToken. */
        type $Shape = sonarjs.analyzeproject.v1.CpdToken.$Properties;
      }

      /**
       * Properties of a SonarResolveComment.
       * @deprecated Use sonarjs.analyzeproject.v1.SonarResolveComment.$Properties instead.
       */
      interface ISonarResolveComment
        extends sonarjs.analyzeproject.v1.SonarResolveComment.$Properties {}

      /** Represents a SonarResolveComment. */
      class SonarResolveComment {
        /**
         * Constructs a new SonarResolveComment.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.SonarResolveComment.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /** SonarResolveComment line. */
        line: number;

        /** SonarResolveComment text. */
        text: string;

        /**
         * Creates a new SonarResolveComment instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SonarResolveComment instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.SonarResolveComment.$Shape,
        ): sonarjs.analyzeproject.v1.SonarResolveComment &
          sonarjs.analyzeproject.v1.SonarResolveComment.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.SonarResolveComment.$Properties,
        ): sonarjs.analyzeproject.v1.SonarResolveComment;

        /**
         * Encodes the specified SonarResolveComment message. Does not implicitly {@link sonarjs.analyzeproject.v1.SonarResolveComment.verify|verify} messages.
         * @param message SonarResolveComment message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.SonarResolveComment.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified SonarResolveComment message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.SonarResolveComment.verify|verify} messages.
         * @param message SonarResolveComment message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.SonarResolveComment.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes a SonarResolveComment message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.SonarResolveComment & sonarjs.analyzeproject.v1.SonarResolveComment.$Shape} SonarResolveComment
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.SonarResolveComment &
          sonarjs.analyzeproject.v1.SonarResolveComment.$Shape;

        /**
         * Decodes a SonarResolveComment message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.SonarResolveComment & sonarjs.analyzeproject.v1.SonarResolveComment.$Shape} SonarResolveComment
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.SonarResolveComment &
          sonarjs.analyzeproject.v1.SonarResolveComment.$Shape;

        /**
         * Verifies a SonarResolveComment message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates a SonarResolveComment message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SonarResolveComment
         */
        static fromObject(object: {
          [k: string]: any;
        }): sonarjs.analyzeproject.v1.SonarResolveComment;

        /**
         * Creates a plain object from a SonarResolveComment message. Also converts values to other types if specified.
         * @param message SonarResolveComment
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.SonarResolveComment,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this SonarResolveComment to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for SonarResolveComment
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace SonarResolveComment {
        /** Properties of a SonarResolveComment. */
        interface $Properties {
          /** SonarResolveComment line */
          line?: number | null;

          /** SonarResolveComment text */
          text?: string | null;

          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of a SonarResolveComment. */
        type $Shape = sonarjs.analyzeproject.v1.SonarResolveComment.$Properties;
      }

      /**
       * Properties of a ProjectAnalysisMeta.
       * @deprecated Use sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Properties instead.
       */
      interface IProjectAnalysisMeta
        extends sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Properties {}

      /** Represents a ProjectAnalysisMeta. */
      class ProjectAnalysisMeta {
        /**
         * Constructs a new ProjectAnalysisMeta.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /** ProjectAnalysisMeta warnings. */
        warnings: string[];

        /** ProjectAnalysisMeta telemetry. */
        telemetry?: sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Properties | null;

        /**
         * Creates a new ProjectAnalysisMeta instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ProjectAnalysisMeta instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Shape,
        ): sonarjs.analyzeproject.v1.ProjectAnalysisMeta &
          sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Properties,
        ): sonarjs.analyzeproject.v1.ProjectAnalysisMeta;

        /**
         * Encodes the specified ProjectAnalysisMeta message. Does not implicitly {@link sonarjs.analyzeproject.v1.ProjectAnalysisMeta.verify|verify} messages.
         * @param message ProjectAnalysisMeta message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified ProjectAnalysisMeta message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.ProjectAnalysisMeta.verify|verify} messages.
         * @param message ProjectAnalysisMeta message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes a ProjectAnalysisMeta message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.ProjectAnalysisMeta & sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Shape} ProjectAnalysisMeta
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.ProjectAnalysisMeta &
          sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Shape;

        /**
         * Decodes a ProjectAnalysisMeta message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.ProjectAnalysisMeta & sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Shape} ProjectAnalysisMeta
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.ProjectAnalysisMeta &
          sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Shape;

        /**
         * Verifies a ProjectAnalysisMeta message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates a ProjectAnalysisMeta message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ProjectAnalysisMeta
         */
        static fromObject(object: {
          [k: string]: any;
        }): sonarjs.analyzeproject.v1.ProjectAnalysisMeta;

        /**
         * Creates a plain object from a ProjectAnalysisMeta message. Also converts values to other types if specified.
         * @param message ProjectAnalysisMeta
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.ProjectAnalysisMeta,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this ProjectAnalysisMeta to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for ProjectAnalysisMeta
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace ProjectAnalysisMeta {
        /** Properties of a ProjectAnalysisMeta. */
        interface $Properties {
          /** ProjectAnalysisMeta warnings */
          warnings?: string[] | null;

          /** ProjectAnalysisMeta telemetry */
          telemetry?: sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Properties | null;

          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of a ProjectAnalysisMeta. */
        type $Shape = sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Properties;
      }

      /**
       * Properties of a ProjectAnalysisTelemetry.
       * @deprecated Use sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Properties instead.
       */
      interface IProjectAnalysisTelemetry
        extends sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Properties {}

      /** Represents a ProjectAnalysisTelemetry. */
      class ProjectAnalysisTelemetry {
        /**
         * Constructs a new ProjectAnalysisTelemetry.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /** ProjectAnalysisTelemetry typescriptVersions. */
        typescriptVersions: string[];

        /** ProjectAnalysisTelemetry typescriptNativePreview. */
        typescriptNativePreview: boolean;

        /** ProjectAnalysisTelemetry compilerOptions. */
        compilerOptions: { [k: string]: sonarjs.analyzeproject.v1.StringList.$Properties };

        /** ProjectAnalysisTelemetry ecmaScriptVersions. */
        ecmaScriptVersions: string[];

        /** ProjectAnalysisTelemetry programCreation. */
        programCreation?: sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Properties | null;

        /** ProjectAnalysisTelemetry esmFileCount. */
        esmFileCount: number;

        /** ProjectAnalysisTelemetry cjsFileCount. */
        cjsFileCount: number;

        /** ProjectAnalysisTelemetry denoImportCounts. */
        denoImportCounts: { [k: string]: number };

        /** ProjectAnalysisTelemetry generatedSources. */
        generatedSources?: sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Properties | null;

        /**
         * Creates a new ProjectAnalysisTelemetry instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ProjectAnalysisTelemetry instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Shape,
        ): sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry &
          sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Properties,
        ): sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry;

        /**
         * Encodes the specified ProjectAnalysisTelemetry message. Does not implicitly {@link sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.verify|verify} messages.
         * @param message ProjectAnalysisTelemetry message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified ProjectAnalysisTelemetry message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.verify|verify} messages.
         * @param message ProjectAnalysisTelemetry message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes a ProjectAnalysisTelemetry message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry & sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Shape} ProjectAnalysisTelemetry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry &
          sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Shape;

        /**
         * Decodes a ProjectAnalysisTelemetry message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry & sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Shape} ProjectAnalysisTelemetry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry &
          sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Shape;

        /**
         * Verifies a ProjectAnalysisTelemetry message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates a ProjectAnalysisTelemetry message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ProjectAnalysisTelemetry
         */
        static fromObject(object: {
          [k: string]: any;
        }): sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry;

        /**
         * Creates a plain object from a ProjectAnalysisTelemetry message. Also converts values to other types if specified.
         * @param message ProjectAnalysisTelemetry
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this ProjectAnalysisTelemetry to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for ProjectAnalysisTelemetry
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace ProjectAnalysisTelemetry {
        /** Properties of a ProjectAnalysisTelemetry. */
        interface $Properties {
          /** ProjectAnalysisTelemetry typescriptVersions */
          typescriptVersions?: string[] | null;

          /** ProjectAnalysisTelemetry typescriptNativePreview */
          typescriptNativePreview?: boolean | null;

          /** ProjectAnalysisTelemetry compilerOptions */
          compilerOptions?: {
            [k: string]: sonarjs.analyzeproject.v1.StringList.$Properties;
          } | null;

          /** ProjectAnalysisTelemetry ecmaScriptVersions */
          ecmaScriptVersions?: string[] | null;

          /** ProjectAnalysisTelemetry programCreation */
          programCreation?: sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Properties | null;

          /** ProjectAnalysisTelemetry esmFileCount */
          esmFileCount?: number | null;

          /** ProjectAnalysisTelemetry cjsFileCount */
          cjsFileCount?: number | null;

          /** ProjectAnalysisTelemetry denoImportCounts */
          denoImportCounts?: { [k: string]: number } | null;

          /** ProjectAnalysisTelemetry generatedSources */
          generatedSources?: sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Properties | null;

          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of a ProjectAnalysisTelemetry. */
        type $Shape = sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Properties;
      }

      /**
       * Properties of a ProgramCreationTelemetry.
       * @deprecated Use sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Properties instead.
       */
      interface IProgramCreationTelemetry
        extends sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Properties {}

      /** Represents a ProgramCreationTelemetry. */
      class ProgramCreationTelemetry {
        /**
         * Constructs a new ProgramCreationTelemetry.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /** ProgramCreationTelemetry attempted. */
        attempted: number;

        /** ProgramCreationTelemetry succeeded. */
        succeeded: number;

        /** ProgramCreationTelemetry failed. */
        failed: number;

        /**
         * Creates a new ProgramCreationTelemetry instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ProgramCreationTelemetry instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Shape,
        ): sonarjs.analyzeproject.v1.ProgramCreationTelemetry &
          sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Properties,
        ): sonarjs.analyzeproject.v1.ProgramCreationTelemetry;

        /**
         * Encodes the specified ProgramCreationTelemetry message. Does not implicitly {@link sonarjs.analyzeproject.v1.ProgramCreationTelemetry.verify|verify} messages.
         * @param message ProgramCreationTelemetry message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified ProgramCreationTelemetry message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.ProgramCreationTelemetry.verify|verify} messages.
         * @param message ProgramCreationTelemetry message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes a ProgramCreationTelemetry message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.ProgramCreationTelemetry & sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Shape} ProgramCreationTelemetry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.ProgramCreationTelemetry &
          sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Shape;

        /**
         * Decodes a ProgramCreationTelemetry message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.ProgramCreationTelemetry & sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Shape} ProgramCreationTelemetry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.ProgramCreationTelemetry &
          sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Shape;

        /**
         * Verifies a ProgramCreationTelemetry message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates a ProgramCreationTelemetry message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ProgramCreationTelemetry
         */
        static fromObject(object: {
          [k: string]: any;
        }): sonarjs.analyzeproject.v1.ProgramCreationTelemetry;

        /**
         * Creates a plain object from a ProgramCreationTelemetry message. Also converts values to other types if specified.
         * @param message ProgramCreationTelemetry
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.ProgramCreationTelemetry,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this ProgramCreationTelemetry to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for ProgramCreationTelemetry
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace ProgramCreationTelemetry {
        /** Properties of a ProgramCreationTelemetry. */
        interface $Properties {
          /** ProgramCreationTelemetry attempted */
          attempted?: number | null;

          /** ProgramCreationTelemetry succeeded */
          succeeded?: number | null;

          /** ProgramCreationTelemetry failed */
          failed?: number | null;

          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of a ProgramCreationTelemetry. */
        type $Shape = sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Properties;
      }

      /**
       * Properties of a GeneratedSourcesTelemetry.
       * @deprecated Use sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Properties instead.
       */
      interface IGeneratedSourcesTelemetry
        extends sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Properties {}

      /** Represents a GeneratedSourcesTelemetry. */
      class GeneratedSourcesTelemetry {
        /**
         * Constructs a new GeneratedSourcesTelemetry.
         * @param [properties] Properties to set
         */
        constructor(properties?: sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Properties);

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /** GeneratedSourcesTelemetry familyCount. */
        familyCount: number;

        /** GeneratedSourcesTelemetry resolvedFileCount. */
        resolvedFileCount: number;

        /** GeneratedSourcesTelemetry taggedFileCount. */
        taggedFileCount: number;

        /** GeneratedSourcesTelemetry families. */
        families: sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Properties[];

        /**
         * Creates a new GeneratedSourcesTelemetry instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GeneratedSourcesTelemetry instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Shape,
        ): sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry &
          sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Properties,
        ): sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry;

        /**
         * Encodes the specified GeneratedSourcesTelemetry message. Does not implicitly {@link sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.verify|verify} messages.
         * @param message GeneratedSourcesTelemetry message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified GeneratedSourcesTelemetry message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.verify|verify} messages.
         * @param message GeneratedSourcesTelemetry message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes a GeneratedSourcesTelemetry message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry & sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Shape} GeneratedSourcesTelemetry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry &
          sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Shape;

        /**
         * Decodes a GeneratedSourcesTelemetry message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry & sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Shape} GeneratedSourcesTelemetry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry &
          sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Shape;

        /**
         * Verifies a GeneratedSourcesTelemetry message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates a GeneratedSourcesTelemetry message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GeneratedSourcesTelemetry
         */
        static fromObject(object: {
          [k: string]: any;
        }): sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry;

        /**
         * Creates a plain object from a GeneratedSourcesTelemetry message. Also converts values to other types if specified.
         * @param message GeneratedSourcesTelemetry
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this GeneratedSourcesTelemetry to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for GeneratedSourcesTelemetry
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace GeneratedSourcesTelemetry {
        /** Properties of a GeneratedSourcesTelemetry. */
        interface $Properties {
          /** GeneratedSourcesTelemetry familyCount */
          familyCount?: number | null;

          /** GeneratedSourcesTelemetry resolvedFileCount */
          resolvedFileCount?: number | null;

          /** GeneratedSourcesTelemetry taggedFileCount */
          taggedFileCount?: number | null;

          /** GeneratedSourcesTelemetry families */
          families?: sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Properties[] | null;

          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of a GeneratedSourcesTelemetry. */
        type $Shape = sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Properties;
      }

      /**
       * Properties of a GeneratedSourceFamilyTelemetry.
       * @deprecated Use sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Properties instead.
       */
      interface IGeneratedSourceFamilyTelemetry
        extends sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Properties {}

      /** Represents a GeneratedSourceFamilyTelemetry. */
      class GeneratedSourceFamilyTelemetry {
        /**
         * Constructs a new GeneratedSourceFamilyTelemetry.
         * @param [properties] Properties to set
         */
        constructor(
          properties?: sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Properties,
        );

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];

        /** GeneratedSourceFamilyTelemetry family. */
        family: string;

        /** GeneratedSourceFamilyTelemetry resolvedFileCount. */
        resolvedFileCount: number;

        /** GeneratedSourceFamilyTelemetry taggedFileCount. */
        taggedFileCount: number;

        /**
         * Creates a new GeneratedSourceFamilyTelemetry instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GeneratedSourceFamilyTelemetry instance
         */
        static create(
          properties: sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Shape,
        ): sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry &
          sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Shape;
        static create(
          properties?: sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Properties,
        ): sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry;

        /**
         * Encodes the specified GeneratedSourceFamilyTelemetry message. Does not implicitly {@link sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.verify|verify} messages.
         * @param message GeneratedSourceFamilyTelemetry message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(
          message: sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified GeneratedSourceFamilyTelemetry message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.verify|verify} messages.
         * @param message GeneratedSourceFamilyTelemetry message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(
          message: sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Properties,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes a GeneratedSourceFamilyTelemetry message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry & sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Shape} GeneratedSourceFamilyTelemetry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry &
          sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Shape;

        /**
         * Decodes a GeneratedSourceFamilyTelemetry message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry & sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Shape} GeneratedSourceFamilyTelemetry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry &
          sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Shape;

        /**
         * Verifies a GeneratedSourceFamilyTelemetry message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates a GeneratedSourceFamilyTelemetry message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GeneratedSourceFamilyTelemetry
         */
        static fromObject(object: {
          [k: string]: any;
        }): sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry;

        /**
         * Creates a plain object from a GeneratedSourceFamilyTelemetry message. Also converts values to other types if specified.
         * @param message GeneratedSourceFamilyTelemetry
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(
          message: sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this GeneratedSourceFamilyTelemetry to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for GeneratedSourceFamilyTelemetry
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
      }

      namespace GeneratedSourceFamilyTelemetry {
        /** Properties of a GeneratedSourceFamilyTelemetry. */
        interface $Properties {
          /** GeneratedSourceFamilyTelemetry family */
          family?: string | null;

          /** GeneratedSourceFamilyTelemetry resolvedFileCount */
          resolvedFileCount?: number | null;

          /** GeneratedSourceFamilyTelemetry taggedFileCount */
          taggedFileCount?: number | null;

          /** Unknown fields preserved while decoding */
          $unknowns?: Uint8Array[];
        }

        /** Shape of a GeneratedSourceFamilyTelemetry. */
        type $Shape = sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Properties;
      }
    }
  }
}

/** Namespace google. */
export namespace google {
  /** Namespace protobuf. */
  namespace protobuf {
    /**
     * Properties of an Empty.
     * @deprecated Use google.protobuf.Empty.$Properties instead.
     */
    interface IEmpty extends google.protobuf.Empty.$Properties {}

    /** Represents an Empty. */
    class Empty {
      /**
       * Constructs a new Empty.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.Empty.$Properties);

      /** Unknown fields preserved while decoding */
      $unknowns?: Uint8Array[];

      /**
       * Creates a new Empty instance using the specified properties.
       * @param [properties] Properties to set
       * @returns Empty instance
       */
      static create(
        properties: google.protobuf.Empty.$Shape,
      ): google.protobuf.Empty & google.protobuf.Empty.$Shape;
      static create(properties?: google.protobuf.Empty.$Properties): google.protobuf.Empty;

      /**
       * Encodes the specified Empty message. Does not implicitly {@link google.protobuf.Empty.verify|verify} messages.
       * @param message Empty message or plain object to encode
       * @param [writer] Writer to encode to
       * @returns Writer
       */
      static encode(
        message: google.protobuf.Empty.$Properties,
        writer?: $protobuf.Writer,
      ): $protobuf.Writer;

      /**
       * Encodes the specified Empty message, length delimited. Does not implicitly {@link google.protobuf.Empty.verify|verify} messages.
       * @param message Empty message or plain object to encode
       * @param [writer] Writer to encode to
       * @returns Writer
       */
      static encodeDelimited(
        message: google.protobuf.Empty.$Properties,
        writer?: $protobuf.Writer,
      ): $protobuf.Writer;

      /**
       * Decodes an Empty message from the specified reader or buffer.
       * @param reader Reader or buffer to decode from
       * @param [length] Message length if known beforehand
       * @returns {google.protobuf.Empty & google.protobuf.Empty.$Shape} Empty
       * @throws {Error} If the payload is not a reader or valid buffer
       * @throws {$protobuf.util.ProtocolError} If required fields are missing
       */
      static decode(
        reader: $protobuf.Reader | Uint8Array,
        length?: number,
      ): google.protobuf.Empty & google.protobuf.Empty.$Shape;

      /**
       * Decodes an Empty message from the specified reader or buffer, length delimited.
       * @param reader Reader or buffer to decode from
       * @returns {google.protobuf.Empty & google.protobuf.Empty.$Shape} Empty
       * @throws {Error} If the payload is not a reader or valid buffer
       * @throws {$protobuf.util.ProtocolError} If required fields are missing
       */
      static decodeDelimited(
        reader: $protobuf.Reader | Uint8Array,
      ): google.protobuf.Empty & google.protobuf.Empty.$Shape;

      /**
       * Verifies an Empty message.
       * @param message Plain object to verify
       * @returns `null` if valid, otherwise the reason why it is not
       */
      static verify(message: { [k: string]: any }): string | null;

      /**
       * Creates an Empty message from a plain object. Also converts values to their respective internal types.
       * @param object Plain object
       * @returns Empty
       */
      static fromObject(object: { [k: string]: any }): google.protobuf.Empty;

      /**
       * Creates a plain object from an Empty message. Also converts values to other types if specified.
       * @param message Empty
       * @param [options] Conversion options
       * @returns Plain object
       */
      static toObject(
        message: google.protobuf.Empty,
        options?: $protobuf.IConversionOptions,
      ): { [k: string]: any };

      /**
       * Converts this Empty to JSON.
       * @returns JSON object
       */
      toJSON(): { [k: string]: any };

      /**
       * Gets the type url for Empty
       * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
       * @returns The type url
       */
      static getTypeUrl(prefix?: string): string;
    }

    namespace Empty {
      /** Properties of an Empty. */
      interface $Properties {
        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];
      }

      /** Shape of an Empty. */
      type $Shape = google.protobuf.Empty.$Properties;
    }

    /**
     * Properties of a Struct.
     * @deprecated Use google.protobuf.Struct.$Properties instead.
     */
    interface IStruct extends google.protobuf.Struct.$Properties {}

    /** Represents a Struct. */
    class Struct {
      /**
       * Constructs a new Struct.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.Struct.$Properties);

      /** Unknown fields preserved while decoding */
      $unknowns?: Uint8Array[];

      /** Struct fields. */
      fields: { [k: string]: google.protobuf.Value.$Properties };

      /**
       * Creates a new Struct instance using the specified properties.
       * @param [properties] Properties to set
       * @returns Struct instance
       */
      static create(
        properties: google.protobuf.Struct.$Shape,
      ): google.protobuf.Struct & google.protobuf.Struct.$Shape;
      static create(properties?: google.protobuf.Struct.$Properties): google.protobuf.Struct;

      /**
       * Encodes the specified Struct message. Does not implicitly {@link google.protobuf.Struct.verify|verify} messages.
       * @param message Struct message or plain object to encode
       * @param [writer] Writer to encode to
       * @returns Writer
       */
      static encode(
        message: google.protobuf.Struct.$Properties,
        writer?: $protobuf.Writer,
      ): $protobuf.Writer;

      /**
       * Encodes the specified Struct message, length delimited. Does not implicitly {@link google.protobuf.Struct.verify|verify} messages.
       * @param message Struct message or plain object to encode
       * @param [writer] Writer to encode to
       * @returns Writer
       */
      static encodeDelimited(
        message: google.protobuf.Struct.$Properties,
        writer?: $protobuf.Writer,
      ): $protobuf.Writer;

      /**
       * Decodes a Struct message from the specified reader or buffer.
       * @param reader Reader or buffer to decode from
       * @param [length] Message length if known beforehand
       * @returns {google.protobuf.Struct & google.protobuf.Struct.$Shape} Struct
       * @throws {Error} If the payload is not a reader or valid buffer
       * @throws {$protobuf.util.ProtocolError} If required fields are missing
       */
      static decode(
        reader: $protobuf.Reader | Uint8Array,
        length?: number,
      ): google.protobuf.Struct & google.protobuf.Struct.$Shape;

      /**
       * Decodes a Struct message from the specified reader or buffer, length delimited.
       * @param reader Reader or buffer to decode from
       * @returns {google.protobuf.Struct & google.protobuf.Struct.$Shape} Struct
       * @throws {Error} If the payload is not a reader or valid buffer
       * @throws {$protobuf.util.ProtocolError} If required fields are missing
       */
      static decodeDelimited(
        reader: $protobuf.Reader | Uint8Array,
      ): google.protobuf.Struct & google.protobuf.Struct.$Shape;

      /**
       * Verifies a Struct message.
       * @param message Plain object to verify
       * @returns `null` if valid, otherwise the reason why it is not
       */
      static verify(message: { [k: string]: any }): string | null;

      /**
       * Creates a Struct message from a plain object. Also converts values to their respective internal types.
       * @param object Plain object
       * @returns Struct
       */
      static fromObject(object: { [k: string]: any }): google.protobuf.Struct;

      /**
       * Creates a plain object from a Struct message. Also converts values to other types if specified.
       * @param message Struct
       * @param [options] Conversion options
       * @returns Plain object
       */
      static toObject(
        message: google.protobuf.Struct,
        options?: $protobuf.IConversionOptions,
      ): { [k: string]: any };

      /**
       * Converts this Struct to JSON.
       * @returns JSON object
       */
      toJSON(): { [k: string]: any };

      /**
       * Gets the type url for Struct
       * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
       * @returns The type url
       */
      static getTypeUrl(prefix?: string): string;
    }

    namespace Struct {
      /** Properties of a Struct. */
      interface $Properties {
        /** Struct fields */
        fields?: { [k: string]: google.protobuf.Value.$Properties } | null;

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];
      }

      /** Shape of a Struct. */
      type $Shape = {
        fields?: { [k: string]: google.protobuf.Value.$Shape } | null;
        $unknowns?: Uint8Array[];
      };
    }

    /**
     * Properties of a Value.
     * @deprecated Use google.protobuf.Value.$Properties instead.
     */
    interface IValue extends google.protobuf.Value.$Properties {}

    /** Represents a Value. */
    class Value {
      /**
       * Constructs a new Value.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.Value.$Properties);

      /** Unknown fields preserved while decoding */
      $unknowns?: Uint8Array[];

      /** Value nullValue. */
      nullValue?: google.protobuf.NullValue | null;

      /** Value numberValue. */
      numberValue?: number | null;

      /** Value stringValue. */
      stringValue?: string | null;

      /** Value boolValue. */
      boolValue?: boolean | null;

      /** Value structValue. */
      structValue?: google.protobuf.Struct.$Properties | null;

      /** Value listValue. */
      listValue?: google.protobuf.ListValue.$Properties | null;

      /** Value kind. */
      kind?:
        | 'nullValue'
        | 'numberValue'
        | 'stringValue'
        | 'boolValue'
        | 'structValue'
        | 'listValue';

      /**
       * Creates a new Value instance using the specified properties.
       * @param [properties] Properties to set
       * @returns Value instance
       */
      static create(
        properties: google.protobuf.Value.$Shape,
      ): google.protobuf.Value & google.protobuf.Value.$Shape;
      static create(properties?: google.protobuf.Value.$Properties): google.protobuf.Value;

      /**
       * Encodes the specified Value message. Does not implicitly {@link google.protobuf.Value.verify|verify} messages.
       * @param message Value message or plain object to encode
       * @param [writer] Writer to encode to
       * @returns Writer
       */
      static encode(
        message: google.protobuf.Value.$Properties,
        writer?: $protobuf.Writer,
      ): $protobuf.Writer;

      /**
       * Encodes the specified Value message, length delimited. Does not implicitly {@link google.protobuf.Value.verify|verify} messages.
       * @param message Value message or plain object to encode
       * @param [writer] Writer to encode to
       * @returns Writer
       */
      static encodeDelimited(
        message: google.protobuf.Value.$Properties,
        writer?: $protobuf.Writer,
      ): $protobuf.Writer;

      /**
       * Decodes a Value message from the specified reader or buffer.
       * @param reader Reader or buffer to decode from
       * @param [length] Message length if known beforehand
       * @returns {google.protobuf.Value & google.protobuf.Value.$Shape} Value
       * @throws {Error} If the payload is not a reader or valid buffer
       * @throws {$protobuf.util.ProtocolError} If required fields are missing
       */
      static decode(
        reader: $protobuf.Reader | Uint8Array,
        length?: number,
      ): google.protobuf.Value & google.protobuf.Value.$Shape;

      /**
       * Decodes a Value message from the specified reader or buffer, length delimited.
       * @param reader Reader or buffer to decode from
       * @returns {google.protobuf.Value & google.protobuf.Value.$Shape} Value
       * @throws {Error} If the payload is not a reader or valid buffer
       * @throws {$protobuf.util.ProtocolError} If required fields are missing
       */
      static decodeDelimited(
        reader: $protobuf.Reader | Uint8Array,
      ): google.protobuf.Value & google.protobuf.Value.$Shape;

      /**
       * Verifies a Value message.
       * @param message Plain object to verify
       * @returns `null` if valid, otherwise the reason why it is not
       */
      static verify(message: { [k: string]: any }): string | null;

      /**
       * Creates a Value message from a plain object. Also converts values to their respective internal types.
       * @param object Plain object
       * @returns Value
       */
      static fromObject(object: { [k: string]: any }): google.protobuf.Value;

      /**
       * Creates a plain object from a Value message. Also converts values to other types if specified.
       * @param message Value
       * @param [options] Conversion options
       * @returns Plain object
       */
      static toObject(
        message: google.protobuf.Value,
        options?: $protobuf.IConversionOptions,
      ): { [k: string]: any };

      /**
       * Converts this Value to JSON.
       * @returns JSON object
       */
      toJSON(): { [k: string]: any };

      /**
       * Gets the type url for Value
       * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
       * @returns The type url
       */
      static getTypeUrl(prefix?: string): string;
    }

    namespace Value {
      /** Properties of a Value. */
      interface $Properties {
        /** Value nullValue */
        nullValue?: google.protobuf.NullValue | null;

        /** Value numberValue */
        numberValue?: number | null;

        /** Value stringValue */
        stringValue?: string | null;

        /** Value boolValue */
        boolValue?: boolean | null;

        /** Value structValue */
        structValue?: google.protobuf.Struct.$Properties | null;

        /** Value listValue */
        listValue?: google.protobuf.ListValue.$Properties | null;

        /** Value kind */
        kind?:
          | 'nullValue'
          | 'numberValue'
          | 'stringValue'
          | 'boolValue'
          | 'structValue'
          | 'listValue';

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];
      }

      /** Narrowed shape of a Value. */
      type $Shape = {
        nullValue?: google.protobuf.NullValue | null;
        numberValue?: number | null;
        stringValue?: string | null;
        boolValue?: boolean | null;
        structValue?: google.protobuf.Struct.$Shape | null;
        listValue?: google.protobuf.ListValue.$Shape | null;
        $unknowns?: Uint8Array[];
      } & (
        | {
            kind?: undefined;
            nullValue?: null;
            numberValue?: null;
            stringValue?: null;
            boolValue?: null;
            structValue?: null;
            listValue?: null;
          }
        | {
            kind?: 'nullValue';
            nullValue: google.protobuf.NullValue;
            numberValue?: null;
            stringValue?: null;
            boolValue?: null;
            structValue?: null;
            listValue?: null;
          }
        | {
            kind?: 'numberValue';
            nullValue?: null;
            numberValue: number;
            stringValue?: null;
            boolValue?: null;
            structValue?: null;
            listValue?: null;
          }
        | {
            kind?: 'stringValue';
            nullValue?: null;
            numberValue?: null;
            stringValue: string;
            boolValue?: null;
            structValue?: null;
            listValue?: null;
          }
        | {
            kind?: 'boolValue';
            nullValue?: null;
            numberValue?: null;
            stringValue?: null;
            boolValue: boolean;
            structValue?: null;
            listValue?: null;
          }
        | {
            kind?: 'structValue';
            nullValue?: null;
            numberValue?: null;
            stringValue?: null;
            boolValue?: null;
            structValue: google.protobuf.Struct.$Shape;
            listValue?: null;
          }
        | {
            kind?: 'listValue';
            nullValue?: null;
            numberValue?: null;
            stringValue?: null;
            boolValue?: null;
            structValue?: null;
            listValue: google.protobuf.ListValue.$Shape;
          }
      );
    }

    /** NullValue enum. */
    enum NullValue {
      /** NULL_VALUE value */
      NULL_VALUE = 0,
    }

    /**
     * Properties of a ListValue.
     * @deprecated Use google.protobuf.ListValue.$Properties instead.
     */
    interface IListValue extends google.protobuf.ListValue.$Properties {}

    /** Represents a ListValue. */
    class ListValue {
      /**
       * Constructs a new ListValue.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.ListValue.$Properties);

      /** Unknown fields preserved while decoding */
      $unknowns?: Uint8Array[];

      /** ListValue values. */
      values: google.protobuf.Value.$Properties[];

      /**
       * Creates a new ListValue instance using the specified properties.
       * @param [properties] Properties to set
       * @returns ListValue instance
       */
      static create(
        properties: google.protobuf.ListValue.$Shape,
      ): google.protobuf.ListValue & google.protobuf.ListValue.$Shape;
      static create(properties?: google.protobuf.ListValue.$Properties): google.protobuf.ListValue;

      /**
       * Encodes the specified ListValue message. Does not implicitly {@link google.protobuf.ListValue.verify|verify} messages.
       * @param message ListValue message or plain object to encode
       * @param [writer] Writer to encode to
       * @returns Writer
       */
      static encode(
        message: google.protobuf.ListValue.$Properties,
        writer?: $protobuf.Writer,
      ): $protobuf.Writer;

      /**
       * Encodes the specified ListValue message, length delimited. Does not implicitly {@link google.protobuf.ListValue.verify|verify} messages.
       * @param message ListValue message or plain object to encode
       * @param [writer] Writer to encode to
       * @returns Writer
       */
      static encodeDelimited(
        message: google.protobuf.ListValue.$Properties,
        writer?: $protobuf.Writer,
      ): $protobuf.Writer;

      /**
       * Decodes a ListValue message from the specified reader or buffer.
       * @param reader Reader or buffer to decode from
       * @param [length] Message length if known beforehand
       * @returns {google.protobuf.ListValue & google.protobuf.ListValue.$Shape} ListValue
       * @throws {Error} If the payload is not a reader or valid buffer
       * @throws {$protobuf.util.ProtocolError} If required fields are missing
       */
      static decode(
        reader: $protobuf.Reader | Uint8Array,
        length?: number,
      ): google.protobuf.ListValue & google.protobuf.ListValue.$Shape;

      /**
       * Decodes a ListValue message from the specified reader or buffer, length delimited.
       * @param reader Reader or buffer to decode from
       * @returns {google.protobuf.ListValue & google.protobuf.ListValue.$Shape} ListValue
       * @throws {Error} If the payload is not a reader or valid buffer
       * @throws {$protobuf.util.ProtocolError} If required fields are missing
       */
      static decodeDelimited(
        reader: $protobuf.Reader | Uint8Array,
      ): google.protobuf.ListValue & google.protobuf.ListValue.$Shape;

      /**
       * Verifies a ListValue message.
       * @param message Plain object to verify
       * @returns `null` if valid, otherwise the reason why it is not
       */
      static verify(message: { [k: string]: any }): string | null;

      /**
       * Creates a ListValue message from a plain object. Also converts values to their respective internal types.
       * @param object Plain object
       * @returns ListValue
       */
      static fromObject(object: { [k: string]: any }): google.protobuf.ListValue;

      /**
       * Creates a plain object from a ListValue message. Also converts values to other types if specified.
       * @param message ListValue
       * @param [options] Conversion options
       * @returns Plain object
       */
      static toObject(
        message: google.protobuf.ListValue,
        options?: $protobuf.IConversionOptions,
      ): { [k: string]: any };

      /**
       * Converts this ListValue to JSON.
       * @returns JSON object
       */
      toJSON(): { [k: string]: any };

      /**
       * Gets the type url for ListValue
       * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
       * @returns The type url
       */
      static getTypeUrl(prefix?: string): string;
    }

    namespace ListValue {
      /** Properties of a ListValue. */
      interface $Properties {
        /** ListValue values */
        values?: google.protobuf.Value.$Properties[] | null;

        /** Unknown fields preserved while decoding */
        $unknowns?: Uint8Array[];
      }

      /** Shape of a ListValue. */
      type $Shape = {
        values?: google.protobuf.Value.$Shape[] | null;
        $unknowns?: Uint8Array[];
      };
    }
  }
}
