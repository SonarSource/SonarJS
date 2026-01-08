/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import $protobuf from 'protobufjs/minimal.js';

// Common aliases
const $Reader = $protobuf.Reader,
  $Writer = $protobuf.Writer,
  $util = $protobuf.util;

// Exported root namespace
const $root = $protobuf.roots['default'] || ($protobuf.roots['default'] = {});

export const grpc = ($root.grpc = (() => {
  /**
   * Namespace grpc.
   * @exports grpc
   * @namespace
   */
  const grpc = {};

  grpc.health = (function () {
    /**
     * Namespace health.
     * @memberof grpc
     * @namespace
     */
    const health = {};

    health.v1 = (function () {
      /**
       * Namespace v1.
       * @memberof grpc.health
       * @namespace
       */
      const v1 = {};

      v1.HealthCheckRequest = (function () {
        /**
         * Properties of a HealthCheckRequest.
         * @memberof grpc.health.v1
         * @interface IHealthCheckRequest
         * @property {string|null} [service] HealthCheckRequest service
         */

        /**
         * Constructs a new HealthCheckRequest.
         * @memberof grpc.health.v1
         * @classdesc Represents a HealthCheckRequest.
         * @implements IHealthCheckRequest
         * @constructor
         * @param {grpc.health.v1.IHealthCheckRequest=} [properties] Properties to set
         */
        function HealthCheckRequest(properties) {
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
        }

        /**
         * HealthCheckRequest service.
         * @member {string} service
         * @memberof grpc.health.v1.HealthCheckRequest
         * @instance
         */
        HealthCheckRequest.prototype.service = '';

        /**
         * Creates a new HealthCheckRequest instance using the specified properties.
         * @function create
         * @memberof grpc.health.v1.HealthCheckRequest
         * @static
         * @param {grpc.health.v1.IHealthCheckRequest=} [properties] Properties to set
         * @returns {grpc.health.v1.HealthCheckRequest} HealthCheckRequest instance
         */
        HealthCheckRequest.create = function create(properties) {
          return new HealthCheckRequest(properties);
        };

        /**
         * Encodes the specified HealthCheckRequest message. Does not implicitly {@link grpc.health.v1.HealthCheckRequest.verify|verify} messages.
         * @function encode
         * @memberof grpc.health.v1.HealthCheckRequest
         * @static
         * @param {grpc.health.v1.IHealthCheckRequest} message HealthCheckRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HealthCheckRequest.encode = function encode(message, writer) {
          if (!writer) writer = $Writer.create();
          if (message.service != null && Object.hasOwnProperty.call(message, 'service'))
            writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.service);
          return writer;
        };

        /**
         * Encodes the specified HealthCheckRequest message, length delimited. Does not implicitly {@link grpc.health.v1.HealthCheckRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof grpc.health.v1.HealthCheckRequest
         * @static
         * @param {grpc.health.v1.IHealthCheckRequest} message HealthCheckRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HealthCheckRequest.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a HealthCheckRequest message from the specified reader or buffer.
         * @function decode
         * @memberof grpc.health.v1.HealthCheckRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {grpc.health.v1.HealthCheckRequest} HealthCheckRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HealthCheckRequest.decode = function decode(reader, length) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          let end = length === undefined ? reader.len : reader.pos + length,
            message = new $root.grpc.health.v1.HealthCheckRequest();
          while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
              case 1: {
                message.service = reader.string();
                break;
              }
              default:
                reader.skipType(tag & 7);
                break;
            }
          }
          return message;
        };

        /**
         * Decodes a HealthCheckRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof grpc.health.v1.HealthCheckRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {grpc.health.v1.HealthCheckRequest} HealthCheckRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HealthCheckRequest.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a HealthCheckRequest message.
         * @function verify
         * @memberof grpc.health.v1.HealthCheckRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        HealthCheckRequest.verify = function verify(message) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (message.service != null && message.hasOwnProperty('service'))
            if (!$util.isString(message.service)) return 'service: string expected';
          return null;
        };

        /**
         * Creates a HealthCheckRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof grpc.health.v1.HealthCheckRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {grpc.health.v1.HealthCheckRequest} HealthCheckRequest
         */
        HealthCheckRequest.fromObject = function fromObject(object) {
          if (object instanceof $root.grpc.health.v1.HealthCheckRequest) return object;
          let message = new $root.grpc.health.v1.HealthCheckRequest();
          if (object.service != null) message.service = String(object.service);
          return message;
        };

        /**
         * Creates a plain object from a HealthCheckRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof grpc.health.v1.HealthCheckRequest
         * @static
         * @param {grpc.health.v1.HealthCheckRequest} message HealthCheckRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        HealthCheckRequest.toObject = function toObject(message, options) {
          if (!options) options = {};
          let object = {};
          if (options.defaults) object.service = '';
          if (message.service != null && message.hasOwnProperty('service'))
            object.service = message.service;
          return object;
        };

        /**
         * Converts this HealthCheckRequest to JSON.
         * @function toJSON
         * @memberof grpc.health.v1.HealthCheckRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        HealthCheckRequest.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for HealthCheckRequest
         * @function getTypeUrl
         * @memberof grpc.health.v1.HealthCheckRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        HealthCheckRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
          if (typeUrlPrefix === undefined) {
            typeUrlPrefix = 'type.googleapis.com';
          }
          return typeUrlPrefix + '/grpc.health.v1.HealthCheckRequest';
        };

        return HealthCheckRequest;
      })();

      v1.HealthCheckResponse = (function () {
        /**
         * Properties of a HealthCheckResponse.
         * @memberof grpc.health.v1
         * @interface IHealthCheckResponse
         * @property {grpc.health.v1.HealthCheckResponse.ServingStatus|null} [status] HealthCheckResponse status
         */

        /**
         * Constructs a new HealthCheckResponse.
         * @memberof grpc.health.v1
         * @classdesc Represents a HealthCheckResponse.
         * @implements IHealthCheckResponse
         * @constructor
         * @param {grpc.health.v1.IHealthCheckResponse=} [properties] Properties to set
         */
        function HealthCheckResponse(properties) {
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
        }

        /**
         * HealthCheckResponse status.
         * @member {grpc.health.v1.HealthCheckResponse.ServingStatus} status
         * @memberof grpc.health.v1.HealthCheckResponse
         * @instance
         */
        HealthCheckResponse.prototype.status = 0;

        /**
         * Creates a new HealthCheckResponse instance using the specified properties.
         * @function create
         * @memberof grpc.health.v1.HealthCheckResponse
         * @static
         * @param {grpc.health.v1.IHealthCheckResponse=} [properties] Properties to set
         * @returns {grpc.health.v1.HealthCheckResponse} HealthCheckResponse instance
         */
        HealthCheckResponse.create = function create(properties) {
          return new HealthCheckResponse(properties);
        };

        /**
         * Encodes the specified HealthCheckResponse message. Does not implicitly {@link grpc.health.v1.HealthCheckResponse.verify|verify} messages.
         * @function encode
         * @memberof grpc.health.v1.HealthCheckResponse
         * @static
         * @param {grpc.health.v1.IHealthCheckResponse} message HealthCheckResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HealthCheckResponse.encode = function encode(message, writer) {
          if (!writer) writer = $Writer.create();
          if (message.status != null && Object.hasOwnProperty.call(message, 'status'))
            writer.uint32(/* id 1, wireType 0 =*/ 8).int32(message.status);
          return writer;
        };

        /**
         * Encodes the specified HealthCheckResponse message, length delimited. Does not implicitly {@link grpc.health.v1.HealthCheckResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof grpc.health.v1.HealthCheckResponse
         * @static
         * @param {grpc.health.v1.IHealthCheckResponse} message HealthCheckResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HealthCheckResponse.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a HealthCheckResponse message from the specified reader or buffer.
         * @function decode
         * @memberof grpc.health.v1.HealthCheckResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {grpc.health.v1.HealthCheckResponse} HealthCheckResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HealthCheckResponse.decode = function decode(reader, length) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          let end = length === undefined ? reader.len : reader.pos + length,
            message = new $root.grpc.health.v1.HealthCheckResponse();
          while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
              case 1: {
                message.status = reader.int32();
                break;
              }
              default:
                reader.skipType(tag & 7);
                break;
            }
          }
          return message;
        };

        /**
         * Decodes a HealthCheckResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof grpc.health.v1.HealthCheckResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {grpc.health.v1.HealthCheckResponse} HealthCheckResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HealthCheckResponse.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a HealthCheckResponse message.
         * @function verify
         * @memberof grpc.health.v1.HealthCheckResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        HealthCheckResponse.verify = function verify(message) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (message.status != null && message.hasOwnProperty('status'))
            switch (message.status) {
              default:
                return 'status: enum value expected';
              case 0:
              case 1:
              case 2:
              case 3:
                break;
            }
          return null;
        };

        /**
         * Creates a HealthCheckResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof grpc.health.v1.HealthCheckResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {grpc.health.v1.HealthCheckResponse} HealthCheckResponse
         */
        HealthCheckResponse.fromObject = function fromObject(object) {
          if (object instanceof $root.grpc.health.v1.HealthCheckResponse) return object;
          let message = new $root.grpc.health.v1.HealthCheckResponse();
          switch (object.status) {
            default:
              if (typeof object.status === 'number') {
                message.status = object.status;
                break;
              }
              break;
            case 'UNKNOWN':
            case 0:
              message.status = 0;
              break;
            case 'SERVING':
            case 1:
              message.status = 1;
              break;
            case 'NOT_SERVING':
            case 2:
              message.status = 2;
              break;
            case 'SERVICE_UNKNOWN':
            case 3:
              message.status = 3;
              break;
          }
          return message;
        };

        /**
         * Creates a plain object from a HealthCheckResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof grpc.health.v1.HealthCheckResponse
         * @static
         * @param {grpc.health.v1.HealthCheckResponse} message HealthCheckResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        HealthCheckResponse.toObject = function toObject(message, options) {
          if (!options) options = {};
          let object = {};
          if (options.defaults) object.status = options.enums === String ? 'UNKNOWN' : 0;
          if (message.status != null && message.hasOwnProperty('status'))
            object.status =
              options.enums === String
                ? $root.grpc.health.v1.HealthCheckResponse.ServingStatus[message.status] ===
                  undefined
                  ? message.status
                  : $root.grpc.health.v1.HealthCheckResponse.ServingStatus[message.status]
                : message.status;
          return object;
        };

        /**
         * Converts this HealthCheckResponse to JSON.
         * @function toJSON
         * @memberof grpc.health.v1.HealthCheckResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        HealthCheckResponse.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for HealthCheckResponse
         * @function getTypeUrl
         * @memberof grpc.health.v1.HealthCheckResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        HealthCheckResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
          if (typeUrlPrefix === undefined) {
            typeUrlPrefix = 'type.googleapis.com';
          }
          return typeUrlPrefix + '/grpc.health.v1.HealthCheckResponse';
        };

        /**
         * ServingStatus enum.
         * @name grpc.health.v1.HealthCheckResponse.ServingStatus
         * @enum {number}
         * @property {number} UNKNOWN=0 UNKNOWN value
         * @property {number} SERVING=1 SERVING value
         * @property {number} NOT_SERVING=2 NOT_SERVING value
         * @property {number} SERVICE_UNKNOWN=3 SERVICE_UNKNOWN value
         */
        HealthCheckResponse.ServingStatus = (function () {
          const valuesById = {},
            values = Object.create(valuesById);
          values[(valuesById[0] = 'UNKNOWN')] = 0;
          values[(valuesById[1] = 'SERVING')] = 1;
          values[(valuesById[2] = 'NOT_SERVING')] = 2;
          values[(valuesById[3] = 'SERVICE_UNKNOWN')] = 3;
          return values;
        })();

        return HealthCheckResponse;
      })();

      v1.Health = (function () {
        /**
         * Constructs a new Health service.
         * @memberof grpc.health.v1
         * @classdesc Represents a Health
         * @extends $protobuf.rpc.Service
         * @constructor
         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
         */
        function Health(rpcImpl, requestDelimited, responseDelimited) {
          $protobuf.rpc.Service.call(this, rpcImpl, requestDelimited, responseDelimited);
        }

        (Health.prototype = Object.create($protobuf.rpc.Service.prototype)).constructor = Health;

        /**
         * Creates new Health service using the specified rpc implementation.
         * @function create
         * @memberof grpc.health.v1.Health
         * @static
         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
         * @returns {Health} RPC service. Useful where requests and/or responses are streamed.
         */
        Health.create = function create(rpcImpl, requestDelimited, responseDelimited) {
          return new this(rpcImpl, requestDelimited, responseDelimited);
        };

        /**
         * Callback as used by {@link grpc.health.v1.Health#check}.
         * @memberof grpc.health.v1.Health
         * @typedef CheckCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {grpc.health.v1.HealthCheckResponse} [response] HealthCheckResponse
         */

        /**
         * Calls Check.
         * @function check
         * @memberof grpc.health.v1.Health
         * @instance
         * @param {grpc.health.v1.IHealthCheckRequest} request HealthCheckRequest message or plain object
         * @param {grpc.health.v1.Health.CheckCallback} callback Node-style callback called with the error, if any, and HealthCheckResponse
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(
          (Health.prototype.check = function check(request, callback) {
            return this.rpcCall(
              check,
              $root.grpc.health.v1.HealthCheckRequest,
              $root.grpc.health.v1.HealthCheckResponse,
              request,
              callback,
            );
          }),
          'name',
          { value: 'Check' },
        );

        /**
         * Calls Check.
         * @function check
         * @memberof grpc.health.v1.Health
         * @instance
         * @param {grpc.health.v1.IHealthCheckRequest} request HealthCheckRequest message or plain object
         * @returns {Promise<grpc.health.v1.HealthCheckResponse>} Promise
         * @variation 2
         */

        return Health;
      })();

      return v1;
    })();

    return health;
  })();

  return grpc;
})());

export { $root as default };
