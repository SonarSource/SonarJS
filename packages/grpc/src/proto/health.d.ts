import * as $protobuf from 'protobufjs';
import Long = require('long');
/** Namespace grpc. */
export namespace grpc {
  /** Namespace health. */
  namespace health {
    /** Namespace v1. */
    namespace v1 {
      /** Properties of a HealthCheckRequest. */
      interface IHealthCheckRequest {
        /** HealthCheckRequest service */
        service?: string | null;
      }

      /** Represents a HealthCheckRequest. */
      class HealthCheckRequest implements IHealthCheckRequest {
        /**
         * Constructs a new HealthCheckRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: grpc.health.v1.IHealthCheckRequest);

        /** HealthCheckRequest service. */
        public service: string;

        /**
         * Creates a new HealthCheckRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns HealthCheckRequest instance
         */
        public static create(
          properties?: grpc.health.v1.IHealthCheckRequest,
        ): grpc.health.v1.HealthCheckRequest;

        /**
         * Encodes the specified HealthCheckRequest message. Does not implicitly {@link grpc.health.v1.HealthCheckRequest.verify|verify} messages.
         * @param message HealthCheckRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(
          message: grpc.health.v1.IHealthCheckRequest,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified HealthCheckRequest message, length delimited. Does not implicitly {@link grpc.health.v1.HealthCheckRequest.verify|verify} messages.
         * @param message HealthCheckRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(
          message: grpc.health.v1.IHealthCheckRequest,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes a HealthCheckRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns HealthCheckRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): grpc.health.v1.HealthCheckRequest;

        /**
         * Decodes a HealthCheckRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns HealthCheckRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): grpc.health.v1.HealthCheckRequest;

        /**
         * Verifies a HealthCheckRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates a HealthCheckRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns HealthCheckRequest
         */
        public static fromObject(object: { [k: string]: any }): grpc.health.v1.HealthCheckRequest;

        /**
         * Creates a plain object from a HealthCheckRequest message. Also converts values to other types if specified.
         * @param message HealthCheckRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(
          message: grpc.health.v1.HealthCheckRequest,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this HealthCheckRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for HealthCheckRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
      }

      /** Properties of a HealthCheckResponse. */
      interface IHealthCheckResponse {
        /** HealthCheckResponse status */
        status?: grpc.health.v1.HealthCheckResponse.ServingStatus | null;
      }

      /** Represents a HealthCheckResponse. */
      class HealthCheckResponse implements IHealthCheckResponse {
        /**
         * Constructs a new HealthCheckResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: grpc.health.v1.IHealthCheckResponse);

        /** HealthCheckResponse status. */
        public status: grpc.health.v1.HealthCheckResponse.ServingStatus;

        /**
         * Creates a new HealthCheckResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns HealthCheckResponse instance
         */
        public static create(
          properties?: grpc.health.v1.IHealthCheckResponse,
        ): grpc.health.v1.HealthCheckResponse;

        /**
         * Encodes the specified HealthCheckResponse message. Does not implicitly {@link grpc.health.v1.HealthCheckResponse.verify|verify} messages.
         * @param message HealthCheckResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(
          message: grpc.health.v1.IHealthCheckResponse,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Encodes the specified HealthCheckResponse message, length delimited. Does not implicitly {@link grpc.health.v1.HealthCheckResponse.verify|verify} messages.
         * @param message HealthCheckResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(
          message: grpc.health.v1.IHealthCheckResponse,
          writer?: $protobuf.Writer,
        ): $protobuf.Writer;

        /**
         * Decodes a HealthCheckResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns HealthCheckResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(
          reader: $protobuf.Reader | Uint8Array,
          length?: number,
        ): grpc.health.v1.HealthCheckResponse;

        /**
         * Decodes a HealthCheckResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns HealthCheckResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(
          reader: $protobuf.Reader | Uint8Array,
        ): grpc.health.v1.HealthCheckResponse;

        /**
         * Verifies a HealthCheckResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): string | null;

        /**
         * Creates a HealthCheckResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns HealthCheckResponse
         */
        public static fromObject(object: { [k: string]: any }): grpc.health.v1.HealthCheckResponse;

        /**
         * Creates a plain object from a HealthCheckResponse message. Also converts values to other types if specified.
         * @param message HealthCheckResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(
          message: grpc.health.v1.HealthCheckResponse,
          options?: $protobuf.IConversionOptions,
        ): { [k: string]: any };

        /**
         * Converts this HealthCheckResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for HealthCheckResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
      }

      namespace HealthCheckResponse {
        /** ServingStatus enum. */
        enum ServingStatus {
          UNKNOWN = 0,
          SERVING = 1,
          NOT_SERVING = 2,
          SERVICE_UNKNOWN = 3,
        }
      }

      /** Represents a Health */
      class Health extends $protobuf.rpc.Service {
        /**
         * Constructs a new Health service.
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
         * Creates new Health service using the specified rpc implementation.
         * @param rpcImpl RPC implementation
         * @param [requestDelimited=false] Whether requests are length-delimited
         * @param [responseDelimited=false] Whether responses are length-delimited
         * @returns RPC service. Useful where requests and/or responses are streamed.
         */
        public static create(
          rpcImpl: $protobuf.RPCImpl,
          requestDelimited?: boolean,
          responseDelimited?: boolean,
        ): Health;

        /**
         * Calls Check.
         * @param request HealthCheckRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and HealthCheckResponse
         */
        public check(
          request: grpc.health.v1.IHealthCheckRequest,
          callback: grpc.health.v1.Health.CheckCallback,
        ): void;

        /**
         * Calls Check.
         * @param request HealthCheckRequest message or plain object
         * @returns Promise
         */
        public check(
          request: grpc.health.v1.IHealthCheckRequest,
        ): Promise<grpc.health.v1.HealthCheckResponse>;
      }

      namespace Health {
        /**
         * Callback as used by {@link grpc.health.v1.Health#check}.
         * @param error Error, if any
         * @param [response] HealthCheckResponse
         */
        type CheckCallback = (
          error: Error | null,
          response?: grpc.health.v1.HealthCheckResponse,
        ) => void;
      }
    }
  }
}
