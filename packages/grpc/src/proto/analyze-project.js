/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-mixed-operators, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars, default-case, jsdoc/require-param*/
/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
const $root = {};

export const sonarjs = ($root.sonarjs = (() => {
  /**
   * Namespace sonarjs.
   * @exports sonarjs
   * @namespace
   */
  const sonarjs = {};

  sonarjs.analyzeproject = (function () {
    /**
     * Namespace analyzeproject.
     * @memberof sonarjs
     * @namespace
     */
    const analyzeproject = {};

    analyzeproject.v1 = (function () {
      /**
       * Namespace v1.
       * @memberof sonarjs.analyzeproject
       * @namespace
       */
      const v1 = {};

      v1.AnalyzeProjectService = (function () {
        /**
         * Constructs a new AnalyzeProjectService service.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents an AnalyzeProjectService
         * @extends $protobuf.rpc.Service
         * @constructor
         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
         */
        function AnalyzeProjectService(rpcImpl, requestDelimited, responseDelimited) {
          $protobuf.rpc.Service.call(this, rpcImpl, requestDelimited, responseDelimited);
        }

        (AnalyzeProjectService.prototype = Object.create(
          $protobuf.rpc.Service.prototype,
        )).constructor = AnalyzeProjectService;

        /**
         * Creates new AnalyzeProjectService service using the specified rpc implementation.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectService
         * @static
         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
         * @returns {AnalyzeProjectService} RPC service. Useful where requests and/or responses are streamed.
         */
        AnalyzeProjectService.create = function create(
          rpcImpl,
          requestDelimited,
          responseDelimited,
        ) {
          return new this(rpcImpl, requestDelimited, responseDelimited);
        };

        /**
         * Callback as used by {@link sonarjs.analyzeproject.v1.AnalyzeProjectService#analyzeProject}.
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectService
         * @typedef AnalyzeProjectCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse} [response] AnalyzeProjectStreamResponse
         */

        /**
         * Calls AnalyzeProject.
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectService
         * @typedef AnalyzeProject
         * @type {{
         *   (request: sonarjs.analyzeproject.v1.IAnalyzeProjectRequest, callback: sonarjs.analyzeproject.v1.AnalyzeProjectService.AnalyzeProjectCallback): void;
         *   (request: sonarjs.analyzeproject.v1.IAnalyzeProjectRequest): Promise<sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse>;
         *   readonly name: "AnalyzeProject";
         *   readonly path: "/sonarjs.analyzeproject.v1.AnalyzeProjectService/AnalyzeProject";
         *   readonly requestType: "AnalyzeProjectRequest";
         *   readonly responseType: "AnalyzeProjectStreamResponse";
         *   readonly requestStream: undefined;
         *   readonly responseStream: true;
         * }}
         */

        /**
         * Calls AnalyzeProject.
         * @name sonarjs.analyzeproject.v1.AnalyzeProjectService#analyzeProject
         * @type {sonarjs.analyzeproject.v1.AnalyzeProjectService.AnalyzeProject}
         */
        Object.defineProperties(
          (AnalyzeProjectService.prototype.analyzeProject = function analyzeProject(
            request,
            callback,
          ) {
            return this.rpcCall(
              analyzeProject,
              $root.sonarjs.analyzeproject.v1.AnalyzeProjectRequest,
              $root.sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse,
              request,
              callback,
            );
          }),
          {
            name: { value: 'AnalyzeProject' },
            path: { value: '/sonarjs.analyzeproject.v1.AnalyzeProjectService/AnalyzeProject' },
            requestType: { value: 'AnalyzeProjectRequest' },
            responseType: { value: 'AnalyzeProjectStreamResponse' },
            requestStream: { value: undefined },
            responseStream: { value: true },
          },
        );

        /**
         * Callback as used by {@link sonarjs.analyzeproject.v1.AnalyzeProjectService#analyzeProjectUnary}.
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectService
         * @typedef AnalyzeProjectUnaryCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse} [response] AnalyzeProjectUnaryResponse
         */

        /**
         * Calls AnalyzeProjectUnary.
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectService
         * @typedef AnalyzeProjectUnary
         * @type {{
         *   (request: sonarjs.analyzeproject.v1.IAnalyzeProjectRequest, callback: sonarjs.analyzeproject.v1.AnalyzeProjectService.AnalyzeProjectUnaryCallback): void;
         *   (request: sonarjs.analyzeproject.v1.IAnalyzeProjectRequest): Promise<sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse>;
         *   readonly name: "AnalyzeProjectUnary";
         *   readonly path: "/sonarjs.analyzeproject.v1.AnalyzeProjectService/AnalyzeProjectUnary";
         *   readonly requestType: "AnalyzeProjectRequest";
         *   readonly responseType: "AnalyzeProjectUnaryResponse";
         *   readonly requestStream: undefined;
         *   readonly responseStream: undefined;
         * }}
         */

        /**
         * Calls AnalyzeProjectUnary.
         * @name sonarjs.analyzeproject.v1.AnalyzeProjectService#analyzeProjectUnary
         * @type {sonarjs.analyzeproject.v1.AnalyzeProjectService.AnalyzeProjectUnary}
         */
        Object.defineProperties(
          (AnalyzeProjectService.prototype.analyzeProjectUnary = function analyzeProjectUnary(
            request,
            callback,
          ) {
            return this.rpcCall(
              analyzeProjectUnary,
              $root.sonarjs.analyzeproject.v1.AnalyzeProjectRequest,
              $root.sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse,
              request,
              callback,
            );
          }),
          {
            name: { value: 'AnalyzeProjectUnary' },
            path: { value: '/sonarjs.analyzeproject.v1.AnalyzeProjectService/AnalyzeProjectUnary' },
            requestType: { value: 'AnalyzeProjectRequest' },
            responseType: { value: 'AnalyzeProjectUnaryResponse' },
            requestStream: { value: undefined },
            responseStream: { value: undefined },
          },
        );

        /**
         * Callback as used by {@link sonarjs.analyzeproject.v1.AnalyzeProjectService#cancelAnalysis}.
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectService
         * @typedef CancelAnalysisCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {sonarjs.analyzeproject.v1.CancelAnalysisResponse} [response] CancelAnalysisResponse
         */

        /**
         * Calls CancelAnalysis.
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectService
         * @typedef CancelAnalysis
         * @type {{
         *   (request: sonarjs.analyzeproject.v1.ICancelAnalysisRequest, callback: sonarjs.analyzeproject.v1.AnalyzeProjectService.CancelAnalysisCallback): void;
         *   (request: sonarjs.analyzeproject.v1.ICancelAnalysisRequest): Promise<sonarjs.analyzeproject.v1.CancelAnalysisResponse>;
         *   readonly name: "CancelAnalysis";
         *   readonly path: "/sonarjs.analyzeproject.v1.AnalyzeProjectService/CancelAnalysis";
         *   readonly requestType: "CancelAnalysisRequest";
         *   readonly responseType: "CancelAnalysisResponse";
         *   readonly requestStream: undefined;
         *   readonly responseStream: undefined;
         * }}
         */

        /**
         * Calls CancelAnalysis.
         * @name sonarjs.analyzeproject.v1.AnalyzeProjectService#cancelAnalysis
         * @type {sonarjs.analyzeproject.v1.AnalyzeProjectService.CancelAnalysis}
         */
        Object.defineProperties(
          (AnalyzeProjectService.prototype.cancelAnalysis = function cancelAnalysis(
            request,
            callback,
          ) {
            return this.rpcCall(
              cancelAnalysis,
              $root.sonarjs.analyzeproject.v1.CancelAnalysisRequest,
              $root.sonarjs.analyzeproject.v1.CancelAnalysisResponse,
              request,
              callback,
            );
          }),
          {
            name: { value: 'CancelAnalysis' },
            path: { value: '/sonarjs.analyzeproject.v1.AnalyzeProjectService/CancelAnalysis' },
            requestType: { value: 'CancelAnalysisRequest' },
            responseType: { value: 'CancelAnalysisResponse' },
            requestStream: { value: undefined },
            responseStream: { value: undefined },
          },
        );

        /**
         * Callback as used by {@link sonarjs.analyzeproject.v1.AnalyzeProjectService#lease}.
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectService
         * @typedef LeaseCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {sonarjs.analyzeproject.v1.LeaseResponse} [response] LeaseResponse
         */

        /**
         * Calls Lease.
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectService
         * @typedef Lease
         * @type {{
         *   (request: sonarjs.analyzeproject.v1.ILeaseRequest, callback: sonarjs.analyzeproject.v1.AnalyzeProjectService.LeaseCallback): void;
         *   (request: sonarjs.analyzeproject.v1.ILeaseRequest): Promise<sonarjs.analyzeproject.v1.LeaseResponse>;
         *   readonly name: "Lease";
         *   readonly path: "/sonarjs.analyzeproject.v1.AnalyzeProjectService/Lease";
         *   readonly requestType: "LeaseRequest";
         *   readonly responseType: "LeaseResponse";
         *   readonly requestStream: true;
         *   readonly responseStream: true;
         * }}
         */

        /**
         * Calls Lease.
         * @name sonarjs.analyzeproject.v1.AnalyzeProjectService#lease
         * @type {sonarjs.analyzeproject.v1.AnalyzeProjectService.Lease}
         */
        Object.defineProperties(
          (AnalyzeProjectService.prototype.lease = function lease(request, callback) {
            return this.rpcCall(
              lease,
              $root.sonarjs.analyzeproject.v1.LeaseRequest,
              $root.sonarjs.analyzeproject.v1.LeaseResponse,
              request,
              callback,
            );
          }),
          {
            name: { value: 'Lease' },
            path: { value: '/sonarjs.analyzeproject.v1.AnalyzeProjectService/Lease' },
            requestType: { value: 'LeaseRequest' },
            responseType: { value: 'LeaseResponse' },
            requestStream: { value: true },
            responseStream: { value: true },
          },
        );

        return AnalyzeProjectService;
      })();

      v1.AnalyzeProjectRequest = (function () {
        /**
         * Properties of an AnalyzeProjectRequest.
         * @typedef {Object} sonarjs.analyzeproject.v1.AnalyzeProjectRequest.$Properties
         * @property {sonarjs.analyzeproject.v1.ProjectConfiguration.$Properties|null} [configuration] AnalyzeProjectRequest configuration
         * @property {Object.<string,sonarjs.analyzeproject.v1.ProjectFileInput.$Properties>|null} [files] AnalyzeProjectRequest files
         * @property {Array.<sonarjs.analyzeproject.v1.JsTsRule.$Properties>|null} [rules] AnalyzeProjectRequest rules
         * @property {Array.<sonarjs.analyzeproject.v1.CssRule.$Properties>|null} [cssRules] AnalyzeProjectRequest cssRules
         * @property {Array.<string>|null} [bundles] AnalyzeProjectRequest bundles
         * @property {string|null} [rulesWorkdir] AnalyzeProjectRequest rulesWorkdir
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of an AnalyzeProjectRequest.
         * @memberof sonarjs.analyzeproject.v1
         * @interface IAnalyzeProjectRequest
         * @augments sonarjs.analyzeproject.v1.AnalyzeProjectRequest.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.AnalyzeProjectRequest.$Properties instead.
         */

        /**
         * Shape of an AnalyzeProjectRequest.
         * @typedef {{
         *   configuration?: sonarjs.analyzeproject.v1.ProjectConfiguration.$Shape|null;
         *   files?: Object.<string,sonarjs.analyzeproject.v1.ProjectFileInput.$Shape>|null;
         *   rules?: Array.<sonarjs.analyzeproject.v1.JsTsRule.$Shape>|null;
         *   cssRules?: Array.<sonarjs.analyzeproject.v1.CssRule.$Shape>|null;
         *   bundles?: Array.<string>|null;
         *   rulesWorkdir?: string|null;
         *   $unknowns?: Array.<Uint8Array>;
         * }} sonarjs.analyzeproject.v1.AnalyzeProjectRequest.$Shape
         */

        /**
         * Constructs a new AnalyzeProjectRequest.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents an AnalyzeProjectRequest.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.AnalyzeProjectRequest.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function AnalyzeProjectRequest(properties) {
          this.files = {};
          this.rules = [];
          this.cssRules = [];
          this.bundles = [];
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * AnalyzeProjectRequest configuration.
         * @member {sonarjs.analyzeproject.v1.ProjectConfiguration.$Properties|null|undefined} configuration
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectRequest
         * @instance
         */
        AnalyzeProjectRequest.prototype.configuration = null;

        /**
         * AnalyzeProjectRequest files.
         * @member {Object.<string,sonarjs.analyzeproject.v1.ProjectFileInput.$Properties>} files
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectRequest
         * @instance
         */
        AnalyzeProjectRequest.prototype.files = $util.emptyObject;

        /**
         * AnalyzeProjectRequest rules.
         * @member {Array.<sonarjs.analyzeproject.v1.JsTsRule.$Properties>} rules
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectRequest
         * @instance
         */
        AnalyzeProjectRequest.prototype.rules = $util.emptyArray;

        /**
         * AnalyzeProjectRequest cssRules.
         * @member {Array.<sonarjs.analyzeproject.v1.CssRule.$Properties>} cssRules
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectRequest
         * @instance
         */
        AnalyzeProjectRequest.prototype.cssRules = $util.emptyArray;

        /**
         * AnalyzeProjectRequest bundles.
         * @member {Array.<string>} bundles
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectRequest
         * @instance
         */
        AnalyzeProjectRequest.prototype.bundles = $util.emptyArray;

        /**
         * AnalyzeProjectRequest rulesWorkdir.
         * @member {string|null|undefined} rulesWorkdir
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectRequest
         * @instance
         */
        AnalyzeProjectRequest.prototype.rulesWorkdir = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(AnalyzeProjectRequest.prototype, '_rulesWorkdir', {
          get: $util.oneOfGetter(($oneOfFields = ['rulesWorkdir'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * Creates a new AnalyzeProjectRequest instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectRequest
         * @static
         * @param {sonarjs.analyzeproject.v1.AnalyzeProjectRequest.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.AnalyzeProjectRequest} AnalyzeProjectRequest instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.AnalyzeProjectRequest.$Shape): sonarjs.analyzeproject.v1.AnalyzeProjectRequest & sonarjs.analyzeproject.v1.AnalyzeProjectRequest.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.AnalyzeProjectRequest.$Properties): sonarjs.analyzeproject.v1.AnalyzeProjectRequest;
         * }}
         */
        AnalyzeProjectRequest.create = function create(properties) {
          return new AnalyzeProjectRequest(properties);
        };

        /**
         * Encodes the specified AnalyzeProjectRequest message. Does not implicitly {@link sonarjs.analyzeproject.v1.AnalyzeProjectRequest.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectRequest
         * @static
         * @param {sonarjs.analyzeproject.v1.AnalyzeProjectRequest.$Properties} message AnalyzeProjectRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AnalyzeProjectRequest.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.configuration != null && Object.hasOwnProperty.call(message, 'configuration'))
            $root.sonarjs.analyzeproject.v1.ProjectConfiguration.encode(
              message.configuration,
              writer.uint32(/* id 1, wireType 2 =*/ 10).fork(),
              _depth + 1,
            ).ldelim();
          if (message.files != null && Object.hasOwnProperty.call(message, 'files'))
            for (let keys = Object.keys(message.files), i = 0; i < keys.length; ++i) {
              writer
                .uint32(/* id 2, wireType 2 =*/ 18)
                .fork()
                .uint32(/* id 1, wireType 2 =*/ 10)
                .string(keys[i]);
              $root.sonarjs.analyzeproject.v1.ProjectFileInput.encode(
                message.files[keys[i]],
                writer.uint32(/* id 2, wireType 2 =*/ 18).fork(),
                _depth + 1,
              )
                .ldelim()
                .ldelim();
            }
          if (message.rules != null && message.rules.length)
            for (let i = 0; i < message.rules.length; ++i)
              $root.sonarjs.analyzeproject.v1.JsTsRule.encode(
                message.rules[i],
                writer.uint32(/* id 3, wireType 2 =*/ 26).fork(),
                _depth + 1,
              ).ldelim();
          if (message.cssRules != null && message.cssRules.length)
            for (let i = 0; i < message.cssRules.length; ++i)
              $root.sonarjs.analyzeproject.v1.CssRule.encode(
                message.cssRules[i],
                writer.uint32(/* id 4, wireType 2 =*/ 34).fork(),
                _depth + 1,
              ).ldelim();
          if (message.bundles != null && message.bundles.length)
            for (let i = 0; i < message.bundles.length; ++i)
              writer.uint32(/* id 5, wireType 2 =*/ 42).string(message.bundles[i]);
          if (message.rulesWorkdir != null && Object.hasOwnProperty.call(message, 'rulesWorkdir'))
            writer.uint32(/* id 6, wireType 2 =*/ 50).string(message.rulesWorkdir);
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified AnalyzeProjectRequest message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.AnalyzeProjectRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectRequest
         * @static
         * @param {sonarjs.analyzeproject.v1.AnalyzeProjectRequest.$Properties} message AnalyzeProjectRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AnalyzeProjectRequest.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes an AnalyzeProjectRequest message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.AnalyzeProjectRequest & sonarjs.analyzeproject.v1.AnalyzeProjectRequest.$Shape} AnalyzeProjectRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AnalyzeProjectRequest.decode = function decode(reader, length, _end, _depth, _target) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.AnalyzeProjectRequest(),
            key,
            value;
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            let wireType = tag & 7;
            switch ((tag >>>= 3)) {
              case 1: {
                if (wireType !== 2) break;
                message.configuration = $root.sonarjs.analyzeproject.v1.ProjectConfiguration.decode(
                  reader,
                  reader.uint32(),
                  undefined,
                  _depth + 1,
                  message.configuration,
                );
                continue;
              }
              case 2: {
                if (wireType !== 2) break;
                if (message.files === $util.emptyObject) message.files = {};
                let end2 = reader.uint32() + reader.pos;
                key = '';
                value = null;
                while (reader.pos < end2) {
                  let tag2 = reader.tag();
                  wireType = tag2 & 7;
                  switch ((tag2 >>>= 3)) {
                    case 1:
                      if (wireType !== 2) break;
                      key = reader.string();
                      continue;
                    case 2:
                      if (wireType !== 2) break;
                      value = $root.sonarjs.analyzeproject.v1.ProjectFileInput.decode(
                        reader,
                        reader.uint32(),
                        undefined,
                        _depth + 1,
                      );
                      continue;
                  }
                  reader.skipType(wireType, _depth, tag2);
                }
                if (key === '__proto__') $util.makeProp(message.files, key);
                message.files[key] =
                  value || new $root.sonarjs.analyzeproject.v1.ProjectFileInput();
                continue;
              }
              case 3: {
                if (wireType !== 2) break;
                if (!(message.rules && message.rules.length)) message.rules = [];
                message.rules.push(
                  $root.sonarjs.analyzeproject.v1.JsTsRule.decode(
                    reader,
                    reader.uint32(),
                    undefined,
                    _depth + 1,
                  ),
                );
                continue;
              }
              case 4: {
                if (wireType !== 2) break;
                if (!(message.cssRules && message.cssRules.length)) message.cssRules = [];
                message.cssRules.push(
                  $root.sonarjs.analyzeproject.v1.CssRule.decode(
                    reader,
                    reader.uint32(),
                    undefined,
                    _depth + 1,
                  ),
                );
                continue;
              }
              case 5: {
                if (wireType !== 2) break;
                if (!(message.bundles && message.bundles.length)) message.bundles = [];
                message.bundles.push(reader.string());
                continue;
              }
              case 6: {
                if (wireType !== 2) break;
                message.rulesWorkdir = reader.string();
                message._rulesWorkdir = 'rulesWorkdir';
                continue;
              }
            }
            reader.skipType(wireType, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes an AnalyzeProjectRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.AnalyzeProjectRequest & sonarjs.analyzeproject.v1.AnalyzeProjectRequest.$Shape} AnalyzeProjectRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AnalyzeProjectRequest.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an AnalyzeProjectRequest message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        AnalyzeProjectRequest.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          let properties = {};
          if (message.configuration != null && message.hasOwnProperty('configuration')) {
            let error = $root.sonarjs.analyzeproject.v1.ProjectConfiguration.verify(
              message.configuration,
              _depth + 1,
            );
            if (error) return 'configuration.' + error;
          }
          if (message.files != null && message.hasOwnProperty('files')) {
            if (!$util.isObject(message.files)) return 'files: object expected';
            let key = Object.keys(message.files);
            for (let i = 0; i < key.length; ++i) {
              let error = $root.sonarjs.analyzeproject.v1.ProjectFileInput.verify(
                message.files[key[i]],
                _depth + 1,
              );
              if (error) return 'files.' + error;
            }
          }
          if (message.rules != null && message.hasOwnProperty('rules')) {
            if (!Array.isArray(message.rules)) return 'rules: array expected';
            for (let i = 0; i < message.rules.length; ++i) {
              let error = $root.sonarjs.analyzeproject.v1.JsTsRule.verify(
                message.rules[i],
                _depth + 1,
              );
              if (error) return 'rules.' + error;
            }
          }
          if (message.cssRules != null && message.hasOwnProperty('cssRules')) {
            if (!Array.isArray(message.cssRules)) return 'cssRules: array expected';
            for (let i = 0; i < message.cssRules.length; ++i) {
              let error = $root.sonarjs.analyzeproject.v1.CssRule.verify(
                message.cssRules[i],
                _depth + 1,
              );
              if (error) return 'cssRules.' + error;
            }
          }
          if (message.bundles != null && message.hasOwnProperty('bundles')) {
            if (!Array.isArray(message.bundles)) return 'bundles: array expected';
            for (let i = 0; i < message.bundles.length; ++i)
              if (!$util.isString(message.bundles[i])) return 'bundles: string[] expected';
          }
          if (message.rulesWorkdir != null && message.hasOwnProperty('rulesWorkdir')) {
            properties._rulesWorkdir = 1;
            if (!$util.isString(message.rulesWorkdir)) return 'rulesWorkdir: string expected';
          }
          return null;
        };

        /**
         * Creates an AnalyzeProjectRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.AnalyzeProjectRequest} AnalyzeProjectRequest
         */
        AnalyzeProjectRequest.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.AnalyzeProjectRequest)
            return object;
          if (!$util.isObject(object))
            throw TypeError('.sonarjs.analyzeproject.v1.AnalyzeProjectRequest: object expected');
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let message = new $root.sonarjs.analyzeproject.v1.AnalyzeProjectRequest();
          if (object.configuration != null) {
            if (!$util.isObject(object.configuration))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.AnalyzeProjectRequest.configuration: object expected',
              );
            message.configuration = $root.sonarjs.analyzeproject.v1.ProjectConfiguration.fromObject(
              object.configuration,
              _depth + 1,
            );
          }
          if (object.files) {
            if (!$util.isObject(object.files))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.AnalyzeProjectRequest.files: object expected',
              );
            message.files = {};
            for (let keys = Object.keys(object.files), i = 0; i < keys.length; ++i) {
              if (keys[i] === '__proto__') $util.makeProp(message.files, keys[i]);
              if (!$util.isObject(object.files[keys[i]]))
                throw TypeError(
                  '.sonarjs.analyzeproject.v1.AnalyzeProjectRequest.files: object expected',
                );
              message.files[keys[i]] = $root.sonarjs.analyzeproject.v1.ProjectFileInput.fromObject(
                object.files[keys[i]],
                _depth + 1,
              );
            }
          }
          if (object.rules) {
            if (!Array.isArray(object.rules))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.AnalyzeProjectRequest.rules: array expected',
              );
            message.rules = Array(object.rules.length);
            for (let i = 0; i < object.rules.length; ++i) {
              if (!$util.isObject(object.rules[i]))
                throw TypeError(
                  '.sonarjs.analyzeproject.v1.AnalyzeProjectRequest.rules: object expected',
                );
              message.rules[i] = $root.sonarjs.analyzeproject.v1.JsTsRule.fromObject(
                object.rules[i],
                _depth + 1,
              );
            }
          }
          if (object.cssRules) {
            if (!Array.isArray(object.cssRules))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.AnalyzeProjectRequest.cssRules: array expected',
              );
            message.cssRules = Array(object.cssRules.length);
            for (let i = 0; i < object.cssRules.length; ++i) {
              if (!$util.isObject(object.cssRules[i]))
                throw TypeError(
                  '.sonarjs.analyzeproject.v1.AnalyzeProjectRequest.cssRules: object expected',
                );
              message.cssRules[i] = $root.sonarjs.analyzeproject.v1.CssRule.fromObject(
                object.cssRules[i],
                _depth + 1,
              );
            }
          }
          if (object.bundles) {
            if (!Array.isArray(object.bundles))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.AnalyzeProjectRequest.bundles: array expected',
              );
            message.bundles = Array(object.bundles.length);
            for (let i = 0; i < object.bundles.length; ++i)
              message.bundles[i] = String(object.bundles[i]);
          }
          if (object.rulesWorkdir != null) message.rulesWorkdir = String(object.rulesWorkdir);
          return message;
        };

        /**
         * Creates a plain object from an AnalyzeProjectRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectRequest
         * @static
         * @param {sonarjs.analyzeproject.v1.AnalyzeProjectRequest} message AnalyzeProjectRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        AnalyzeProjectRequest.toObject = function toObject(message, options, _depth) {
          if (!options) options = {};
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let object = {};
          if (options.arrays || options.defaults) {
            object.rules = [];
            object.cssRules = [];
            object.bundles = [];
          }
          if (options.objects || options.defaults) object.files = {};
          if (options.defaults) object.configuration = null;
          if (message.configuration != null && message.hasOwnProperty('configuration'))
            object.configuration = $root.sonarjs.analyzeproject.v1.ProjectConfiguration.toObject(
              message.configuration,
              options,
              _depth + 1,
            );
          let keys2;
          if (message.files && (keys2 = Object.keys(message.files)).length) {
            object.files = {};
            for (let j = 0; j < keys2.length; ++j) {
              if (keys2[j] === '__proto__') $util.makeProp(object.files, keys2[j]);
              object.files[keys2[j]] = $root.sonarjs.analyzeproject.v1.ProjectFileInput.toObject(
                message.files[keys2[j]],
                options,
                _depth + 1,
              );
            }
          }
          if (message.rules && message.rules.length) {
            object.rules = Array(message.rules.length);
            for (let j = 0; j < message.rules.length; ++j)
              object.rules[j] = $root.sonarjs.analyzeproject.v1.JsTsRule.toObject(
                message.rules[j],
                options,
                _depth + 1,
              );
          }
          if (message.cssRules && message.cssRules.length) {
            object.cssRules = Array(message.cssRules.length);
            for (let j = 0; j < message.cssRules.length; ++j)
              object.cssRules[j] = $root.sonarjs.analyzeproject.v1.CssRule.toObject(
                message.cssRules[j],
                options,
                _depth + 1,
              );
          }
          if (message.bundles && message.bundles.length) {
            object.bundles = Array(message.bundles.length);
            for (let j = 0; j < message.bundles.length; ++j) object.bundles[j] = message.bundles[j];
          }
          if (message.rulesWorkdir != null && message.hasOwnProperty('rulesWorkdir'))
            object.rulesWorkdir = message.rulesWorkdir;
          return object;
        };

        /**
         * Converts this AnalyzeProjectRequest to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        AnalyzeProjectRequest.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for AnalyzeProjectRequest
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectRequest
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        AnalyzeProjectRequest.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.AnalyzeProjectRequest';
        };

        return AnalyzeProjectRequest;
      })();

      v1.AnalyzeProjectStreamResponse = (function () {
        /**
         * Properties of an AnalyzeProjectStreamResponse.
         * @typedef {Object} sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.$Properties
         * @property {sonarjs.analyzeproject.v1.FileResultMessage.$Properties|null} [fileResult] AnalyzeProjectStreamResponse fileResult
         * @property {sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Properties|null} [meta] AnalyzeProjectStreamResponse meta
         * @property {google.protobuf.Empty.$Properties|null} [cancelled] AnalyzeProjectStreamResponse cancelled
         * @property {"fileResult"|"meta"|"cancelled"} [message] AnalyzeProjectStreamResponse message
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of an AnalyzeProjectStreamResponse.
         * @memberof sonarjs.analyzeproject.v1
         * @interface IAnalyzeProjectStreamResponse
         * @augments sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.$Properties instead.
         */

        /**
         * Narrowed shape of an AnalyzeProjectStreamResponse.
         * @typedef {{
         *   fileResult?: sonarjs.analyzeproject.v1.FileResultMessage.$Shape|null;
         *   meta?: sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Shape|null;
         *   cancelled?: google.protobuf.Empty.$Shape|null;
         *   $unknowns?: Array.<Uint8Array>;
         * } & (
         *   ({ message?: undefined; fileResult?: null; meta?: null; cancelled?: null }|{ message?: "fileResult"; fileResult: sonarjs.analyzeproject.v1.FileResultMessage.$Shape; meta?: null; cancelled?: null }|{ message?: "meta"; fileResult?: null; meta: sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Shape; cancelled?: null }|{ message?: "cancelled"; fileResult?: null; meta?: null; cancelled: google.protobuf.Empty.$Shape })
         * )} sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.$Shape
         */

        /**
         * Constructs a new AnalyzeProjectStreamResponse.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents an AnalyzeProjectStreamResponse.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function AnalyzeProjectStreamResponse(properties) {
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * AnalyzeProjectStreamResponse fileResult.
         * @member {sonarjs.analyzeproject.v1.FileResultMessage.$Properties|null|undefined} fileResult
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse
         * @instance
         */
        AnalyzeProjectStreamResponse.prototype.fileResult = null;

        /**
         * AnalyzeProjectStreamResponse meta.
         * @member {sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Properties|null|undefined} meta
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse
         * @instance
         */
        AnalyzeProjectStreamResponse.prototype.meta = null;

        /**
         * AnalyzeProjectStreamResponse cancelled.
         * @member {google.protobuf.Empty.$Properties|null|undefined} cancelled
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse
         * @instance
         */
        AnalyzeProjectStreamResponse.prototype.cancelled = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * AnalyzeProjectStreamResponse message.
         * @member {"fileResult"|"meta"|"cancelled"|undefined} message
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse
         * @instance
         */
        Object.defineProperty(AnalyzeProjectStreamResponse.prototype, 'message', {
          get: $util.oneOfGetter(($oneOfFields = ['fileResult', 'meta', 'cancelled'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * Creates a new AnalyzeProjectStreamResponse instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse
         * @static
         * @param {sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse} AnalyzeProjectStreamResponse instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.$Shape): sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse & sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.$Properties): sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse;
         * }}
         */
        AnalyzeProjectStreamResponse.create = function create(properties) {
          return new AnalyzeProjectStreamResponse(properties);
        };

        /**
         * Encodes the specified AnalyzeProjectStreamResponse message. Does not implicitly {@link sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse
         * @static
         * @param {sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.$Properties} message AnalyzeProjectStreamResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AnalyzeProjectStreamResponse.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.fileResult != null && Object.hasOwnProperty.call(message, 'fileResult'))
            $root.sonarjs.analyzeproject.v1.FileResultMessage.encode(
              message.fileResult,
              writer.uint32(/* id 1, wireType 2 =*/ 10).fork(),
              _depth + 1,
            ).ldelim();
          if (message.meta != null && Object.hasOwnProperty.call(message, 'meta'))
            $root.sonarjs.analyzeproject.v1.ProjectAnalysisMeta.encode(
              message.meta,
              writer.uint32(/* id 2, wireType 2 =*/ 18).fork(),
              _depth + 1,
            ).ldelim();
          if (message.cancelled != null && Object.hasOwnProperty.call(message, 'cancelled'))
            $root.google.protobuf.Empty.encode(
              message.cancelled,
              writer.uint32(/* id 3, wireType 2 =*/ 26).fork(),
              _depth + 1,
            ).ldelim();
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified AnalyzeProjectStreamResponse message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse
         * @static
         * @param {sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.$Properties} message AnalyzeProjectStreamResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AnalyzeProjectStreamResponse.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes an AnalyzeProjectStreamResponse message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse & sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.$Shape} AnalyzeProjectStreamResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AnalyzeProjectStreamResponse.decode = function decode(
          reader,
          length,
          _end,
          _depth,
          _target,
        ) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse();
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            let wireType = tag & 7;
            switch ((tag >>>= 3)) {
              case 1: {
                if (wireType !== 2) break;
                message.fileResult = $root.sonarjs.analyzeproject.v1.FileResultMessage.decode(
                  reader,
                  reader.uint32(),
                  undefined,
                  _depth + 1,
                  message.fileResult,
                );
                message.message = 'fileResult';
                continue;
              }
              case 2: {
                if (wireType !== 2) break;
                message.meta = $root.sonarjs.analyzeproject.v1.ProjectAnalysisMeta.decode(
                  reader,
                  reader.uint32(),
                  undefined,
                  _depth + 1,
                  message.meta,
                );
                message.message = 'meta';
                continue;
              }
              case 3: {
                if (wireType !== 2) break;
                message.cancelled = $root.google.protobuf.Empty.decode(
                  reader,
                  reader.uint32(),
                  undefined,
                  _depth + 1,
                  message.cancelled,
                );
                message.message = 'cancelled';
                continue;
              }
            }
            reader.skipType(wireType, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes an AnalyzeProjectStreamResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse & sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.$Shape} AnalyzeProjectStreamResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AnalyzeProjectStreamResponse.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an AnalyzeProjectStreamResponse message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        AnalyzeProjectStreamResponse.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          let properties = {};
          if (message.fileResult != null && message.hasOwnProperty('fileResult')) {
            properties.message = 1;
            {
              let error = $root.sonarjs.analyzeproject.v1.FileResultMessage.verify(
                message.fileResult,
                _depth + 1,
              );
              if (error) return 'fileResult.' + error;
            }
          }
          if (message.meta != null && message.hasOwnProperty('meta')) {
            if (properties.message === 1) return 'message: multiple values';
            properties.message = 1;
            {
              let error = $root.sonarjs.analyzeproject.v1.ProjectAnalysisMeta.verify(
                message.meta,
                _depth + 1,
              );
              if (error) return 'meta.' + error;
            }
          }
          if (message.cancelled != null && message.hasOwnProperty('cancelled')) {
            if (properties.message === 1) return 'message: multiple values';
            properties.message = 1;
            {
              let error = $root.google.protobuf.Empty.verify(message.cancelled, _depth + 1);
              if (error) return 'cancelled.' + error;
            }
          }
          return null;
        };

        /**
         * Creates an AnalyzeProjectStreamResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse} AnalyzeProjectStreamResponse
         */
        AnalyzeProjectStreamResponse.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse)
            return object;
          if (!$util.isObject(object))
            throw TypeError(
              '.sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse: object expected',
            );
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let message = new $root.sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse();
          if (object.fileResult != null) {
            if (!$util.isObject(object.fileResult))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.fileResult: object expected',
              );
            message.fileResult = $root.sonarjs.analyzeproject.v1.FileResultMessage.fromObject(
              object.fileResult,
              _depth + 1,
            );
          }
          if (object.meta != null) {
            if (!$util.isObject(object.meta))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.meta: object expected',
              );
            message.meta = $root.sonarjs.analyzeproject.v1.ProjectAnalysisMeta.fromObject(
              object.meta,
              _depth + 1,
            );
          }
          if (object.cancelled != null) {
            if (!$util.isObject(object.cancelled))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse.cancelled: object expected',
              );
            message.cancelled = $root.google.protobuf.Empty.fromObject(
              object.cancelled,
              _depth + 1,
            );
          }
          return message;
        };

        /**
         * Creates a plain object from an AnalyzeProjectStreamResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse
         * @static
         * @param {sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse} message AnalyzeProjectStreamResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        AnalyzeProjectStreamResponse.toObject = function toObject(message, options, _depth) {
          if (!options) options = {};
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let object = {};
          if (message.fileResult != null && message.hasOwnProperty('fileResult')) {
            object.fileResult = $root.sonarjs.analyzeproject.v1.FileResultMessage.toObject(
              message.fileResult,
              options,
              _depth + 1,
            );
            if (options.oneofs) object.message = 'fileResult';
          }
          if (message.meta != null && message.hasOwnProperty('meta')) {
            object.meta = $root.sonarjs.analyzeproject.v1.ProjectAnalysisMeta.toObject(
              message.meta,
              options,
              _depth + 1,
            );
            if (options.oneofs) object.message = 'meta';
          }
          if (message.cancelled != null && message.hasOwnProperty('cancelled')) {
            object.cancelled = $root.google.protobuf.Empty.toObject(
              message.cancelled,
              options,
              _depth + 1,
            );
            if (options.oneofs) object.message = 'cancelled';
          }
          return object;
        };

        /**
         * Converts this AnalyzeProjectStreamResponse to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        AnalyzeProjectStreamResponse.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for AnalyzeProjectStreamResponse
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        AnalyzeProjectStreamResponse.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.AnalyzeProjectStreamResponse';
        };

        return AnalyzeProjectStreamResponse;
      })();

      v1.AnalyzeProjectUnaryResponse = (function () {
        /**
         * Properties of an AnalyzeProjectUnaryResponse.
         * @typedef {Object} sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.$Properties
         * @property {Object.<string,sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Properties>|null} [files] AnalyzeProjectUnaryResponse files
         * @property {sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Properties|null} [meta] AnalyzeProjectUnaryResponse meta
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of an AnalyzeProjectUnaryResponse.
         * @memberof sonarjs.analyzeproject.v1
         * @interface IAnalyzeProjectUnaryResponse
         * @augments sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.$Properties instead.
         */

        /**
         * Shape of an AnalyzeProjectUnaryResponse.
         * @typedef {sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.$Properties} sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.$Shape
         */

        /**
         * Constructs a new AnalyzeProjectUnaryResponse.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents an AnalyzeProjectUnaryResponse.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function AnalyzeProjectUnaryResponse(properties) {
          this.files = {};
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * AnalyzeProjectUnaryResponse files.
         * @member {Object.<string,sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Properties>} files
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse
         * @instance
         */
        AnalyzeProjectUnaryResponse.prototype.files = $util.emptyObject;

        /**
         * AnalyzeProjectUnaryResponse meta.
         * @member {sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Properties|null|undefined} meta
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse
         * @instance
         */
        AnalyzeProjectUnaryResponse.prototype.meta = null;

        /**
         * Creates a new AnalyzeProjectUnaryResponse instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse
         * @static
         * @param {sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse} AnalyzeProjectUnaryResponse instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.$Shape): sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse & sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.$Properties): sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse;
         * }}
         */
        AnalyzeProjectUnaryResponse.create = function create(properties) {
          return new AnalyzeProjectUnaryResponse(properties);
        };

        /**
         * Encodes the specified AnalyzeProjectUnaryResponse message. Does not implicitly {@link sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse
         * @static
         * @param {sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.$Properties} message AnalyzeProjectUnaryResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AnalyzeProjectUnaryResponse.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.files != null && Object.hasOwnProperty.call(message, 'files'))
            for (let keys = Object.keys(message.files), i = 0; i < keys.length; ++i) {
              writer
                .uint32(/* id 1, wireType 2 =*/ 10)
                .fork()
                .uint32(/* id 1, wireType 2 =*/ 10)
                .string(keys[i]);
              $root.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.encode(
                message.files[keys[i]],
                writer.uint32(/* id 2, wireType 2 =*/ 18).fork(),
                _depth + 1,
              )
                .ldelim()
                .ldelim();
            }
          if (message.meta != null && Object.hasOwnProperty.call(message, 'meta'))
            $root.sonarjs.analyzeproject.v1.ProjectAnalysisMeta.encode(
              message.meta,
              writer.uint32(/* id 2, wireType 2 =*/ 18).fork(),
              _depth + 1,
            ).ldelim();
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified AnalyzeProjectUnaryResponse message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse
         * @static
         * @param {sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.$Properties} message AnalyzeProjectUnaryResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AnalyzeProjectUnaryResponse.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes an AnalyzeProjectUnaryResponse message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse & sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.$Shape} AnalyzeProjectUnaryResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AnalyzeProjectUnaryResponse.decode = function decode(
          reader,
          length,
          _end,
          _depth,
          _target,
        ) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse(),
            key,
            value;
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            let wireType = tag & 7;
            switch ((tag >>>= 3)) {
              case 1: {
                if (wireType !== 2) break;
                if (message.files === $util.emptyObject) message.files = {};
                let end2 = reader.uint32() + reader.pos;
                key = '';
                value = null;
                while (reader.pos < end2) {
                  let tag2 = reader.tag();
                  wireType = tag2 & 7;
                  switch ((tag2 >>>= 3)) {
                    case 1:
                      if (wireType !== 2) break;
                      key = reader.string();
                      continue;
                    case 2:
                      if (wireType !== 2) break;
                      value = $root.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.decode(
                        reader,
                        reader.uint32(),
                        undefined,
                        _depth + 1,
                      );
                      continue;
                  }
                  reader.skipType(wireType, _depth, tag2);
                }
                if (key === '__proto__') $util.makeProp(message.files, key);
                message.files[key] =
                  value || new $root.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult();
                continue;
              }
              case 2: {
                if (wireType !== 2) break;
                message.meta = $root.sonarjs.analyzeproject.v1.ProjectAnalysisMeta.decode(
                  reader,
                  reader.uint32(),
                  undefined,
                  _depth + 1,
                  message.meta,
                );
                continue;
              }
            }
            reader.skipType(wireType, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes an AnalyzeProjectUnaryResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse & sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.$Shape} AnalyzeProjectUnaryResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AnalyzeProjectUnaryResponse.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an AnalyzeProjectUnaryResponse message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        AnalyzeProjectUnaryResponse.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          if (message.files != null && message.hasOwnProperty('files')) {
            if (!$util.isObject(message.files)) return 'files: object expected';
            let key = Object.keys(message.files);
            for (let i = 0; i < key.length; ++i) {
              let error = $root.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.verify(
                message.files[key[i]],
                _depth + 1,
              );
              if (error) return 'files.' + error;
            }
          }
          if (message.meta != null && message.hasOwnProperty('meta')) {
            let error = $root.sonarjs.analyzeproject.v1.ProjectAnalysisMeta.verify(
              message.meta,
              _depth + 1,
            );
            if (error) return 'meta.' + error;
          }
          return null;
        };

        /**
         * Creates an AnalyzeProjectUnaryResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse} AnalyzeProjectUnaryResponse
         */
        AnalyzeProjectUnaryResponse.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse)
            return object;
          if (!$util.isObject(object))
            throw TypeError(
              '.sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse: object expected',
            );
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let message = new $root.sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse();
          if (object.files) {
            if (!$util.isObject(object.files))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.files: object expected',
              );
            message.files = {};
            for (let keys = Object.keys(object.files), i = 0; i < keys.length; ++i) {
              if (keys[i] === '__proto__') $util.makeProp(message.files, keys[i]);
              if (!$util.isObject(object.files[keys[i]]))
                throw TypeError(
                  '.sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.files: object expected',
                );
              message.files[keys[i]] =
                $root.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.fromObject(
                  object.files[keys[i]],
                  _depth + 1,
                );
            }
          }
          if (object.meta != null) {
            if (!$util.isObject(object.meta))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse.meta: object expected',
              );
            message.meta = $root.sonarjs.analyzeproject.v1.ProjectAnalysisMeta.fromObject(
              object.meta,
              _depth + 1,
            );
          }
          return message;
        };

        /**
         * Creates a plain object from an AnalyzeProjectUnaryResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse
         * @static
         * @param {sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse} message AnalyzeProjectUnaryResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        AnalyzeProjectUnaryResponse.toObject = function toObject(message, options, _depth) {
          if (!options) options = {};
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let object = {};
          if (options.objects || options.defaults) object.files = {};
          if (options.defaults) object.meta = null;
          let keys2;
          if (message.files && (keys2 = Object.keys(message.files)).length) {
            object.files = {};
            for (let j = 0; j < keys2.length; ++j) {
              if (keys2[j] === '__proto__') $util.makeProp(object.files, keys2[j]);
              object.files[keys2[j]] =
                $root.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.toObject(
                  message.files[keys2[j]],
                  options,
                  _depth + 1,
                );
            }
          }
          if (message.meta != null && message.hasOwnProperty('meta'))
            object.meta = $root.sonarjs.analyzeproject.v1.ProjectAnalysisMeta.toObject(
              message.meta,
              options,
              _depth + 1,
            );
          return object;
        };

        /**
         * Converts this AnalyzeProjectUnaryResponse to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        AnalyzeProjectUnaryResponse.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for AnalyzeProjectUnaryResponse
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        AnalyzeProjectUnaryResponse.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.AnalyzeProjectUnaryResponse';
        };

        return AnalyzeProjectUnaryResponse;
      })();

      v1.CancelAnalysisRequest = (function () {
        /**
         * Properties of a CancelAnalysisRequest.
         * @typedef {Object} sonarjs.analyzeproject.v1.CancelAnalysisRequest.$Properties
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of a CancelAnalysisRequest.
         * @memberof sonarjs.analyzeproject.v1
         * @interface ICancelAnalysisRequest
         * @augments sonarjs.analyzeproject.v1.CancelAnalysisRequest.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.CancelAnalysisRequest.$Properties instead.
         */

        /**
         * Shape of a CancelAnalysisRequest.
         * @typedef {sonarjs.analyzeproject.v1.CancelAnalysisRequest.$Properties} sonarjs.analyzeproject.v1.CancelAnalysisRequest.$Shape
         */

        /**
         * Constructs a new CancelAnalysisRequest.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents a CancelAnalysisRequest.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.CancelAnalysisRequest.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function CancelAnalysisRequest(properties) {
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * Creates a new CancelAnalysisRequest instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.CancelAnalysisRequest
         * @static
         * @param {sonarjs.analyzeproject.v1.CancelAnalysisRequest.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.CancelAnalysisRequest} CancelAnalysisRequest instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.CancelAnalysisRequest.$Shape): sonarjs.analyzeproject.v1.CancelAnalysisRequest & sonarjs.analyzeproject.v1.CancelAnalysisRequest.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.CancelAnalysisRequest.$Properties): sonarjs.analyzeproject.v1.CancelAnalysisRequest;
         * }}
         */
        CancelAnalysisRequest.create = function create(properties) {
          return new CancelAnalysisRequest(properties);
        };

        /**
         * Encodes the specified CancelAnalysisRequest message. Does not implicitly {@link sonarjs.analyzeproject.v1.CancelAnalysisRequest.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.CancelAnalysisRequest
         * @static
         * @param {sonarjs.analyzeproject.v1.CancelAnalysisRequest.$Properties} message CancelAnalysisRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CancelAnalysisRequest.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified CancelAnalysisRequest message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.CancelAnalysisRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.CancelAnalysisRequest
         * @static
         * @param {sonarjs.analyzeproject.v1.CancelAnalysisRequest.$Properties} message CancelAnalysisRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CancelAnalysisRequest.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a CancelAnalysisRequest message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.CancelAnalysisRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.CancelAnalysisRequest & sonarjs.analyzeproject.v1.CancelAnalysisRequest.$Shape} CancelAnalysisRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CancelAnalysisRequest.decode = function decode(reader, length, _end, _depth, _target) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.CancelAnalysisRequest();
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            reader.skipType(tag & 7, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes a CancelAnalysisRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.CancelAnalysisRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.CancelAnalysisRequest & sonarjs.analyzeproject.v1.CancelAnalysisRequest.$Shape} CancelAnalysisRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CancelAnalysisRequest.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a CancelAnalysisRequest message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.CancelAnalysisRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        CancelAnalysisRequest.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          return null;
        };

        /**
         * Creates a CancelAnalysisRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.CancelAnalysisRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.CancelAnalysisRequest} CancelAnalysisRequest
         */
        CancelAnalysisRequest.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.CancelAnalysisRequest)
            return object;
          if (!$util.isObject(object))
            throw TypeError('.sonarjs.analyzeproject.v1.CancelAnalysisRequest: object expected');
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          return new $root.sonarjs.analyzeproject.v1.CancelAnalysisRequest();
        };

        /**
         * Creates a plain object from a CancelAnalysisRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.CancelAnalysisRequest
         * @static
         * @param {sonarjs.analyzeproject.v1.CancelAnalysisRequest} message CancelAnalysisRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        CancelAnalysisRequest.toObject = function toObject() {
          return {};
        };

        /**
         * Converts this CancelAnalysisRequest to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.CancelAnalysisRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        CancelAnalysisRequest.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for CancelAnalysisRequest
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.CancelAnalysisRequest
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        CancelAnalysisRequest.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.CancelAnalysisRequest';
        };

        return CancelAnalysisRequest;
      })();

      v1.CancelAnalysisResponse = (function () {
        /**
         * Properties of a CancelAnalysisResponse.
         * @typedef {Object} sonarjs.analyzeproject.v1.CancelAnalysisResponse.$Properties
         * @property {boolean|null} [cancelled] CancelAnalysisResponse cancelled
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of a CancelAnalysisResponse.
         * @memberof sonarjs.analyzeproject.v1
         * @interface ICancelAnalysisResponse
         * @augments sonarjs.analyzeproject.v1.CancelAnalysisResponse.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.CancelAnalysisResponse.$Properties instead.
         */

        /**
         * Shape of a CancelAnalysisResponse.
         * @typedef {sonarjs.analyzeproject.v1.CancelAnalysisResponse.$Properties} sonarjs.analyzeproject.v1.CancelAnalysisResponse.$Shape
         */

        /**
         * Constructs a new CancelAnalysisResponse.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents a CancelAnalysisResponse.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.CancelAnalysisResponse.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function CancelAnalysisResponse(properties) {
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * CancelAnalysisResponse cancelled.
         * @member {boolean} cancelled
         * @memberof sonarjs.analyzeproject.v1.CancelAnalysisResponse
         * @instance
         */
        CancelAnalysisResponse.prototype.cancelled = false;

        /**
         * Creates a new CancelAnalysisResponse instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.CancelAnalysisResponse
         * @static
         * @param {sonarjs.analyzeproject.v1.CancelAnalysisResponse.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.CancelAnalysisResponse} CancelAnalysisResponse instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.CancelAnalysisResponse.$Shape): sonarjs.analyzeproject.v1.CancelAnalysisResponse & sonarjs.analyzeproject.v1.CancelAnalysisResponse.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.CancelAnalysisResponse.$Properties): sonarjs.analyzeproject.v1.CancelAnalysisResponse;
         * }}
         */
        CancelAnalysisResponse.create = function create(properties) {
          return new CancelAnalysisResponse(properties);
        };

        /**
         * Encodes the specified CancelAnalysisResponse message. Does not implicitly {@link sonarjs.analyzeproject.v1.CancelAnalysisResponse.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.CancelAnalysisResponse
         * @static
         * @param {sonarjs.analyzeproject.v1.CancelAnalysisResponse.$Properties} message CancelAnalysisResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CancelAnalysisResponse.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.cancelled != null && Object.hasOwnProperty.call(message, 'cancelled'))
            writer.uint32(/* id 1, wireType 0 =*/ 8).bool(message.cancelled);
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified CancelAnalysisResponse message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.CancelAnalysisResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.CancelAnalysisResponse
         * @static
         * @param {sonarjs.analyzeproject.v1.CancelAnalysisResponse.$Properties} message CancelAnalysisResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CancelAnalysisResponse.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a CancelAnalysisResponse message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.CancelAnalysisResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.CancelAnalysisResponse & sonarjs.analyzeproject.v1.CancelAnalysisResponse.$Shape} CancelAnalysisResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CancelAnalysisResponse.decode = function decode(reader, length, _end, _depth, _target) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.CancelAnalysisResponse(),
            value;
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            let wireType = tag & 7;
            switch ((tag >>>= 3)) {
              case 1: {
                if (wireType !== 0) break;
                if ((value = reader.bool())) message.cancelled = value;
                else delete message.cancelled;
                continue;
              }
            }
            reader.skipType(wireType, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes a CancelAnalysisResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.CancelAnalysisResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.CancelAnalysisResponse & sonarjs.analyzeproject.v1.CancelAnalysisResponse.$Shape} CancelAnalysisResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CancelAnalysisResponse.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a CancelAnalysisResponse message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.CancelAnalysisResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        CancelAnalysisResponse.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          if (message.cancelled != null && message.hasOwnProperty('cancelled'))
            if (typeof message.cancelled !== 'boolean') return 'cancelled: boolean expected';
          return null;
        };

        /**
         * Creates a CancelAnalysisResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.CancelAnalysisResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.CancelAnalysisResponse} CancelAnalysisResponse
         */
        CancelAnalysisResponse.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.CancelAnalysisResponse)
            return object;
          if (!$util.isObject(object))
            throw TypeError('.sonarjs.analyzeproject.v1.CancelAnalysisResponse: object expected');
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let message = new $root.sonarjs.analyzeproject.v1.CancelAnalysisResponse();
          if (object.cancelled != null)
            if (object.cancelled) message.cancelled = Boolean(object.cancelled);
          return message;
        };

        /**
         * Creates a plain object from a CancelAnalysisResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.CancelAnalysisResponse
         * @static
         * @param {sonarjs.analyzeproject.v1.CancelAnalysisResponse} message CancelAnalysisResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        CancelAnalysisResponse.toObject = function toObject(message, options, _depth) {
          if (!options) options = {};
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let object = {};
          if (options.defaults) object.cancelled = false;
          if (message.cancelled != null && message.hasOwnProperty('cancelled'))
            object.cancelled = message.cancelled;
          return object;
        };

        /**
         * Converts this CancelAnalysisResponse to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.CancelAnalysisResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        CancelAnalysisResponse.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for CancelAnalysisResponse
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.CancelAnalysisResponse
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        CancelAnalysisResponse.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.CancelAnalysisResponse';
        };

        return CancelAnalysisResponse;
      })();

      v1.LeaseRequest = (function () {
        /**
         * Properties of a LeaseRequest.
         * @typedef {Object} sonarjs.analyzeproject.v1.LeaseRequest.$Properties
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of a LeaseRequest.
         * @memberof sonarjs.analyzeproject.v1
         * @interface ILeaseRequest
         * @augments sonarjs.analyzeproject.v1.LeaseRequest.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.LeaseRequest.$Properties instead.
         */

        /**
         * Shape of a LeaseRequest.
         * @typedef {sonarjs.analyzeproject.v1.LeaseRequest.$Properties} sonarjs.analyzeproject.v1.LeaseRequest.$Shape
         */

        /**
         * Constructs a new LeaseRequest.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents a LeaseRequest.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.LeaseRequest.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function LeaseRequest(properties) {
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * Creates a new LeaseRequest instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.LeaseRequest
         * @static
         * @param {sonarjs.analyzeproject.v1.LeaseRequest.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.LeaseRequest} LeaseRequest instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.LeaseRequest.$Shape): sonarjs.analyzeproject.v1.LeaseRequest & sonarjs.analyzeproject.v1.LeaseRequest.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.LeaseRequest.$Properties): sonarjs.analyzeproject.v1.LeaseRequest;
         * }}
         */
        LeaseRequest.create = function create(properties) {
          return new LeaseRequest(properties);
        };

        /**
         * Encodes the specified LeaseRequest message. Does not implicitly {@link sonarjs.analyzeproject.v1.LeaseRequest.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.LeaseRequest
         * @static
         * @param {sonarjs.analyzeproject.v1.LeaseRequest.$Properties} message LeaseRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        LeaseRequest.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified LeaseRequest message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.LeaseRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.LeaseRequest
         * @static
         * @param {sonarjs.analyzeproject.v1.LeaseRequest.$Properties} message LeaseRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        LeaseRequest.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a LeaseRequest message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.LeaseRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.LeaseRequest & sonarjs.analyzeproject.v1.LeaseRequest.$Shape} LeaseRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        LeaseRequest.decode = function decode(reader, length, _end, _depth, _target) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.LeaseRequest();
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            reader.skipType(tag & 7, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes a LeaseRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.LeaseRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.LeaseRequest & sonarjs.analyzeproject.v1.LeaseRequest.$Shape} LeaseRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        LeaseRequest.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a LeaseRequest message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.LeaseRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        LeaseRequest.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          return null;
        };

        /**
         * Creates a LeaseRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.LeaseRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.LeaseRequest} LeaseRequest
         */
        LeaseRequest.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.LeaseRequest) return object;
          if (!$util.isObject(object))
            throw TypeError('.sonarjs.analyzeproject.v1.LeaseRequest: object expected');
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          return new $root.sonarjs.analyzeproject.v1.LeaseRequest();
        };

        /**
         * Creates a plain object from a LeaseRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.LeaseRequest
         * @static
         * @param {sonarjs.analyzeproject.v1.LeaseRequest} message LeaseRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        LeaseRequest.toObject = function toObject() {
          return {};
        };

        /**
         * Converts this LeaseRequest to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.LeaseRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        LeaseRequest.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for LeaseRequest
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.LeaseRequest
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        LeaseRequest.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.LeaseRequest';
        };

        return LeaseRequest;
      })();

      v1.LeaseResponse = (function () {
        /**
         * Properties of a LeaseResponse.
         * @typedef {Object} sonarjs.analyzeproject.v1.LeaseResponse.$Properties
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of a LeaseResponse.
         * @memberof sonarjs.analyzeproject.v1
         * @interface ILeaseResponse
         * @augments sonarjs.analyzeproject.v1.LeaseResponse.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.LeaseResponse.$Properties instead.
         */

        /**
         * Shape of a LeaseResponse.
         * @typedef {sonarjs.analyzeproject.v1.LeaseResponse.$Properties} sonarjs.analyzeproject.v1.LeaseResponse.$Shape
         */

        /**
         * Constructs a new LeaseResponse.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents a LeaseResponse.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.LeaseResponse.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function LeaseResponse(properties) {
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * Creates a new LeaseResponse instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.LeaseResponse
         * @static
         * @param {sonarjs.analyzeproject.v1.LeaseResponse.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.LeaseResponse} LeaseResponse instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.LeaseResponse.$Shape): sonarjs.analyzeproject.v1.LeaseResponse & sonarjs.analyzeproject.v1.LeaseResponse.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.LeaseResponse.$Properties): sonarjs.analyzeproject.v1.LeaseResponse;
         * }}
         */
        LeaseResponse.create = function create(properties) {
          return new LeaseResponse(properties);
        };

        /**
         * Encodes the specified LeaseResponse message. Does not implicitly {@link sonarjs.analyzeproject.v1.LeaseResponse.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.LeaseResponse
         * @static
         * @param {sonarjs.analyzeproject.v1.LeaseResponse.$Properties} message LeaseResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        LeaseResponse.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified LeaseResponse message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.LeaseResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.LeaseResponse
         * @static
         * @param {sonarjs.analyzeproject.v1.LeaseResponse.$Properties} message LeaseResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        LeaseResponse.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a LeaseResponse message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.LeaseResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.LeaseResponse & sonarjs.analyzeproject.v1.LeaseResponse.$Shape} LeaseResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        LeaseResponse.decode = function decode(reader, length, _end, _depth, _target) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.LeaseResponse();
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            reader.skipType(tag & 7, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes a LeaseResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.LeaseResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.LeaseResponse & sonarjs.analyzeproject.v1.LeaseResponse.$Shape} LeaseResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        LeaseResponse.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a LeaseResponse message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.LeaseResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        LeaseResponse.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          return null;
        };

        /**
         * Creates a LeaseResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.LeaseResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.LeaseResponse} LeaseResponse
         */
        LeaseResponse.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.LeaseResponse) return object;
          if (!$util.isObject(object))
            throw TypeError('.sonarjs.analyzeproject.v1.LeaseResponse: object expected');
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          return new $root.sonarjs.analyzeproject.v1.LeaseResponse();
        };

        /**
         * Creates a plain object from a LeaseResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.LeaseResponse
         * @static
         * @param {sonarjs.analyzeproject.v1.LeaseResponse} message LeaseResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        LeaseResponse.toObject = function toObject() {
          return {};
        };

        /**
         * Converts this LeaseResponse to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.LeaseResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        LeaseResponse.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for LeaseResponse
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.LeaseResponse
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        LeaseResponse.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.LeaseResponse';
        };

        return LeaseResponse;
      })();

      v1.ProjectConfiguration = (function () {
        /**
         * Properties of a ProjectConfiguration.
         * @typedef {Object} sonarjs.analyzeproject.v1.ProjectConfiguration.$Properties
         * @property {string|null} [baseDir] ProjectConfiguration baseDir
         * @property {boolean|null} [sonarlint] ProjectConfiguration sonarlint
         * @property {Array.<string>|null} [fsEvents] ProjectConfiguration fsEvents
         * @property {boolean|null} [allowTsParserJsFiles] ProjectConfiguration allowTsParserJsFiles
         * @property {sonarjs.analyzeproject.v1.AnalysisMode|null} [analysisMode] ProjectConfiguration analysisMode
         * @property {boolean|null} [skipAst] ProjectConfiguration skipAst
         * @property {boolean|null} [ignoreHeaderComments] ProjectConfiguration ignoreHeaderComments
         * @property {number|Long|null} [maxFileSize] ProjectConfiguration maxFileSize
         * @property {sonarjs.analyzeproject.v1.StringList.$Properties|null} [environments] ProjectConfiguration environments
         * @property {sonarjs.analyzeproject.v1.StringList.$Properties|null} [globals] ProjectConfiguration globals
         * @property {sonarjs.analyzeproject.v1.StringList.$Properties|null} [tsSuffixes] ProjectConfiguration tsSuffixes
         * @property {sonarjs.analyzeproject.v1.StringList.$Properties|null} [jsSuffixes] ProjectConfiguration jsSuffixes
         * @property {sonarjs.analyzeproject.v1.StringList.$Properties|null} [cssSuffixes] ProjectConfiguration cssSuffixes
         * @property {sonarjs.analyzeproject.v1.StringList.$Properties|null} [htmlSuffixes] ProjectConfiguration htmlSuffixes
         * @property {sonarjs.analyzeproject.v1.StringList.$Properties|null} [yamlSuffixes] ProjectConfiguration yamlSuffixes
         * @property {sonarjs.analyzeproject.v1.StringList.$Properties|null} [cssAdditionalSuffixes] ProjectConfiguration cssAdditionalSuffixes
         * @property {Array.<string>|null} [tsConfigPaths] ProjectConfiguration tsConfigPaths
         * @property {sonarjs.analyzeproject.v1.StringList.$Properties|null} [jsTsExclusions] ProjectConfiguration jsTsExclusions
         * @property {Array.<string>|null} [sources] ProjectConfiguration sources
         * @property {Array.<string>|null} [inclusions] ProjectConfiguration inclusions
         * @property {Array.<string>|null} [exclusions] ProjectConfiguration exclusions
         * @property {Array.<string>|null} [tests] ProjectConfiguration tests
         * @property {Array.<string>|null} [testInclusions] ProjectConfiguration testInclusions
         * @property {Array.<string>|null} [testExclusions] ProjectConfiguration testExclusions
         * @property {boolean|null} [detectBundles] ProjectConfiguration detectBundles
         * @property {boolean|null} [canAccessFileSystem] ProjectConfiguration canAccessFileSystem
         * @property {boolean|null} [createTsProgramForOrphanFiles] ProjectConfiguration createTsProgramForOrphanFiles
         * @property {boolean|null} [disableTypeChecking] ProjectConfiguration disableTypeChecking
         * @property {boolean|null} [skipNodeModuleLookupOutsideBaseDir] ProjectConfiguration skipNodeModuleLookupOutsideBaseDir
         * @property {string|null} [ecmaScriptVersion] ProjectConfiguration ecmaScriptVersion
         * @property {boolean|null} [clearDependenciesCache] ProjectConfiguration clearDependenciesCache
         * @property {boolean|null} [clearTsConfigCache] ProjectConfiguration clearTsConfigCache
         * @property {boolean|null} [reportNclocForTestFiles] ProjectConfiguration reportNclocForTestFiles
         * @property {boolean|null} [detectGeneratedCode] ProjectConfiguration detectGeneratedCode
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of a ProjectConfiguration.
         * @memberof sonarjs.analyzeproject.v1
         * @interface IProjectConfiguration
         * @augments sonarjs.analyzeproject.v1.ProjectConfiguration.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.ProjectConfiguration.$Properties instead.
         */

        /**
         * Shape of a ProjectConfiguration.
         * @typedef {sonarjs.analyzeproject.v1.ProjectConfiguration.$Properties} sonarjs.analyzeproject.v1.ProjectConfiguration.$Shape
         */

        /**
         * Constructs a new ProjectConfiguration.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents a ProjectConfiguration.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.ProjectConfiguration.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function ProjectConfiguration(properties) {
          this.fsEvents = [];
          this.tsConfigPaths = [];
          this.sources = [];
          this.inclusions = [];
          this.exclusions = [];
          this.tests = [];
          this.testInclusions = [];
          this.testExclusions = [];
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * ProjectConfiguration baseDir.
         * @member {string} baseDir
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.baseDir = '';

        /**
         * ProjectConfiguration sonarlint.
         * @member {boolean|null|undefined} sonarlint
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.sonarlint = null;

        /**
         * ProjectConfiguration fsEvents.
         * @member {Array.<string>} fsEvents
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.fsEvents = $util.emptyArray;

        /**
         * ProjectConfiguration allowTsParserJsFiles.
         * @member {boolean|null|undefined} allowTsParserJsFiles
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.allowTsParserJsFiles = null;

        /**
         * ProjectConfiguration analysisMode.
         * @member {sonarjs.analyzeproject.v1.AnalysisMode} analysisMode
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.analysisMode = 0;

        /**
         * ProjectConfiguration skipAst.
         * @member {boolean|null|undefined} skipAst
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.skipAst = null;

        /**
         * ProjectConfiguration ignoreHeaderComments.
         * @member {boolean|null|undefined} ignoreHeaderComments
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.ignoreHeaderComments = null;

        /**
         * ProjectConfiguration maxFileSize.
         * @member {number|Long|null|undefined} maxFileSize
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.maxFileSize = null;

        /**
         * ProjectConfiguration environments.
         * @member {sonarjs.analyzeproject.v1.StringList.$Properties|null|undefined} environments
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.environments = null;

        /**
         * ProjectConfiguration globals.
         * @member {sonarjs.analyzeproject.v1.StringList.$Properties|null|undefined} globals
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.globals = null;

        /**
         * ProjectConfiguration tsSuffixes.
         * @member {sonarjs.analyzeproject.v1.StringList.$Properties|null|undefined} tsSuffixes
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.tsSuffixes = null;

        /**
         * ProjectConfiguration jsSuffixes.
         * @member {sonarjs.analyzeproject.v1.StringList.$Properties|null|undefined} jsSuffixes
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.jsSuffixes = null;

        /**
         * ProjectConfiguration cssSuffixes.
         * @member {sonarjs.analyzeproject.v1.StringList.$Properties|null|undefined} cssSuffixes
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.cssSuffixes = null;

        /**
         * ProjectConfiguration htmlSuffixes.
         * @member {sonarjs.analyzeproject.v1.StringList.$Properties|null|undefined} htmlSuffixes
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.htmlSuffixes = null;

        /**
         * ProjectConfiguration yamlSuffixes.
         * @member {sonarjs.analyzeproject.v1.StringList.$Properties|null|undefined} yamlSuffixes
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.yamlSuffixes = null;

        /**
         * ProjectConfiguration cssAdditionalSuffixes.
         * @member {sonarjs.analyzeproject.v1.StringList.$Properties|null|undefined} cssAdditionalSuffixes
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.cssAdditionalSuffixes = null;

        /**
         * ProjectConfiguration tsConfigPaths.
         * @member {Array.<string>} tsConfigPaths
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.tsConfigPaths = $util.emptyArray;

        /**
         * ProjectConfiguration jsTsExclusions.
         * @member {sonarjs.analyzeproject.v1.StringList.$Properties|null|undefined} jsTsExclusions
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.jsTsExclusions = null;

        /**
         * ProjectConfiguration sources.
         * @member {Array.<string>} sources
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.sources = $util.emptyArray;

        /**
         * ProjectConfiguration inclusions.
         * @member {Array.<string>} inclusions
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.inclusions = $util.emptyArray;

        /**
         * ProjectConfiguration exclusions.
         * @member {Array.<string>} exclusions
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.exclusions = $util.emptyArray;

        /**
         * ProjectConfiguration tests.
         * @member {Array.<string>} tests
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.tests = $util.emptyArray;

        /**
         * ProjectConfiguration testInclusions.
         * @member {Array.<string>} testInclusions
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.testInclusions = $util.emptyArray;

        /**
         * ProjectConfiguration testExclusions.
         * @member {Array.<string>} testExclusions
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.testExclusions = $util.emptyArray;

        /**
         * ProjectConfiguration detectBundles.
         * @member {boolean|null|undefined} detectBundles
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.detectBundles = null;

        /**
         * ProjectConfiguration canAccessFileSystem.
         * @member {boolean|null|undefined} canAccessFileSystem
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.canAccessFileSystem = null;

        /**
         * ProjectConfiguration createTsProgramForOrphanFiles.
         * @member {boolean|null|undefined} createTsProgramForOrphanFiles
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.createTsProgramForOrphanFiles = null;

        /**
         * ProjectConfiguration disableTypeChecking.
         * @member {boolean|null|undefined} disableTypeChecking
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.disableTypeChecking = null;

        /**
         * ProjectConfiguration skipNodeModuleLookupOutsideBaseDir.
         * @member {boolean|null|undefined} skipNodeModuleLookupOutsideBaseDir
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.skipNodeModuleLookupOutsideBaseDir = null;

        /**
         * ProjectConfiguration ecmaScriptVersion.
         * @member {string|null|undefined} ecmaScriptVersion
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.ecmaScriptVersion = null;

        /**
         * ProjectConfiguration clearDependenciesCache.
         * @member {boolean|null|undefined} clearDependenciesCache
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.clearDependenciesCache = null;

        /**
         * ProjectConfiguration clearTsConfigCache.
         * @member {boolean|null|undefined} clearTsConfigCache
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.clearTsConfigCache = null;

        /**
         * ProjectConfiguration reportNclocForTestFiles.
         * @member {boolean|null|undefined} reportNclocForTestFiles
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.reportNclocForTestFiles = null;

        /**
         * ProjectConfiguration detectGeneratedCode.
         * @member {boolean|null|undefined} detectGeneratedCode
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         */
        ProjectConfiguration.prototype.detectGeneratedCode = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(ProjectConfiguration.prototype, '_sonarlint', {
          get: $util.oneOfGetter(($oneOfFields = ['sonarlint'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(ProjectConfiguration.prototype, '_allowTsParserJsFiles', {
          get: $util.oneOfGetter(($oneOfFields = ['allowTsParserJsFiles'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(ProjectConfiguration.prototype, '_skipAst', {
          get: $util.oneOfGetter(($oneOfFields = ['skipAst'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(ProjectConfiguration.prototype, '_ignoreHeaderComments', {
          get: $util.oneOfGetter(($oneOfFields = ['ignoreHeaderComments'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(ProjectConfiguration.prototype, '_maxFileSize', {
          get: $util.oneOfGetter(($oneOfFields = ['maxFileSize'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(ProjectConfiguration.prototype, '_detectBundles', {
          get: $util.oneOfGetter(($oneOfFields = ['detectBundles'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(ProjectConfiguration.prototype, '_canAccessFileSystem', {
          get: $util.oneOfGetter(($oneOfFields = ['canAccessFileSystem'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(ProjectConfiguration.prototype, '_createTsProgramForOrphanFiles', {
          get: $util.oneOfGetter(($oneOfFields = ['createTsProgramForOrphanFiles'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(ProjectConfiguration.prototype, '_disableTypeChecking', {
          get: $util.oneOfGetter(($oneOfFields = ['disableTypeChecking'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(
          ProjectConfiguration.prototype,
          '_skipNodeModuleLookupOutsideBaseDir',
          {
            get: $util.oneOfGetter(($oneOfFields = ['skipNodeModuleLookupOutsideBaseDir'])),
            set: $util.oneOfSetter($oneOfFields),
          },
        );

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(ProjectConfiguration.prototype, '_ecmaScriptVersion', {
          get: $util.oneOfGetter(($oneOfFields = ['ecmaScriptVersion'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(ProjectConfiguration.prototype, '_clearDependenciesCache', {
          get: $util.oneOfGetter(($oneOfFields = ['clearDependenciesCache'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(ProjectConfiguration.prototype, '_clearTsConfigCache', {
          get: $util.oneOfGetter(($oneOfFields = ['clearTsConfigCache'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(ProjectConfiguration.prototype, '_reportNclocForTestFiles', {
          get: $util.oneOfGetter(($oneOfFields = ['reportNclocForTestFiles'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(ProjectConfiguration.prototype, '_detectGeneratedCode', {
          get: $util.oneOfGetter(($oneOfFields = ['detectGeneratedCode'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * Creates a new ProjectConfiguration instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @static
         * @param {sonarjs.analyzeproject.v1.ProjectConfiguration.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.ProjectConfiguration} ProjectConfiguration instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.ProjectConfiguration.$Shape): sonarjs.analyzeproject.v1.ProjectConfiguration & sonarjs.analyzeproject.v1.ProjectConfiguration.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.ProjectConfiguration.$Properties): sonarjs.analyzeproject.v1.ProjectConfiguration;
         * }}
         */
        ProjectConfiguration.create = function create(properties) {
          return new ProjectConfiguration(properties);
        };

        /**
         * Encodes the specified ProjectConfiguration message. Does not implicitly {@link sonarjs.analyzeproject.v1.ProjectConfiguration.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @static
         * @param {sonarjs.analyzeproject.v1.ProjectConfiguration.$Properties} message ProjectConfiguration message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ProjectConfiguration.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.baseDir != null && Object.hasOwnProperty.call(message, 'baseDir'))
            writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.baseDir);
          if (message.sonarlint != null && Object.hasOwnProperty.call(message, 'sonarlint'))
            writer.uint32(/* id 2, wireType 0 =*/ 16).bool(message.sonarlint);
          if (message.fsEvents != null && message.fsEvents.length)
            for (let i = 0; i < message.fsEvents.length; ++i)
              writer.uint32(/* id 3, wireType 2 =*/ 26).string(message.fsEvents[i]);
          if (
            message.allowTsParserJsFiles != null &&
            Object.hasOwnProperty.call(message, 'allowTsParserJsFiles')
          )
            writer.uint32(/* id 4, wireType 0 =*/ 32).bool(message.allowTsParserJsFiles);
          if (message.analysisMode != null && Object.hasOwnProperty.call(message, 'analysisMode'))
            writer.uint32(/* id 5, wireType 0 =*/ 40).int32(message.analysisMode);
          if (message.skipAst != null && Object.hasOwnProperty.call(message, 'skipAst'))
            writer.uint32(/* id 6, wireType 0 =*/ 48).bool(message.skipAst);
          if (
            message.ignoreHeaderComments != null &&
            Object.hasOwnProperty.call(message, 'ignoreHeaderComments')
          )
            writer.uint32(/* id 7, wireType 0 =*/ 56).bool(message.ignoreHeaderComments);
          if (message.maxFileSize != null && Object.hasOwnProperty.call(message, 'maxFileSize'))
            writer.uint32(/* id 8, wireType 0 =*/ 64).int64(message.maxFileSize);
          if (message.environments != null && Object.hasOwnProperty.call(message, 'environments'))
            $root.sonarjs.analyzeproject.v1.StringList.encode(
              message.environments,
              writer.uint32(/* id 9, wireType 2 =*/ 74).fork(),
              _depth + 1,
            ).ldelim();
          if (message.globals != null && Object.hasOwnProperty.call(message, 'globals'))
            $root.sonarjs.analyzeproject.v1.StringList.encode(
              message.globals,
              writer.uint32(/* id 10, wireType 2 =*/ 82).fork(),
              _depth + 1,
            ).ldelim();
          if (message.tsSuffixes != null && Object.hasOwnProperty.call(message, 'tsSuffixes'))
            $root.sonarjs.analyzeproject.v1.StringList.encode(
              message.tsSuffixes,
              writer.uint32(/* id 11, wireType 2 =*/ 90).fork(),
              _depth + 1,
            ).ldelim();
          if (message.jsSuffixes != null && Object.hasOwnProperty.call(message, 'jsSuffixes'))
            $root.sonarjs.analyzeproject.v1.StringList.encode(
              message.jsSuffixes,
              writer.uint32(/* id 12, wireType 2 =*/ 98).fork(),
              _depth + 1,
            ).ldelim();
          if (message.cssSuffixes != null && Object.hasOwnProperty.call(message, 'cssSuffixes'))
            $root.sonarjs.analyzeproject.v1.StringList.encode(
              message.cssSuffixes,
              writer.uint32(/* id 13, wireType 2 =*/ 106).fork(),
              _depth + 1,
            ).ldelim();
          if (message.htmlSuffixes != null && Object.hasOwnProperty.call(message, 'htmlSuffixes'))
            $root.sonarjs.analyzeproject.v1.StringList.encode(
              message.htmlSuffixes,
              writer.uint32(/* id 14, wireType 2 =*/ 114).fork(),
              _depth + 1,
            ).ldelim();
          if (message.yamlSuffixes != null && Object.hasOwnProperty.call(message, 'yamlSuffixes'))
            $root.sonarjs.analyzeproject.v1.StringList.encode(
              message.yamlSuffixes,
              writer.uint32(/* id 15, wireType 2 =*/ 122).fork(),
              _depth + 1,
            ).ldelim();
          if (
            message.cssAdditionalSuffixes != null &&
            Object.hasOwnProperty.call(message, 'cssAdditionalSuffixes')
          )
            $root.sonarjs.analyzeproject.v1.StringList.encode(
              message.cssAdditionalSuffixes,
              writer.uint32(/* id 16, wireType 2 =*/ 130).fork(),
              _depth + 1,
            ).ldelim();
          if (message.tsConfigPaths != null && message.tsConfigPaths.length)
            for (let i = 0; i < message.tsConfigPaths.length; ++i)
              writer.uint32(/* id 17, wireType 2 =*/ 138).string(message.tsConfigPaths[i]);
          if (
            message.jsTsExclusions != null &&
            Object.hasOwnProperty.call(message, 'jsTsExclusions')
          )
            $root.sonarjs.analyzeproject.v1.StringList.encode(
              message.jsTsExclusions,
              writer.uint32(/* id 18, wireType 2 =*/ 146).fork(),
              _depth + 1,
            ).ldelim();
          if (message.sources != null && message.sources.length)
            for (let i = 0; i < message.sources.length; ++i)
              writer.uint32(/* id 19, wireType 2 =*/ 154).string(message.sources[i]);
          if (message.inclusions != null && message.inclusions.length)
            for (let i = 0; i < message.inclusions.length; ++i)
              writer.uint32(/* id 20, wireType 2 =*/ 162).string(message.inclusions[i]);
          if (message.exclusions != null && message.exclusions.length)
            for (let i = 0; i < message.exclusions.length; ++i)
              writer.uint32(/* id 21, wireType 2 =*/ 170).string(message.exclusions[i]);
          if (message.tests != null && message.tests.length)
            for (let i = 0; i < message.tests.length; ++i)
              writer.uint32(/* id 22, wireType 2 =*/ 178).string(message.tests[i]);
          if (message.testInclusions != null && message.testInclusions.length)
            for (let i = 0; i < message.testInclusions.length; ++i)
              writer.uint32(/* id 23, wireType 2 =*/ 186).string(message.testInclusions[i]);
          if (message.testExclusions != null && message.testExclusions.length)
            for (let i = 0; i < message.testExclusions.length; ++i)
              writer.uint32(/* id 24, wireType 2 =*/ 194).string(message.testExclusions[i]);
          if (message.detectBundles != null && Object.hasOwnProperty.call(message, 'detectBundles'))
            writer.uint32(/* id 25, wireType 0 =*/ 200).bool(message.detectBundles);
          if (
            message.canAccessFileSystem != null &&
            Object.hasOwnProperty.call(message, 'canAccessFileSystem')
          )
            writer.uint32(/* id 26, wireType 0 =*/ 208).bool(message.canAccessFileSystem);
          if (
            message.createTsProgramForOrphanFiles != null &&
            Object.hasOwnProperty.call(message, 'createTsProgramForOrphanFiles')
          )
            writer.uint32(/* id 27, wireType 0 =*/ 216).bool(message.createTsProgramForOrphanFiles);
          if (
            message.disableTypeChecking != null &&
            Object.hasOwnProperty.call(message, 'disableTypeChecking')
          )
            writer.uint32(/* id 28, wireType 0 =*/ 224).bool(message.disableTypeChecking);
          if (
            message.skipNodeModuleLookupOutsideBaseDir != null &&
            Object.hasOwnProperty.call(message, 'skipNodeModuleLookupOutsideBaseDir')
          )
            writer
              .uint32(/* id 29, wireType 0 =*/ 232)
              .bool(message.skipNodeModuleLookupOutsideBaseDir);
          if (
            message.ecmaScriptVersion != null &&
            Object.hasOwnProperty.call(message, 'ecmaScriptVersion')
          )
            writer.uint32(/* id 30, wireType 2 =*/ 242).string(message.ecmaScriptVersion);
          if (
            message.clearDependenciesCache != null &&
            Object.hasOwnProperty.call(message, 'clearDependenciesCache')
          )
            writer.uint32(/* id 31, wireType 0 =*/ 248).bool(message.clearDependenciesCache);
          if (
            message.clearTsConfigCache != null &&
            Object.hasOwnProperty.call(message, 'clearTsConfigCache')
          )
            writer.uint32(/* id 32, wireType 0 =*/ 256).bool(message.clearTsConfigCache);
          if (
            message.reportNclocForTestFiles != null &&
            Object.hasOwnProperty.call(message, 'reportNclocForTestFiles')
          )
            writer.uint32(/* id 33, wireType 0 =*/ 264).bool(message.reportNclocForTestFiles);
          if (
            message.detectGeneratedCode != null &&
            Object.hasOwnProperty.call(message, 'detectGeneratedCode')
          )
            writer.uint32(/* id 34, wireType 0 =*/ 272).bool(message.detectGeneratedCode);
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified ProjectConfiguration message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.ProjectConfiguration.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @static
         * @param {sonarjs.analyzeproject.v1.ProjectConfiguration.$Properties} message ProjectConfiguration message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ProjectConfiguration.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a ProjectConfiguration message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.ProjectConfiguration & sonarjs.analyzeproject.v1.ProjectConfiguration.$Shape} ProjectConfiguration
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ProjectConfiguration.decode = function decode(reader, length, _end, _depth, _target) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.ProjectConfiguration(),
            value;
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            let wireType = tag & 7;
            switch ((tag >>>= 3)) {
              case 1: {
                if (wireType !== 2) break;
                if ((value = reader.string()).length) message.baseDir = value;
                else delete message.baseDir;
                continue;
              }
              case 2: {
                if (wireType !== 0) break;
                message.sonarlint = reader.bool();
                message._sonarlint = 'sonarlint';
                continue;
              }
              case 3: {
                if (wireType !== 2) break;
                if (!(message.fsEvents && message.fsEvents.length)) message.fsEvents = [];
                message.fsEvents.push(reader.string());
                continue;
              }
              case 4: {
                if (wireType !== 0) break;
                message.allowTsParserJsFiles = reader.bool();
                message._allowTsParserJsFiles = 'allowTsParserJsFiles';
                continue;
              }
              case 5: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.analysisMode = value;
                else delete message.analysisMode;
                continue;
              }
              case 6: {
                if (wireType !== 0) break;
                message.skipAst = reader.bool();
                message._skipAst = 'skipAst';
                continue;
              }
              case 7: {
                if (wireType !== 0) break;
                message.ignoreHeaderComments = reader.bool();
                message._ignoreHeaderComments = 'ignoreHeaderComments';
                continue;
              }
              case 8: {
                if (wireType !== 0) break;
                message.maxFileSize = reader.int64();
                message._maxFileSize = 'maxFileSize';
                continue;
              }
              case 9: {
                if (wireType !== 2) break;
                message.environments = $root.sonarjs.analyzeproject.v1.StringList.decode(
                  reader,
                  reader.uint32(),
                  undefined,
                  _depth + 1,
                  message.environments,
                );
                continue;
              }
              case 10: {
                if (wireType !== 2) break;
                message.globals = $root.sonarjs.analyzeproject.v1.StringList.decode(
                  reader,
                  reader.uint32(),
                  undefined,
                  _depth + 1,
                  message.globals,
                );
                continue;
              }
              case 11: {
                if (wireType !== 2) break;
                message.tsSuffixes = $root.sonarjs.analyzeproject.v1.StringList.decode(
                  reader,
                  reader.uint32(),
                  undefined,
                  _depth + 1,
                  message.tsSuffixes,
                );
                continue;
              }
              case 12: {
                if (wireType !== 2) break;
                message.jsSuffixes = $root.sonarjs.analyzeproject.v1.StringList.decode(
                  reader,
                  reader.uint32(),
                  undefined,
                  _depth + 1,
                  message.jsSuffixes,
                );
                continue;
              }
              case 13: {
                if (wireType !== 2) break;
                message.cssSuffixes = $root.sonarjs.analyzeproject.v1.StringList.decode(
                  reader,
                  reader.uint32(),
                  undefined,
                  _depth + 1,
                  message.cssSuffixes,
                );
                continue;
              }
              case 14: {
                if (wireType !== 2) break;
                message.htmlSuffixes = $root.sonarjs.analyzeproject.v1.StringList.decode(
                  reader,
                  reader.uint32(),
                  undefined,
                  _depth + 1,
                  message.htmlSuffixes,
                );
                continue;
              }
              case 15: {
                if (wireType !== 2) break;
                message.yamlSuffixes = $root.sonarjs.analyzeproject.v1.StringList.decode(
                  reader,
                  reader.uint32(),
                  undefined,
                  _depth + 1,
                  message.yamlSuffixes,
                );
                continue;
              }
              case 16: {
                if (wireType !== 2) break;
                message.cssAdditionalSuffixes = $root.sonarjs.analyzeproject.v1.StringList.decode(
                  reader,
                  reader.uint32(),
                  undefined,
                  _depth + 1,
                  message.cssAdditionalSuffixes,
                );
                continue;
              }
              case 17: {
                if (wireType !== 2) break;
                if (!(message.tsConfigPaths && message.tsConfigPaths.length))
                  message.tsConfigPaths = [];
                message.tsConfigPaths.push(reader.string());
                continue;
              }
              case 18: {
                if (wireType !== 2) break;
                message.jsTsExclusions = $root.sonarjs.analyzeproject.v1.StringList.decode(
                  reader,
                  reader.uint32(),
                  undefined,
                  _depth + 1,
                  message.jsTsExclusions,
                );
                continue;
              }
              case 19: {
                if (wireType !== 2) break;
                if (!(message.sources && message.sources.length)) message.sources = [];
                message.sources.push(reader.string());
                continue;
              }
              case 20: {
                if (wireType !== 2) break;
                if (!(message.inclusions && message.inclusions.length)) message.inclusions = [];
                message.inclusions.push(reader.string());
                continue;
              }
              case 21: {
                if (wireType !== 2) break;
                if (!(message.exclusions && message.exclusions.length)) message.exclusions = [];
                message.exclusions.push(reader.string());
                continue;
              }
              case 22: {
                if (wireType !== 2) break;
                if (!(message.tests && message.tests.length)) message.tests = [];
                message.tests.push(reader.string());
                continue;
              }
              case 23: {
                if (wireType !== 2) break;
                if (!(message.testInclusions && message.testInclusions.length))
                  message.testInclusions = [];
                message.testInclusions.push(reader.string());
                continue;
              }
              case 24: {
                if (wireType !== 2) break;
                if (!(message.testExclusions && message.testExclusions.length))
                  message.testExclusions = [];
                message.testExclusions.push(reader.string());
                continue;
              }
              case 25: {
                if (wireType !== 0) break;
                message.detectBundles = reader.bool();
                message._detectBundles = 'detectBundles';
                continue;
              }
              case 26: {
                if (wireType !== 0) break;
                message.canAccessFileSystem = reader.bool();
                message._canAccessFileSystem = 'canAccessFileSystem';
                continue;
              }
              case 27: {
                if (wireType !== 0) break;
                message.createTsProgramForOrphanFiles = reader.bool();
                message._createTsProgramForOrphanFiles = 'createTsProgramForOrphanFiles';
                continue;
              }
              case 28: {
                if (wireType !== 0) break;
                message.disableTypeChecking = reader.bool();
                message._disableTypeChecking = 'disableTypeChecking';
                continue;
              }
              case 29: {
                if (wireType !== 0) break;
                message.skipNodeModuleLookupOutsideBaseDir = reader.bool();
                message._skipNodeModuleLookupOutsideBaseDir = 'skipNodeModuleLookupOutsideBaseDir';
                continue;
              }
              case 30: {
                if (wireType !== 2) break;
                message.ecmaScriptVersion = reader.string();
                message._ecmaScriptVersion = 'ecmaScriptVersion';
                continue;
              }
              case 31: {
                if (wireType !== 0) break;
                message.clearDependenciesCache = reader.bool();
                message._clearDependenciesCache = 'clearDependenciesCache';
                continue;
              }
              case 32: {
                if (wireType !== 0) break;
                message.clearTsConfigCache = reader.bool();
                message._clearTsConfigCache = 'clearTsConfigCache';
                continue;
              }
              case 33: {
                if (wireType !== 0) break;
                message.reportNclocForTestFiles = reader.bool();
                message._reportNclocForTestFiles = 'reportNclocForTestFiles';
                continue;
              }
              case 34: {
                if (wireType !== 0) break;
                message.detectGeneratedCode = reader.bool();
                message._detectGeneratedCode = 'detectGeneratedCode';
                continue;
              }
            }
            reader.skipType(wireType, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes a ProjectConfiguration message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.ProjectConfiguration & sonarjs.analyzeproject.v1.ProjectConfiguration.$Shape} ProjectConfiguration
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ProjectConfiguration.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ProjectConfiguration message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ProjectConfiguration.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          let properties = {};
          if (message.baseDir != null && message.hasOwnProperty('baseDir'))
            if (!$util.isString(message.baseDir)) return 'baseDir: string expected';
          if (message.sonarlint != null && message.hasOwnProperty('sonarlint')) {
            properties._sonarlint = 1;
            if (typeof message.sonarlint !== 'boolean') return 'sonarlint: boolean expected';
          }
          if (message.fsEvents != null && message.hasOwnProperty('fsEvents')) {
            if (!Array.isArray(message.fsEvents)) return 'fsEvents: array expected';
            for (let i = 0; i < message.fsEvents.length; ++i)
              if (!$util.isString(message.fsEvents[i])) return 'fsEvents: string[] expected';
          }
          if (
            message.allowTsParserJsFiles != null &&
            message.hasOwnProperty('allowTsParserJsFiles')
          ) {
            properties._allowTsParserJsFiles = 1;
            if (typeof message.allowTsParserJsFiles !== 'boolean')
              return 'allowTsParserJsFiles: boolean expected';
          }
          if (message.analysisMode != null && message.hasOwnProperty('analysisMode'))
            switch (message.analysisMode) {
              default:
                return 'analysisMode: enum value expected';
              case 0:
              case 1:
              case 2:
                break;
            }
          if (message.skipAst != null && message.hasOwnProperty('skipAst')) {
            properties._skipAst = 1;
            if (typeof message.skipAst !== 'boolean') return 'skipAst: boolean expected';
          }
          if (
            message.ignoreHeaderComments != null &&
            message.hasOwnProperty('ignoreHeaderComments')
          ) {
            properties._ignoreHeaderComments = 1;
            if (typeof message.ignoreHeaderComments !== 'boolean')
              return 'ignoreHeaderComments: boolean expected';
          }
          if (message.maxFileSize != null && message.hasOwnProperty('maxFileSize')) {
            properties._maxFileSize = 1;
            if (
              !$util.isInteger(message.maxFileSize) &&
              !(
                message.maxFileSize &&
                $util.isInteger(message.maxFileSize.low) &&
                $util.isInteger(message.maxFileSize.high)
              )
            )
              return 'maxFileSize: integer|Long expected';
          }
          if (message.environments != null && message.hasOwnProperty('environments')) {
            let error = $root.sonarjs.analyzeproject.v1.StringList.verify(
              message.environments,
              _depth + 1,
            );
            if (error) return 'environments.' + error;
          }
          if (message.globals != null && message.hasOwnProperty('globals')) {
            let error = $root.sonarjs.analyzeproject.v1.StringList.verify(
              message.globals,
              _depth + 1,
            );
            if (error) return 'globals.' + error;
          }
          if (message.tsSuffixes != null && message.hasOwnProperty('tsSuffixes')) {
            let error = $root.sonarjs.analyzeproject.v1.StringList.verify(
              message.tsSuffixes,
              _depth + 1,
            );
            if (error) return 'tsSuffixes.' + error;
          }
          if (message.jsSuffixes != null && message.hasOwnProperty('jsSuffixes')) {
            let error = $root.sonarjs.analyzeproject.v1.StringList.verify(
              message.jsSuffixes,
              _depth + 1,
            );
            if (error) return 'jsSuffixes.' + error;
          }
          if (message.cssSuffixes != null && message.hasOwnProperty('cssSuffixes')) {
            let error = $root.sonarjs.analyzeproject.v1.StringList.verify(
              message.cssSuffixes,
              _depth + 1,
            );
            if (error) return 'cssSuffixes.' + error;
          }
          if (message.htmlSuffixes != null && message.hasOwnProperty('htmlSuffixes')) {
            let error = $root.sonarjs.analyzeproject.v1.StringList.verify(
              message.htmlSuffixes,
              _depth + 1,
            );
            if (error) return 'htmlSuffixes.' + error;
          }
          if (message.yamlSuffixes != null && message.hasOwnProperty('yamlSuffixes')) {
            let error = $root.sonarjs.analyzeproject.v1.StringList.verify(
              message.yamlSuffixes,
              _depth + 1,
            );
            if (error) return 'yamlSuffixes.' + error;
          }
          if (
            message.cssAdditionalSuffixes != null &&
            message.hasOwnProperty('cssAdditionalSuffixes')
          ) {
            let error = $root.sonarjs.analyzeproject.v1.StringList.verify(
              message.cssAdditionalSuffixes,
              _depth + 1,
            );
            if (error) return 'cssAdditionalSuffixes.' + error;
          }
          if (message.tsConfigPaths != null && message.hasOwnProperty('tsConfigPaths')) {
            if (!Array.isArray(message.tsConfigPaths)) return 'tsConfigPaths: array expected';
            for (let i = 0; i < message.tsConfigPaths.length; ++i)
              if (!$util.isString(message.tsConfigPaths[i]))
                return 'tsConfigPaths: string[] expected';
          }
          if (message.jsTsExclusions != null && message.hasOwnProperty('jsTsExclusions')) {
            let error = $root.sonarjs.analyzeproject.v1.StringList.verify(
              message.jsTsExclusions,
              _depth + 1,
            );
            if (error) return 'jsTsExclusions.' + error;
          }
          if (message.sources != null && message.hasOwnProperty('sources')) {
            if (!Array.isArray(message.sources)) return 'sources: array expected';
            for (let i = 0; i < message.sources.length; ++i)
              if (!$util.isString(message.sources[i])) return 'sources: string[] expected';
          }
          if (message.inclusions != null && message.hasOwnProperty('inclusions')) {
            if (!Array.isArray(message.inclusions)) return 'inclusions: array expected';
            for (let i = 0; i < message.inclusions.length; ++i)
              if (!$util.isString(message.inclusions[i])) return 'inclusions: string[] expected';
          }
          if (message.exclusions != null && message.hasOwnProperty('exclusions')) {
            if (!Array.isArray(message.exclusions)) return 'exclusions: array expected';
            for (let i = 0; i < message.exclusions.length; ++i)
              if (!$util.isString(message.exclusions[i])) return 'exclusions: string[] expected';
          }
          if (message.tests != null && message.hasOwnProperty('tests')) {
            if (!Array.isArray(message.tests)) return 'tests: array expected';
            for (let i = 0; i < message.tests.length; ++i)
              if (!$util.isString(message.tests[i])) return 'tests: string[] expected';
          }
          if (message.testInclusions != null && message.hasOwnProperty('testInclusions')) {
            if (!Array.isArray(message.testInclusions)) return 'testInclusions: array expected';
            for (let i = 0; i < message.testInclusions.length; ++i)
              if (!$util.isString(message.testInclusions[i]))
                return 'testInclusions: string[] expected';
          }
          if (message.testExclusions != null && message.hasOwnProperty('testExclusions')) {
            if (!Array.isArray(message.testExclusions)) return 'testExclusions: array expected';
            for (let i = 0; i < message.testExclusions.length; ++i)
              if (!$util.isString(message.testExclusions[i]))
                return 'testExclusions: string[] expected';
          }
          if (message.detectBundles != null && message.hasOwnProperty('detectBundles')) {
            properties._detectBundles = 1;
            if (typeof message.detectBundles !== 'boolean')
              return 'detectBundles: boolean expected';
          }
          if (
            message.canAccessFileSystem != null &&
            message.hasOwnProperty('canAccessFileSystem')
          ) {
            properties._canAccessFileSystem = 1;
            if (typeof message.canAccessFileSystem !== 'boolean')
              return 'canAccessFileSystem: boolean expected';
          }
          if (
            message.createTsProgramForOrphanFiles != null &&
            message.hasOwnProperty('createTsProgramForOrphanFiles')
          ) {
            properties._createTsProgramForOrphanFiles = 1;
            if (typeof message.createTsProgramForOrphanFiles !== 'boolean')
              return 'createTsProgramForOrphanFiles: boolean expected';
          }
          if (
            message.disableTypeChecking != null &&
            message.hasOwnProperty('disableTypeChecking')
          ) {
            properties._disableTypeChecking = 1;
            if (typeof message.disableTypeChecking !== 'boolean')
              return 'disableTypeChecking: boolean expected';
          }
          if (
            message.skipNodeModuleLookupOutsideBaseDir != null &&
            message.hasOwnProperty('skipNodeModuleLookupOutsideBaseDir')
          ) {
            properties._skipNodeModuleLookupOutsideBaseDir = 1;
            if (typeof message.skipNodeModuleLookupOutsideBaseDir !== 'boolean')
              return 'skipNodeModuleLookupOutsideBaseDir: boolean expected';
          }
          if (message.ecmaScriptVersion != null && message.hasOwnProperty('ecmaScriptVersion')) {
            properties._ecmaScriptVersion = 1;
            if (!$util.isString(message.ecmaScriptVersion))
              return 'ecmaScriptVersion: string expected';
          }
          if (
            message.clearDependenciesCache != null &&
            message.hasOwnProperty('clearDependenciesCache')
          ) {
            properties._clearDependenciesCache = 1;
            if (typeof message.clearDependenciesCache !== 'boolean')
              return 'clearDependenciesCache: boolean expected';
          }
          if (message.clearTsConfigCache != null && message.hasOwnProperty('clearTsConfigCache')) {
            properties._clearTsConfigCache = 1;
            if (typeof message.clearTsConfigCache !== 'boolean')
              return 'clearTsConfigCache: boolean expected';
          }
          if (
            message.reportNclocForTestFiles != null &&
            message.hasOwnProperty('reportNclocForTestFiles')
          ) {
            properties._reportNclocForTestFiles = 1;
            if (typeof message.reportNclocForTestFiles !== 'boolean')
              return 'reportNclocForTestFiles: boolean expected';
          }
          if (
            message.detectGeneratedCode != null &&
            message.hasOwnProperty('detectGeneratedCode')
          ) {
            properties._detectGeneratedCode = 1;
            if (typeof message.detectGeneratedCode !== 'boolean')
              return 'detectGeneratedCode: boolean expected';
          }
          return null;
        };

        /**
         * Creates a ProjectConfiguration message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.ProjectConfiguration} ProjectConfiguration
         */
        ProjectConfiguration.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.ProjectConfiguration) return object;
          if (!$util.isObject(object))
            throw TypeError('.sonarjs.analyzeproject.v1.ProjectConfiguration: object expected');
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let message = new $root.sonarjs.analyzeproject.v1.ProjectConfiguration();
          if (object.baseDir != null)
            if (typeof object.baseDir !== 'string' || object.baseDir.length)
              message.baseDir = String(object.baseDir);
          if (object.sonarlint != null) message.sonarlint = Boolean(object.sonarlint);
          if (object.fsEvents) {
            if (!Array.isArray(object.fsEvents))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectConfiguration.fsEvents: array expected',
              );
            message.fsEvents = Array(object.fsEvents.length);
            for (let i = 0; i < object.fsEvents.length; ++i)
              message.fsEvents[i] = String(object.fsEvents[i]);
          }
          if (object.allowTsParserJsFiles != null)
            message.allowTsParserJsFiles = Boolean(object.allowTsParserJsFiles);
          if (
            object.analysisMode !== 0 &&
            (typeof object.analysisMode !== 'string' ||
              $root.sonarjs.analyzeproject.v1.AnalysisMode[object.analysisMode] !== 0)
          )
            switch (object.analysisMode) {
              default:
                if (typeof object.analysisMode === 'number') {
                  message.analysisMode = object.analysisMode;
                  break;
                }
                break;
              case 'ANALYSIS_MODE_UNSPECIFIED':
              case 0:
                message.analysisMode = 0;
                break;
              case 'ANALYSIS_MODE_DEFAULT':
              case 1:
                message.analysisMode = 1;
                break;
              case 'ANALYSIS_MODE_SKIP_UNCHANGED':
              case 2:
                message.analysisMode = 2;
                break;
            }
          if (object.skipAst != null) message.skipAst = Boolean(object.skipAst);
          if (object.ignoreHeaderComments != null)
            message.ignoreHeaderComments = Boolean(object.ignoreHeaderComments);
          if (object.maxFileSize != null)
            if ($util.Long) message.maxFileSize = $util.Long.fromValue(object.maxFileSize, false);
            else if (typeof object.maxFileSize === 'string')
              message.maxFileSize = parseInt(object.maxFileSize, 10);
            else if (typeof object.maxFileSize === 'number')
              message.maxFileSize = object.maxFileSize;
            else if (typeof object.maxFileSize === 'object')
              message.maxFileSize = new $util.LongBits(
                object.maxFileSize.low >>> 0,
                object.maxFileSize.high >>> 0,
              ).toNumber();
          if (object.environments != null) {
            if (!$util.isObject(object.environments))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectConfiguration.environments: object expected',
              );
            message.environments = $root.sonarjs.analyzeproject.v1.StringList.fromObject(
              object.environments,
              _depth + 1,
            );
          }
          if (object.globals != null) {
            if (!$util.isObject(object.globals))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectConfiguration.globals: object expected',
              );
            message.globals = $root.sonarjs.analyzeproject.v1.StringList.fromObject(
              object.globals,
              _depth + 1,
            );
          }
          if (object.tsSuffixes != null) {
            if (!$util.isObject(object.tsSuffixes))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectConfiguration.tsSuffixes: object expected',
              );
            message.tsSuffixes = $root.sonarjs.analyzeproject.v1.StringList.fromObject(
              object.tsSuffixes,
              _depth + 1,
            );
          }
          if (object.jsSuffixes != null) {
            if (!$util.isObject(object.jsSuffixes))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectConfiguration.jsSuffixes: object expected',
              );
            message.jsSuffixes = $root.sonarjs.analyzeproject.v1.StringList.fromObject(
              object.jsSuffixes,
              _depth + 1,
            );
          }
          if (object.cssSuffixes != null) {
            if (!$util.isObject(object.cssSuffixes))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectConfiguration.cssSuffixes: object expected',
              );
            message.cssSuffixes = $root.sonarjs.analyzeproject.v1.StringList.fromObject(
              object.cssSuffixes,
              _depth + 1,
            );
          }
          if (object.htmlSuffixes != null) {
            if (!$util.isObject(object.htmlSuffixes))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectConfiguration.htmlSuffixes: object expected',
              );
            message.htmlSuffixes = $root.sonarjs.analyzeproject.v1.StringList.fromObject(
              object.htmlSuffixes,
              _depth + 1,
            );
          }
          if (object.yamlSuffixes != null) {
            if (!$util.isObject(object.yamlSuffixes))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectConfiguration.yamlSuffixes: object expected',
              );
            message.yamlSuffixes = $root.sonarjs.analyzeproject.v1.StringList.fromObject(
              object.yamlSuffixes,
              _depth + 1,
            );
          }
          if (object.cssAdditionalSuffixes != null) {
            if (!$util.isObject(object.cssAdditionalSuffixes))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectConfiguration.cssAdditionalSuffixes: object expected',
              );
            message.cssAdditionalSuffixes = $root.sonarjs.analyzeproject.v1.StringList.fromObject(
              object.cssAdditionalSuffixes,
              _depth + 1,
            );
          }
          if (object.tsConfigPaths) {
            if (!Array.isArray(object.tsConfigPaths))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectConfiguration.tsConfigPaths: array expected',
              );
            message.tsConfigPaths = Array(object.tsConfigPaths.length);
            for (let i = 0; i < object.tsConfigPaths.length; ++i)
              message.tsConfigPaths[i] = String(object.tsConfigPaths[i]);
          }
          if (object.jsTsExclusions != null) {
            if (!$util.isObject(object.jsTsExclusions))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectConfiguration.jsTsExclusions: object expected',
              );
            message.jsTsExclusions = $root.sonarjs.analyzeproject.v1.StringList.fromObject(
              object.jsTsExclusions,
              _depth + 1,
            );
          }
          if (object.sources) {
            if (!Array.isArray(object.sources))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectConfiguration.sources: array expected',
              );
            message.sources = Array(object.sources.length);
            for (let i = 0; i < object.sources.length; ++i)
              message.sources[i] = String(object.sources[i]);
          }
          if (object.inclusions) {
            if (!Array.isArray(object.inclusions))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectConfiguration.inclusions: array expected',
              );
            message.inclusions = Array(object.inclusions.length);
            for (let i = 0; i < object.inclusions.length; ++i)
              message.inclusions[i] = String(object.inclusions[i]);
          }
          if (object.exclusions) {
            if (!Array.isArray(object.exclusions))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectConfiguration.exclusions: array expected',
              );
            message.exclusions = Array(object.exclusions.length);
            for (let i = 0; i < object.exclusions.length; ++i)
              message.exclusions[i] = String(object.exclusions[i]);
          }
          if (object.tests) {
            if (!Array.isArray(object.tests))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectConfiguration.tests: array expected',
              );
            message.tests = Array(object.tests.length);
            for (let i = 0; i < object.tests.length; ++i)
              message.tests[i] = String(object.tests[i]);
          }
          if (object.testInclusions) {
            if (!Array.isArray(object.testInclusions))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectConfiguration.testInclusions: array expected',
              );
            message.testInclusions = Array(object.testInclusions.length);
            for (let i = 0; i < object.testInclusions.length; ++i)
              message.testInclusions[i] = String(object.testInclusions[i]);
          }
          if (object.testExclusions) {
            if (!Array.isArray(object.testExclusions))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectConfiguration.testExclusions: array expected',
              );
            message.testExclusions = Array(object.testExclusions.length);
            for (let i = 0; i < object.testExclusions.length; ++i)
              message.testExclusions[i] = String(object.testExclusions[i]);
          }
          if (object.detectBundles != null) message.detectBundles = Boolean(object.detectBundles);
          if (object.canAccessFileSystem != null)
            message.canAccessFileSystem = Boolean(object.canAccessFileSystem);
          if (object.createTsProgramForOrphanFiles != null)
            message.createTsProgramForOrphanFiles = Boolean(object.createTsProgramForOrphanFiles);
          if (object.disableTypeChecking != null)
            message.disableTypeChecking = Boolean(object.disableTypeChecking);
          if (object.skipNodeModuleLookupOutsideBaseDir != null)
            message.skipNodeModuleLookupOutsideBaseDir = Boolean(
              object.skipNodeModuleLookupOutsideBaseDir,
            );
          if (object.ecmaScriptVersion != null)
            message.ecmaScriptVersion = String(object.ecmaScriptVersion);
          if (object.clearDependenciesCache != null)
            message.clearDependenciesCache = Boolean(object.clearDependenciesCache);
          if (object.clearTsConfigCache != null)
            message.clearTsConfigCache = Boolean(object.clearTsConfigCache);
          if (object.reportNclocForTestFiles != null)
            message.reportNclocForTestFiles = Boolean(object.reportNclocForTestFiles);
          if (object.detectGeneratedCode != null)
            message.detectGeneratedCode = Boolean(object.detectGeneratedCode);
          return message;
        };

        /**
         * Creates a plain object from a ProjectConfiguration message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @static
         * @param {sonarjs.analyzeproject.v1.ProjectConfiguration} message ProjectConfiguration
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ProjectConfiguration.toObject = function toObject(message, options, _depth) {
          if (!options) options = {};
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let object = {};
          if (options.arrays || options.defaults) {
            object.fsEvents = [];
            object.tsConfigPaths = [];
            object.sources = [];
            object.inclusions = [];
            object.exclusions = [];
            object.tests = [];
            object.testInclusions = [];
            object.testExclusions = [];
          }
          if (options.defaults) {
            object.baseDir = '';
            object.analysisMode = options.enums === String ? 'ANALYSIS_MODE_UNSPECIFIED' : 0;
            object.environments = null;
            object.globals = null;
            object.tsSuffixes = null;
            object.jsSuffixes = null;
            object.cssSuffixes = null;
            object.htmlSuffixes = null;
            object.yamlSuffixes = null;
            object.cssAdditionalSuffixes = null;
            object.jsTsExclusions = null;
          }
          if (message.baseDir != null && message.hasOwnProperty('baseDir'))
            object.baseDir = message.baseDir;
          if (message.sonarlint != null && message.hasOwnProperty('sonarlint'))
            object.sonarlint = message.sonarlint;
          if (message.fsEvents && message.fsEvents.length) {
            object.fsEvents = Array(message.fsEvents.length);
            for (let j = 0; j < message.fsEvents.length; ++j)
              object.fsEvents[j] = message.fsEvents[j];
          }
          if (
            message.allowTsParserJsFiles != null &&
            message.hasOwnProperty('allowTsParserJsFiles')
          )
            object.allowTsParserJsFiles = message.allowTsParserJsFiles;
          if (message.analysisMode != null && message.hasOwnProperty('analysisMode'))
            object.analysisMode =
              options.enums === String
                ? $root.sonarjs.analyzeproject.v1.AnalysisMode[message.analysisMode] === undefined
                  ? message.analysisMode
                  : $root.sonarjs.analyzeproject.v1.AnalysisMode[message.analysisMode]
                : message.analysisMode;
          if (message.skipAst != null && message.hasOwnProperty('skipAst'))
            object.skipAst = message.skipAst;
          if (
            message.ignoreHeaderComments != null &&
            message.hasOwnProperty('ignoreHeaderComments')
          )
            object.ignoreHeaderComments = message.ignoreHeaderComments;
          if (message.maxFileSize != null && message.hasOwnProperty('maxFileSize'))
            if (typeof BigInt !== 'undefined' && options.longs === BigInt)
              object.maxFileSize =
                typeof message.maxFileSize === 'number'
                  ? BigInt(message.maxFileSize)
                  : $util.Long.fromBits(
                      message.maxFileSize.low >>> 0,
                      message.maxFileSize.high >>> 0,
                      false,
                    ).toBigInt();
            else if (typeof message.maxFileSize === 'number')
              object.maxFileSize =
                options.longs === String ? String(message.maxFileSize) : message.maxFileSize;
            else
              object.maxFileSize =
                options.longs === String
                  ? $util.Long.prototype.toString.call(message.maxFileSize)
                  : options.longs === Number
                    ? new $util.LongBits(
                        message.maxFileSize.low >>> 0,
                        message.maxFileSize.high >>> 0,
                      ).toNumber()
                    : message.maxFileSize;
          if (message.environments != null && message.hasOwnProperty('environments'))
            object.environments = $root.sonarjs.analyzeproject.v1.StringList.toObject(
              message.environments,
              options,
              _depth + 1,
            );
          if (message.globals != null && message.hasOwnProperty('globals'))
            object.globals = $root.sonarjs.analyzeproject.v1.StringList.toObject(
              message.globals,
              options,
              _depth + 1,
            );
          if (message.tsSuffixes != null && message.hasOwnProperty('tsSuffixes'))
            object.tsSuffixes = $root.sonarjs.analyzeproject.v1.StringList.toObject(
              message.tsSuffixes,
              options,
              _depth + 1,
            );
          if (message.jsSuffixes != null && message.hasOwnProperty('jsSuffixes'))
            object.jsSuffixes = $root.sonarjs.analyzeproject.v1.StringList.toObject(
              message.jsSuffixes,
              options,
              _depth + 1,
            );
          if (message.cssSuffixes != null && message.hasOwnProperty('cssSuffixes'))
            object.cssSuffixes = $root.sonarjs.analyzeproject.v1.StringList.toObject(
              message.cssSuffixes,
              options,
              _depth + 1,
            );
          if (message.htmlSuffixes != null && message.hasOwnProperty('htmlSuffixes'))
            object.htmlSuffixes = $root.sonarjs.analyzeproject.v1.StringList.toObject(
              message.htmlSuffixes,
              options,
              _depth + 1,
            );
          if (message.yamlSuffixes != null && message.hasOwnProperty('yamlSuffixes'))
            object.yamlSuffixes = $root.sonarjs.analyzeproject.v1.StringList.toObject(
              message.yamlSuffixes,
              options,
              _depth + 1,
            );
          if (
            message.cssAdditionalSuffixes != null &&
            message.hasOwnProperty('cssAdditionalSuffixes')
          )
            object.cssAdditionalSuffixes = $root.sonarjs.analyzeproject.v1.StringList.toObject(
              message.cssAdditionalSuffixes,
              options,
              _depth + 1,
            );
          if (message.tsConfigPaths && message.tsConfigPaths.length) {
            object.tsConfigPaths = Array(message.tsConfigPaths.length);
            for (let j = 0; j < message.tsConfigPaths.length; ++j)
              object.tsConfigPaths[j] = message.tsConfigPaths[j];
          }
          if (message.jsTsExclusions != null && message.hasOwnProperty('jsTsExclusions'))
            object.jsTsExclusions = $root.sonarjs.analyzeproject.v1.StringList.toObject(
              message.jsTsExclusions,
              options,
              _depth + 1,
            );
          if (message.sources && message.sources.length) {
            object.sources = Array(message.sources.length);
            for (let j = 0; j < message.sources.length; ++j) object.sources[j] = message.sources[j];
          }
          if (message.inclusions && message.inclusions.length) {
            object.inclusions = Array(message.inclusions.length);
            for (let j = 0; j < message.inclusions.length; ++j)
              object.inclusions[j] = message.inclusions[j];
          }
          if (message.exclusions && message.exclusions.length) {
            object.exclusions = Array(message.exclusions.length);
            for (let j = 0; j < message.exclusions.length; ++j)
              object.exclusions[j] = message.exclusions[j];
          }
          if (message.tests && message.tests.length) {
            object.tests = Array(message.tests.length);
            for (let j = 0; j < message.tests.length; ++j) object.tests[j] = message.tests[j];
          }
          if (message.testInclusions && message.testInclusions.length) {
            object.testInclusions = Array(message.testInclusions.length);
            for (let j = 0; j < message.testInclusions.length; ++j)
              object.testInclusions[j] = message.testInclusions[j];
          }
          if (message.testExclusions && message.testExclusions.length) {
            object.testExclusions = Array(message.testExclusions.length);
            for (let j = 0; j < message.testExclusions.length; ++j)
              object.testExclusions[j] = message.testExclusions[j];
          }
          if (message.detectBundles != null && message.hasOwnProperty('detectBundles'))
            object.detectBundles = message.detectBundles;
          if (message.canAccessFileSystem != null && message.hasOwnProperty('canAccessFileSystem'))
            object.canAccessFileSystem = message.canAccessFileSystem;
          if (
            message.createTsProgramForOrphanFiles != null &&
            message.hasOwnProperty('createTsProgramForOrphanFiles')
          )
            object.createTsProgramForOrphanFiles = message.createTsProgramForOrphanFiles;
          if (message.disableTypeChecking != null && message.hasOwnProperty('disableTypeChecking'))
            object.disableTypeChecking = message.disableTypeChecking;
          if (
            message.skipNodeModuleLookupOutsideBaseDir != null &&
            message.hasOwnProperty('skipNodeModuleLookupOutsideBaseDir')
          )
            object.skipNodeModuleLookupOutsideBaseDir = message.skipNodeModuleLookupOutsideBaseDir;
          if (message.ecmaScriptVersion != null && message.hasOwnProperty('ecmaScriptVersion'))
            object.ecmaScriptVersion = message.ecmaScriptVersion;
          if (
            message.clearDependenciesCache != null &&
            message.hasOwnProperty('clearDependenciesCache')
          )
            object.clearDependenciesCache = message.clearDependenciesCache;
          if (message.clearTsConfigCache != null && message.hasOwnProperty('clearTsConfigCache'))
            object.clearTsConfigCache = message.clearTsConfigCache;
          if (
            message.reportNclocForTestFiles != null &&
            message.hasOwnProperty('reportNclocForTestFiles')
          )
            object.reportNclocForTestFiles = message.reportNclocForTestFiles;
          if (message.detectGeneratedCode != null && message.hasOwnProperty('detectGeneratedCode'))
            object.detectGeneratedCode = message.detectGeneratedCode;
          return object;
        };

        /**
         * Converts this ProjectConfiguration to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ProjectConfiguration.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for ProjectConfiguration
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.ProjectConfiguration
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        ProjectConfiguration.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.ProjectConfiguration';
        };

        return ProjectConfiguration;
      })();

      v1.StringList = (function () {
        /**
         * Properties of a StringList.
         * @typedef {Object} sonarjs.analyzeproject.v1.StringList.$Properties
         * @property {Array.<string>|null} [values] StringList values
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of a StringList.
         * @memberof sonarjs.analyzeproject.v1
         * @interface IStringList
         * @augments sonarjs.analyzeproject.v1.StringList.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.StringList.$Properties instead.
         */

        /**
         * Shape of a StringList.
         * @typedef {sonarjs.analyzeproject.v1.StringList.$Properties} sonarjs.analyzeproject.v1.StringList.$Shape
         */

        /**
         * Constructs a new StringList.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents a StringList.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.StringList.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function StringList(properties) {
          this.values = [];
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * StringList values.
         * @member {Array.<string>} values
         * @memberof sonarjs.analyzeproject.v1.StringList
         * @instance
         */
        StringList.prototype.values = $util.emptyArray;

        /**
         * Creates a new StringList instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.StringList
         * @static
         * @param {sonarjs.analyzeproject.v1.StringList.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.StringList} StringList instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.StringList.$Shape): sonarjs.analyzeproject.v1.StringList & sonarjs.analyzeproject.v1.StringList.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.StringList.$Properties): sonarjs.analyzeproject.v1.StringList;
         * }}
         */
        StringList.create = function create(properties) {
          return new StringList(properties);
        };

        /**
         * Encodes the specified StringList message. Does not implicitly {@link sonarjs.analyzeproject.v1.StringList.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.StringList
         * @static
         * @param {sonarjs.analyzeproject.v1.StringList.$Properties} message StringList message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        StringList.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.values != null && message.values.length)
            for (let i = 0; i < message.values.length; ++i)
              writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.values[i]);
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified StringList message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.StringList.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.StringList
         * @static
         * @param {sonarjs.analyzeproject.v1.StringList.$Properties} message StringList message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        StringList.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a StringList message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.StringList
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.StringList & sonarjs.analyzeproject.v1.StringList.$Shape} StringList
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        StringList.decode = function decode(reader, length, _end, _depth, _target) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.StringList();
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            let wireType = tag & 7;
            switch ((tag >>>= 3)) {
              case 1: {
                if (wireType !== 2) break;
                if (!(message.values && message.values.length)) message.values = [];
                message.values.push(reader.string());
                continue;
              }
            }
            reader.skipType(wireType, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes a StringList message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.StringList
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.StringList & sonarjs.analyzeproject.v1.StringList.$Shape} StringList
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        StringList.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a StringList message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.StringList
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        StringList.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          if (message.values != null && message.hasOwnProperty('values')) {
            if (!Array.isArray(message.values)) return 'values: array expected';
            for (let i = 0; i < message.values.length; ++i)
              if (!$util.isString(message.values[i])) return 'values: string[] expected';
          }
          return null;
        };

        /**
         * Creates a StringList message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.StringList
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.StringList} StringList
         */
        StringList.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.StringList) return object;
          if (!$util.isObject(object))
            throw TypeError('.sonarjs.analyzeproject.v1.StringList: object expected');
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let message = new $root.sonarjs.analyzeproject.v1.StringList();
          if (object.values) {
            if (!Array.isArray(object.values))
              throw TypeError('.sonarjs.analyzeproject.v1.StringList.values: array expected');
            message.values = Array(object.values.length);
            for (let i = 0; i < object.values.length; ++i)
              message.values[i] = String(object.values[i]);
          }
          return message;
        };

        /**
         * Creates a plain object from a StringList message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.StringList
         * @static
         * @param {sonarjs.analyzeproject.v1.StringList} message StringList
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        StringList.toObject = function toObject(message, options, _depth) {
          if (!options) options = {};
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let object = {};
          if (options.arrays || options.defaults) object.values = [];
          if (message.values && message.values.length) {
            object.values = Array(message.values.length);
            for (let j = 0; j < message.values.length; ++j) object.values[j] = message.values[j];
          }
          return object;
        };

        /**
         * Converts this StringList to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.StringList
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        StringList.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for StringList
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.StringList
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        StringList.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.StringList';
        };

        return StringList;
      })();

      v1.ProjectFileInput = (function () {
        /**
         * Properties of a ProjectFileInput.
         * @typedef {Object} sonarjs.analyzeproject.v1.ProjectFileInput.$Properties
         * @property {string|null} [fileContent] ProjectFileInput fileContent
         * @property {sonarjs.analyzeproject.v1.FileType|null} [fileType] ProjectFileInput fileType
         * @property {sonarjs.analyzeproject.v1.FileStatus|null} [fileStatus] ProjectFileInput fileStatus
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of a ProjectFileInput.
         * @memberof sonarjs.analyzeproject.v1
         * @interface IProjectFileInput
         * @augments sonarjs.analyzeproject.v1.ProjectFileInput.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.ProjectFileInput.$Properties instead.
         */

        /**
         * Shape of a ProjectFileInput.
         * @typedef {sonarjs.analyzeproject.v1.ProjectFileInput.$Properties} sonarjs.analyzeproject.v1.ProjectFileInput.$Shape
         */

        /**
         * Constructs a new ProjectFileInput.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents a ProjectFileInput.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.ProjectFileInput.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function ProjectFileInput(properties) {
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * ProjectFileInput fileContent.
         * @member {string|null|undefined} fileContent
         * @memberof sonarjs.analyzeproject.v1.ProjectFileInput
         * @instance
         */
        ProjectFileInput.prototype.fileContent = null;

        /**
         * ProjectFileInput fileType.
         * @member {sonarjs.analyzeproject.v1.FileType} fileType
         * @memberof sonarjs.analyzeproject.v1.ProjectFileInput
         * @instance
         */
        ProjectFileInput.prototype.fileType = 0;

        /**
         * ProjectFileInput fileStatus.
         * @member {sonarjs.analyzeproject.v1.FileStatus} fileStatus
         * @memberof sonarjs.analyzeproject.v1.ProjectFileInput
         * @instance
         */
        ProjectFileInput.prototype.fileStatus = 0;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(ProjectFileInput.prototype, '_fileContent', {
          get: $util.oneOfGetter(($oneOfFields = ['fileContent'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * Creates a new ProjectFileInput instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.ProjectFileInput
         * @static
         * @param {sonarjs.analyzeproject.v1.ProjectFileInput.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.ProjectFileInput} ProjectFileInput instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.ProjectFileInput.$Shape): sonarjs.analyzeproject.v1.ProjectFileInput & sonarjs.analyzeproject.v1.ProjectFileInput.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.ProjectFileInput.$Properties): sonarjs.analyzeproject.v1.ProjectFileInput;
         * }}
         */
        ProjectFileInput.create = function create(properties) {
          return new ProjectFileInput(properties);
        };

        /**
         * Encodes the specified ProjectFileInput message. Does not implicitly {@link sonarjs.analyzeproject.v1.ProjectFileInput.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.ProjectFileInput
         * @static
         * @param {sonarjs.analyzeproject.v1.ProjectFileInput.$Properties} message ProjectFileInput message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ProjectFileInput.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.fileContent != null && Object.hasOwnProperty.call(message, 'fileContent'))
            writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.fileContent);
          if (message.fileType != null && Object.hasOwnProperty.call(message, 'fileType'))
            writer.uint32(/* id 2, wireType 0 =*/ 16).int32(message.fileType);
          if (message.fileStatus != null && Object.hasOwnProperty.call(message, 'fileStatus'))
            writer.uint32(/* id 3, wireType 0 =*/ 24).int32(message.fileStatus);
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified ProjectFileInput message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.ProjectFileInput.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.ProjectFileInput
         * @static
         * @param {sonarjs.analyzeproject.v1.ProjectFileInput.$Properties} message ProjectFileInput message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ProjectFileInput.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a ProjectFileInput message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.ProjectFileInput
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.ProjectFileInput & sonarjs.analyzeproject.v1.ProjectFileInput.$Shape} ProjectFileInput
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ProjectFileInput.decode = function decode(reader, length, _end, _depth, _target) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.ProjectFileInput(),
            value;
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            let wireType = tag & 7;
            switch ((tag >>>= 3)) {
              case 1: {
                if (wireType !== 2) break;
                message.fileContent = reader.string();
                message._fileContent = 'fileContent';
                continue;
              }
              case 2: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.fileType = value;
                else delete message.fileType;
                continue;
              }
              case 3: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.fileStatus = value;
                else delete message.fileStatus;
                continue;
              }
            }
            reader.skipType(wireType, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes a ProjectFileInput message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.ProjectFileInput
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.ProjectFileInput & sonarjs.analyzeproject.v1.ProjectFileInput.$Shape} ProjectFileInput
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ProjectFileInput.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ProjectFileInput message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.ProjectFileInput
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ProjectFileInput.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          let properties = {};
          if (message.fileContent != null && message.hasOwnProperty('fileContent')) {
            properties._fileContent = 1;
            if (!$util.isString(message.fileContent)) return 'fileContent: string expected';
          }
          if (message.fileType != null && message.hasOwnProperty('fileType'))
            switch (message.fileType) {
              default:
                return 'fileType: enum value expected';
              case 0:
              case 1:
              case 2:
                break;
            }
          if (message.fileStatus != null && message.hasOwnProperty('fileStatus'))
            switch (message.fileStatus) {
              default:
                return 'fileStatus: enum value expected';
              case 0:
              case 1:
              case 2:
              case 3:
                break;
            }
          return null;
        };

        /**
         * Creates a ProjectFileInput message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.ProjectFileInput
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.ProjectFileInput} ProjectFileInput
         */
        ProjectFileInput.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.ProjectFileInput) return object;
          if (!$util.isObject(object))
            throw TypeError('.sonarjs.analyzeproject.v1.ProjectFileInput: object expected');
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let message = new $root.sonarjs.analyzeproject.v1.ProjectFileInput();
          if (object.fileContent != null) message.fileContent = String(object.fileContent);
          if (
            object.fileType !== 0 &&
            (typeof object.fileType !== 'string' ||
              $root.sonarjs.analyzeproject.v1.FileType[object.fileType] !== 0)
          )
            switch (object.fileType) {
              default:
                if (typeof object.fileType === 'number') {
                  message.fileType = object.fileType;
                  break;
                }
                break;
              case 'FILE_TYPE_UNSPECIFIED':
              case 0:
                message.fileType = 0;
                break;
              case 'FILE_TYPE_MAIN':
              case 1:
                message.fileType = 1;
                break;
              case 'FILE_TYPE_TEST':
              case 2:
                message.fileType = 2;
                break;
            }
          if (
            object.fileStatus !== 0 &&
            (typeof object.fileStatus !== 'string' ||
              $root.sonarjs.analyzeproject.v1.FileStatus[object.fileStatus] !== 0)
          )
            switch (object.fileStatus) {
              default:
                if (typeof object.fileStatus === 'number') {
                  message.fileStatus = object.fileStatus;
                  break;
                }
                break;
              case 'FILE_STATUS_UNSPECIFIED':
              case 0:
                message.fileStatus = 0;
                break;
              case 'FILE_STATUS_SAME':
              case 1:
                message.fileStatus = 1;
                break;
              case 'FILE_STATUS_CHANGED':
              case 2:
                message.fileStatus = 2;
                break;
              case 'FILE_STATUS_ADDED':
              case 3:
                message.fileStatus = 3;
                break;
            }
          return message;
        };

        /**
         * Creates a plain object from a ProjectFileInput message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.ProjectFileInput
         * @static
         * @param {sonarjs.analyzeproject.v1.ProjectFileInput} message ProjectFileInput
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ProjectFileInput.toObject = function toObject(message, options, _depth) {
          if (!options) options = {};
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let object = {};
          if (options.defaults) {
            object.fileType = options.enums === String ? 'FILE_TYPE_UNSPECIFIED' : 0;
            object.fileStatus = options.enums === String ? 'FILE_STATUS_UNSPECIFIED' : 0;
          }
          if (message.fileContent != null && message.hasOwnProperty('fileContent'))
            object.fileContent = message.fileContent;
          if (message.fileType != null && message.hasOwnProperty('fileType'))
            object.fileType =
              options.enums === String
                ? $root.sonarjs.analyzeproject.v1.FileType[message.fileType] === undefined
                  ? message.fileType
                  : $root.sonarjs.analyzeproject.v1.FileType[message.fileType]
                : message.fileType;
          if (message.fileStatus != null && message.hasOwnProperty('fileStatus'))
            object.fileStatus =
              options.enums === String
                ? $root.sonarjs.analyzeproject.v1.FileStatus[message.fileStatus] === undefined
                  ? message.fileStatus
                  : $root.sonarjs.analyzeproject.v1.FileStatus[message.fileStatus]
                : message.fileStatus;
          return object;
        };

        /**
         * Converts this ProjectFileInput to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.ProjectFileInput
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ProjectFileInput.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for ProjectFileInput
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.ProjectFileInput
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        ProjectFileInput.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.ProjectFileInput';
        };

        return ProjectFileInput;
      })();

      /**
       * FileType enum.
       * @name sonarjs.analyzeproject.v1.FileType
       * @enum {number}
       * @property {number} FILE_TYPE_UNSPECIFIED=0 FILE_TYPE_UNSPECIFIED value
       * @property {number} FILE_TYPE_MAIN=1 FILE_TYPE_MAIN value
       * @property {number} FILE_TYPE_TEST=2 FILE_TYPE_TEST value
       */
      v1.FileType = (function () {
        const valuesById = {},
          values = Object.create(valuesById);
        values[(valuesById[0] = 'FILE_TYPE_UNSPECIFIED')] = 0;
        values[(valuesById[1] = 'FILE_TYPE_MAIN')] = 1;
        values[(valuesById[2] = 'FILE_TYPE_TEST')] = 2;
        return values;
      })();

      /**
       * FileStatus enum.
       * @name sonarjs.analyzeproject.v1.FileStatus
       * @enum {number}
       * @property {number} FILE_STATUS_UNSPECIFIED=0 FILE_STATUS_UNSPECIFIED value
       * @property {number} FILE_STATUS_SAME=1 FILE_STATUS_SAME value
       * @property {number} FILE_STATUS_CHANGED=2 FILE_STATUS_CHANGED value
       * @property {number} FILE_STATUS_ADDED=3 FILE_STATUS_ADDED value
       */
      v1.FileStatus = (function () {
        const valuesById = {},
          values = Object.create(valuesById);
        values[(valuesById[0] = 'FILE_STATUS_UNSPECIFIED')] = 0;
        values[(valuesById[1] = 'FILE_STATUS_SAME')] = 1;
        values[(valuesById[2] = 'FILE_STATUS_CHANGED')] = 2;
        values[(valuesById[3] = 'FILE_STATUS_ADDED')] = 3;
        return values;
      })();

      /**
       * AnalysisMode enum.
       * @name sonarjs.analyzeproject.v1.AnalysisMode
       * @enum {number}
       * @property {number} ANALYSIS_MODE_UNSPECIFIED=0 ANALYSIS_MODE_UNSPECIFIED value
       * @property {number} ANALYSIS_MODE_DEFAULT=1 ANALYSIS_MODE_DEFAULT value
       * @property {number} ANALYSIS_MODE_SKIP_UNCHANGED=2 ANALYSIS_MODE_SKIP_UNCHANGED value
       */
      v1.AnalysisMode = (function () {
        const valuesById = {},
          values = Object.create(valuesById);
        values[(valuesById[0] = 'ANALYSIS_MODE_UNSPECIFIED')] = 0;
        values[(valuesById[1] = 'ANALYSIS_MODE_DEFAULT')] = 1;
        values[(valuesById[2] = 'ANALYSIS_MODE_SKIP_UNCHANGED')] = 2;
        return values;
      })();

      /**
       * JsTsLanguage enum.
       * @name sonarjs.analyzeproject.v1.JsTsLanguage
       * @enum {number}
       * @property {number} JS_TS_LANGUAGE_UNSPECIFIED=0 JS_TS_LANGUAGE_UNSPECIFIED value
       * @property {number} JS_TS_LANGUAGE_JS=1 JS_TS_LANGUAGE_JS value
       * @property {number} JS_TS_LANGUAGE_TS=2 JS_TS_LANGUAGE_TS value
       */
      v1.JsTsLanguage = (function () {
        const valuesById = {},
          values = Object.create(valuesById);
        values[(valuesById[0] = 'JS_TS_LANGUAGE_UNSPECIFIED')] = 0;
        values[(valuesById[1] = 'JS_TS_LANGUAGE_JS')] = 1;
        values[(valuesById[2] = 'JS_TS_LANGUAGE_TS')] = 2;
        return values;
      })();

      /**
       * AnalysisLanguage enum.
       * @name sonarjs.analyzeproject.v1.AnalysisLanguage
       * @enum {number}
       * @property {number} ANALYSIS_LANGUAGE_UNSPECIFIED=0 ANALYSIS_LANGUAGE_UNSPECIFIED value
       * @property {number} ANALYSIS_LANGUAGE_JS=1 ANALYSIS_LANGUAGE_JS value
       * @property {number} ANALYSIS_LANGUAGE_TS=2 ANALYSIS_LANGUAGE_TS value
       * @property {number} ANALYSIS_LANGUAGE_CSS=3 ANALYSIS_LANGUAGE_CSS value
       */
      v1.AnalysisLanguage = (function () {
        const valuesById = {},
          values = Object.create(valuesById);
        values[(valuesById[0] = 'ANALYSIS_LANGUAGE_UNSPECIFIED')] = 0;
        values[(valuesById[1] = 'ANALYSIS_LANGUAGE_JS')] = 1;
        values[(valuesById[2] = 'ANALYSIS_LANGUAGE_TS')] = 2;
        values[(valuesById[3] = 'ANALYSIS_LANGUAGE_CSS')] = 3;
        return values;
      })();

      /**
       * ParsingErrorCode enum.
       * @name sonarjs.analyzeproject.v1.ParsingErrorCode
       * @enum {number}
       * @property {number} PARSING_ERROR_CODE_UNSPECIFIED=0 PARSING_ERROR_CODE_UNSPECIFIED value
       * @property {number} PARSING_ERROR_CODE_PARSING=1 PARSING_ERROR_CODE_PARSING value
       * @property {number} PARSING_ERROR_CODE_FAILING_TYPESCRIPT=2 PARSING_ERROR_CODE_FAILING_TYPESCRIPT value
       * @property {number} PARSING_ERROR_CODE_LINTER_INITIALIZATION=3 PARSING_ERROR_CODE_LINTER_INITIALIZATION value
       */
      v1.ParsingErrorCode = (function () {
        const valuesById = {},
          values = Object.create(valuesById);
        values[(valuesById[0] = 'PARSING_ERROR_CODE_UNSPECIFIED')] = 0;
        values[(valuesById[1] = 'PARSING_ERROR_CODE_PARSING')] = 1;
        values[(valuesById[2] = 'PARSING_ERROR_CODE_FAILING_TYPESCRIPT')] = 2;
        values[(valuesById[3] = 'PARSING_ERROR_CODE_LINTER_INITIALIZATION')] = 3;
        return values;
      })();

      /**
       * TextType enum.
       * @name sonarjs.analyzeproject.v1.TextType
       * @enum {number}
       * @property {number} TEXT_TYPE_UNSPECIFIED=0 TEXT_TYPE_UNSPECIFIED value
       * @property {number} TEXT_TYPE_CONSTANT=1 TEXT_TYPE_CONSTANT value
       * @property {number} TEXT_TYPE_COMMENT=2 TEXT_TYPE_COMMENT value
       * @property {number} TEXT_TYPE_STRUCTURED_COMMENT=3 TEXT_TYPE_STRUCTURED_COMMENT value
       * @property {number} TEXT_TYPE_KEYWORD=4 TEXT_TYPE_KEYWORD value
       * @property {number} TEXT_TYPE_STRING=5 TEXT_TYPE_STRING value
       */
      v1.TextType = (function () {
        const valuesById = {},
          values = Object.create(valuesById);
        values[(valuesById[0] = 'TEXT_TYPE_UNSPECIFIED')] = 0;
        values[(valuesById[1] = 'TEXT_TYPE_CONSTANT')] = 1;
        values[(valuesById[2] = 'TEXT_TYPE_COMMENT')] = 2;
        values[(valuesById[3] = 'TEXT_TYPE_STRUCTURED_COMMENT')] = 3;
        values[(valuesById[4] = 'TEXT_TYPE_KEYWORD')] = 4;
        values[(valuesById[5] = 'TEXT_TYPE_STRING')] = 5;
        return values;
      })();

      v1.JsTsRule = (function () {
        /**
         * Properties of a JsTsRule.
         * @typedef {Object} sonarjs.analyzeproject.v1.JsTsRule.$Properties
         * @property {string|null} [key] JsTsRule key
         * @property {Array.<google.protobuf.Value.$Properties>|null} [configurations] JsTsRule configurations
         * @property {Array.<sonarjs.analyzeproject.v1.FileType>|null} [fileTypeTargets] JsTsRule fileTypeTargets
         * @property {sonarjs.analyzeproject.v1.JsTsLanguage|null} [language] JsTsRule language
         * @property {Array.<sonarjs.analyzeproject.v1.AnalysisMode>|null} [analysisModes] JsTsRule analysisModes
         * @property {Array.<string>|null} [blacklistedExtensions] JsTsRule blacklistedExtensions
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of a JsTsRule.
         * @memberof sonarjs.analyzeproject.v1
         * @interface IJsTsRule
         * @augments sonarjs.analyzeproject.v1.JsTsRule.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.JsTsRule.$Properties instead.
         */

        /**
         * Shape of a JsTsRule.
         * @typedef {{
         *   key?: string|null;
         *   configurations?: Array.<google.protobuf.Value.$Shape>|null;
         *   fileTypeTargets?: Array.<sonarjs.analyzeproject.v1.FileType>|null;
         *   language?: sonarjs.analyzeproject.v1.JsTsLanguage|null;
         *   analysisModes?: Array.<sonarjs.analyzeproject.v1.AnalysisMode>|null;
         *   blacklistedExtensions?: Array.<string>|null;
         *   $unknowns?: Array.<Uint8Array>;
         * }} sonarjs.analyzeproject.v1.JsTsRule.$Shape
         */

        /**
         * Constructs a new JsTsRule.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents a JsTsRule.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.JsTsRule.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function JsTsRule(properties) {
          this.configurations = [];
          this.fileTypeTargets = [];
          this.analysisModes = [];
          this.blacklistedExtensions = [];
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * JsTsRule key.
         * @member {string} key
         * @memberof sonarjs.analyzeproject.v1.JsTsRule
         * @instance
         */
        JsTsRule.prototype.key = '';

        /**
         * JsTsRule configurations.
         * @member {Array.<google.protobuf.Value.$Properties>} configurations
         * @memberof sonarjs.analyzeproject.v1.JsTsRule
         * @instance
         */
        JsTsRule.prototype.configurations = $util.emptyArray;

        /**
         * JsTsRule fileTypeTargets.
         * @member {Array.<sonarjs.analyzeproject.v1.FileType>} fileTypeTargets
         * @memberof sonarjs.analyzeproject.v1.JsTsRule
         * @instance
         */
        JsTsRule.prototype.fileTypeTargets = $util.emptyArray;

        /**
         * JsTsRule language.
         * @member {sonarjs.analyzeproject.v1.JsTsLanguage} language
         * @memberof sonarjs.analyzeproject.v1.JsTsRule
         * @instance
         */
        JsTsRule.prototype.language = 0;

        /**
         * JsTsRule analysisModes.
         * @member {Array.<sonarjs.analyzeproject.v1.AnalysisMode>} analysisModes
         * @memberof sonarjs.analyzeproject.v1.JsTsRule
         * @instance
         */
        JsTsRule.prototype.analysisModes = $util.emptyArray;

        /**
         * JsTsRule blacklistedExtensions.
         * @member {Array.<string>} blacklistedExtensions
         * @memberof sonarjs.analyzeproject.v1.JsTsRule
         * @instance
         */
        JsTsRule.prototype.blacklistedExtensions = $util.emptyArray;

        /**
         * Creates a new JsTsRule instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.JsTsRule
         * @static
         * @param {sonarjs.analyzeproject.v1.JsTsRule.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.JsTsRule} JsTsRule instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.JsTsRule.$Shape): sonarjs.analyzeproject.v1.JsTsRule & sonarjs.analyzeproject.v1.JsTsRule.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.JsTsRule.$Properties): sonarjs.analyzeproject.v1.JsTsRule;
         * }}
         */
        JsTsRule.create = function create(properties) {
          return new JsTsRule(properties);
        };

        /**
         * Encodes the specified JsTsRule message. Does not implicitly {@link sonarjs.analyzeproject.v1.JsTsRule.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.JsTsRule
         * @static
         * @param {sonarjs.analyzeproject.v1.JsTsRule.$Properties} message JsTsRule message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        JsTsRule.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.key != null && Object.hasOwnProperty.call(message, 'key'))
            writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.key);
          if (message.configurations != null && message.configurations.length)
            for (let i = 0; i < message.configurations.length; ++i)
              $root.google.protobuf.Value.encode(
                message.configurations[i],
                writer.uint32(/* id 2, wireType 2 =*/ 18).fork(),
                _depth + 1,
              ).ldelim();
          if (message.fileTypeTargets != null && message.fileTypeTargets.length) {
            writer.uint32(/* id 3, wireType 2 =*/ 26).fork();
            for (let i = 0; i < message.fileTypeTargets.length; ++i)
              writer.int32(message.fileTypeTargets[i]);
            writer.ldelim();
          }
          if (message.language != null && Object.hasOwnProperty.call(message, 'language'))
            writer.uint32(/* id 4, wireType 0 =*/ 32).int32(message.language);
          if (message.analysisModes != null && message.analysisModes.length) {
            writer.uint32(/* id 5, wireType 2 =*/ 42).fork();
            for (let i = 0; i < message.analysisModes.length; ++i)
              writer.int32(message.analysisModes[i]);
            writer.ldelim();
          }
          if (message.blacklistedExtensions != null && message.blacklistedExtensions.length)
            for (let i = 0; i < message.blacklistedExtensions.length; ++i)
              writer.uint32(/* id 6, wireType 2 =*/ 50).string(message.blacklistedExtensions[i]);
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified JsTsRule message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.JsTsRule.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.JsTsRule
         * @static
         * @param {sonarjs.analyzeproject.v1.JsTsRule.$Properties} message JsTsRule message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        JsTsRule.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a JsTsRule message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.JsTsRule
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.JsTsRule & sonarjs.analyzeproject.v1.JsTsRule.$Shape} JsTsRule
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        JsTsRule.decode = function decode(reader, length, _end, _depth, _target) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.JsTsRule(),
            value;
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            let wireType = tag & 7;
            switch ((tag >>>= 3)) {
              case 1: {
                if (wireType !== 2) break;
                if ((value = reader.string()).length) message.key = value;
                else delete message.key;
                continue;
              }
              case 2: {
                if (wireType !== 2) break;
                if (!(message.configurations && message.configurations.length))
                  message.configurations = [];
                message.configurations.push(
                  $root.google.protobuf.Value.decode(
                    reader,
                    reader.uint32(),
                    undefined,
                    _depth + 1,
                  ),
                );
                continue;
              }
              case 3: {
                if (wireType === 2) {
                  if (!(message.fileTypeTargets && message.fileTypeTargets.length))
                    message.fileTypeTargets = [];
                  let end2 = reader.uint32() + reader.pos;
                  while (reader.pos < end2) message.fileTypeTargets.push(reader.int32());
                  continue;
                }
                if (wireType !== 0) break;
                if (!(message.fileTypeTargets && message.fileTypeTargets.length))
                  message.fileTypeTargets = [];
                message.fileTypeTargets.push(reader.int32());
                continue;
              }
              case 4: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.language = value;
                else delete message.language;
                continue;
              }
              case 5: {
                if (wireType === 2) {
                  if (!(message.analysisModes && message.analysisModes.length))
                    message.analysisModes = [];
                  let end2 = reader.uint32() + reader.pos;
                  while (reader.pos < end2) message.analysisModes.push(reader.int32());
                  continue;
                }
                if (wireType !== 0) break;
                if (!(message.analysisModes && message.analysisModes.length))
                  message.analysisModes = [];
                message.analysisModes.push(reader.int32());
                continue;
              }
              case 6: {
                if (wireType !== 2) break;
                if (!(message.blacklistedExtensions && message.blacklistedExtensions.length))
                  message.blacklistedExtensions = [];
                message.blacklistedExtensions.push(reader.string());
                continue;
              }
            }
            reader.skipType(wireType, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes a JsTsRule message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.JsTsRule
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.JsTsRule & sonarjs.analyzeproject.v1.JsTsRule.$Shape} JsTsRule
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        JsTsRule.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a JsTsRule message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.JsTsRule
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        JsTsRule.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          if (message.key != null && message.hasOwnProperty('key'))
            if (!$util.isString(message.key)) return 'key: string expected';
          if (message.configurations != null && message.hasOwnProperty('configurations')) {
            if (!Array.isArray(message.configurations)) return 'configurations: array expected';
            for (let i = 0; i < message.configurations.length; ++i) {
              let error = $root.google.protobuf.Value.verify(message.configurations[i], _depth + 1);
              if (error) return 'configurations.' + error;
            }
          }
          if (message.fileTypeTargets != null && message.hasOwnProperty('fileTypeTargets')) {
            if (!Array.isArray(message.fileTypeTargets)) return 'fileTypeTargets: array expected';
            for (let i = 0; i < message.fileTypeTargets.length; ++i)
              switch (message.fileTypeTargets[i]) {
                default:
                  return 'fileTypeTargets: enum value[] expected';
                case 0:
                case 1:
                case 2:
                  break;
              }
          }
          if (message.language != null && message.hasOwnProperty('language'))
            switch (message.language) {
              default:
                return 'language: enum value expected';
              case 0:
              case 1:
              case 2:
                break;
            }
          if (message.analysisModes != null && message.hasOwnProperty('analysisModes')) {
            if (!Array.isArray(message.analysisModes)) return 'analysisModes: array expected';
            for (let i = 0; i < message.analysisModes.length; ++i)
              switch (message.analysisModes[i]) {
                default:
                  return 'analysisModes: enum value[] expected';
                case 0:
                case 1:
                case 2:
                  break;
              }
          }
          if (
            message.blacklistedExtensions != null &&
            message.hasOwnProperty('blacklistedExtensions')
          ) {
            if (!Array.isArray(message.blacklistedExtensions))
              return 'blacklistedExtensions: array expected';
            for (let i = 0; i < message.blacklistedExtensions.length; ++i)
              if (!$util.isString(message.blacklistedExtensions[i]))
                return 'blacklistedExtensions: string[] expected';
          }
          return null;
        };

        /**
         * Creates a JsTsRule message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.JsTsRule
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.JsTsRule} JsTsRule
         */
        JsTsRule.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.JsTsRule) return object;
          if (!$util.isObject(object))
            throw TypeError('.sonarjs.analyzeproject.v1.JsTsRule: object expected');
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let message = new $root.sonarjs.analyzeproject.v1.JsTsRule();
          if (object.key != null)
            if (typeof object.key !== 'string' || object.key.length)
              message.key = String(object.key);
          if (object.configurations) {
            if (!Array.isArray(object.configurations))
              throw TypeError('.sonarjs.analyzeproject.v1.JsTsRule.configurations: array expected');
            message.configurations = Array(object.configurations.length);
            for (let i = 0; i < object.configurations.length; ++i) {
              if (!$util.isObject(object.configurations[i]))
                throw TypeError(
                  '.sonarjs.analyzeproject.v1.JsTsRule.configurations: object expected',
                );
              message.configurations[i] = $root.google.protobuf.Value.fromObject(
                object.configurations[i],
                _depth + 1,
              );
            }
          }
          if (object.fileTypeTargets) {
            if (!Array.isArray(object.fileTypeTargets))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.JsTsRule.fileTypeTargets: array expected',
              );
            message.fileTypeTargets = Array(object.fileTypeTargets.length);
            for (let i = 0; i < object.fileTypeTargets.length; ++i)
              switch (object.fileTypeTargets[i]) {
                default:
                  if (typeof object.fileTypeTargets[i] === 'number') {
                    message.fileTypeTargets[i] = object.fileTypeTargets[i];
                    break;
                  }
                case 'FILE_TYPE_UNSPECIFIED':
                case 0:
                  message.fileTypeTargets[i] = 0;
                  break;
                case 'FILE_TYPE_MAIN':
                case 1:
                  message.fileTypeTargets[i] = 1;
                  break;
                case 'FILE_TYPE_TEST':
                case 2:
                  message.fileTypeTargets[i] = 2;
                  break;
              }
          }
          if (
            object.language !== 0 &&
            (typeof object.language !== 'string' ||
              $root.sonarjs.analyzeproject.v1.JsTsLanguage[object.language] !== 0)
          )
            switch (object.language) {
              default:
                if (typeof object.language === 'number') {
                  message.language = object.language;
                  break;
                }
                break;
              case 'JS_TS_LANGUAGE_UNSPECIFIED':
              case 0:
                message.language = 0;
                break;
              case 'JS_TS_LANGUAGE_JS':
              case 1:
                message.language = 1;
                break;
              case 'JS_TS_LANGUAGE_TS':
              case 2:
                message.language = 2;
                break;
            }
          if (object.analysisModes) {
            if (!Array.isArray(object.analysisModes))
              throw TypeError('.sonarjs.analyzeproject.v1.JsTsRule.analysisModes: array expected');
            message.analysisModes = Array(object.analysisModes.length);
            for (let i = 0; i < object.analysisModes.length; ++i)
              switch (object.analysisModes[i]) {
                default:
                  if (typeof object.analysisModes[i] === 'number') {
                    message.analysisModes[i] = object.analysisModes[i];
                    break;
                  }
                case 'ANALYSIS_MODE_UNSPECIFIED':
                case 0:
                  message.analysisModes[i] = 0;
                  break;
                case 'ANALYSIS_MODE_DEFAULT':
                case 1:
                  message.analysisModes[i] = 1;
                  break;
                case 'ANALYSIS_MODE_SKIP_UNCHANGED':
                case 2:
                  message.analysisModes[i] = 2;
                  break;
              }
          }
          if (object.blacklistedExtensions) {
            if (!Array.isArray(object.blacklistedExtensions))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.JsTsRule.blacklistedExtensions: array expected',
              );
            message.blacklistedExtensions = Array(object.blacklistedExtensions.length);
            for (let i = 0; i < object.blacklistedExtensions.length; ++i)
              message.blacklistedExtensions[i] = String(object.blacklistedExtensions[i]);
          }
          return message;
        };

        /**
         * Creates a plain object from a JsTsRule message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.JsTsRule
         * @static
         * @param {sonarjs.analyzeproject.v1.JsTsRule} message JsTsRule
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        JsTsRule.toObject = function toObject(message, options, _depth) {
          if (!options) options = {};
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let object = {};
          if (options.arrays || options.defaults) {
            object.configurations = [];
            object.fileTypeTargets = [];
            object.analysisModes = [];
            object.blacklistedExtensions = [];
          }
          if (options.defaults) {
            object.key = '';
            object.language = options.enums === String ? 'JS_TS_LANGUAGE_UNSPECIFIED' : 0;
          }
          if (message.key != null && message.hasOwnProperty('key')) object.key = message.key;
          if (message.configurations && message.configurations.length) {
            object.configurations = Array(message.configurations.length);
            for (let j = 0; j < message.configurations.length; ++j)
              object.configurations[j] = $root.google.protobuf.Value.toObject(
                message.configurations[j],
                options,
                _depth + 1,
              );
          }
          if (message.fileTypeTargets && message.fileTypeTargets.length) {
            object.fileTypeTargets = Array(message.fileTypeTargets.length);
            for (let j = 0; j < message.fileTypeTargets.length; ++j)
              object.fileTypeTargets[j] =
                options.enums === String
                  ? $root.sonarjs.analyzeproject.v1.FileType[message.fileTypeTargets[j]] ===
                    undefined
                    ? message.fileTypeTargets[j]
                    : $root.sonarjs.analyzeproject.v1.FileType[message.fileTypeTargets[j]]
                  : message.fileTypeTargets[j];
          }
          if (message.language != null && message.hasOwnProperty('language'))
            object.language =
              options.enums === String
                ? $root.sonarjs.analyzeproject.v1.JsTsLanguage[message.language] === undefined
                  ? message.language
                  : $root.sonarjs.analyzeproject.v1.JsTsLanguage[message.language]
                : message.language;
          if (message.analysisModes && message.analysisModes.length) {
            object.analysisModes = Array(message.analysisModes.length);
            for (let j = 0; j < message.analysisModes.length; ++j)
              object.analysisModes[j] =
                options.enums === String
                  ? $root.sonarjs.analyzeproject.v1.AnalysisMode[message.analysisModes[j]] ===
                    undefined
                    ? message.analysisModes[j]
                    : $root.sonarjs.analyzeproject.v1.AnalysisMode[message.analysisModes[j]]
                  : message.analysisModes[j];
          }
          if (message.blacklistedExtensions && message.blacklistedExtensions.length) {
            object.blacklistedExtensions = Array(message.blacklistedExtensions.length);
            for (let j = 0; j < message.blacklistedExtensions.length; ++j)
              object.blacklistedExtensions[j] = message.blacklistedExtensions[j];
          }
          return object;
        };

        /**
         * Converts this JsTsRule to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.JsTsRule
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        JsTsRule.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for JsTsRule
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.JsTsRule
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        JsTsRule.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.JsTsRule';
        };

        return JsTsRule;
      })();

      v1.CssRule = (function () {
        /**
         * Properties of a CssRule.
         * @typedef {Object} sonarjs.analyzeproject.v1.CssRule.$Properties
         * @property {string|null} [key] CssRule key
         * @property {Array.<google.protobuf.Value.$Properties>|null} [configurations] CssRule configurations
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of a CssRule.
         * @memberof sonarjs.analyzeproject.v1
         * @interface ICssRule
         * @augments sonarjs.analyzeproject.v1.CssRule.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.CssRule.$Properties instead.
         */

        /**
         * Shape of a CssRule.
         * @typedef {{
         *   key?: string|null;
         *   configurations?: Array.<google.protobuf.Value.$Shape>|null;
         *   $unknowns?: Array.<Uint8Array>;
         * }} sonarjs.analyzeproject.v1.CssRule.$Shape
         */

        /**
         * Constructs a new CssRule.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents a CssRule.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.CssRule.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function CssRule(properties) {
          this.configurations = [];
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * CssRule key.
         * @member {string} key
         * @memberof sonarjs.analyzeproject.v1.CssRule
         * @instance
         */
        CssRule.prototype.key = '';

        /**
         * CssRule configurations.
         * @member {Array.<google.protobuf.Value.$Properties>} configurations
         * @memberof sonarjs.analyzeproject.v1.CssRule
         * @instance
         */
        CssRule.prototype.configurations = $util.emptyArray;

        /**
         * Creates a new CssRule instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.CssRule
         * @static
         * @param {sonarjs.analyzeproject.v1.CssRule.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.CssRule} CssRule instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.CssRule.$Shape): sonarjs.analyzeproject.v1.CssRule & sonarjs.analyzeproject.v1.CssRule.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.CssRule.$Properties): sonarjs.analyzeproject.v1.CssRule;
         * }}
         */
        CssRule.create = function create(properties) {
          return new CssRule(properties);
        };

        /**
         * Encodes the specified CssRule message. Does not implicitly {@link sonarjs.analyzeproject.v1.CssRule.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.CssRule
         * @static
         * @param {sonarjs.analyzeproject.v1.CssRule.$Properties} message CssRule message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CssRule.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.key != null && Object.hasOwnProperty.call(message, 'key'))
            writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.key);
          if (message.configurations != null && message.configurations.length)
            for (let i = 0; i < message.configurations.length; ++i)
              $root.google.protobuf.Value.encode(
                message.configurations[i],
                writer.uint32(/* id 2, wireType 2 =*/ 18).fork(),
                _depth + 1,
              ).ldelim();
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified CssRule message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.CssRule.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.CssRule
         * @static
         * @param {sonarjs.analyzeproject.v1.CssRule.$Properties} message CssRule message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CssRule.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a CssRule message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.CssRule
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.CssRule & sonarjs.analyzeproject.v1.CssRule.$Shape} CssRule
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CssRule.decode = function decode(reader, length, _end, _depth, _target) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.CssRule(),
            value;
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            let wireType = tag & 7;
            switch ((tag >>>= 3)) {
              case 1: {
                if (wireType !== 2) break;
                if ((value = reader.string()).length) message.key = value;
                else delete message.key;
                continue;
              }
              case 2: {
                if (wireType !== 2) break;
                if (!(message.configurations && message.configurations.length))
                  message.configurations = [];
                message.configurations.push(
                  $root.google.protobuf.Value.decode(
                    reader,
                    reader.uint32(),
                    undefined,
                    _depth + 1,
                  ),
                );
                continue;
              }
            }
            reader.skipType(wireType, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes a CssRule message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.CssRule
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.CssRule & sonarjs.analyzeproject.v1.CssRule.$Shape} CssRule
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CssRule.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a CssRule message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.CssRule
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        CssRule.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          if (message.key != null && message.hasOwnProperty('key'))
            if (!$util.isString(message.key)) return 'key: string expected';
          if (message.configurations != null && message.hasOwnProperty('configurations')) {
            if (!Array.isArray(message.configurations)) return 'configurations: array expected';
            for (let i = 0; i < message.configurations.length; ++i) {
              let error = $root.google.protobuf.Value.verify(message.configurations[i], _depth + 1);
              if (error) return 'configurations.' + error;
            }
          }
          return null;
        };

        /**
         * Creates a CssRule message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.CssRule
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.CssRule} CssRule
         */
        CssRule.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.CssRule) return object;
          if (!$util.isObject(object))
            throw TypeError('.sonarjs.analyzeproject.v1.CssRule: object expected');
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let message = new $root.sonarjs.analyzeproject.v1.CssRule();
          if (object.key != null)
            if (typeof object.key !== 'string' || object.key.length)
              message.key = String(object.key);
          if (object.configurations) {
            if (!Array.isArray(object.configurations))
              throw TypeError('.sonarjs.analyzeproject.v1.CssRule.configurations: array expected');
            message.configurations = Array(object.configurations.length);
            for (let i = 0; i < object.configurations.length; ++i) {
              if (!$util.isObject(object.configurations[i]))
                throw TypeError(
                  '.sonarjs.analyzeproject.v1.CssRule.configurations: object expected',
                );
              message.configurations[i] = $root.google.protobuf.Value.fromObject(
                object.configurations[i],
                _depth + 1,
              );
            }
          }
          return message;
        };

        /**
         * Creates a plain object from a CssRule message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.CssRule
         * @static
         * @param {sonarjs.analyzeproject.v1.CssRule} message CssRule
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        CssRule.toObject = function toObject(message, options, _depth) {
          if (!options) options = {};
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let object = {};
          if (options.arrays || options.defaults) object.configurations = [];
          if (options.defaults) object.key = '';
          if (message.key != null && message.hasOwnProperty('key')) object.key = message.key;
          if (message.configurations && message.configurations.length) {
            object.configurations = Array(message.configurations.length);
            for (let j = 0; j < message.configurations.length; ++j)
              object.configurations[j] = $root.google.protobuf.Value.toObject(
                message.configurations[j],
                options,
                _depth + 1,
              );
          }
          return object;
        };

        /**
         * Converts this CssRule to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.CssRule
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        CssRule.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for CssRule
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.CssRule
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        CssRule.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.CssRule';
        };

        return CssRule;
      })();

      v1.FileResultMessage = (function () {
        /**
         * Properties of a FileResultMessage.
         * @typedef {Object} sonarjs.analyzeproject.v1.FileResultMessage.$Properties
         * @property {string|null} [filePath] FileResultMessage filePath
         * @property {sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Properties|null} [result] FileResultMessage result
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of a FileResultMessage.
         * @memberof sonarjs.analyzeproject.v1
         * @interface IFileResultMessage
         * @augments sonarjs.analyzeproject.v1.FileResultMessage.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.FileResultMessage.$Properties instead.
         */

        /**
         * Shape of a FileResultMessage.
         * @typedef {sonarjs.analyzeproject.v1.FileResultMessage.$Properties} sonarjs.analyzeproject.v1.FileResultMessage.$Shape
         */

        /**
         * Constructs a new FileResultMessage.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents a FileResultMessage.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.FileResultMessage.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function FileResultMessage(properties) {
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * FileResultMessage filePath.
         * @member {string} filePath
         * @memberof sonarjs.analyzeproject.v1.FileResultMessage
         * @instance
         */
        FileResultMessage.prototype.filePath = '';

        /**
         * FileResultMessage result.
         * @member {sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Properties|null|undefined} result
         * @memberof sonarjs.analyzeproject.v1.FileResultMessage
         * @instance
         */
        FileResultMessage.prototype.result = null;

        /**
         * Creates a new FileResultMessage instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.FileResultMessage
         * @static
         * @param {sonarjs.analyzeproject.v1.FileResultMessage.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.FileResultMessage} FileResultMessage instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.FileResultMessage.$Shape): sonarjs.analyzeproject.v1.FileResultMessage & sonarjs.analyzeproject.v1.FileResultMessage.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.FileResultMessage.$Properties): sonarjs.analyzeproject.v1.FileResultMessage;
         * }}
         */
        FileResultMessage.create = function create(properties) {
          return new FileResultMessage(properties);
        };

        /**
         * Encodes the specified FileResultMessage message. Does not implicitly {@link sonarjs.analyzeproject.v1.FileResultMessage.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.FileResultMessage
         * @static
         * @param {sonarjs.analyzeproject.v1.FileResultMessage.$Properties} message FileResultMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        FileResultMessage.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.filePath != null && Object.hasOwnProperty.call(message, 'filePath'))
            writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.filePath);
          if (message.result != null && Object.hasOwnProperty.call(message, 'result'))
            $root.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.encode(
              message.result,
              writer.uint32(/* id 2, wireType 2 =*/ 18).fork(),
              _depth + 1,
            ).ldelim();
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified FileResultMessage message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.FileResultMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.FileResultMessage
         * @static
         * @param {sonarjs.analyzeproject.v1.FileResultMessage.$Properties} message FileResultMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        FileResultMessage.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a FileResultMessage message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.FileResultMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.FileResultMessage & sonarjs.analyzeproject.v1.FileResultMessage.$Shape} FileResultMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        FileResultMessage.decode = function decode(reader, length, _end, _depth, _target) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.FileResultMessage(),
            value;
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            let wireType = tag & 7;
            switch ((tag >>>= 3)) {
              case 1: {
                if (wireType !== 2) break;
                if ((value = reader.string()).length) message.filePath = value;
                else delete message.filePath;
                continue;
              }
              case 2: {
                if (wireType !== 2) break;
                message.result = $root.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.decode(
                  reader,
                  reader.uint32(),
                  undefined,
                  _depth + 1,
                  message.result,
                );
                continue;
              }
            }
            reader.skipType(wireType, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes a FileResultMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.FileResultMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.FileResultMessage & sonarjs.analyzeproject.v1.FileResultMessage.$Shape} FileResultMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        FileResultMessage.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a FileResultMessage message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.FileResultMessage
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        FileResultMessage.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          if (message.filePath != null && message.hasOwnProperty('filePath'))
            if (!$util.isString(message.filePath)) return 'filePath: string expected';
          if (message.result != null && message.hasOwnProperty('result')) {
            let error = $root.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.verify(
              message.result,
              _depth + 1,
            );
            if (error) return 'result.' + error;
          }
          return null;
        };

        /**
         * Creates a FileResultMessage message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.FileResultMessage
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.FileResultMessage} FileResultMessage
         */
        FileResultMessage.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.FileResultMessage) return object;
          if (!$util.isObject(object))
            throw TypeError('.sonarjs.analyzeproject.v1.FileResultMessage: object expected');
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let message = new $root.sonarjs.analyzeproject.v1.FileResultMessage();
          if (object.filePath != null)
            if (typeof object.filePath !== 'string' || object.filePath.length)
              message.filePath = String(object.filePath);
          if (object.result != null) {
            if (!$util.isObject(object.result))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.FileResultMessage.result: object expected',
              );
            message.result = $root.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.fromObject(
              object.result,
              _depth + 1,
            );
          }
          return message;
        };

        /**
         * Creates a plain object from a FileResultMessage message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.FileResultMessage
         * @static
         * @param {sonarjs.analyzeproject.v1.FileResultMessage} message FileResultMessage
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        FileResultMessage.toObject = function toObject(message, options, _depth) {
          if (!options) options = {};
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let object = {};
          if (options.defaults) {
            object.filePath = '';
            object.result = null;
          }
          if (message.filePath != null && message.hasOwnProperty('filePath'))
            object.filePath = message.filePath;
          if (message.result != null && message.hasOwnProperty('result'))
            object.result = $root.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.toObject(
              message.result,
              options,
              _depth + 1,
            );
          return object;
        };

        /**
         * Converts this FileResultMessage to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.FileResultMessage
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        FileResultMessage.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for FileResultMessage
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.FileResultMessage
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        FileResultMessage.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.FileResultMessage';
        };

        return FileResultMessage;
      })();

      v1.ProjectAnalysisFileResult = (function () {
        /**
         * Properties of a ProjectAnalysisFileResult.
         * @typedef {Object} sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Properties
         * @property {Array.<sonarjs.analyzeproject.v1.ParsingError.$Properties>|null} [parsingErrors] ProjectAnalysisFileResult parsingErrors
         * @property {Array.<sonarjs.analyzeproject.v1.Issue.$Properties>|null} [issues] ProjectAnalysisFileResult issues
         * @property {Array.<sonarjs.analyzeproject.v1.Highlight.$Properties>|null} [highlights] ProjectAnalysisFileResult highlights
         * @property {Array.<sonarjs.analyzeproject.v1.HighlightedSymbol.$Properties>|null} [highlightedSymbols] ProjectAnalysisFileResult highlightedSymbols
         * @property {sonarjs.analyzeproject.v1.Metrics.$Properties|null} [metrics] ProjectAnalysisFileResult metrics
         * @property {Array.<sonarjs.analyzeproject.v1.CpdToken.$Properties>|null} [cpdTokens] ProjectAnalysisFileResult cpdTokens
         * @property {Uint8Array|null} [ast] ProjectAnalysisFileResult ast
         * @property {string|null} [error] ProjectAnalysisFileResult error
         * @property {Array.<sonarjs.analyzeproject.v1.SonarResolveComment.$Properties>|null} [sonarResolveComments] ProjectAnalysisFileResult sonarResolveComments
         * @property {Array.<sonarjs.analyzeproject.v1.Issue.$Properties>|null} [suppressedIssues] ProjectAnalysisFileResult suppressedIssues
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of a ProjectAnalysisFileResult.
         * @memberof sonarjs.analyzeproject.v1
         * @interface IProjectAnalysisFileResult
         * @augments sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Properties instead.
         */

        /**
         * Shape of a ProjectAnalysisFileResult.
         * @typedef {sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Properties} sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Shape
         */

        /**
         * Constructs a new ProjectAnalysisFileResult.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents a ProjectAnalysisFileResult.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function ProjectAnalysisFileResult(properties) {
          this.parsingErrors = [];
          this.issues = [];
          this.highlights = [];
          this.highlightedSymbols = [];
          this.cpdTokens = [];
          this.sonarResolveComments = [];
          this.suppressedIssues = [];
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * ProjectAnalysisFileResult parsingErrors.
         * @member {Array.<sonarjs.analyzeproject.v1.ParsingError.$Properties>} parsingErrors
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisFileResult
         * @instance
         */
        ProjectAnalysisFileResult.prototype.parsingErrors = $util.emptyArray;

        /**
         * ProjectAnalysisFileResult issues.
         * @member {Array.<sonarjs.analyzeproject.v1.Issue.$Properties>} issues
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisFileResult
         * @instance
         */
        ProjectAnalysisFileResult.prototype.issues = $util.emptyArray;

        /**
         * ProjectAnalysisFileResult highlights.
         * @member {Array.<sonarjs.analyzeproject.v1.Highlight.$Properties>} highlights
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisFileResult
         * @instance
         */
        ProjectAnalysisFileResult.prototype.highlights = $util.emptyArray;

        /**
         * ProjectAnalysisFileResult highlightedSymbols.
         * @member {Array.<sonarjs.analyzeproject.v1.HighlightedSymbol.$Properties>} highlightedSymbols
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisFileResult
         * @instance
         */
        ProjectAnalysisFileResult.prototype.highlightedSymbols = $util.emptyArray;

        /**
         * ProjectAnalysisFileResult metrics.
         * @member {sonarjs.analyzeproject.v1.Metrics.$Properties|null|undefined} metrics
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisFileResult
         * @instance
         */
        ProjectAnalysisFileResult.prototype.metrics = null;

        /**
         * ProjectAnalysisFileResult cpdTokens.
         * @member {Array.<sonarjs.analyzeproject.v1.CpdToken.$Properties>} cpdTokens
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisFileResult
         * @instance
         */
        ProjectAnalysisFileResult.prototype.cpdTokens = $util.emptyArray;

        /**
         * ProjectAnalysisFileResult ast.
         * @member {Uint8Array} ast
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisFileResult
         * @instance
         */
        ProjectAnalysisFileResult.prototype.ast = $util.newBuffer([]);

        /**
         * ProjectAnalysisFileResult error.
         * @member {string|null|undefined} error
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisFileResult
         * @instance
         */
        ProjectAnalysisFileResult.prototype.error = null;

        /**
         * ProjectAnalysisFileResult sonarResolveComments.
         * @member {Array.<sonarjs.analyzeproject.v1.SonarResolveComment.$Properties>} sonarResolveComments
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisFileResult
         * @instance
         */
        ProjectAnalysisFileResult.prototype.sonarResolveComments = $util.emptyArray;

        /**
         * ProjectAnalysisFileResult suppressedIssues.
         * @member {Array.<sonarjs.analyzeproject.v1.Issue.$Properties>} suppressedIssues
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisFileResult
         * @instance
         */
        ProjectAnalysisFileResult.prototype.suppressedIssues = $util.emptyArray;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(ProjectAnalysisFileResult.prototype, '_error', {
          get: $util.oneOfGetter(($oneOfFields = ['error'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * Creates a new ProjectAnalysisFileResult instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisFileResult
         * @static
         * @param {sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.ProjectAnalysisFileResult} ProjectAnalysisFileResult instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Shape): sonarjs.analyzeproject.v1.ProjectAnalysisFileResult & sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Properties): sonarjs.analyzeproject.v1.ProjectAnalysisFileResult;
         * }}
         */
        ProjectAnalysisFileResult.create = function create(properties) {
          return new ProjectAnalysisFileResult(properties);
        };

        /**
         * Encodes the specified ProjectAnalysisFileResult message. Does not implicitly {@link sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisFileResult
         * @static
         * @param {sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Properties} message ProjectAnalysisFileResult message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ProjectAnalysisFileResult.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.parsingErrors != null && message.parsingErrors.length)
            for (let i = 0; i < message.parsingErrors.length; ++i)
              $root.sonarjs.analyzeproject.v1.ParsingError.encode(
                message.parsingErrors[i],
                writer.uint32(/* id 1, wireType 2 =*/ 10).fork(),
                _depth + 1,
              ).ldelim();
          if (message.issues != null && message.issues.length)
            for (let i = 0; i < message.issues.length; ++i)
              $root.sonarjs.analyzeproject.v1.Issue.encode(
                message.issues[i],
                writer.uint32(/* id 2, wireType 2 =*/ 18).fork(),
                _depth + 1,
              ).ldelim();
          if (message.highlights != null && message.highlights.length)
            for (let i = 0; i < message.highlights.length; ++i)
              $root.sonarjs.analyzeproject.v1.Highlight.encode(
                message.highlights[i],
                writer.uint32(/* id 3, wireType 2 =*/ 26).fork(),
                _depth + 1,
              ).ldelim();
          if (message.highlightedSymbols != null && message.highlightedSymbols.length)
            for (let i = 0; i < message.highlightedSymbols.length; ++i)
              $root.sonarjs.analyzeproject.v1.HighlightedSymbol.encode(
                message.highlightedSymbols[i],
                writer.uint32(/* id 4, wireType 2 =*/ 34).fork(),
                _depth + 1,
              ).ldelim();
          if (message.metrics != null && Object.hasOwnProperty.call(message, 'metrics'))
            $root.sonarjs.analyzeproject.v1.Metrics.encode(
              message.metrics,
              writer.uint32(/* id 5, wireType 2 =*/ 42).fork(),
              _depth + 1,
            ).ldelim();
          if (message.cpdTokens != null && message.cpdTokens.length)
            for (let i = 0; i < message.cpdTokens.length; ++i)
              $root.sonarjs.analyzeproject.v1.CpdToken.encode(
                message.cpdTokens[i],
                writer.uint32(/* id 6, wireType 2 =*/ 50).fork(),
                _depth + 1,
              ).ldelim();
          if (message.ast != null && Object.hasOwnProperty.call(message, 'ast'))
            writer.uint32(/* id 7, wireType 2 =*/ 58).bytes(message.ast);
          if (message.error != null && Object.hasOwnProperty.call(message, 'error'))
            writer.uint32(/* id 8, wireType 2 =*/ 66).string(message.error);
          if (message.sonarResolveComments != null && message.sonarResolveComments.length)
            for (let i = 0; i < message.sonarResolveComments.length; ++i)
              $root.sonarjs.analyzeproject.v1.SonarResolveComment.encode(
                message.sonarResolveComments[i],
                writer.uint32(/* id 9, wireType 2 =*/ 74).fork(),
                _depth + 1,
              ).ldelim();
          if (message.suppressedIssues != null && message.suppressedIssues.length)
            for (let i = 0; i < message.suppressedIssues.length; ++i)
              $root.sonarjs.analyzeproject.v1.Issue.encode(
                message.suppressedIssues[i],
                writer.uint32(/* id 10, wireType 2 =*/ 82).fork(),
                _depth + 1,
              ).ldelim();
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified ProjectAnalysisFileResult message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisFileResult
         * @static
         * @param {sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Properties} message ProjectAnalysisFileResult message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ProjectAnalysisFileResult.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a ProjectAnalysisFileResult message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisFileResult
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.ProjectAnalysisFileResult & sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Shape} ProjectAnalysisFileResult
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ProjectAnalysisFileResult.decode = function decode(reader, length, _end, _depth, _target) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult(),
            value;
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            let wireType = tag & 7;
            switch ((tag >>>= 3)) {
              case 1: {
                if (wireType !== 2) break;
                if (!(message.parsingErrors && message.parsingErrors.length))
                  message.parsingErrors = [];
                message.parsingErrors.push(
                  $root.sonarjs.analyzeproject.v1.ParsingError.decode(
                    reader,
                    reader.uint32(),
                    undefined,
                    _depth + 1,
                  ),
                );
                continue;
              }
              case 2: {
                if (wireType !== 2) break;
                if (!(message.issues && message.issues.length)) message.issues = [];
                message.issues.push(
                  $root.sonarjs.analyzeproject.v1.Issue.decode(
                    reader,
                    reader.uint32(),
                    undefined,
                    _depth + 1,
                  ),
                );
                continue;
              }
              case 3: {
                if (wireType !== 2) break;
                if (!(message.highlights && message.highlights.length)) message.highlights = [];
                message.highlights.push(
                  $root.sonarjs.analyzeproject.v1.Highlight.decode(
                    reader,
                    reader.uint32(),
                    undefined,
                    _depth + 1,
                  ),
                );
                continue;
              }
              case 4: {
                if (wireType !== 2) break;
                if (!(message.highlightedSymbols && message.highlightedSymbols.length))
                  message.highlightedSymbols = [];
                message.highlightedSymbols.push(
                  $root.sonarjs.analyzeproject.v1.HighlightedSymbol.decode(
                    reader,
                    reader.uint32(),
                    undefined,
                    _depth + 1,
                  ),
                );
                continue;
              }
              case 5: {
                if (wireType !== 2) break;
                message.metrics = $root.sonarjs.analyzeproject.v1.Metrics.decode(
                  reader,
                  reader.uint32(),
                  undefined,
                  _depth + 1,
                  message.metrics,
                );
                continue;
              }
              case 6: {
                if (wireType !== 2) break;
                if (!(message.cpdTokens && message.cpdTokens.length)) message.cpdTokens = [];
                message.cpdTokens.push(
                  $root.sonarjs.analyzeproject.v1.CpdToken.decode(
                    reader,
                    reader.uint32(),
                    undefined,
                    _depth + 1,
                  ),
                );
                continue;
              }
              case 7: {
                if (wireType !== 2) break;
                if ((value = reader.bytes()).length) message.ast = value;
                else delete message.ast;
                continue;
              }
              case 8: {
                if (wireType !== 2) break;
                message.error = reader.string();
                message._error = 'error';
                continue;
              }
              case 9: {
                if (wireType !== 2) break;
                if (!(message.sonarResolveComments && message.sonarResolveComments.length))
                  message.sonarResolveComments = [];
                message.sonarResolveComments.push(
                  $root.sonarjs.analyzeproject.v1.SonarResolveComment.decode(
                    reader,
                    reader.uint32(),
                    undefined,
                    _depth + 1,
                  ),
                );
                continue;
              }
              case 10: {
                if (wireType !== 2) break;
                if (!(message.suppressedIssues && message.suppressedIssues.length))
                  message.suppressedIssues = [];
                message.suppressedIssues.push(
                  $root.sonarjs.analyzeproject.v1.Issue.decode(
                    reader,
                    reader.uint32(),
                    undefined,
                    _depth + 1,
                  ),
                );
                continue;
              }
            }
            reader.skipType(wireType, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes a ProjectAnalysisFileResult message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisFileResult
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.ProjectAnalysisFileResult & sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.$Shape} ProjectAnalysisFileResult
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ProjectAnalysisFileResult.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ProjectAnalysisFileResult message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisFileResult
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ProjectAnalysisFileResult.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          let properties = {};
          if (message.parsingErrors != null && message.hasOwnProperty('parsingErrors')) {
            if (!Array.isArray(message.parsingErrors)) return 'parsingErrors: array expected';
            for (let i = 0; i < message.parsingErrors.length; ++i) {
              let error = $root.sonarjs.analyzeproject.v1.ParsingError.verify(
                message.parsingErrors[i],
                _depth + 1,
              );
              if (error) return 'parsingErrors.' + error;
            }
          }
          if (message.issues != null && message.hasOwnProperty('issues')) {
            if (!Array.isArray(message.issues)) return 'issues: array expected';
            for (let i = 0; i < message.issues.length; ++i) {
              let error = $root.sonarjs.analyzeproject.v1.Issue.verify(
                message.issues[i],
                _depth + 1,
              );
              if (error) return 'issues.' + error;
            }
          }
          if (message.highlights != null && message.hasOwnProperty('highlights')) {
            if (!Array.isArray(message.highlights)) return 'highlights: array expected';
            for (let i = 0; i < message.highlights.length; ++i) {
              let error = $root.sonarjs.analyzeproject.v1.Highlight.verify(
                message.highlights[i],
                _depth + 1,
              );
              if (error) return 'highlights.' + error;
            }
          }
          if (message.highlightedSymbols != null && message.hasOwnProperty('highlightedSymbols')) {
            if (!Array.isArray(message.highlightedSymbols))
              return 'highlightedSymbols: array expected';
            for (let i = 0; i < message.highlightedSymbols.length; ++i) {
              let error = $root.sonarjs.analyzeproject.v1.HighlightedSymbol.verify(
                message.highlightedSymbols[i],
                _depth + 1,
              );
              if (error) return 'highlightedSymbols.' + error;
            }
          }
          if (message.metrics != null && message.hasOwnProperty('metrics')) {
            let error = $root.sonarjs.analyzeproject.v1.Metrics.verify(message.metrics, _depth + 1);
            if (error) return 'metrics.' + error;
          }
          if (message.cpdTokens != null && message.hasOwnProperty('cpdTokens')) {
            if (!Array.isArray(message.cpdTokens)) return 'cpdTokens: array expected';
            for (let i = 0; i < message.cpdTokens.length; ++i) {
              let error = $root.sonarjs.analyzeproject.v1.CpdToken.verify(
                message.cpdTokens[i],
                _depth + 1,
              );
              if (error) return 'cpdTokens.' + error;
            }
          }
          if (message.ast != null && message.hasOwnProperty('ast'))
            if (
              !(
                (message.ast && typeof message.ast.length === 'number') ||
                $util.isString(message.ast)
              )
            )
              return 'ast: buffer expected';
          if (message.error != null && message.hasOwnProperty('error')) {
            properties._error = 1;
            if (!$util.isString(message.error)) return 'error: string expected';
          }
          if (
            message.sonarResolveComments != null &&
            message.hasOwnProperty('sonarResolveComments')
          ) {
            if (!Array.isArray(message.sonarResolveComments))
              return 'sonarResolveComments: array expected';
            for (let i = 0; i < message.sonarResolveComments.length; ++i) {
              let error = $root.sonarjs.analyzeproject.v1.SonarResolveComment.verify(
                message.sonarResolveComments[i],
                _depth + 1,
              );
              if (error) return 'sonarResolveComments.' + error;
            }
          }
          if (message.suppressedIssues != null && message.hasOwnProperty('suppressedIssues')) {
            if (!Array.isArray(message.suppressedIssues)) return 'suppressedIssues: array expected';
            for (let i = 0; i < message.suppressedIssues.length; ++i) {
              let error = $root.sonarjs.analyzeproject.v1.Issue.verify(
                message.suppressedIssues[i],
                _depth + 1,
              );
              if (error) return 'suppressedIssues.' + error;
            }
          }
          return null;
        };

        /**
         * Creates a ProjectAnalysisFileResult message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisFileResult
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.ProjectAnalysisFileResult} ProjectAnalysisFileResult
         */
        ProjectAnalysisFileResult.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult)
            return object;
          if (!$util.isObject(object))
            throw TypeError(
              '.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult: object expected',
            );
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let message = new $root.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult();
          if (object.parsingErrors) {
            if (!Array.isArray(object.parsingErrors))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.parsingErrors: array expected',
              );
            message.parsingErrors = Array(object.parsingErrors.length);
            for (let i = 0; i < object.parsingErrors.length; ++i) {
              if (!$util.isObject(object.parsingErrors[i]))
                throw TypeError(
                  '.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.parsingErrors: object expected',
                );
              message.parsingErrors[i] = $root.sonarjs.analyzeproject.v1.ParsingError.fromObject(
                object.parsingErrors[i],
                _depth + 1,
              );
            }
          }
          if (object.issues) {
            if (!Array.isArray(object.issues))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.issues: array expected',
              );
            message.issues = Array(object.issues.length);
            for (let i = 0; i < object.issues.length; ++i) {
              if (!$util.isObject(object.issues[i]))
                throw TypeError(
                  '.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.issues: object expected',
                );
              message.issues[i] = $root.sonarjs.analyzeproject.v1.Issue.fromObject(
                object.issues[i],
                _depth + 1,
              );
            }
          }
          if (object.highlights) {
            if (!Array.isArray(object.highlights))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.highlights: array expected',
              );
            message.highlights = Array(object.highlights.length);
            for (let i = 0; i < object.highlights.length; ++i) {
              if (!$util.isObject(object.highlights[i]))
                throw TypeError(
                  '.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.highlights: object expected',
                );
              message.highlights[i] = $root.sonarjs.analyzeproject.v1.Highlight.fromObject(
                object.highlights[i],
                _depth + 1,
              );
            }
          }
          if (object.highlightedSymbols) {
            if (!Array.isArray(object.highlightedSymbols))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.highlightedSymbols: array expected',
              );
            message.highlightedSymbols = Array(object.highlightedSymbols.length);
            for (let i = 0; i < object.highlightedSymbols.length; ++i) {
              if (!$util.isObject(object.highlightedSymbols[i]))
                throw TypeError(
                  '.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.highlightedSymbols: object expected',
                );
              message.highlightedSymbols[i] =
                $root.sonarjs.analyzeproject.v1.HighlightedSymbol.fromObject(
                  object.highlightedSymbols[i],
                  _depth + 1,
                );
            }
          }
          if (object.metrics != null) {
            if (!$util.isObject(object.metrics))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.metrics: object expected',
              );
            message.metrics = $root.sonarjs.analyzeproject.v1.Metrics.fromObject(
              object.metrics,
              _depth + 1,
            );
          }
          if (object.cpdTokens) {
            if (!Array.isArray(object.cpdTokens))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.cpdTokens: array expected',
              );
            message.cpdTokens = Array(object.cpdTokens.length);
            for (let i = 0; i < object.cpdTokens.length; ++i) {
              if (!$util.isObject(object.cpdTokens[i]))
                throw TypeError(
                  '.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.cpdTokens: object expected',
                );
              message.cpdTokens[i] = $root.sonarjs.analyzeproject.v1.CpdToken.fromObject(
                object.cpdTokens[i],
                _depth + 1,
              );
            }
          }
          if (object.ast != null)
            if (object.ast.length)
              if (typeof object.ast === 'string')
                $util.base64.decode(
                  object.ast,
                  (message.ast = $util.newBuffer($util.base64.length(object.ast))),
                  0,
                );
              else if (object.ast.length >= 0) message.ast = object.ast;
          if (object.error != null) message.error = String(object.error);
          if (object.sonarResolveComments) {
            if (!Array.isArray(object.sonarResolveComments))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.sonarResolveComments: array expected',
              );
            message.sonarResolveComments = Array(object.sonarResolveComments.length);
            for (let i = 0; i < object.sonarResolveComments.length; ++i) {
              if (!$util.isObject(object.sonarResolveComments[i]))
                throw TypeError(
                  '.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.sonarResolveComments: object expected',
                );
              message.sonarResolveComments[i] =
                $root.sonarjs.analyzeproject.v1.SonarResolveComment.fromObject(
                  object.sonarResolveComments[i],
                  _depth + 1,
                );
            }
          }
          if (object.suppressedIssues) {
            if (!Array.isArray(object.suppressedIssues))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.suppressedIssues: array expected',
              );
            message.suppressedIssues = Array(object.suppressedIssues.length);
            for (let i = 0; i < object.suppressedIssues.length; ++i) {
              if (!$util.isObject(object.suppressedIssues[i]))
                throw TypeError(
                  '.sonarjs.analyzeproject.v1.ProjectAnalysisFileResult.suppressedIssues: object expected',
                );
              message.suppressedIssues[i] = $root.sonarjs.analyzeproject.v1.Issue.fromObject(
                object.suppressedIssues[i],
                _depth + 1,
              );
            }
          }
          return message;
        };

        /**
         * Creates a plain object from a ProjectAnalysisFileResult message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisFileResult
         * @static
         * @param {sonarjs.analyzeproject.v1.ProjectAnalysisFileResult} message ProjectAnalysisFileResult
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ProjectAnalysisFileResult.toObject = function toObject(message, options, _depth) {
          if (!options) options = {};
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let object = {};
          if (options.arrays || options.defaults) {
            object.parsingErrors = [];
            object.issues = [];
            object.highlights = [];
            object.highlightedSymbols = [];
            object.cpdTokens = [];
            object.sonarResolveComments = [];
            object.suppressedIssues = [];
          }
          if (options.defaults) {
            object.metrics = null;
            if (options.bytes === String) object.ast = '';
            else {
              object.ast = [];
              if (options.bytes !== Array) object.ast = $util.newBuffer(object.ast);
            }
          }
          if (message.parsingErrors && message.parsingErrors.length) {
            object.parsingErrors = Array(message.parsingErrors.length);
            for (let j = 0; j < message.parsingErrors.length; ++j)
              object.parsingErrors[j] = $root.sonarjs.analyzeproject.v1.ParsingError.toObject(
                message.parsingErrors[j],
                options,
                _depth + 1,
              );
          }
          if (message.issues && message.issues.length) {
            object.issues = Array(message.issues.length);
            for (let j = 0; j < message.issues.length; ++j)
              object.issues[j] = $root.sonarjs.analyzeproject.v1.Issue.toObject(
                message.issues[j],
                options,
                _depth + 1,
              );
          }
          if (message.highlights && message.highlights.length) {
            object.highlights = Array(message.highlights.length);
            for (let j = 0; j < message.highlights.length; ++j)
              object.highlights[j] = $root.sonarjs.analyzeproject.v1.Highlight.toObject(
                message.highlights[j],
                options,
                _depth + 1,
              );
          }
          if (message.highlightedSymbols && message.highlightedSymbols.length) {
            object.highlightedSymbols = Array(message.highlightedSymbols.length);
            for (let j = 0; j < message.highlightedSymbols.length; ++j)
              object.highlightedSymbols[j] =
                $root.sonarjs.analyzeproject.v1.HighlightedSymbol.toObject(
                  message.highlightedSymbols[j],
                  options,
                  _depth + 1,
                );
          }
          if (message.metrics != null && message.hasOwnProperty('metrics'))
            object.metrics = $root.sonarjs.analyzeproject.v1.Metrics.toObject(
              message.metrics,
              options,
              _depth + 1,
            );
          if (message.cpdTokens && message.cpdTokens.length) {
            object.cpdTokens = Array(message.cpdTokens.length);
            for (let j = 0; j < message.cpdTokens.length; ++j)
              object.cpdTokens[j] = $root.sonarjs.analyzeproject.v1.CpdToken.toObject(
                message.cpdTokens[j],
                options,
                _depth + 1,
              );
          }
          if (message.ast != null && message.hasOwnProperty('ast'))
            object.ast =
              options.bytes === String
                ? $util.base64.encode(message.ast, 0, message.ast.length)
                : options.bytes === Array
                  ? Array.prototype.slice.call(message.ast)
                  : message.ast;
          if (message.error != null && message.hasOwnProperty('error'))
            object.error = message.error;
          if (message.sonarResolveComments && message.sonarResolveComments.length) {
            object.sonarResolveComments = Array(message.sonarResolveComments.length);
            for (let j = 0; j < message.sonarResolveComments.length; ++j)
              object.sonarResolveComments[j] =
                $root.sonarjs.analyzeproject.v1.SonarResolveComment.toObject(
                  message.sonarResolveComments[j],
                  options,
                  _depth + 1,
                );
          }
          if (message.suppressedIssues && message.suppressedIssues.length) {
            object.suppressedIssues = Array(message.suppressedIssues.length);
            for (let j = 0; j < message.suppressedIssues.length; ++j)
              object.suppressedIssues[j] = $root.sonarjs.analyzeproject.v1.Issue.toObject(
                message.suppressedIssues[j],
                options,
                _depth + 1,
              );
          }
          return object;
        };

        /**
         * Converts this ProjectAnalysisFileResult to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisFileResult
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ProjectAnalysisFileResult.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for ProjectAnalysisFileResult
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisFileResult
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        ProjectAnalysisFileResult.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.ProjectAnalysisFileResult';
        };

        return ProjectAnalysisFileResult;
      })();

      v1.ParsingError = (function () {
        /**
         * Properties of a ParsingError.
         * @typedef {Object} sonarjs.analyzeproject.v1.ParsingError.$Properties
         * @property {string|null} [message] ParsingError message
         * @property {number|null} [line] ParsingError line
         * @property {number|null} [column] ParsingError column
         * @property {sonarjs.analyzeproject.v1.ParsingErrorCode|null} [code] ParsingError code
         * @property {sonarjs.analyzeproject.v1.AnalysisLanguage|null} [language] ParsingError language
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of a ParsingError.
         * @memberof sonarjs.analyzeproject.v1
         * @interface IParsingError
         * @augments sonarjs.analyzeproject.v1.ParsingError.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.ParsingError.$Properties instead.
         */

        /**
         * Shape of a ParsingError.
         * @typedef {sonarjs.analyzeproject.v1.ParsingError.$Properties} sonarjs.analyzeproject.v1.ParsingError.$Shape
         */

        /**
         * Constructs a new ParsingError.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents a ParsingError.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.ParsingError.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function ParsingError(properties) {
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * ParsingError message.
         * @member {string} message
         * @memberof sonarjs.analyzeproject.v1.ParsingError
         * @instance
         */
        ParsingError.prototype.message = '';

        /**
         * ParsingError line.
         * @member {number|null|undefined} line
         * @memberof sonarjs.analyzeproject.v1.ParsingError
         * @instance
         */
        ParsingError.prototype.line = null;

        /**
         * ParsingError column.
         * @member {number|null|undefined} column
         * @memberof sonarjs.analyzeproject.v1.ParsingError
         * @instance
         */
        ParsingError.prototype.column = null;

        /**
         * ParsingError code.
         * @member {sonarjs.analyzeproject.v1.ParsingErrorCode} code
         * @memberof sonarjs.analyzeproject.v1.ParsingError
         * @instance
         */
        ParsingError.prototype.code = 0;

        /**
         * ParsingError language.
         * @member {sonarjs.analyzeproject.v1.AnalysisLanguage} language
         * @memberof sonarjs.analyzeproject.v1.ParsingError
         * @instance
         */
        ParsingError.prototype.language = 0;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(ParsingError.prototype, '_line', {
          get: $util.oneOfGetter(($oneOfFields = ['line'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(ParsingError.prototype, '_column', {
          get: $util.oneOfGetter(($oneOfFields = ['column'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * Creates a new ParsingError instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.ParsingError
         * @static
         * @param {sonarjs.analyzeproject.v1.ParsingError.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.ParsingError} ParsingError instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.ParsingError.$Shape): sonarjs.analyzeproject.v1.ParsingError & sonarjs.analyzeproject.v1.ParsingError.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.ParsingError.$Properties): sonarjs.analyzeproject.v1.ParsingError;
         * }}
         */
        ParsingError.create = function create(properties) {
          return new ParsingError(properties);
        };

        /**
         * Encodes the specified ParsingError message. Does not implicitly {@link sonarjs.analyzeproject.v1.ParsingError.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.ParsingError
         * @static
         * @param {sonarjs.analyzeproject.v1.ParsingError.$Properties} message ParsingError message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ParsingError.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.message != null && Object.hasOwnProperty.call(message, 'message'))
            writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.message);
          if (message.line != null && Object.hasOwnProperty.call(message, 'line'))
            writer.uint32(/* id 2, wireType 0 =*/ 16).int32(message.line);
          if (message.column != null && Object.hasOwnProperty.call(message, 'column'))
            writer.uint32(/* id 3, wireType 0 =*/ 24).int32(message.column);
          if (message.code != null && Object.hasOwnProperty.call(message, 'code'))
            writer.uint32(/* id 4, wireType 0 =*/ 32).int32(message.code);
          if (message.language != null && Object.hasOwnProperty.call(message, 'language'))
            writer.uint32(/* id 5, wireType 0 =*/ 40).int32(message.language);
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified ParsingError message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.ParsingError.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.ParsingError
         * @static
         * @param {sonarjs.analyzeproject.v1.ParsingError.$Properties} message ParsingError message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ParsingError.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a ParsingError message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.ParsingError
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.ParsingError & sonarjs.analyzeproject.v1.ParsingError.$Shape} ParsingError
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ParsingError.decode = function decode(reader, length, _end, _depth, _target) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.ParsingError(),
            value;
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            let wireType = tag & 7;
            switch ((tag >>>= 3)) {
              case 1: {
                if (wireType !== 2) break;
                if ((value = reader.string()).length) message.message = value;
                else delete message.message;
                continue;
              }
              case 2: {
                if (wireType !== 0) break;
                message.line = reader.int32();
                message._line = 'line';
                continue;
              }
              case 3: {
                if (wireType !== 0) break;
                message.column = reader.int32();
                message._column = 'column';
                continue;
              }
              case 4: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.code = value;
                else delete message.code;
                continue;
              }
              case 5: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.language = value;
                else delete message.language;
                continue;
              }
            }
            reader.skipType(wireType, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes a ParsingError message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.ParsingError
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.ParsingError & sonarjs.analyzeproject.v1.ParsingError.$Shape} ParsingError
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ParsingError.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ParsingError message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.ParsingError
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ParsingError.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          let properties = {};
          if (message.message != null && message.hasOwnProperty('message'))
            if (!$util.isString(message.message)) return 'message: string expected';
          if (message.line != null && message.hasOwnProperty('line')) {
            properties._line = 1;
            if (!$util.isInteger(message.line)) return 'line: integer expected';
          }
          if (message.column != null && message.hasOwnProperty('column')) {
            properties._column = 1;
            if (!$util.isInteger(message.column)) return 'column: integer expected';
          }
          if (message.code != null && message.hasOwnProperty('code'))
            switch (message.code) {
              default:
                return 'code: enum value expected';
              case 0:
              case 1:
              case 2:
              case 3:
                break;
            }
          if (message.language != null && message.hasOwnProperty('language'))
            switch (message.language) {
              default:
                return 'language: enum value expected';
              case 0:
              case 1:
              case 2:
              case 3:
                break;
            }
          return null;
        };

        /**
         * Creates a ParsingError message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.ParsingError
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.ParsingError} ParsingError
         */
        ParsingError.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.ParsingError) return object;
          if (!$util.isObject(object))
            throw TypeError('.sonarjs.analyzeproject.v1.ParsingError: object expected');
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let message = new $root.sonarjs.analyzeproject.v1.ParsingError();
          if (object.message != null)
            if (typeof object.message !== 'string' || object.message.length)
              message.message = String(object.message);
          if (object.line != null) message.line = object.line | 0;
          if (object.column != null) message.column = object.column | 0;
          if (
            object.code !== 0 &&
            (typeof object.code !== 'string' ||
              $root.sonarjs.analyzeproject.v1.ParsingErrorCode[object.code] !== 0)
          )
            switch (object.code) {
              default:
                if (typeof object.code === 'number') {
                  message.code = object.code;
                  break;
                }
                break;
              case 'PARSING_ERROR_CODE_UNSPECIFIED':
              case 0:
                message.code = 0;
                break;
              case 'PARSING_ERROR_CODE_PARSING':
              case 1:
                message.code = 1;
                break;
              case 'PARSING_ERROR_CODE_FAILING_TYPESCRIPT':
              case 2:
                message.code = 2;
                break;
              case 'PARSING_ERROR_CODE_LINTER_INITIALIZATION':
              case 3:
                message.code = 3;
                break;
            }
          if (
            object.language !== 0 &&
            (typeof object.language !== 'string' ||
              $root.sonarjs.analyzeproject.v1.AnalysisLanguage[object.language] !== 0)
          )
            switch (object.language) {
              default:
                if (typeof object.language === 'number') {
                  message.language = object.language;
                  break;
                }
                break;
              case 'ANALYSIS_LANGUAGE_UNSPECIFIED':
              case 0:
                message.language = 0;
                break;
              case 'ANALYSIS_LANGUAGE_JS':
              case 1:
                message.language = 1;
                break;
              case 'ANALYSIS_LANGUAGE_TS':
              case 2:
                message.language = 2;
                break;
              case 'ANALYSIS_LANGUAGE_CSS':
              case 3:
                message.language = 3;
                break;
            }
          return message;
        };

        /**
         * Creates a plain object from a ParsingError message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.ParsingError
         * @static
         * @param {sonarjs.analyzeproject.v1.ParsingError} message ParsingError
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ParsingError.toObject = function toObject(message, options, _depth) {
          if (!options) options = {};
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let object = {};
          if (options.defaults) {
            object.message = '';
            object.code = options.enums === String ? 'PARSING_ERROR_CODE_UNSPECIFIED' : 0;
            object.language = options.enums === String ? 'ANALYSIS_LANGUAGE_UNSPECIFIED' : 0;
          }
          if (message.message != null && message.hasOwnProperty('message'))
            object.message = message.message;
          if (message.line != null && message.hasOwnProperty('line')) object.line = message.line;
          if (message.column != null && message.hasOwnProperty('column'))
            object.column = message.column;
          if (message.code != null && message.hasOwnProperty('code'))
            object.code =
              options.enums === String
                ? $root.sonarjs.analyzeproject.v1.ParsingErrorCode[message.code] === undefined
                  ? message.code
                  : $root.sonarjs.analyzeproject.v1.ParsingErrorCode[message.code]
                : message.code;
          if (message.language != null && message.hasOwnProperty('language'))
            object.language =
              options.enums === String
                ? $root.sonarjs.analyzeproject.v1.AnalysisLanguage[message.language] === undefined
                  ? message.language
                  : $root.sonarjs.analyzeproject.v1.AnalysisLanguage[message.language]
                : message.language;
          return object;
        };

        /**
         * Converts this ParsingError to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.ParsingError
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ParsingError.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for ParsingError
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.ParsingError
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        ParsingError.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.ParsingError';
        };

        return ParsingError;
      })();

      v1.Issue = (function () {
        /**
         * Properties of an Issue.
         * @typedef {Object} sonarjs.analyzeproject.v1.Issue.$Properties
         * @property {number|null} [line] Issue line
         * @property {number|null} [column] Issue column
         * @property {number|null} [endLine] Issue endLine
         * @property {number|null} [endColumn] Issue endColumn
         * @property {string|null} [message] Issue message
         * @property {string|null} [ruleId] Issue ruleId
         * @property {sonarjs.analyzeproject.v1.AnalysisLanguage|null} [language] Issue language
         * @property {Array.<sonarjs.analyzeproject.v1.IssueLocation.$Properties>|null} [secondaryLocations] Issue secondaryLocations
         * @property {number|null} [cost] Issue cost
         * @property {Array.<sonarjs.analyzeproject.v1.QuickFix.$Properties>|null} [quickFixes] Issue quickFixes
         * @property {Array.<string>|null} [ruleEslintKeys] Issue ruleEslintKeys
         * @property {string|null} [filePath] Issue filePath
         * @property {string|null} [resolutionComment] Issue resolutionComment
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of an Issue.
         * @memberof sonarjs.analyzeproject.v1
         * @interface IIssue
         * @augments sonarjs.analyzeproject.v1.Issue.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.Issue.$Properties instead.
         */

        /**
         * Shape of an Issue.
         * @typedef {sonarjs.analyzeproject.v1.Issue.$Properties} sonarjs.analyzeproject.v1.Issue.$Shape
         */

        /**
         * Constructs a new Issue.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents an Issue.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.Issue.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function Issue(properties) {
          this.secondaryLocations = [];
          this.quickFixes = [];
          this.ruleEslintKeys = [];
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * Issue line.
         * @member {number} line
         * @memberof sonarjs.analyzeproject.v1.Issue
         * @instance
         */
        Issue.prototype.line = 0;

        /**
         * Issue column.
         * @member {number} column
         * @memberof sonarjs.analyzeproject.v1.Issue
         * @instance
         */
        Issue.prototype.column = 0;

        /**
         * Issue endLine.
         * @member {number|null|undefined} endLine
         * @memberof sonarjs.analyzeproject.v1.Issue
         * @instance
         */
        Issue.prototype.endLine = null;

        /**
         * Issue endColumn.
         * @member {number|null|undefined} endColumn
         * @memberof sonarjs.analyzeproject.v1.Issue
         * @instance
         */
        Issue.prototype.endColumn = null;

        /**
         * Issue message.
         * @member {string} message
         * @memberof sonarjs.analyzeproject.v1.Issue
         * @instance
         */
        Issue.prototype.message = '';

        /**
         * Issue ruleId.
         * @member {string} ruleId
         * @memberof sonarjs.analyzeproject.v1.Issue
         * @instance
         */
        Issue.prototype.ruleId = '';

        /**
         * Issue language.
         * @member {sonarjs.analyzeproject.v1.AnalysisLanguage} language
         * @memberof sonarjs.analyzeproject.v1.Issue
         * @instance
         */
        Issue.prototype.language = 0;

        /**
         * Issue secondaryLocations.
         * @member {Array.<sonarjs.analyzeproject.v1.IssueLocation.$Properties>} secondaryLocations
         * @memberof sonarjs.analyzeproject.v1.Issue
         * @instance
         */
        Issue.prototype.secondaryLocations = $util.emptyArray;

        /**
         * Issue cost.
         * @member {number|null|undefined} cost
         * @memberof sonarjs.analyzeproject.v1.Issue
         * @instance
         */
        Issue.prototype.cost = null;

        /**
         * Issue quickFixes.
         * @member {Array.<sonarjs.analyzeproject.v1.QuickFix.$Properties>} quickFixes
         * @memberof sonarjs.analyzeproject.v1.Issue
         * @instance
         */
        Issue.prototype.quickFixes = $util.emptyArray;

        /**
         * Issue ruleEslintKeys.
         * @member {Array.<string>} ruleEslintKeys
         * @memberof sonarjs.analyzeproject.v1.Issue
         * @instance
         */
        Issue.prototype.ruleEslintKeys = $util.emptyArray;

        /**
         * Issue filePath.
         * @member {string} filePath
         * @memberof sonarjs.analyzeproject.v1.Issue
         * @instance
         */
        Issue.prototype.filePath = '';

        /**
         * Issue resolutionComment.
         * @member {string|null|undefined} resolutionComment
         * @memberof sonarjs.analyzeproject.v1.Issue
         * @instance
         */
        Issue.prototype.resolutionComment = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(Issue.prototype, '_endLine', {
          get: $util.oneOfGetter(($oneOfFields = ['endLine'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(Issue.prototype, '_endColumn', {
          get: $util.oneOfGetter(($oneOfFields = ['endColumn'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(Issue.prototype, '_cost', {
          get: $util.oneOfGetter(($oneOfFields = ['cost'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(Issue.prototype, '_resolutionComment', {
          get: $util.oneOfGetter(($oneOfFields = ['resolutionComment'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * Creates a new Issue instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.Issue
         * @static
         * @param {sonarjs.analyzeproject.v1.Issue.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.Issue} Issue instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.Issue.$Shape): sonarjs.analyzeproject.v1.Issue & sonarjs.analyzeproject.v1.Issue.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.Issue.$Properties): sonarjs.analyzeproject.v1.Issue;
         * }}
         */
        Issue.create = function create(properties) {
          return new Issue(properties);
        };

        /**
         * Encodes the specified Issue message. Does not implicitly {@link sonarjs.analyzeproject.v1.Issue.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.Issue
         * @static
         * @param {sonarjs.analyzeproject.v1.Issue.$Properties} message Issue message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Issue.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.line != null && Object.hasOwnProperty.call(message, 'line'))
            writer.uint32(/* id 1, wireType 0 =*/ 8).int32(message.line);
          if (message.column != null && Object.hasOwnProperty.call(message, 'column'))
            writer.uint32(/* id 2, wireType 0 =*/ 16).int32(message.column);
          if (message.endLine != null && Object.hasOwnProperty.call(message, 'endLine'))
            writer.uint32(/* id 3, wireType 0 =*/ 24).int32(message.endLine);
          if (message.endColumn != null && Object.hasOwnProperty.call(message, 'endColumn'))
            writer.uint32(/* id 4, wireType 0 =*/ 32).int32(message.endColumn);
          if (message.message != null && Object.hasOwnProperty.call(message, 'message'))
            writer.uint32(/* id 5, wireType 2 =*/ 42).string(message.message);
          if (message.ruleId != null && Object.hasOwnProperty.call(message, 'ruleId'))
            writer.uint32(/* id 6, wireType 2 =*/ 50).string(message.ruleId);
          if (message.language != null && Object.hasOwnProperty.call(message, 'language'))
            writer.uint32(/* id 7, wireType 0 =*/ 56).int32(message.language);
          if (message.secondaryLocations != null && message.secondaryLocations.length)
            for (let i = 0; i < message.secondaryLocations.length; ++i)
              $root.sonarjs.analyzeproject.v1.IssueLocation.encode(
                message.secondaryLocations[i],
                writer.uint32(/* id 8, wireType 2 =*/ 66).fork(),
                _depth + 1,
              ).ldelim();
          if (message.cost != null && Object.hasOwnProperty.call(message, 'cost'))
            writer.uint32(/* id 9, wireType 1 =*/ 73).double(message.cost);
          if (message.quickFixes != null && message.quickFixes.length)
            for (let i = 0; i < message.quickFixes.length; ++i)
              $root.sonarjs.analyzeproject.v1.QuickFix.encode(
                message.quickFixes[i],
                writer.uint32(/* id 10, wireType 2 =*/ 82).fork(),
                _depth + 1,
              ).ldelim();
          if (message.ruleEslintKeys != null && message.ruleEslintKeys.length)
            for (let i = 0; i < message.ruleEslintKeys.length; ++i)
              writer.uint32(/* id 11, wireType 2 =*/ 90).string(message.ruleEslintKeys[i]);
          if (message.filePath != null && Object.hasOwnProperty.call(message, 'filePath'))
            writer.uint32(/* id 12, wireType 2 =*/ 98).string(message.filePath);
          if (
            message.resolutionComment != null &&
            Object.hasOwnProperty.call(message, 'resolutionComment')
          )
            writer.uint32(/* id 13, wireType 2 =*/ 106).string(message.resolutionComment);
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified Issue message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.Issue.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.Issue
         * @static
         * @param {sonarjs.analyzeproject.v1.Issue.$Properties} message Issue message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Issue.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes an Issue message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.Issue
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.Issue & sonarjs.analyzeproject.v1.Issue.$Shape} Issue
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Issue.decode = function decode(reader, length, _end, _depth, _target) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.Issue(),
            value;
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            let wireType = tag & 7;
            switch ((tag >>>= 3)) {
              case 1: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.line = value;
                else delete message.line;
                continue;
              }
              case 2: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.column = value;
                else delete message.column;
                continue;
              }
              case 3: {
                if (wireType !== 0) break;
                message.endLine = reader.int32();
                message._endLine = 'endLine';
                continue;
              }
              case 4: {
                if (wireType !== 0) break;
                message.endColumn = reader.int32();
                message._endColumn = 'endColumn';
                continue;
              }
              case 5: {
                if (wireType !== 2) break;
                if ((value = reader.string()).length) message.message = value;
                else delete message.message;
                continue;
              }
              case 6: {
                if (wireType !== 2) break;
                if ((value = reader.string()).length) message.ruleId = value;
                else delete message.ruleId;
                continue;
              }
              case 7: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.language = value;
                else delete message.language;
                continue;
              }
              case 8: {
                if (wireType !== 2) break;
                if (!(message.secondaryLocations && message.secondaryLocations.length))
                  message.secondaryLocations = [];
                message.secondaryLocations.push(
                  $root.sonarjs.analyzeproject.v1.IssueLocation.decode(
                    reader,
                    reader.uint32(),
                    undefined,
                    _depth + 1,
                  ),
                );
                continue;
              }
              case 9: {
                if (wireType !== 1) break;
                message.cost = reader.double();
                message._cost = 'cost';
                continue;
              }
              case 10: {
                if (wireType !== 2) break;
                if (!(message.quickFixes && message.quickFixes.length)) message.quickFixes = [];
                message.quickFixes.push(
                  $root.sonarjs.analyzeproject.v1.QuickFix.decode(
                    reader,
                    reader.uint32(),
                    undefined,
                    _depth + 1,
                  ),
                );
                continue;
              }
              case 11: {
                if (wireType !== 2) break;
                if (!(message.ruleEslintKeys && message.ruleEslintKeys.length))
                  message.ruleEslintKeys = [];
                message.ruleEslintKeys.push(reader.string());
                continue;
              }
              case 12: {
                if (wireType !== 2) break;
                if ((value = reader.string()).length) message.filePath = value;
                else delete message.filePath;
                continue;
              }
              case 13: {
                if (wireType !== 2) break;
                message.resolutionComment = reader.string();
                message._resolutionComment = 'resolutionComment';
                continue;
              }
            }
            reader.skipType(wireType, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes an Issue message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.Issue
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.Issue & sonarjs.analyzeproject.v1.Issue.$Shape} Issue
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Issue.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an Issue message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.Issue
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Issue.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          let properties = {};
          if (message.line != null && message.hasOwnProperty('line'))
            if (!$util.isInteger(message.line)) return 'line: integer expected';
          if (message.column != null && message.hasOwnProperty('column'))
            if (!$util.isInteger(message.column)) return 'column: integer expected';
          if (message.endLine != null && message.hasOwnProperty('endLine')) {
            properties._endLine = 1;
            if (!$util.isInteger(message.endLine)) return 'endLine: integer expected';
          }
          if (message.endColumn != null && message.hasOwnProperty('endColumn')) {
            properties._endColumn = 1;
            if (!$util.isInteger(message.endColumn)) return 'endColumn: integer expected';
          }
          if (message.message != null && message.hasOwnProperty('message'))
            if (!$util.isString(message.message)) return 'message: string expected';
          if (message.ruleId != null && message.hasOwnProperty('ruleId'))
            if (!$util.isString(message.ruleId)) return 'ruleId: string expected';
          if (message.language != null && message.hasOwnProperty('language'))
            switch (message.language) {
              default:
                return 'language: enum value expected';
              case 0:
              case 1:
              case 2:
              case 3:
                break;
            }
          if (message.secondaryLocations != null && message.hasOwnProperty('secondaryLocations')) {
            if (!Array.isArray(message.secondaryLocations))
              return 'secondaryLocations: array expected';
            for (let i = 0; i < message.secondaryLocations.length; ++i) {
              let error = $root.sonarjs.analyzeproject.v1.IssueLocation.verify(
                message.secondaryLocations[i],
                _depth + 1,
              );
              if (error) return 'secondaryLocations.' + error;
            }
          }
          if (message.cost != null && message.hasOwnProperty('cost')) {
            properties._cost = 1;
            if (typeof message.cost !== 'number') return 'cost: number expected';
          }
          if (message.quickFixes != null && message.hasOwnProperty('quickFixes')) {
            if (!Array.isArray(message.quickFixes)) return 'quickFixes: array expected';
            for (let i = 0; i < message.quickFixes.length; ++i) {
              let error = $root.sonarjs.analyzeproject.v1.QuickFix.verify(
                message.quickFixes[i],
                _depth + 1,
              );
              if (error) return 'quickFixes.' + error;
            }
          }
          if (message.ruleEslintKeys != null && message.hasOwnProperty('ruleEslintKeys')) {
            if (!Array.isArray(message.ruleEslintKeys)) return 'ruleEslintKeys: array expected';
            for (let i = 0; i < message.ruleEslintKeys.length; ++i)
              if (!$util.isString(message.ruleEslintKeys[i]))
                return 'ruleEslintKeys: string[] expected';
          }
          if (message.filePath != null && message.hasOwnProperty('filePath'))
            if (!$util.isString(message.filePath)) return 'filePath: string expected';
          if (message.resolutionComment != null && message.hasOwnProperty('resolutionComment')) {
            properties._resolutionComment = 1;
            if (!$util.isString(message.resolutionComment))
              return 'resolutionComment: string expected';
          }
          return null;
        };

        /**
         * Creates an Issue message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.Issue
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.Issue} Issue
         */
        Issue.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.Issue) return object;
          if (!$util.isObject(object))
            throw TypeError('.sonarjs.analyzeproject.v1.Issue: object expected');
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let message = new $root.sonarjs.analyzeproject.v1.Issue();
          if (object.line != null) if (Number(object.line) !== 0) message.line = object.line | 0;
          if (object.column != null)
            if (Number(object.column) !== 0) message.column = object.column | 0;
          if (object.endLine != null) message.endLine = object.endLine | 0;
          if (object.endColumn != null) message.endColumn = object.endColumn | 0;
          if (object.message != null)
            if (typeof object.message !== 'string' || object.message.length)
              message.message = String(object.message);
          if (object.ruleId != null)
            if (typeof object.ruleId !== 'string' || object.ruleId.length)
              message.ruleId = String(object.ruleId);
          if (
            object.language !== 0 &&
            (typeof object.language !== 'string' ||
              $root.sonarjs.analyzeproject.v1.AnalysisLanguage[object.language] !== 0)
          )
            switch (object.language) {
              default:
                if (typeof object.language === 'number') {
                  message.language = object.language;
                  break;
                }
                break;
              case 'ANALYSIS_LANGUAGE_UNSPECIFIED':
              case 0:
                message.language = 0;
                break;
              case 'ANALYSIS_LANGUAGE_JS':
              case 1:
                message.language = 1;
                break;
              case 'ANALYSIS_LANGUAGE_TS':
              case 2:
                message.language = 2;
                break;
              case 'ANALYSIS_LANGUAGE_CSS':
              case 3:
                message.language = 3;
                break;
            }
          if (object.secondaryLocations) {
            if (!Array.isArray(object.secondaryLocations))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.Issue.secondaryLocations: array expected',
              );
            message.secondaryLocations = Array(object.secondaryLocations.length);
            for (let i = 0; i < object.secondaryLocations.length; ++i) {
              if (!$util.isObject(object.secondaryLocations[i]))
                throw TypeError(
                  '.sonarjs.analyzeproject.v1.Issue.secondaryLocations: object expected',
                );
              message.secondaryLocations[i] =
                $root.sonarjs.analyzeproject.v1.IssueLocation.fromObject(
                  object.secondaryLocations[i],
                  _depth + 1,
                );
            }
          }
          if (object.cost != null) message.cost = Number(object.cost);
          if (object.quickFixes) {
            if (!Array.isArray(object.quickFixes))
              throw TypeError('.sonarjs.analyzeproject.v1.Issue.quickFixes: array expected');
            message.quickFixes = Array(object.quickFixes.length);
            for (let i = 0; i < object.quickFixes.length; ++i) {
              if (!$util.isObject(object.quickFixes[i]))
                throw TypeError('.sonarjs.analyzeproject.v1.Issue.quickFixes: object expected');
              message.quickFixes[i] = $root.sonarjs.analyzeproject.v1.QuickFix.fromObject(
                object.quickFixes[i],
                _depth + 1,
              );
            }
          }
          if (object.ruleEslintKeys) {
            if (!Array.isArray(object.ruleEslintKeys))
              throw TypeError('.sonarjs.analyzeproject.v1.Issue.ruleEslintKeys: array expected');
            message.ruleEslintKeys = Array(object.ruleEslintKeys.length);
            for (let i = 0; i < object.ruleEslintKeys.length; ++i)
              message.ruleEslintKeys[i] = String(object.ruleEslintKeys[i]);
          }
          if (object.filePath != null)
            if (typeof object.filePath !== 'string' || object.filePath.length)
              message.filePath = String(object.filePath);
          if (object.resolutionComment != null)
            message.resolutionComment = String(object.resolutionComment);
          return message;
        };

        /**
         * Creates a plain object from an Issue message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.Issue
         * @static
         * @param {sonarjs.analyzeproject.v1.Issue} message Issue
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Issue.toObject = function toObject(message, options, _depth) {
          if (!options) options = {};
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let object = {};
          if (options.arrays || options.defaults) {
            object.secondaryLocations = [];
            object.quickFixes = [];
            object.ruleEslintKeys = [];
          }
          if (options.defaults) {
            object.line = 0;
            object.column = 0;
            object.message = '';
            object.ruleId = '';
            object.language = options.enums === String ? 'ANALYSIS_LANGUAGE_UNSPECIFIED' : 0;
            object.filePath = '';
          }
          if (message.line != null && message.hasOwnProperty('line')) object.line = message.line;
          if (message.column != null && message.hasOwnProperty('column'))
            object.column = message.column;
          if (message.endLine != null && message.hasOwnProperty('endLine'))
            object.endLine = message.endLine;
          if (message.endColumn != null && message.hasOwnProperty('endColumn'))
            object.endColumn = message.endColumn;
          if (message.message != null && message.hasOwnProperty('message'))
            object.message = message.message;
          if (message.ruleId != null && message.hasOwnProperty('ruleId'))
            object.ruleId = message.ruleId;
          if (message.language != null && message.hasOwnProperty('language'))
            object.language =
              options.enums === String
                ? $root.sonarjs.analyzeproject.v1.AnalysisLanguage[message.language] === undefined
                  ? message.language
                  : $root.sonarjs.analyzeproject.v1.AnalysisLanguage[message.language]
                : message.language;
          if (message.secondaryLocations && message.secondaryLocations.length) {
            object.secondaryLocations = Array(message.secondaryLocations.length);
            for (let j = 0; j < message.secondaryLocations.length; ++j)
              object.secondaryLocations[j] = $root.sonarjs.analyzeproject.v1.IssueLocation.toObject(
                message.secondaryLocations[j],
                options,
                _depth + 1,
              );
          }
          if (message.cost != null && message.hasOwnProperty('cost'))
            object.cost =
              options.json && !isFinite(message.cost) ? String(message.cost) : message.cost;
          if (message.quickFixes && message.quickFixes.length) {
            object.quickFixes = Array(message.quickFixes.length);
            for (let j = 0; j < message.quickFixes.length; ++j)
              object.quickFixes[j] = $root.sonarjs.analyzeproject.v1.QuickFix.toObject(
                message.quickFixes[j],
                options,
                _depth + 1,
              );
          }
          if (message.ruleEslintKeys && message.ruleEslintKeys.length) {
            object.ruleEslintKeys = Array(message.ruleEslintKeys.length);
            for (let j = 0; j < message.ruleEslintKeys.length; ++j)
              object.ruleEslintKeys[j] = message.ruleEslintKeys[j];
          }
          if (message.filePath != null && message.hasOwnProperty('filePath'))
            object.filePath = message.filePath;
          if (message.resolutionComment != null && message.hasOwnProperty('resolutionComment'))
            object.resolutionComment = message.resolutionComment;
          return object;
        };

        /**
         * Converts this Issue to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.Issue
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Issue.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for Issue
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.Issue
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        Issue.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.Issue';
        };

        return Issue;
      })();

      v1.QuickFix = (function () {
        /**
         * Properties of a QuickFix.
         * @typedef {Object} sonarjs.analyzeproject.v1.QuickFix.$Properties
         * @property {string|null} [message] QuickFix message
         * @property {Array.<sonarjs.analyzeproject.v1.QuickFixEdit.$Properties>|null} [edits] QuickFix edits
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of a QuickFix.
         * @memberof sonarjs.analyzeproject.v1
         * @interface IQuickFix
         * @augments sonarjs.analyzeproject.v1.QuickFix.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.QuickFix.$Properties instead.
         */

        /**
         * Shape of a QuickFix.
         * @typedef {sonarjs.analyzeproject.v1.QuickFix.$Properties} sonarjs.analyzeproject.v1.QuickFix.$Shape
         */

        /**
         * Constructs a new QuickFix.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents a QuickFix.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.QuickFix.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function QuickFix(properties) {
          this.edits = [];
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * QuickFix message.
         * @member {string} message
         * @memberof sonarjs.analyzeproject.v1.QuickFix
         * @instance
         */
        QuickFix.prototype.message = '';

        /**
         * QuickFix edits.
         * @member {Array.<sonarjs.analyzeproject.v1.QuickFixEdit.$Properties>} edits
         * @memberof sonarjs.analyzeproject.v1.QuickFix
         * @instance
         */
        QuickFix.prototype.edits = $util.emptyArray;

        /**
         * Creates a new QuickFix instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.QuickFix
         * @static
         * @param {sonarjs.analyzeproject.v1.QuickFix.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.QuickFix} QuickFix instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.QuickFix.$Shape): sonarjs.analyzeproject.v1.QuickFix & sonarjs.analyzeproject.v1.QuickFix.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.QuickFix.$Properties): sonarjs.analyzeproject.v1.QuickFix;
         * }}
         */
        QuickFix.create = function create(properties) {
          return new QuickFix(properties);
        };

        /**
         * Encodes the specified QuickFix message. Does not implicitly {@link sonarjs.analyzeproject.v1.QuickFix.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.QuickFix
         * @static
         * @param {sonarjs.analyzeproject.v1.QuickFix.$Properties} message QuickFix message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        QuickFix.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.message != null && Object.hasOwnProperty.call(message, 'message'))
            writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.message);
          if (message.edits != null && message.edits.length)
            for (let i = 0; i < message.edits.length; ++i)
              $root.sonarjs.analyzeproject.v1.QuickFixEdit.encode(
                message.edits[i],
                writer.uint32(/* id 2, wireType 2 =*/ 18).fork(),
                _depth + 1,
              ).ldelim();
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified QuickFix message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.QuickFix.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.QuickFix
         * @static
         * @param {sonarjs.analyzeproject.v1.QuickFix.$Properties} message QuickFix message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        QuickFix.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a QuickFix message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.QuickFix
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.QuickFix & sonarjs.analyzeproject.v1.QuickFix.$Shape} QuickFix
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        QuickFix.decode = function decode(reader, length, _end, _depth, _target) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.QuickFix(),
            value;
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            let wireType = tag & 7;
            switch ((tag >>>= 3)) {
              case 1: {
                if (wireType !== 2) break;
                if ((value = reader.string()).length) message.message = value;
                else delete message.message;
                continue;
              }
              case 2: {
                if (wireType !== 2) break;
                if (!(message.edits && message.edits.length)) message.edits = [];
                message.edits.push(
                  $root.sonarjs.analyzeproject.v1.QuickFixEdit.decode(
                    reader,
                    reader.uint32(),
                    undefined,
                    _depth + 1,
                  ),
                );
                continue;
              }
            }
            reader.skipType(wireType, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes a QuickFix message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.QuickFix
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.QuickFix & sonarjs.analyzeproject.v1.QuickFix.$Shape} QuickFix
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        QuickFix.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a QuickFix message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.QuickFix
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        QuickFix.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          if (message.message != null && message.hasOwnProperty('message'))
            if (!$util.isString(message.message)) return 'message: string expected';
          if (message.edits != null && message.hasOwnProperty('edits')) {
            if (!Array.isArray(message.edits)) return 'edits: array expected';
            for (let i = 0; i < message.edits.length; ++i) {
              let error = $root.sonarjs.analyzeproject.v1.QuickFixEdit.verify(
                message.edits[i],
                _depth + 1,
              );
              if (error) return 'edits.' + error;
            }
          }
          return null;
        };

        /**
         * Creates a QuickFix message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.QuickFix
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.QuickFix} QuickFix
         */
        QuickFix.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.QuickFix) return object;
          if (!$util.isObject(object))
            throw TypeError('.sonarjs.analyzeproject.v1.QuickFix: object expected');
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let message = new $root.sonarjs.analyzeproject.v1.QuickFix();
          if (object.message != null)
            if (typeof object.message !== 'string' || object.message.length)
              message.message = String(object.message);
          if (object.edits) {
            if (!Array.isArray(object.edits))
              throw TypeError('.sonarjs.analyzeproject.v1.QuickFix.edits: array expected');
            message.edits = Array(object.edits.length);
            for (let i = 0; i < object.edits.length; ++i) {
              if (!$util.isObject(object.edits[i]))
                throw TypeError('.sonarjs.analyzeproject.v1.QuickFix.edits: object expected');
              message.edits[i] = $root.sonarjs.analyzeproject.v1.QuickFixEdit.fromObject(
                object.edits[i],
                _depth + 1,
              );
            }
          }
          return message;
        };

        /**
         * Creates a plain object from a QuickFix message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.QuickFix
         * @static
         * @param {sonarjs.analyzeproject.v1.QuickFix} message QuickFix
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        QuickFix.toObject = function toObject(message, options, _depth) {
          if (!options) options = {};
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let object = {};
          if (options.arrays || options.defaults) object.edits = [];
          if (options.defaults) object.message = '';
          if (message.message != null && message.hasOwnProperty('message'))
            object.message = message.message;
          if (message.edits && message.edits.length) {
            object.edits = Array(message.edits.length);
            for (let j = 0; j < message.edits.length; ++j)
              object.edits[j] = $root.sonarjs.analyzeproject.v1.QuickFixEdit.toObject(
                message.edits[j],
                options,
                _depth + 1,
              );
          }
          return object;
        };

        /**
         * Converts this QuickFix to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.QuickFix
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        QuickFix.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for QuickFix
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.QuickFix
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        QuickFix.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.QuickFix';
        };

        return QuickFix;
      })();

      v1.QuickFixEdit = (function () {
        /**
         * Properties of a QuickFixEdit.
         * @typedef {Object} sonarjs.analyzeproject.v1.QuickFixEdit.$Properties
         * @property {string|null} [text] QuickFixEdit text
         * @property {sonarjs.analyzeproject.v1.IssueLocation.$Properties|null} [loc] QuickFixEdit loc
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of a QuickFixEdit.
         * @memberof sonarjs.analyzeproject.v1
         * @interface IQuickFixEdit
         * @augments sonarjs.analyzeproject.v1.QuickFixEdit.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.QuickFixEdit.$Properties instead.
         */

        /**
         * Shape of a QuickFixEdit.
         * @typedef {sonarjs.analyzeproject.v1.QuickFixEdit.$Properties} sonarjs.analyzeproject.v1.QuickFixEdit.$Shape
         */

        /**
         * Constructs a new QuickFixEdit.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents a QuickFixEdit.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.QuickFixEdit.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function QuickFixEdit(properties) {
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * QuickFixEdit text.
         * @member {string} text
         * @memberof sonarjs.analyzeproject.v1.QuickFixEdit
         * @instance
         */
        QuickFixEdit.prototype.text = '';

        /**
         * QuickFixEdit loc.
         * @member {sonarjs.analyzeproject.v1.IssueLocation.$Properties|null|undefined} loc
         * @memberof sonarjs.analyzeproject.v1.QuickFixEdit
         * @instance
         */
        QuickFixEdit.prototype.loc = null;

        /**
         * Creates a new QuickFixEdit instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.QuickFixEdit
         * @static
         * @param {sonarjs.analyzeproject.v1.QuickFixEdit.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.QuickFixEdit} QuickFixEdit instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.QuickFixEdit.$Shape): sonarjs.analyzeproject.v1.QuickFixEdit & sonarjs.analyzeproject.v1.QuickFixEdit.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.QuickFixEdit.$Properties): sonarjs.analyzeproject.v1.QuickFixEdit;
         * }}
         */
        QuickFixEdit.create = function create(properties) {
          return new QuickFixEdit(properties);
        };

        /**
         * Encodes the specified QuickFixEdit message. Does not implicitly {@link sonarjs.analyzeproject.v1.QuickFixEdit.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.QuickFixEdit
         * @static
         * @param {sonarjs.analyzeproject.v1.QuickFixEdit.$Properties} message QuickFixEdit message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        QuickFixEdit.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.text != null && Object.hasOwnProperty.call(message, 'text'))
            writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.text);
          if (message.loc != null && Object.hasOwnProperty.call(message, 'loc'))
            $root.sonarjs.analyzeproject.v1.IssueLocation.encode(
              message.loc,
              writer.uint32(/* id 2, wireType 2 =*/ 18).fork(),
              _depth + 1,
            ).ldelim();
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified QuickFixEdit message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.QuickFixEdit.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.QuickFixEdit
         * @static
         * @param {sonarjs.analyzeproject.v1.QuickFixEdit.$Properties} message QuickFixEdit message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        QuickFixEdit.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a QuickFixEdit message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.QuickFixEdit
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.QuickFixEdit & sonarjs.analyzeproject.v1.QuickFixEdit.$Shape} QuickFixEdit
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        QuickFixEdit.decode = function decode(reader, length, _end, _depth, _target) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.QuickFixEdit(),
            value;
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            let wireType = tag & 7;
            switch ((tag >>>= 3)) {
              case 1: {
                if (wireType !== 2) break;
                if ((value = reader.string()).length) message.text = value;
                else delete message.text;
                continue;
              }
              case 2: {
                if (wireType !== 2) break;
                message.loc = $root.sonarjs.analyzeproject.v1.IssueLocation.decode(
                  reader,
                  reader.uint32(),
                  undefined,
                  _depth + 1,
                  message.loc,
                );
                continue;
              }
            }
            reader.skipType(wireType, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes a QuickFixEdit message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.QuickFixEdit
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.QuickFixEdit & sonarjs.analyzeproject.v1.QuickFixEdit.$Shape} QuickFixEdit
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        QuickFixEdit.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a QuickFixEdit message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.QuickFixEdit
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        QuickFixEdit.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          if (message.text != null && message.hasOwnProperty('text'))
            if (!$util.isString(message.text)) return 'text: string expected';
          if (message.loc != null && message.hasOwnProperty('loc')) {
            let error = $root.sonarjs.analyzeproject.v1.IssueLocation.verify(
              message.loc,
              _depth + 1,
            );
            if (error) return 'loc.' + error;
          }
          return null;
        };

        /**
         * Creates a QuickFixEdit message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.QuickFixEdit
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.QuickFixEdit} QuickFixEdit
         */
        QuickFixEdit.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.QuickFixEdit) return object;
          if (!$util.isObject(object))
            throw TypeError('.sonarjs.analyzeproject.v1.QuickFixEdit: object expected');
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let message = new $root.sonarjs.analyzeproject.v1.QuickFixEdit();
          if (object.text != null)
            if (typeof object.text !== 'string' || object.text.length)
              message.text = String(object.text);
          if (object.loc != null) {
            if (!$util.isObject(object.loc))
              throw TypeError('.sonarjs.analyzeproject.v1.QuickFixEdit.loc: object expected');
            message.loc = $root.sonarjs.analyzeproject.v1.IssueLocation.fromObject(
              object.loc,
              _depth + 1,
            );
          }
          return message;
        };

        /**
         * Creates a plain object from a QuickFixEdit message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.QuickFixEdit
         * @static
         * @param {sonarjs.analyzeproject.v1.QuickFixEdit} message QuickFixEdit
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        QuickFixEdit.toObject = function toObject(message, options, _depth) {
          if (!options) options = {};
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let object = {};
          if (options.defaults) {
            object.text = '';
            object.loc = null;
          }
          if (message.text != null && message.hasOwnProperty('text')) object.text = message.text;
          if (message.loc != null && message.hasOwnProperty('loc'))
            object.loc = $root.sonarjs.analyzeproject.v1.IssueLocation.toObject(
              message.loc,
              options,
              _depth + 1,
            );
          return object;
        };

        /**
         * Converts this QuickFixEdit to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.QuickFixEdit
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        QuickFixEdit.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for QuickFixEdit
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.QuickFixEdit
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        QuickFixEdit.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.QuickFixEdit';
        };

        return QuickFixEdit;
      })();

      v1.IssueLocation = (function () {
        /**
         * Properties of an IssueLocation.
         * @typedef {Object} sonarjs.analyzeproject.v1.IssueLocation.$Properties
         * @property {number|null} [line] IssueLocation line
         * @property {number|null} [column] IssueLocation column
         * @property {number|null} [endLine] IssueLocation endLine
         * @property {number|null} [endColumn] IssueLocation endColumn
         * @property {string|null} [message] IssueLocation message
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of an IssueLocation.
         * @memberof sonarjs.analyzeproject.v1
         * @interface IIssueLocation
         * @augments sonarjs.analyzeproject.v1.IssueLocation.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.IssueLocation.$Properties instead.
         */

        /**
         * Shape of an IssueLocation.
         * @typedef {sonarjs.analyzeproject.v1.IssueLocation.$Properties} sonarjs.analyzeproject.v1.IssueLocation.$Shape
         */

        /**
         * Constructs a new IssueLocation.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents an IssueLocation.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.IssueLocation.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function IssueLocation(properties) {
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * IssueLocation line.
         * @member {number|null|undefined} line
         * @memberof sonarjs.analyzeproject.v1.IssueLocation
         * @instance
         */
        IssueLocation.prototype.line = null;

        /**
         * IssueLocation column.
         * @member {number|null|undefined} column
         * @memberof sonarjs.analyzeproject.v1.IssueLocation
         * @instance
         */
        IssueLocation.prototype.column = null;

        /**
         * IssueLocation endLine.
         * @member {number|null|undefined} endLine
         * @memberof sonarjs.analyzeproject.v1.IssueLocation
         * @instance
         */
        IssueLocation.prototype.endLine = null;

        /**
         * IssueLocation endColumn.
         * @member {number|null|undefined} endColumn
         * @memberof sonarjs.analyzeproject.v1.IssueLocation
         * @instance
         */
        IssueLocation.prototype.endColumn = null;

        /**
         * IssueLocation message.
         * @member {string|null|undefined} message
         * @memberof sonarjs.analyzeproject.v1.IssueLocation
         * @instance
         */
        IssueLocation.prototype.message = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(IssueLocation.prototype, '_line', {
          get: $util.oneOfGetter(($oneOfFields = ['line'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(IssueLocation.prototype, '_column', {
          get: $util.oneOfGetter(($oneOfFields = ['column'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(IssueLocation.prototype, '_endLine', {
          get: $util.oneOfGetter(($oneOfFields = ['endLine'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(IssueLocation.prototype, '_endColumn', {
          get: $util.oneOfGetter(($oneOfFields = ['endColumn'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(IssueLocation.prototype, '_message', {
          get: $util.oneOfGetter(($oneOfFields = ['message'])),
          set: $util.oneOfSetter($oneOfFields),
        });

        /**
         * Creates a new IssueLocation instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.IssueLocation
         * @static
         * @param {sonarjs.analyzeproject.v1.IssueLocation.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.IssueLocation} IssueLocation instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.IssueLocation.$Shape): sonarjs.analyzeproject.v1.IssueLocation & sonarjs.analyzeproject.v1.IssueLocation.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.IssueLocation.$Properties): sonarjs.analyzeproject.v1.IssueLocation;
         * }}
         */
        IssueLocation.create = function create(properties) {
          return new IssueLocation(properties);
        };

        /**
         * Encodes the specified IssueLocation message. Does not implicitly {@link sonarjs.analyzeproject.v1.IssueLocation.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.IssueLocation
         * @static
         * @param {sonarjs.analyzeproject.v1.IssueLocation.$Properties} message IssueLocation message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        IssueLocation.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.line != null && Object.hasOwnProperty.call(message, 'line'))
            writer.uint32(/* id 1, wireType 0 =*/ 8).int32(message.line);
          if (message.column != null && Object.hasOwnProperty.call(message, 'column'))
            writer.uint32(/* id 2, wireType 0 =*/ 16).int32(message.column);
          if (message.endLine != null && Object.hasOwnProperty.call(message, 'endLine'))
            writer.uint32(/* id 3, wireType 0 =*/ 24).int32(message.endLine);
          if (message.endColumn != null && Object.hasOwnProperty.call(message, 'endColumn'))
            writer.uint32(/* id 4, wireType 0 =*/ 32).int32(message.endColumn);
          if (message.message != null && Object.hasOwnProperty.call(message, 'message'))
            writer.uint32(/* id 5, wireType 2 =*/ 42).string(message.message);
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified IssueLocation message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.IssueLocation.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.IssueLocation
         * @static
         * @param {sonarjs.analyzeproject.v1.IssueLocation.$Properties} message IssueLocation message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        IssueLocation.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes an IssueLocation message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.IssueLocation
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.IssueLocation & sonarjs.analyzeproject.v1.IssueLocation.$Shape} IssueLocation
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        IssueLocation.decode = function decode(reader, length, _end, _depth, _target) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.IssueLocation();
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            let wireType = tag & 7;
            switch ((tag >>>= 3)) {
              case 1: {
                if (wireType !== 0) break;
                message.line = reader.int32();
                message._line = 'line';
                continue;
              }
              case 2: {
                if (wireType !== 0) break;
                message.column = reader.int32();
                message._column = 'column';
                continue;
              }
              case 3: {
                if (wireType !== 0) break;
                message.endLine = reader.int32();
                message._endLine = 'endLine';
                continue;
              }
              case 4: {
                if (wireType !== 0) break;
                message.endColumn = reader.int32();
                message._endColumn = 'endColumn';
                continue;
              }
              case 5: {
                if (wireType !== 2) break;
                message.message = reader.string();
                message._message = 'message';
                continue;
              }
            }
            reader.skipType(wireType, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes an IssueLocation message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.IssueLocation
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.IssueLocation & sonarjs.analyzeproject.v1.IssueLocation.$Shape} IssueLocation
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        IssueLocation.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an IssueLocation message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.IssueLocation
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        IssueLocation.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          let properties = {};
          if (message.line != null && message.hasOwnProperty('line')) {
            properties._line = 1;
            if (!$util.isInteger(message.line)) return 'line: integer expected';
          }
          if (message.column != null && message.hasOwnProperty('column')) {
            properties._column = 1;
            if (!$util.isInteger(message.column)) return 'column: integer expected';
          }
          if (message.endLine != null && message.hasOwnProperty('endLine')) {
            properties._endLine = 1;
            if (!$util.isInteger(message.endLine)) return 'endLine: integer expected';
          }
          if (message.endColumn != null && message.hasOwnProperty('endColumn')) {
            properties._endColumn = 1;
            if (!$util.isInteger(message.endColumn)) return 'endColumn: integer expected';
          }
          if (message.message != null && message.hasOwnProperty('message')) {
            properties._message = 1;
            if (!$util.isString(message.message)) return 'message: string expected';
          }
          return null;
        };

        /**
         * Creates an IssueLocation message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.IssueLocation
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.IssueLocation} IssueLocation
         */
        IssueLocation.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.IssueLocation) return object;
          if (!$util.isObject(object))
            throw TypeError('.sonarjs.analyzeproject.v1.IssueLocation: object expected');
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let message = new $root.sonarjs.analyzeproject.v1.IssueLocation();
          if (object.line != null) message.line = object.line | 0;
          if (object.column != null) message.column = object.column | 0;
          if (object.endLine != null) message.endLine = object.endLine | 0;
          if (object.endColumn != null) message.endColumn = object.endColumn | 0;
          if (object.message != null) message.message = String(object.message);
          return message;
        };

        /**
         * Creates a plain object from an IssueLocation message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.IssueLocation
         * @static
         * @param {sonarjs.analyzeproject.v1.IssueLocation} message IssueLocation
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        IssueLocation.toObject = function toObject(message, options, _depth) {
          if (!options) options = {};
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let object = {};
          if (message.line != null && message.hasOwnProperty('line')) object.line = message.line;
          if (message.column != null && message.hasOwnProperty('column'))
            object.column = message.column;
          if (message.endLine != null && message.hasOwnProperty('endLine'))
            object.endLine = message.endLine;
          if (message.endColumn != null && message.hasOwnProperty('endColumn'))
            object.endColumn = message.endColumn;
          if (message.message != null && message.hasOwnProperty('message'))
            object.message = message.message;
          return object;
        };

        /**
         * Converts this IssueLocation to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.IssueLocation
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        IssueLocation.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for IssueLocation
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.IssueLocation
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        IssueLocation.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.IssueLocation';
        };

        return IssueLocation;
      })();

      v1.Location = (function () {
        /**
         * Properties of a Location.
         * @typedef {Object} sonarjs.analyzeproject.v1.Location.$Properties
         * @property {number|null} [startLine] Location startLine
         * @property {number|null} [startCol] Location startCol
         * @property {number|null} [endLine] Location endLine
         * @property {number|null} [endCol] Location endCol
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of a Location.
         * @memberof sonarjs.analyzeproject.v1
         * @interface ILocation
         * @augments sonarjs.analyzeproject.v1.Location.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.Location.$Properties instead.
         */

        /**
         * Shape of a Location.
         * @typedef {sonarjs.analyzeproject.v1.Location.$Properties} sonarjs.analyzeproject.v1.Location.$Shape
         */

        /**
         * Constructs a new Location.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents a Location.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.Location.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function Location(properties) {
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * Location startLine.
         * @member {number} startLine
         * @memberof sonarjs.analyzeproject.v1.Location
         * @instance
         */
        Location.prototype.startLine = 0;

        /**
         * Location startCol.
         * @member {number} startCol
         * @memberof sonarjs.analyzeproject.v1.Location
         * @instance
         */
        Location.prototype.startCol = 0;

        /**
         * Location endLine.
         * @member {number} endLine
         * @memberof sonarjs.analyzeproject.v1.Location
         * @instance
         */
        Location.prototype.endLine = 0;

        /**
         * Location endCol.
         * @member {number} endCol
         * @memberof sonarjs.analyzeproject.v1.Location
         * @instance
         */
        Location.prototype.endCol = 0;

        /**
         * Creates a new Location instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.Location
         * @static
         * @param {sonarjs.analyzeproject.v1.Location.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.Location} Location instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.Location.$Shape): sonarjs.analyzeproject.v1.Location & sonarjs.analyzeproject.v1.Location.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.Location.$Properties): sonarjs.analyzeproject.v1.Location;
         * }}
         */
        Location.create = function create(properties) {
          return new Location(properties);
        };

        /**
         * Encodes the specified Location message. Does not implicitly {@link sonarjs.analyzeproject.v1.Location.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.Location
         * @static
         * @param {sonarjs.analyzeproject.v1.Location.$Properties} message Location message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Location.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.startLine != null && Object.hasOwnProperty.call(message, 'startLine'))
            writer.uint32(/* id 1, wireType 0 =*/ 8).int32(message.startLine);
          if (message.startCol != null && Object.hasOwnProperty.call(message, 'startCol'))
            writer.uint32(/* id 2, wireType 0 =*/ 16).int32(message.startCol);
          if (message.endLine != null && Object.hasOwnProperty.call(message, 'endLine'))
            writer.uint32(/* id 3, wireType 0 =*/ 24).int32(message.endLine);
          if (message.endCol != null && Object.hasOwnProperty.call(message, 'endCol'))
            writer.uint32(/* id 4, wireType 0 =*/ 32).int32(message.endCol);
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified Location message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.Location.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.Location
         * @static
         * @param {sonarjs.analyzeproject.v1.Location.$Properties} message Location message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Location.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a Location message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.Location
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.Location & sonarjs.analyzeproject.v1.Location.$Shape} Location
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Location.decode = function decode(reader, length, _end, _depth, _target) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.Location(),
            value;
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            let wireType = tag & 7;
            switch ((tag >>>= 3)) {
              case 1: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.startLine = value;
                else delete message.startLine;
                continue;
              }
              case 2: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.startCol = value;
                else delete message.startCol;
                continue;
              }
              case 3: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.endLine = value;
                else delete message.endLine;
                continue;
              }
              case 4: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.endCol = value;
                else delete message.endCol;
                continue;
              }
            }
            reader.skipType(wireType, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes a Location message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.Location
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.Location & sonarjs.analyzeproject.v1.Location.$Shape} Location
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Location.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Location message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.Location
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Location.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          if (message.startLine != null && message.hasOwnProperty('startLine'))
            if (!$util.isInteger(message.startLine)) return 'startLine: integer expected';
          if (message.startCol != null && message.hasOwnProperty('startCol'))
            if (!$util.isInteger(message.startCol)) return 'startCol: integer expected';
          if (message.endLine != null && message.hasOwnProperty('endLine'))
            if (!$util.isInteger(message.endLine)) return 'endLine: integer expected';
          if (message.endCol != null && message.hasOwnProperty('endCol'))
            if (!$util.isInteger(message.endCol)) return 'endCol: integer expected';
          return null;
        };

        /**
         * Creates a Location message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.Location
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.Location} Location
         */
        Location.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.Location) return object;
          if (!$util.isObject(object))
            throw TypeError('.sonarjs.analyzeproject.v1.Location: object expected');
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let message = new $root.sonarjs.analyzeproject.v1.Location();
          if (object.startLine != null)
            if (Number(object.startLine) !== 0) message.startLine = object.startLine | 0;
          if (object.startCol != null)
            if (Number(object.startCol) !== 0) message.startCol = object.startCol | 0;
          if (object.endLine != null)
            if (Number(object.endLine) !== 0) message.endLine = object.endLine | 0;
          if (object.endCol != null)
            if (Number(object.endCol) !== 0) message.endCol = object.endCol | 0;
          return message;
        };

        /**
         * Creates a plain object from a Location message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.Location
         * @static
         * @param {sonarjs.analyzeproject.v1.Location} message Location
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Location.toObject = function toObject(message, options, _depth) {
          if (!options) options = {};
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let object = {};
          if (options.defaults) {
            object.startLine = 0;
            object.startCol = 0;
            object.endLine = 0;
            object.endCol = 0;
          }
          if (message.startLine != null && message.hasOwnProperty('startLine'))
            object.startLine = message.startLine;
          if (message.startCol != null && message.hasOwnProperty('startCol'))
            object.startCol = message.startCol;
          if (message.endLine != null && message.hasOwnProperty('endLine'))
            object.endLine = message.endLine;
          if (message.endCol != null && message.hasOwnProperty('endCol'))
            object.endCol = message.endCol;
          return object;
        };

        /**
         * Converts this Location to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.Location
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Location.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for Location
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.Location
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        Location.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.Location';
        };

        return Location;
      })();

      v1.Highlight = (function () {
        /**
         * Properties of a Highlight.
         * @typedef {Object} sonarjs.analyzeproject.v1.Highlight.$Properties
         * @property {sonarjs.analyzeproject.v1.Location.$Properties|null} [location] Highlight location
         * @property {sonarjs.analyzeproject.v1.TextType|null} [textType] Highlight textType
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of a Highlight.
         * @memberof sonarjs.analyzeproject.v1
         * @interface IHighlight
         * @augments sonarjs.analyzeproject.v1.Highlight.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.Highlight.$Properties instead.
         */

        /**
         * Shape of a Highlight.
         * @typedef {sonarjs.analyzeproject.v1.Highlight.$Properties} sonarjs.analyzeproject.v1.Highlight.$Shape
         */

        /**
         * Constructs a new Highlight.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents a Highlight.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.Highlight.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function Highlight(properties) {
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * Highlight location.
         * @member {sonarjs.analyzeproject.v1.Location.$Properties|null|undefined} location
         * @memberof sonarjs.analyzeproject.v1.Highlight
         * @instance
         */
        Highlight.prototype.location = null;

        /**
         * Highlight textType.
         * @member {sonarjs.analyzeproject.v1.TextType} textType
         * @memberof sonarjs.analyzeproject.v1.Highlight
         * @instance
         */
        Highlight.prototype.textType = 0;

        /**
         * Creates a new Highlight instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.Highlight
         * @static
         * @param {sonarjs.analyzeproject.v1.Highlight.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.Highlight} Highlight instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.Highlight.$Shape): sonarjs.analyzeproject.v1.Highlight & sonarjs.analyzeproject.v1.Highlight.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.Highlight.$Properties): sonarjs.analyzeproject.v1.Highlight;
         * }}
         */
        Highlight.create = function create(properties) {
          return new Highlight(properties);
        };

        /**
         * Encodes the specified Highlight message. Does not implicitly {@link sonarjs.analyzeproject.v1.Highlight.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.Highlight
         * @static
         * @param {sonarjs.analyzeproject.v1.Highlight.$Properties} message Highlight message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Highlight.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.location != null && Object.hasOwnProperty.call(message, 'location'))
            $root.sonarjs.analyzeproject.v1.Location.encode(
              message.location,
              writer.uint32(/* id 1, wireType 2 =*/ 10).fork(),
              _depth + 1,
            ).ldelim();
          if (message.textType != null && Object.hasOwnProperty.call(message, 'textType'))
            writer.uint32(/* id 2, wireType 0 =*/ 16).int32(message.textType);
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified Highlight message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.Highlight.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.Highlight
         * @static
         * @param {sonarjs.analyzeproject.v1.Highlight.$Properties} message Highlight message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Highlight.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a Highlight message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.Highlight
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.Highlight & sonarjs.analyzeproject.v1.Highlight.$Shape} Highlight
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Highlight.decode = function decode(reader, length, _end, _depth, _target) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.Highlight(),
            value;
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            let wireType = tag & 7;
            switch ((tag >>>= 3)) {
              case 1: {
                if (wireType !== 2) break;
                message.location = $root.sonarjs.analyzeproject.v1.Location.decode(
                  reader,
                  reader.uint32(),
                  undefined,
                  _depth + 1,
                  message.location,
                );
                continue;
              }
              case 2: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.textType = value;
                else delete message.textType;
                continue;
              }
            }
            reader.skipType(wireType, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes a Highlight message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.Highlight
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.Highlight & sonarjs.analyzeproject.v1.Highlight.$Shape} Highlight
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Highlight.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Highlight message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.Highlight
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Highlight.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          if (message.location != null && message.hasOwnProperty('location')) {
            let error = $root.sonarjs.analyzeproject.v1.Location.verify(
              message.location,
              _depth + 1,
            );
            if (error) return 'location.' + error;
          }
          if (message.textType != null && message.hasOwnProperty('textType'))
            switch (message.textType) {
              default:
                return 'textType: enum value expected';
              case 0:
              case 1:
              case 2:
              case 3:
              case 4:
              case 5:
                break;
            }
          return null;
        };

        /**
         * Creates a Highlight message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.Highlight
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.Highlight} Highlight
         */
        Highlight.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.Highlight) return object;
          if (!$util.isObject(object))
            throw TypeError('.sonarjs.analyzeproject.v1.Highlight: object expected');
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let message = new $root.sonarjs.analyzeproject.v1.Highlight();
          if (object.location != null) {
            if (!$util.isObject(object.location))
              throw TypeError('.sonarjs.analyzeproject.v1.Highlight.location: object expected');
            message.location = $root.sonarjs.analyzeproject.v1.Location.fromObject(
              object.location,
              _depth + 1,
            );
          }
          if (
            object.textType !== 0 &&
            (typeof object.textType !== 'string' ||
              $root.sonarjs.analyzeproject.v1.TextType[object.textType] !== 0)
          )
            switch (object.textType) {
              default:
                if (typeof object.textType === 'number') {
                  message.textType = object.textType;
                  break;
                }
                break;
              case 'TEXT_TYPE_UNSPECIFIED':
              case 0:
                message.textType = 0;
                break;
              case 'TEXT_TYPE_CONSTANT':
              case 1:
                message.textType = 1;
                break;
              case 'TEXT_TYPE_COMMENT':
              case 2:
                message.textType = 2;
                break;
              case 'TEXT_TYPE_STRUCTURED_COMMENT':
              case 3:
                message.textType = 3;
                break;
              case 'TEXT_TYPE_KEYWORD':
              case 4:
                message.textType = 4;
                break;
              case 'TEXT_TYPE_STRING':
              case 5:
                message.textType = 5;
                break;
            }
          return message;
        };

        /**
         * Creates a plain object from a Highlight message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.Highlight
         * @static
         * @param {sonarjs.analyzeproject.v1.Highlight} message Highlight
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Highlight.toObject = function toObject(message, options, _depth) {
          if (!options) options = {};
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let object = {};
          if (options.defaults) {
            object.location = null;
            object.textType = options.enums === String ? 'TEXT_TYPE_UNSPECIFIED' : 0;
          }
          if (message.location != null && message.hasOwnProperty('location'))
            object.location = $root.sonarjs.analyzeproject.v1.Location.toObject(
              message.location,
              options,
              _depth + 1,
            );
          if (message.textType != null && message.hasOwnProperty('textType'))
            object.textType =
              options.enums === String
                ? $root.sonarjs.analyzeproject.v1.TextType[message.textType] === undefined
                  ? message.textType
                  : $root.sonarjs.analyzeproject.v1.TextType[message.textType]
                : message.textType;
          return object;
        };

        /**
         * Converts this Highlight to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.Highlight
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Highlight.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for Highlight
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.Highlight
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        Highlight.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.Highlight';
        };

        return Highlight;
      })();

      v1.HighlightedSymbol = (function () {
        /**
         * Properties of a HighlightedSymbol.
         * @typedef {Object} sonarjs.analyzeproject.v1.HighlightedSymbol.$Properties
         * @property {sonarjs.analyzeproject.v1.Location.$Properties|null} [declaration] HighlightedSymbol declaration
         * @property {Array.<sonarjs.analyzeproject.v1.Location.$Properties>|null} [references] HighlightedSymbol references
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of a HighlightedSymbol.
         * @memberof sonarjs.analyzeproject.v1
         * @interface IHighlightedSymbol
         * @augments sonarjs.analyzeproject.v1.HighlightedSymbol.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.HighlightedSymbol.$Properties instead.
         */

        /**
         * Shape of a HighlightedSymbol.
         * @typedef {sonarjs.analyzeproject.v1.HighlightedSymbol.$Properties} sonarjs.analyzeproject.v1.HighlightedSymbol.$Shape
         */

        /**
         * Constructs a new HighlightedSymbol.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents a HighlightedSymbol.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.HighlightedSymbol.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function HighlightedSymbol(properties) {
          this.references = [];
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * HighlightedSymbol declaration.
         * @member {sonarjs.analyzeproject.v1.Location.$Properties|null|undefined} declaration
         * @memberof sonarjs.analyzeproject.v1.HighlightedSymbol
         * @instance
         */
        HighlightedSymbol.prototype.declaration = null;

        /**
         * HighlightedSymbol references.
         * @member {Array.<sonarjs.analyzeproject.v1.Location.$Properties>} references
         * @memberof sonarjs.analyzeproject.v1.HighlightedSymbol
         * @instance
         */
        HighlightedSymbol.prototype.references = $util.emptyArray;

        /**
         * Creates a new HighlightedSymbol instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.HighlightedSymbol
         * @static
         * @param {sonarjs.analyzeproject.v1.HighlightedSymbol.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.HighlightedSymbol} HighlightedSymbol instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.HighlightedSymbol.$Shape): sonarjs.analyzeproject.v1.HighlightedSymbol & sonarjs.analyzeproject.v1.HighlightedSymbol.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.HighlightedSymbol.$Properties): sonarjs.analyzeproject.v1.HighlightedSymbol;
         * }}
         */
        HighlightedSymbol.create = function create(properties) {
          return new HighlightedSymbol(properties);
        };

        /**
         * Encodes the specified HighlightedSymbol message. Does not implicitly {@link sonarjs.analyzeproject.v1.HighlightedSymbol.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.HighlightedSymbol
         * @static
         * @param {sonarjs.analyzeproject.v1.HighlightedSymbol.$Properties} message HighlightedSymbol message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HighlightedSymbol.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.declaration != null && Object.hasOwnProperty.call(message, 'declaration'))
            $root.sonarjs.analyzeproject.v1.Location.encode(
              message.declaration,
              writer.uint32(/* id 1, wireType 2 =*/ 10).fork(),
              _depth + 1,
            ).ldelim();
          if (message.references != null && message.references.length)
            for (let i = 0; i < message.references.length; ++i)
              $root.sonarjs.analyzeproject.v1.Location.encode(
                message.references[i],
                writer.uint32(/* id 2, wireType 2 =*/ 18).fork(),
                _depth + 1,
              ).ldelim();
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified HighlightedSymbol message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.HighlightedSymbol.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.HighlightedSymbol
         * @static
         * @param {sonarjs.analyzeproject.v1.HighlightedSymbol.$Properties} message HighlightedSymbol message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HighlightedSymbol.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a HighlightedSymbol message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.HighlightedSymbol
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.HighlightedSymbol & sonarjs.analyzeproject.v1.HighlightedSymbol.$Shape} HighlightedSymbol
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HighlightedSymbol.decode = function decode(reader, length, _end, _depth, _target) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.HighlightedSymbol(),
            value;
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            let wireType = tag & 7;
            switch ((tag >>>= 3)) {
              case 1: {
                if (wireType !== 2) break;
                message.declaration = $root.sonarjs.analyzeproject.v1.Location.decode(
                  reader,
                  reader.uint32(),
                  undefined,
                  _depth + 1,
                  message.declaration,
                );
                continue;
              }
              case 2: {
                if (wireType !== 2) break;
                if (!(message.references && message.references.length)) message.references = [];
                message.references.push(
                  $root.sonarjs.analyzeproject.v1.Location.decode(
                    reader,
                    reader.uint32(),
                    undefined,
                    _depth + 1,
                  ),
                );
                continue;
              }
            }
            reader.skipType(wireType, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes a HighlightedSymbol message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.HighlightedSymbol
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.HighlightedSymbol & sonarjs.analyzeproject.v1.HighlightedSymbol.$Shape} HighlightedSymbol
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HighlightedSymbol.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a HighlightedSymbol message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.HighlightedSymbol
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        HighlightedSymbol.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          if (message.declaration != null && message.hasOwnProperty('declaration')) {
            let error = $root.sonarjs.analyzeproject.v1.Location.verify(
              message.declaration,
              _depth + 1,
            );
            if (error) return 'declaration.' + error;
          }
          if (message.references != null && message.hasOwnProperty('references')) {
            if (!Array.isArray(message.references)) return 'references: array expected';
            for (let i = 0; i < message.references.length; ++i) {
              let error = $root.sonarjs.analyzeproject.v1.Location.verify(
                message.references[i],
                _depth + 1,
              );
              if (error) return 'references.' + error;
            }
          }
          return null;
        };

        /**
         * Creates a HighlightedSymbol message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.HighlightedSymbol
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.HighlightedSymbol} HighlightedSymbol
         */
        HighlightedSymbol.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.HighlightedSymbol) return object;
          if (!$util.isObject(object))
            throw TypeError('.sonarjs.analyzeproject.v1.HighlightedSymbol: object expected');
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let message = new $root.sonarjs.analyzeproject.v1.HighlightedSymbol();
          if (object.declaration != null) {
            if (!$util.isObject(object.declaration))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.HighlightedSymbol.declaration: object expected',
              );
            message.declaration = $root.sonarjs.analyzeproject.v1.Location.fromObject(
              object.declaration,
              _depth + 1,
            );
          }
          if (object.references) {
            if (!Array.isArray(object.references))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.HighlightedSymbol.references: array expected',
              );
            message.references = Array(object.references.length);
            for (let i = 0; i < object.references.length; ++i) {
              if (!$util.isObject(object.references[i]))
                throw TypeError(
                  '.sonarjs.analyzeproject.v1.HighlightedSymbol.references: object expected',
                );
              message.references[i] = $root.sonarjs.analyzeproject.v1.Location.fromObject(
                object.references[i],
                _depth + 1,
              );
            }
          }
          return message;
        };

        /**
         * Creates a plain object from a HighlightedSymbol message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.HighlightedSymbol
         * @static
         * @param {sonarjs.analyzeproject.v1.HighlightedSymbol} message HighlightedSymbol
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        HighlightedSymbol.toObject = function toObject(message, options, _depth) {
          if (!options) options = {};
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let object = {};
          if (options.arrays || options.defaults) object.references = [];
          if (options.defaults) object.declaration = null;
          if (message.declaration != null && message.hasOwnProperty('declaration'))
            object.declaration = $root.sonarjs.analyzeproject.v1.Location.toObject(
              message.declaration,
              options,
              _depth + 1,
            );
          if (message.references && message.references.length) {
            object.references = Array(message.references.length);
            for (let j = 0; j < message.references.length; ++j)
              object.references[j] = $root.sonarjs.analyzeproject.v1.Location.toObject(
                message.references[j],
                options,
                _depth + 1,
              );
          }
          return object;
        };

        /**
         * Converts this HighlightedSymbol to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.HighlightedSymbol
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        HighlightedSymbol.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for HighlightedSymbol
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.HighlightedSymbol
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        HighlightedSymbol.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.HighlightedSymbol';
        };

        return HighlightedSymbol;
      })();

      v1.Metrics = (function () {
        /**
         * Properties of a Metrics.
         * @typedef {Object} sonarjs.analyzeproject.v1.Metrics.$Properties
         * @property {Array.<number>|null} [ncloc] Metrics ncloc
         * @property {Array.<number>|null} [commentLines] Metrics commentLines
         * @property {Array.<number>|null} [nosonarLines] Metrics nosonarLines
         * @property {Array.<number>|null} [executableLines] Metrics executableLines
         * @property {number|null} [functions] Metrics functions
         * @property {number|null} [statements] Metrics statements
         * @property {number|null} [classes] Metrics classes
         * @property {number|null} [complexity] Metrics complexity
         * @property {number|null} [cognitiveComplexity] Metrics cognitiveComplexity
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of a Metrics.
         * @memberof sonarjs.analyzeproject.v1
         * @interface IMetrics
         * @augments sonarjs.analyzeproject.v1.Metrics.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.Metrics.$Properties instead.
         */

        /**
         * Shape of a Metrics.
         * @typedef {sonarjs.analyzeproject.v1.Metrics.$Properties} sonarjs.analyzeproject.v1.Metrics.$Shape
         */

        /**
         * Constructs a new Metrics.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents a Metrics.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.Metrics.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function Metrics(properties) {
          this.ncloc = [];
          this.commentLines = [];
          this.nosonarLines = [];
          this.executableLines = [];
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * Metrics ncloc.
         * @member {Array.<number>} ncloc
         * @memberof sonarjs.analyzeproject.v1.Metrics
         * @instance
         */
        Metrics.prototype.ncloc = $util.emptyArray;

        /**
         * Metrics commentLines.
         * @member {Array.<number>} commentLines
         * @memberof sonarjs.analyzeproject.v1.Metrics
         * @instance
         */
        Metrics.prototype.commentLines = $util.emptyArray;

        /**
         * Metrics nosonarLines.
         * @member {Array.<number>} nosonarLines
         * @memberof sonarjs.analyzeproject.v1.Metrics
         * @instance
         */
        Metrics.prototype.nosonarLines = $util.emptyArray;

        /**
         * Metrics executableLines.
         * @member {Array.<number>} executableLines
         * @memberof sonarjs.analyzeproject.v1.Metrics
         * @instance
         */
        Metrics.prototype.executableLines = $util.emptyArray;

        /**
         * Metrics functions.
         * @member {number} functions
         * @memberof sonarjs.analyzeproject.v1.Metrics
         * @instance
         */
        Metrics.prototype.functions = 0;

        /**
         * Metrics statements.
         * @member {number} statements
         * @memberof sonarjs.analyzeproject.v1.Metrics
         * @instance
         */
        Metrics.prototype.statements = 0;

        /**
         * Metrics classes.
         * @member {number} classes
         * @memberof sonarjs.analyzeproject.v1.Metrics
         * @instance
         */
        Metrics.prototype.classes = 0;

        /**
         * Metrics complexity.
         * @member {number} complexity
         * @memberof sonarjs.analyzeproject.v1.Metrics
         * @instance
         */
        Metrics.prototype.complexity = 0;

        /**
         * Metrics cognitiveComplexity.
         * @member {number} cognitiveComplexity
         * @memberof sonarjs.analyzeproject.v1.Metrics
         * @instance
         */
        Metrics.prototype.cognitiveComplexity = 0;

        /**
         * Creates a new Metrics instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.Metrics
         * @static
         * @param {sonarjs.analyzeproject.v1.Metrics.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.Metrics} Metrics instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.Metrics.$Shape): sonarjs.analyzeproject.v1.Metrics & sonarjs.analyzeproject.v1.Metrics.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.Metrics.$Properties): sonarjs.analyzeproject.v1.Metrics;
         * }}
         */
        Metrics.create = function create(properties) {
          return new Metrics(properties);
        };

        /**
         * Encodes the specified Metrics message. Does not implicitly {@link sonarjs.analyzeproject.v1.Metrics.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.Metrics
         * @static
         * @param {sonarjs.analyzeproject.v1.Metrics.$Properties} message Metrics message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Metrics.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.ncloc != null && message.ncloc.length) {
            writer.uint32(/* id 1, wireType 2 =*/ 10).fork();
            for (let i = 0; i < message.ncloc.length; ++i) writer.int32(message.ncloc[i]);
            writer.ldelim();
          }
          if (message.commentLines != null && message.commentLines.length) {
            writer.uint32(/* id 2, wireType 2 =*/ 18).fork();
            for (let i = 0; i < message.commentLines.length; ++i)
              writer.int32(message.commentLines[i]);
            writer.ldelim();
          }
          if (message.nosonarLines != null && message.nosonarLines.length) {
            writer.uint32(/* id 3, wireType 2 =*/ 26).fork();
            for (let i = 0; i < message.nosonarLines.length; ++i)
              writer.int32(message.nosonarLines[i]);
            writer.ldelim();
          }
          if (message.executableLines != null && message.executableLines.length) {
            writer.uint32(/* id 4, wireType 2 =*/ 34).fork();
            for (let i = 0; i < message.executableLines.length; ++i)
              writer.int32(message.executableLines[i]);
            writer.ldelim();
          }
          if (message.functions != null && Object.hasOwnProperty.call(message, 'functions'))
            writer.uint32(/* id 5, wireType 0 =*/ 40).int32(message.functions);
          if (message.statements != null && Object.hasOwnProperty.call(message, 'statements'))
            writer.uint32(/* id 6, wireType 0 =*/ 48).int32(message.statements);
          if (message.classes != null && Object.hasOwnProperty.call(message, 'classes'))
            writer.uint32(/* id 7, wireType 0 =*/ 56).int32(message.classes);
          if (message.complexity != null && Object.hasOwnProperty.call(message, 'complexity'))
            writer.uint32(/* id 8, wireType 0 =*/ 64).int32(message.complexity);
          if (
            message.cognitiveComplexity != null &&
            Object.hasOwnProperty.call(message, 'cognitiveComplexity')
          )
            writer.uint32(/* id 9, wireType 0 =*/ 72).int32(message.cognitiveComplexity);
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified Metrics message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.Metrics.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.Metrics
         * @static
         * @param {sonarjs.analyzeproject.v1.Metrics.$Properties} message Metrics message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Metrics.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a Metrics message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.Metrics
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.Metrics & sonarjs.analyzeproject.v1.Metrics.$Shape} Metrics
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Metrics.decode = function decode(reader, length, _end, _depth, _target) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.Metrics(),
            value;
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            let wireType = tag & 7;
            switch ((tag >>>= 3)) {
              case 1: {
                if (wireType === 2) {
                  if (!(message.ncloc && message.ncloc.length)) message.ncloc = [];
                  let end2 = reader.uint32() + reader.pos;
                  while (reader.pos < end2) message.ncloc.push(reader.int32());
                  continue;
                }
                if (wireType !== 0) break;
                if (!(message.ncloc && message.ncloc.length)) message.ncloc = [];
                message.ncloc.push(reader.int32());
                continue;
              }
              case 2: {
                if (wireType === 2) {
                  if (!(message.commentLines && message.commentLines.length))
                    message.commentLines = [];
                  let end2 = reader.uint32() + reader.pos;
                  while (reader.pos < end2) message.commentLines.push(reader.int32());
                  continue;
                }
                if (wireType !== 0) break;
                if (!(message.commentLines && message.commentLines.length))
                  message.commentLines = [];
                message.commentLines.push(reader.int32());
                continue;
              }
              case 3: {
                if (wireType === 2) {
                  if (!(message.nosonarLines && message.nosonarLines.length))
                    message.nosonarLines = [];
                  let end2 = reader.uint32() + reader.pos;
                  while (reader.pos < end2) message.nosonarLines.push(reader.int32());
                  continue;
                }
                if (wireType !== 0) break;
                if (!(message.nosonarLines && message.nosonarLines.length))
                  message.nosonarLines = [];
                message.nosonarLines.push(reader.int32());
                continue;
              }
              case 4: {
                if (wireType === 2) {
                  if (!(message.executableLines && message.executableLines.length))
                    message.executableLines = [];
                  let end2 = reader.uint32() + reader.pos;
                  while (reader.pos < end2) message.executableLines.push(reader.int32());
                  continue;
                }
                if (wireType !== 0) break;
                if (!(message.executableLines && message.executableLines.length))
                  message.executableLines = [];
                message.executableLines.push(reader.int32());
                continue;
              }
              case 5: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.functions = value;
                else delete message.functions;
                continue;
              }
              case 6: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.statements = value;
                else delete message.statements;
                continue;
              }
              case 7: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.classes = value;
                else delete message.classes;
                continue;
              }
              case 8: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.complexity = value;
                else delete message.complexity;
                continue;
              }
              case 9: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.cognitiveComplexity = value;
                else delete message.cognitiveComplexity;
                continue;
              }
            }
            reader.skipType(wireType, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes a Metrics message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.Metrics
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.Metrics & sonarjs.analyzeproject.v1.Metrics.$Shape} Metrics
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Metrics.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Metrics message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.Metrics
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Metrics.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          if (message.ncloc != null && message.hasOwnProperty('ncloc')) {
            if (!Array.isArray(message.ncloc)) return 'ncloc: array expected';
            for (let i = 0; i < message.ncloc.length; ++i)
              if (!$util.isInteger(message.ncloc[i])) return 'ncloc: integer[] expected';
          }
          if (message.commentLines != null && message.hasOwnProperty('commentLines')) {
            if (!Array.isArray(message.commentLines)) return 'commentLines: array expected';
            for (let i = 0; i < message.commentLines.length; ++i)
              if (!$util.isInteger(message.commentLines[i]))
                return 'commentLines: integer[] expected';
          }
          if (message.nosonarLines != null && message.hasOwnProperty('nosonarLines')) {
            if (!Array.isArray(message.nosonarLines)) return 'nosonarLines: array expected';
            for (let i = 0; i < message.nosonarLines.length; ++i)
              if (!$util.isInteger(message.nosonarLines[i]))
                return 'nosonarLines: integer[] expected';
          }
          if (message.executableLines != null && message.hasOwnProperty('executableLines')) {
            if (!Array.isArray(message.executableLines)) return 'executableLines: array expected';
            for (let i = 0; i < message.executableLines.length; ++i)
              if (!$util.isInteger(message.executableLines[i]))
                return 'executableLines: integer[] expected';
          }
          if (message.functions != null && message.hasOwnProperty('functions'))
            if (!$util.isInteger(message.functions)) return 'functions: integer expected';
          if (message.statements != null && message.hasOwnProperty('statements'))
            if (!$util.isInteger(message.statements)) return 'statements: integer expected';
          if (message.classes != null && message.hasOwnProperty('classes'))
            if (!$util.isInteger(message.classes)) return 'classes: integer expected';
          if (message.complexity != null && message.hasOwnProperty('complexity'))
            if (!$util.isInteger(message.complexity)) return 'complexity: integer expected';
          if (message.cognitiveComplexity != null && message.hasOwnProperty('cognitiveComplexity'))
            if (!$util.isInteger(message.cognitiveComplexity))
              return 'cognitiveComplexity: integer expected';
          return null;
        };

        /**
         * Creates a Metrics message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.Metrics
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.Metrics} Metrics
         */
        Metrics.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.Metrics) return object;
          if (!$util.isObject(object))
            throw TypeError('.sonarjs.analyzeproject.v1.Metrics: object expected');
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let message = new $root.sonarjs.analyzeproject.v1.Metrics();
          if (object.ncloc) {
            if (!Array.isArray(object.ncloc))
              throw TypeError('.sonarjs.analyzeproject.v1.Metrics.ncloc: array expected');
            message.ncloc = Array(object.ncloc.length);
            for (let i = 0; i < object.ncloc.length; ++i) message.ncloc[i] = object.ncloc[i] | 0;
          }
          if (object.commentLines) {
            if (!Array.isArray(object.commentLines))
              throw TypeError('.sonarjs.analyzeproject.v1.Metrics.commentLines: array expected');
            message.commentLines = Array(object.commentLines.length);
            for (let i = 0; i < object.commentLines.length; ++i)
              message.commentLines[i] = object.commentLines[i] | 0;
          }
          if (object.nosonarLines) {
            if (!Array.isArray(object.nosonarLines))
              throw TypeError('.sonarjs.analyzeproject.v1.Metrics.nosonarLines: array expected');
            message.nosonarLines = Array(object.nosonarLines.length);
            for (let i = 0; i < object.nosonarLines.length; ++i)
              message.nosonarLines[i] = object.nosonarLines[i] | 0;
          }
          if (object.executableLines) {
            if (!Array.isArray(object.executableLines))
              throw TypeError('.sonarjs.analyzeproject.v1.Metrics.executableLines: array expected');
            message.executableLines = Array(object.executableLines.length);
            for (let i = 0; i < object.executableLines.length; ++i)
              message.executableLines[i] = object.executableLines[i] | 0;
          }
          if (object.functions != null)
            if (Number(object.functions) !== 0) message.functions = object.functions | 0;
          if (object.statements != null)
            if (Number(object.statements) !== 0) message.statements = object.statements | 0;
          if (object.classes != null)
            if (Number(object.classes) !== 0) message.classes = object.classes | 0;
          if (object.complexity != null)
            if (Number(object.complexity) !== 0) message.complexity = object.complexity | 0;
          if (object.cognitiveComplexity != null)
            if (Number(object.cognitiveComplexity) !== 0)
              message.cognitiveComplexity = object.cognitiveComplexity | 0;
          return message;
        };

        /**
         * Creates a plain object from a Metrics message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.Metrics
         * @static
         * @param {sonarjs.analyzeproject.v1.Metrics} message Metrics
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Metrics.toObject = function toObject(message, options, _depth) {
          if (!options) options = {};
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let object = {};
          if (options.arrays || options.defaults) {
            object.ncloc = [];
            object.commentLines = [];
            object.nosonarLines = [];
            object.executableLines = [];
          }
          if (options.defaults) {
            object.functions = 0;
            object.statements = 0;
            object.classes = 0;
            object.complexity = 0;
            object.cognitiveComplexity = 0;
          }
          if (message.ncloc && message.ncloc.length) {
            object.ncloc = Array(message.ncloc.length);
            for (let j = 0; j < message.ncloc.length; ++j) object.ncloc[j] = message.ncloc[j];
          }
          if (message.commentLines && message.commentLines.length) {
            object.commentLines = Array(message.commentLines.length);
            for (let j = 0; j < message.commentLines.length; ++j)
              object.commentLines[j] = message.commentLines[j];
          }
          if (message.nosonarLines && message.nosonarLines.length) {
            object.nosonarLines = Array(message.nosonarLines.length);
            for (let j = 0; j < message.nosonarLines.length; ++j)
              object.nosonarLines[j] = message.nosonarLines[j];
          }
          if (message.executableLines && message.executableLines.length) {
            object.executableLines = Array(message.executableLines.length);
            for (let j = 0; j < message.executableLines.length; ++j)
              object.executableLines[j] = message.executableLines[j];
          }
          if (message.functions != null && message.hasOwnProperty('functions'))
            object.functions = message.functions;
          if (message.statements != null && message.hasOwnProperty('statements'))
            object.statements = message.statements;
          if (message.classes != null && message.hasOwnProperty('classes'))
            object.classes = message.classes;
          if (message.complexity != null && message.hasOwnProperty('complexity'))
            object.complexity = message.complexity;
          if (message.cognitiveComplexity != null && message.hasOwnProperty('cognitiveComplexity'))
            object.cognitiveComplexity = message.cognitiveComplexity;
          return object;
        };

        /**
         * Converts this Metrics to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.Metrics
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Metrics.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for Metrics
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.Metrics
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        Metrics.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.Metrics';
        };

        return Metrics;
      })();

      v1.CpdToken = (function () {
        /**
         * Properties of a CpdToken.
         * @typedef {Object} sonarjs.analyzeproject.v1.CpdToken.$Properties
         * @property {sonarjs.analyzeproject.v1.Location.$Properties|null} [location] CpdToken location
         * @property {string|null} [image] CpdToken image
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of a CpdToken.
         * @memberof sonarjs.analyzeproject.v1
         * @interface ICpdToken
         * @augments sonarjs.analyzeproject.v1.CpdToken.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.CpdToken.$Properties instead.
         */

        /**
         * Shape of a CpdToken.
         * @typedef {sonarjs.analyzeproject.v1.CpdToken.$Properties} sonarjs.analyzeproject.v1.CpdToken.$Shape
         */

        /**
         * Constructs a new CpdToken.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents a CpdToken.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.CpdToken.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function CpdToken(properties) {
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * CpdToken location.
         * @member {sonarjs.analyzeproject.v1.Location.$Properties|null|undefined} location
         * @memberof sonarjs.analyzeproject.v1.CpdToken
         * @instance
         */
        CpdToken.prototype.location = null;

        /**
         * CpdToken image.
         * @member {string} image
         * @memberof sonarjs.analyzeproject.v1.CpdToken
         * @instance
         */
        CpdToken.prototype.image = '';

        /**
         * Creates a new CpdToken instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.CpdToken
         * @static
         * @param {sonarjs.analyzeproject.v1.CpdToken.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.CpdToken} CpdToken instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.CpdToken.$Shape): sonarjs.analyzeproject.v1.CpdToken & sonarjs.analyzeproject.v1.CpdToken.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.CpdToken.$Properties): sonarjs.analyzeproject.v1.CpdToken;
         * }}
         */
        CpdToken.create = function create(properties) {
          return new CpdToken(properties);
        };

        /**
         * Encodes the specified CpdToken message. Does not implicitly {@link sonarjs.analyzeproject.v1.CpdToken.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.CpdToken
         * @static
         * @param {sonarjs.analyzeproject.v1.CpdToken.$Properties} message CpdToken message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CpdToken.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.location != null && Object.hasOwnProperty.call(message, 'location'))
            $root.sonarjs.analyzeproject.v1.Location.encode(
              message.location,
              writer.uint32(/* id 1, wireType 2 =*/ 10).fork(),
              _depth + 1,
            ).ldelim();
          if (message.image != null && Object.hasOwnProperty.call(message, 'image'))
            writer.uint32(/* id 2, wireType 2 =*/ 18).string(message.image);
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified CpdToken message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.CpdToken.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.CpdToken
         * @static
         * @param {sonarjs.analyzeproject.v1.CpdToken.$Properties} message CpdToken message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CpdToken.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a CpdToken message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.CpdToken
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.CpdToken & sonarjs.analyzeproject.v1.CpdToken.$Shape} CpdToken
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CpdToken.decode = function decode(reader, length, _end, _depth, _target) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.CpdToken(),
            value;
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            let wireType = tag & 7;
            switch ((tag >>>= 3)) {
              case 1: {
                if (wireType !== 2) break;
                message.location = $root.sonarjs.analyzeproject.v1.Location.decode(
                  reader,
                  reader.uint32(),
                  undefined,
                  _depth + 1,
                  message.location,
                );
                continue;
              }
              case 2: {
                if (wireType !== 2) break;
                if ((value = reader.string()).length) message.image = value;
                else delete message.image;
                continue;
              }
            }
            reader.skipType(wireType, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes a CpdToken message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.CpdToken
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.CpdToken & sonarjs.analyzeproject.v1.CpdToken.$Shape} CpdToken
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CpdToken.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a CpdToken message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.CpdToken
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        CpdToken.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          if (message.location != null && message.hasOwnProperty('location')) {
            let error = $root.sonarjs.analyzeproject.v1.Location.verify(
              message.location,
              _depth + 1,
            );
            if (error) return 'location.' + error;
          }
          if (message.image != null && message.hasOwnProperty('image'))
            if (!$util.isString(message.image)) return 'image: string expected';
          return null;
        };

        /**
         * Creates a CpdToken message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.CpdToken
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.CpdToken} CpdToken
         */
        CpdToken.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.CpdToken) return object;
          if (!$util.isObject(object))
            throw TypeError('.sonarjs.analyzeproject.v1.CpdToken: object expected');
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let message = new $root.sonarjs.analyzeproject.v1.CpdToken();
          if (object.location != null) {
            if (!$util.isObject(object.location))
              throw TypeError('.sonarjs.analyzeproject.v1.CpdToken.location: object expected');
            message.location = $root.sonarjs.analyzeproject.v1.Location.fromObject(
              object.location,
              _depth + 1,
            );
          }
          if (object.image != null)
            if (typeof object.image !== 'string' || object.image.length)
              message.image = String(object.image);
          return message;
        };

        /**
         * Creates a plain object from a CpdToken message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.CpdToken
         * @static
         * @param {sonarjs.analyzeproject.v1.CpdToken} message CpdToken
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        CpdToken.toObject = function toObject(message, options, _depth) {
          if (!options) options = {};
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let object = {};
          if (options.defaults) {
            object.location = null;
            object.image = '';
          }
          if (message.location != null && message.hasOwnProperty('location'))
            object.location = $root.sonarjs.analyzeproject.v1.Location.toObject(
              message.location,
              options,
              _depth + 1,
            );
          if (message.image != null && message.hasOwnProperty('image'))
            object.image = message.image;
          return object;
        };

        /**
         * Converts this CpdToken to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.CpdToken
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        CpdToken.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for CpdToken
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.CpdToken
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        CpdToken.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.CpdToken';
        };

        return CpdToken;
      })();

      v1.SonarResolveComment = (function () {
        /**
         * Properties of a SonarResolveComment.
         * @typedef {Object} sonarjs.analyzeproject.v1.SonarResolveComment.$Properties
         * @property {number|null} [line] SonarResolveComment line
         * @property {string|null} [text] SonarResolveComment text
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of a SonarResolveComment.
         * @memberof sonarjs.analyzeproject.v1
         * @interface ISonarResolveComment
         * @augments sonarjs.analyzeproject.v1.SonarResolveComment.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.SonarResolveComment.$Properties instead.
         */

        /**
         * Shape of a SonarResolveComment.
         * @typedef {sonarjs.analyzeproject.v1.SonarResolveComment.$Properties} sonarjs.analyzeproject.v1.SonarResolveComment.$Shape
         */

        /**
         * Constructs a new SonarResolveComment.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents a SonarResolveComment.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.SonarResolveComment.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function SonarResolveComment(properties) {
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * SonarResolveComment line.
         * @member {number} line
         * @memberof sonarjs.analyzeproject.v1.SonarResolveComment
         * @instance
         */
        SonarResolveComment.prototype.line = 0;

        /**
         * SonarResolveComment text.
         * @member {string} text
         * @memberof sonarjs.analyzeproject.v1.SonarResolveComment
         * @instance
         */
        SonarResolveComment.prototype.text = '';

        /**
         * Creates a new SonarResolveComment instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.SonarResolveComment
         * @static
         * @param {sonarjs.analyzeproject.v1.SonarResolveComment.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.SonarResolveComment} SonarResolveComment instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.SonarResolveComment.$Shape): sonarjs.analyzeproject.v1.SonarResolveComment & sonarjs.analyzeproject.v1.SonarResolveComment.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.SonarResolveComment.$Properties): sonarjs.analyzeproject.v1.SonarResolveComment;
         * }}
         */
        SonarResolveComment.create = function create(properties) {
          return new SonarResolveComment(properties);
        };

        /**
         * Encodes the specified SonarResolveComment message. Does not implicitly {@link sonarjs.analyzeproject.v1.SonarResolveComment.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.SonarResolveComment
         * @static
         * @param {sonarjs.analyzeproject.v1.SonarResolveComment.$Properties} message SonarResolveComment message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SonarResolveComment.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.line != null && Object.hasOwnProperty.call(message, 'line'))
            writer.uint32(/* id 1, wireType 0 =*/ 8).int32(message.line);
          if (message.text != null && Object.hasOwnProperty.call(message, 'text'))
            writer.uint32(/* id 2, wireType 2 =*/ 18).string(message.text);
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified SonarResolveComment message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.SonarResolveComment.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.SonarResolveComment
         * @static
         * @param {sonarjs.analyzeproject.v1.SonarResolveComment.$Properties} message SonarResolveComment message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SonarResolveComment.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a SonarResolveComment message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.SonarResolveComment
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.SonarResolveComment & sonarjs.analyzeproject.v1.SonarResolveComment.$Shape} SonarResolveComment
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SonarResolveComment.decode = function decode(reader, length, _end, _depth, _target) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.SonarResolveComment(),
            value;
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            let wireType = tag & 7;
            switch ((tag >>>= 3)) {
              case 1: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.line = value;
                else delete message.line;
                continue;
              }
              case 2: {
                if (wireType !== 2) break;
                if ((value = reader.string()).length) message.text = value;
                else delete message.text;
                continue;
              }
            }
            reader.skipType(wireType, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes a SonarResolveComment message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.SonarResolveComment
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.SonarResolveComment & sonarjs.analyzeproject.v1.SonarResolveComment.$Shape} SonarResolveComment
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SonarResolveComment.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SonarResolveComment message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.SonarResolveComment
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SonarResolveComment.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          if (message.line != null && message.hasOwnProperty('line'))
            if (!$util.isInteger(message.line)) return 'line: integer expected';
          if (message.text != null && message.hasOwnProperty('text'))
            if (!$util.isString(message.text)) return 'text: string expected';
          return null;
        };

        /**
         * Creates a SonarResolveComment message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.SonarResolveComment
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.SonarResolveComment} SonarResolveComment
         */
        SonarResolveComment.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.SonarResolveComment) return object;
          if (!$util.isObject(object))
            throw TypeError('.sonarjs.analyzeproject.v1.SonarResolveComment: object expected');
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let message = new $root.sonarjs.analyzeproject.v1.SonarResolveComment();
          if (object.line != null) if (Number(object.line) !== 0) message.line = object.line | 0;
          if (object.text != null)
            if (typeof object.text !== 'string' || object.text.length)
              message.text = String(object.text);
          return message;
        };

        /**
         * Creates a plain object from a SonarResolveComment message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.SonarResolveComment
         * @static
         * @param {sonarjs.analyzeproject.v1.SonarResolveComment} message SonarResolveComment
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SonarResolveComment.toObject = function toObject(message, options, _depth) {
          if (!options) options = {};
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let object = {};
          if (options.defaults) {
            object.line = 0;
            object.text = '';
          }
          if (message.line != null && message.hasOwnProperty('line')) object.line = message.line;
          if (message.text != null && message.hasOwnProperty('text')) object.text = message.text;
          return object;
        };

        /**
         * Converts this SonarResolveComment to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.SonarResolveComment
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SonarResolveComment.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for SonarResolveComment
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.SonarResolveComment
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        SonarResolveComment.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.SonarResolveComment';
        };

        return SonarResolveComment;
      })();

      v1.ProjectAnalysisMeta = (function () {
        /**
         * Properties of a ProjectAnalysisMeta.
         * @typedef {Object} sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Properties
         * @property {Array.<string>|null} [warnings] ProjectAnalysisMeta warnings
         * @property {sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Properties|null} [telemetry] ProjectAnalysisMeta telemetry
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of a ProjectAnalysisMeta.
         * @memberof sonarjs.analyzeproject.v1
         * @interface IProjectAnalysisMeta
         * @augments sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Properties instead.
         */

        /**
         * Shape of a ProjectAnalysisMeta.
         * @typedef {sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Properties} sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Shape
         */

        /**
         * Constructs a new ProjectAnalysisMeta.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents a ProjectAnalysisMeta.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function ProjectAnalysisMeta(properties) {
          this.warnings = [];
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * ProjectAnalysisMeta warnings.
         * @member {Array.<string>} warnings
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisMeta
         * @instance
         */
        ProjectAnalysisMeta.prototype.warnings = $util.emptyArray;

        /**
         * ProjectAnalysisMeta telemetry.
         * @member {sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Properties|null|undefined} telemetry
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisMeta
         * @instance
         */
        ProjectAnalysisMeta.prototype.telemetry = null;

        /**
         * Creates a new ProjectAnalysisMeta instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisMeta
         * @static
         * @param {sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.ProjectAnalysisMeta} ProjectAnalysisMeta instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Shape): sonarjs.analyzeproject.v1.ProjectAnalysisMeta & sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Properties): sonarjs.analyzeproject.v1.ProjectAnalysisMeta;
         * }}
         */
        ProjectAnalysisMeta.create = function create(properties) {
          return new ProjectAnalysisMeta(properties);
        };

        /**
         * Encodes the specified ProjectAnalysisMeta message. Does not implicitly {@link sonarjs.analyzeproject.v1.ProjectAnalysisMeta.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisMeta
         * @static
         * @param {sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Properties} message ProjectAnalysisMeta message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ProjectAnalysisMeta.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.warnings != null && message.warnings.length)
            for (let i = 0; i < message.warnings.length; ++i)
              writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.warnings[i]);
          if (message.telemetry != null && Object.hasOwnProperty.call(message, 'telemetry'))
            $root.sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.encode(
              message.telemetry,
              writer.uint32(/* id 2, wireType 2 =*/ 18).fork(),
              _depth + 1,
            ).ldelim();
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified ProjectAnalysisMeta message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.ProjectAnalysisMeta.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisMeta
         * @static
         * @param {sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Properties} message ProjectAnalysisMeta message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ProjectAnalysisMeta.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a ProjectAnalysisMeta message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisMeta
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.ProjectAnalysisMeta & sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Shape} ProjectAnalysisMeta
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ProjectAnalysisMeta.decode = function decode(reader, length, _end, _depth, _target) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.ProjectAnalysisMeta(),
            value;
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            let wireType = tag & 7;
            switch ((tag >>>= 3)) {
              case 1: {
                if (wireType !== 2) break;
                if (!(message.warnings && message.warnings.length)) message.warnings = [];
                message.warnings.push(reader.string());
                continue;
              }
              case 2: {
                if (wireType !== 2) break;
                message.telemetry = $root.sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.decode(
                  reader,
                  reader.uint32(),
                  undefined,
                  _depth + 1,
                  message.telemetry,
                );
                continue;
              }
            }
            reader.skipType(wireType, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes a ProjectAnalysisMeta message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisMeta
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.ProjectAnalysisMeta & sonarjs.analyzeproject.v1.ProjectAnalysisMeta.$Shape} ProjectAnalysisMeta
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ProjectAnalysisMeta.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ProjectAnalysisMeta message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisMeta
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ProjectAnalysisMeta.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          if (message.warnings != null && message.hasOwnProperty('warnings')) {
            if (!Array.isArray(message.warnings)) return 'warnings: array expected';
            for (let i = 0; i < message.warnings.length; ++i)
              if (!$util.isString(message.warnings[i])) return 'warnings: string[] expected';
          }
          if (message.telemetry != null && message.hasOwnProperty('telemetry')) {
            let error = $root.sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.verify(
              message.telemetry,
              _depth + 1,
            );
            if (error) return 'telemetry.' + error;
          }
          return null;
        };

        /**
         * Creates a ProjectAnalysisMeta message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisMeta
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.ProjectAnalysisMeta} ProjectAnalysisMeta
         */
        ProjectAnalysisMeta.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.ProjectAnalysisMeta) return object;
          if (!$util.isObject(object))
            throw TypeError('.sonarjs.analyzeproject.v1.ProjectAnalysisMeta: object expected');
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let message = new $root.sonarjs.analyzeproject.v1.ProjectAnalysisMeta();
          if (object.warnings) {
            if (!Array.isArray(object.warnings))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectAnalysisMeta.warnings: array expected',
              );
            message.warnings = Array(object.warnings.length);
            for (let i = 0; i < object.warnings.length; ++i)
              message.warnings[i] = String(object.warnings[i]);
          }
          if (object.telemetry != null) {
            if (!$util.isObject(object.telemetry))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectAnalysisMeta.telemetry: object expected',
              );
            message.telemetry = $root.sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.fromObject(
              object.telemetry,
              _depth + 1,
            );
          }
          return message;
        };

        /**
         * Creates a plain object from a ProjectAnalysisMeta message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisMeta
         * @static
         * @param {sonarjs.analyzeproject.v1.ProjectAnalysisMeta} message ProjectAnalysisMeta
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ProjectAnalysisMeta.toObject = function toObject(message, options, _depth) {
          if (!options) options = {};
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let object = {};
          if (options.arrays || options.defaults) object.warnings = [];
          if (options.defaults) object.telemetry = null;
          if (message.warnings && message.warnings.length) {
            object.warnings = Array(message.warnings.length);
            for (let j = 0; j < message.warnings.length; ++j)
              object.warnings[j] = message.warnings[j];
          }
          if (message.telemetry != null && message.hasOwnProperty('telemetry'))
            object.telemetry = $root.sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.toObject(
              message.telemetry,
              options,
              _depth + 1,
            );
          return object;
        };

        /**
         * Converts this ProjectAnalysisMeta to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisMeta
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ProjectAnalysisMeta.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for ProjectAnalysisMeta
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisMeta
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        ProjectAnalysisMeta.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.ProjectAnalysisMeta';
        };

        return ProjectAnalysisMeta;
      })();

      v1.ProjectAnalysisTelemetry = (function () {
        /**
         * Properties of a ProjectAnalysisTelemetry.
         * @typedef {Object} sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Properties
         * @property {Array.<string>|null} [typescriptVersions] ProjectAnalysisTelemetry typescriptVersions
         * @property {boolean|null} [typescriptNativePreview] ProjectAnalysisTelemetry typescriptNativePreview
         * @property {Object.<string,sonarjs.analyzeproject.v1.StringList.$Properties>|null} [compilerOptions] ProjectAnalysisTelemetry compilerOptions
         * @property {Array.<string>|null} [ecmaScriptVersions] ProjectAnalysisTelemetry ecmaScriptVersions
         * @property {sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Properties|null} [programCreation] ProjectAnalysisTelemetry programCreation
         * @property {number|null} [esmFileCount] ProjectAnalysisTelemetry esmFileCount
         * @property {number|null} [cjsFileCount] ProjectAnalysisTelemetry cjsFileCount
         * @property {Object.<string,number>|null} [denoImportCounts] ProjectAnalysisTelemetry denoImportCounts
         * @property {sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Properties|null} [generatedSources] ProjectAnalysisTelemetry generatedSources
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of a ProjectAnalysisTelemetry.
         * @memberof sonarjs.analyzeproject.v1
         * @interface IProjectAnalysisTelemetry
         * @augments sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Properties instead.
         */

        /**
         * Shape of a ProjectAnalysisTelemetry.
         * @typedef {sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Properties} sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Shape
         */

        /**
         * Constructs a new ProjectAnalysisTelemetry.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents a ProjectAnalysisTelemetry.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function ProjectAnalysisTelemetry(properties) {
          this.typescriptVersions = [];
          this.compilerOptions = {};
          this.ecmaScriptVersions = [];
          this.denoImportCounts = {};
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * ProjectAnalysisTelemetry typescriptVersions.
         * @member {Array.<string>} typescriptVersions
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry
         * @instance
         */
        ProjectAnalysisTelemetry.prototype.typescriptVersions = $util.emptyArray;

        /**
         * ProjectAnalysisTelemetry typescriptNativePreview.
         * @member {boolean} typescriptNativePreview
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry
         * @instance
         */
        ProjectAnalysisTelemetry.prototype.typescriptNativePreview = false;

        /**
         * ProjectAnalysisTelemetry compilerOptions.
         * @member {Object.<string,sonarjs.analyzeproject.v1.StringList.$Properties>} compilerOptions
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry
         * @instance
         */
        ProjectAnalysisTelemetry.prototype.compilerOptions = $util.emptyObject;

        /**
         * ProjectAnalysisTelemetry ecmaScriptVersions.
         * @member {Array.<string>} ecmaScriptVersions
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry
         * @instance
         */
        ProjectAnalysisTelemetry.prototype.ecmaScriptVersions = $util.emptyArray;

        /**
         * ProjectAnalysisTelemetry programCreation.
         * @member {sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Properties|null|undefined} programCreation
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry
         * @instance
         */
        ProjectAnalysisTelemetry.prototype.programCreation = null;

        /**
         * ProjectAnalysisTelemetry esmFileCount.
         * @member {number} esmFileCount
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry
         * @instance
         */
        ProjectAnalysisTelemetry.prototype.esmFileCount = 0;

        /**
         * ProjectAnalysisTelemetry cjsFileCount.
         * @member {number} cjsFileCount
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry
         * @instance
         */
        ProjectAnalysisTelemetry.prototype.cjsFileCount = 0;

        /**
         * ProjectAnalysisTelemetry denoImportCounts.
         * @member {Object.<string,number>} denoImportCounts
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry
         * @instance
         */
        ProjectAnalysisTelemetry.prototype.denoImportCounts = $util.emptyObject;

        /**
         * ProjectAnalysisTelemetry generatedSources.
         * @member {sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Properties|null|undefined} generatedSources
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry
         * @instance
         */
        ProjectAnalysisTelemetry.prototype.generatedSources = null;

        /**
         * Creates a new ProjectAnalysisTelemetry instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry
         * @static
         * @param {sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry} ProjectAnalysisTelemetry instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Shape): sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry & sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Properties): sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry;
         * }}
         */
        ProjectAnalysisTelemetry.create = function create(properties) {
          return new ProjectAnalysisTelemetry(properties);
        };

        /**
         * Encodes the specified ProjectAnalysisTelemetry message. Does not implicitly {@link sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry
         * @static
         * @param {sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Properties} message ProjectAnalysisTelemetry message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ProjectAnalysisTelemetry.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.typescriptVersions != null && message.typescriptVersions.length)
            for (let i = 0; i < message.typescriptVersions.length; ++i)
              writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.typescriptVersions[i]);
          if (
            message.typescriptNativePreview != null &&
            Object.hasOwnProperty.call(message, 'typescriptNativePreview')
          )
            writer.uint32(/* id 2, wireType 0 =*/ 16).bool(message.typescriptNativePreview);
          if (
            message.compilerOptions != null &&
            Object.hasOwnProperty.call(message, 'compilerOptions')
          )
            for (let keys = Object.keys(message.compilerOptions), i = 0; i < keys.length; ++i) {
              writer
                .uint32(/* id 3, wireType 2 =*/ 26)
                .fork()
                .uint32(/* id 1, wireType 2 =*/ 10)
                .string(keys[i]);
              $root.sonarjs.analyzeproject.v1.StringList.encode(
                message.compilerOptions[keys[i]],
                writer.uint32(/* id 2, wireType 2 =*/ 18).fork(),
                _depth + 1,
              )
                .ldelim()
                .ldelim();
            }
          if (message.ecmaScriptVersions != null && message.ecmaScriptVersions.length)
            for (let i = 0; i < message.ecmaScriptVersions.length; ++i)
              writer.uint32(/* id 4, wireType 2 =*/ 34).string(message.ecmaScriptVersions[i]);
          if (
            message.programCreation != null &&
            Object.hasOwnProperty.call(message, 'programCreation')
          )
            $root.sonarjs.analyzeproject.v1.ProgramCreationTelemetry.encode(
              message.programCreation,
              writer.uint32(/* id 5, wireType 2 =*/ 42).fork(),
              _depth + 1,
            ).ldelim();
          if (message.esmFileCount != null && Object.hasOwnProperty.call(message, 'esmFileCount'))
            writer.uint32(/* id 6, wireType 0 =*/ 48).int32(message.esmFileCount);
          if (message.cjsFileCount != null && Object.hasOwnProperty.call(message, 'cjsFileCount'))
            writer.uint32(/* id 7, wireType 0 =*/ 56).int32(message.cjsFileCount);
          if (
            message.denoImportCounts != null &&
            Object.hasOwnProperty.call(message, 'denoImportCounts')
          )
            for (let keys = Object.keys(message.denoImportCounts), i = 0; i < keys.length; ++i)
              writer
                .uint32(/* id 8, wireType 2 =*/ 66)
                .fork()
                .uint32(/* id 1, wireType 2 =*/ 10)
                .string(keys[i])
                .uint32(/* id 2, wireType 0 =*/ 16)
                .int32(message.denoImportCounts[keys[i]])
                .ldelim();
          if (
            message.generatedSources != null &&
            Object.hasOwnProperty.call(message, 'generatedSources')
          )
            $root.sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.encode(
              message.generatedSources,
              writer.uint32(/* id 9, wireType 2 =*/ 74).fork(),
              _depth + 1,
            ).ldelim();
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified ProjectAnalysisTelemetry message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry
         * @static
         * @param {sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Properties} message ProjectAnalysisTelemetry message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ProjectAnalysisTelemetry.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a ProjectAnalysisTelemetry message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry & sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Shape} ProjectAnalysisTelemetry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ProjectAnalysisTelemetry.decode = function decode(reader, length, _end, _depth, _target) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry(),
            key,
            value;
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            let wireType = tag & 7;
            switch ((tag >>>= 3)) {
              case 1: {
                if (wireType !== 2) break;
                if (!(message.typescriptVersions && message.typescriptVersions.length))
                  message.typescriptVersions = [];
                message.typescriptVersions.push(reader.string());
                continue;
              }
              case 2: {
                if (wireType !== 0) break;
                if ((value = reader.bool())) message.typescriptNativePreview = value;
                else delete message.typescriptNativePreview;
                continue;
              }
              case 3: {
                if (wireType !== 2) break;
                if (message.compilerOptions === $util.emptyObject) message.compilerOptions = {};
                let end2 = reader.uint32() + reader.pos;
                key = '';
                value = null;
                while (reader.pos < end2) {
                  let tag2 = reader.tag();
                  wireType = tag2 & 7;
                  switch ((tag2 >>>= 3)) {
                    case 1:
                      if (wireType !== 2) break;
                      key = reader.string();
                      continue;
                    case 2:
                      if (wireType !== 2) break;
                      value = $root.sonarjs.analyzeproject.v1.StringList.decode(
                        reader,
                        reader.uint32(),
                        undefined,
                        _depth + 1,
                      );
                      continue;
                  }
                  reader.skipType(wireType, _depth, tag2);
                }
                if (key === '__proto__') $util.makeProp(message.compilerOptions, key);
                message.compilerOptions[key] =
                  value || new $root.sonarjs.analyzeproject.v1.StringList();
                continue;
              }
              case 4: {
                if (wireType !== 2) break;
                if (!(message.ecmaScriptVersions && message.ecmaScriptVersions.length))
                  message.ecmaScriptVersions = [];
                message.ecmaScriptVersions.push(reader.string());
                continue;
              }
              case 5: {
                if (wireType !== 2) break;
                message.programCreation =
                  $root.sonarjs.analyzeproject.v1.ProgramCreationTelemetry.decode(
                    reader,
                    reader.uint32(),
                    undefined,
                    _depth + 1,
                    message.programCreation,
                  );
                continue;
              }
              case 6: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.esmFileCount = value;
                else delete message.esmFileCount;
                continue;
              }
              case 7: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.cjsFileCount = value;
                else delete message.cjsFileCount;
                continue;
              }
              case 8: {
                if (wireType !== 2) break;
                if (message.denoImportCounts === $util.emptyObject) message.denoImportCounts = {};
                let end2 = reader.uint32() + reader.pos;
                key = '';
                value = 0;
                while (reader.pos < end2) {
                  let tag2 = reader.tag();
                  wireType = tag2 & 7;
                  switch ((tag2 >>>= 3)) {
                    case 1:
                      if (wireType !== 2) break;
                      key = reader.string();
                      continue;
                    case 2:
                      if (wireType !== 0) break;
                      value = reader.int32();
                      continue;
                  }
                  reader.skipType(wireType, _depth, tag2);
                }
                if (key === '__proto__') $util.makeProp(message.denoImportCounts, key);
                message.denoImportCounts[key] = value;
                continue;
              }
              case 9: {
                if (wireType !== 2) break;
                message.generatedSources =
                  $root.sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.decode(
                    reader,
                    reader.uint32(),
                    undefined,
                    _depth + 1,
                    message.generatedSources,
                  );
                continue;
              }
            }
            reader.skipType(wireType, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes a ProjectAnalysisTelemetry message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry & sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.$Shape} ProjectAnalysisTelemetry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ProjectAnalysisTelemetry.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ProjectAnalysisTelemetry message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ProjectAnalysisTelemetry.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          if (message.typescriptVersions != null && message.hasOwnProperty('typescriptVersions')) {
            if (!Array.isArray(message.typescriptVersions))
              return 'typescriptVersions: array expected';
            for (let i = 0; i < message.typescriptVersions.length; ++i)
              if (!$util.isString(message.typescriptVersions[i]))
                return 'typescriptVersions: string[] expected';
          }
          if (
            message.typescriptNativePreview != null &&
            message.hasOwnProperty('typescriptNativePreview')
          )
            if (typeof message.typescriptNativePreview !== 'boolean')
              return 'typescriptNativePreview: boolean expected';
          if (message.compilerOptions != null && message.hasOwnProperty('compilerOptions')) {
            if (!$util.isObject(message.compilerOptions)) return 'compilerOptions: object expected';
            let key = Object.keys(message.compilerOptions);
            for (let i = 0; i < key.length; ++i) {
              let error = $root.sonarjs.analyzeproject.v1.StringList.verify(
                message.compilerOptions[key[i]],
                _depth + 1,
              );
              if (error) return 'compilerOptions.' + error;
            }
          }
          if (message.ecmaScriptVersions != null && message.hasOwnProperty('ecmaScriptVersions')) {
            if (!Array.isArray(message.ecmaScriptVersions))
              return 'ecmaScriptVersions: array expected';
            for (let i = 0; i < message.ecmaScriptVersions.length; ++i)
              if (!$util.isString(message.ecmaScriptVersions[i]))
                return 'ecmaScriptVersions: string[] expected';
          }
          if (message.programCreation != null && message.hasOwnProperty('programCreation')) {
            let error = $root.sonarjs.analyzeproject.v1.ProgramCreationTelemetry.verify(
              message.programCreation,
              _depth + 1,
            );
            if (error) return 'programCreation.' + error;
          }
          if (message.esmFileCount != null && message.hasOwnProperty('esmFileCount'))
            if (!$util.isInteger(message.esmFileCount)) return 'esmFileCount: integer expected';
          if (message.cjsFileCount != null && message.hasOwnProperty('cjsFileCount'))
            if (!$util.isInteger(message.cjsFileCount)) return 'cjsFileCount: integer expected';
          if (message.denoImportCounts != null && message.hasOwnProperty('denoImportCounts')) {
            if (!$util.isObject(message.denoImportCounts))
              return 'denoImportCounts: object expected';
            let key = Object.keys(message.denoImportCounts);
            for (let i = 0; i < key.length; ++i)
              if (!$util.isInteger(message.denoImportCounts[key[i]]))
                return 'denoImportCounts: integer{k:string} expected';
          }
          if (message.generatedSources != null && message.hasOwnProperty('generatedSources')) {
            let error = $root.sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.verify(
              message.generatedSources,
              _depth + 1,
            );
            if (error) return 'generatedSources.' + error;
          }
          return null;
        };

        /**
         * Creates a ProjectAnalysisTelemetry message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry} ProjectAnalysisTelemetry
         */
        ProjectAnalysisTelemetry.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry)
            return object;
          if (!$util.isObject(object))
            throw TypeError('.sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry: object expected');
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let message = new $root.sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry();
          if (object.typescriptVersions) {
            if (!Array.isArray(object.typescriptVersions))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.typescriptVersions: array expected',
              );
            message.typescriptVersions = Array(object.typescriptVersions.length);
            for (let i = 0; i < object.typescriptVersions.length; ++i)
              message.typescriptVersions[i] = String(object.typescriptVersions[i]);
          }
          if (object.typescriptNativePreview != null)
            if (object.typescriptNativePreview)
              message.typescriptNativePreview = Boolean(object.typescriptNativePreview);
          if (object.compilerOptions) {
            if (!$util.isObject(object.compilerOptions))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.compilerOptions: object expected',
              );
            message.compilerOptions = {};
            for (let keys = Object.keys(object.compilerOptions), i = 0; i < keys.length; ++i) {
              if (keys[i] === '__proto__') $util.makeProp(message.compilerOptions, keys[i]);
              if (!$util.isObject(object.compilerOptions[keys[i]]))
                throw TypeError(
                  '.sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.compilerOptions: object expected',
                );
              message.compilerOptions[keys[i]] =
                $root.sonarjs.analyzeproject.v1.StringList.fromObject(
                  object.compilerOptions[keys[i]],
                  _depth + 1,
                );
            }
          }
          if (object.ecmaScriptVersions) {
            if (!Array.isArray(object.ecmaScriptVersions))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.ecmaScriptVersions: array expected',
              );
            message.ecmaScriptVersions = Array(object.ecmaScriptVersions.length);
            for (let i = 0; i < object.ecmaScriptVersions.length; ++i)
              message.ecmaScriptVersions[i] = String(object.ecmaScriptVersions[i]);
          }
          if (object.programCreation != null) {
            if (!$util.isObject(object.programCreation))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.programCreation: object expected',
              );
            message.programCreation =
              $root.sonarjs.analyzeproject.v1.ProgramCreationTelemetry.fromObject(
                object.programCreation,
                _depth + 1,
              );
          }
          if (object.esmFileCount != null)
            if (Number(object.esmFileCount) !== 0) message.esmFileCount = object.esmFileCount | 0;
          if (object.cjsFileCount != null)
            if (Number(object.cjsFileCount) !== 0) message.cjsFileCount = object.cjsFileCount | 0;
          if (object.denoImportCounts) {
            if (!$util.isObject(object.denoImportCounts))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.denoImportCounts: object expected',
              );
            message.denoImportCounts = {};
            for (let keys = Object.keys(object.denoImportCounts), i = 0; i < keys.length; ++i) {
              if (keys[i] === '__proto__') $util.makeProp(message.denoImportCounts, keys[i]);
              message.denoImportCounts[keys[i]] = object.denoImportCounts[keys[i]] | 0;
            }
          }
          if (object.generatedSources != null) {
            if (!$util.isObject(object.generatedSources))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry.generatedSources: object expected',
              );
            message.generatedSources =
              $root.sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.fromObject(
                object.generatedSources,
                _depth + 1,
              );
          }
          return message;
        };

        /**
         * Creates a plain object from a ProjectAnalysisTelemetry message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry
         * @static
         * @param {sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry} message ProjectAnalysisTelemetry
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ProjectAnalysisTelemetry.toObject = function toObject(message, options, _depth) {
          if (!options) options = {};
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let object = {};
          if (options.arrays || options.defaults) {
            object.typescriptVersions = [];
            object.ecmaScriptVersions = [];
          }
          if (options.objects || options.defaults) {
            object.compilerOptions = {};
            object.denoImportCounts = {};
          }
          if (options.defaults) {
            object.typescriptNativePreview = false;
            object.programCreation = null;
            object.esmFileCount = 0;
            object.cjsFileCount = 0;
            object.generatedSources = null;
          }
          if (message.typescriptVersions && message.typescriptVersions.length) {
            object.typescriptVersions = Array(message.typescriptVersions.length);
            for (let j = 0; j < message.typescriptVersions.length; ++j)
              object.typescriptVersions[j] = message.typescriptVersions[j];
          }
          if (
            message.typescriptNativePreview != null &&
            message.hasOwnProperty('typescriptNativePreview')
          )
            object.typescriptNativePreview = message.typescriptNativePreview;
          let keys2;
          if (message.compilerOptions && (keys2 = Object.keys(message.compilerOptions)).length) {
            object.compilerOptions = {};
            for (let j = 0; j < keys2.length; ++j) {
              if (keys2[j] === '__proto__') $util.makeProp(object.compilerOptions, keys2[j]);
              object.compilerOptions[keys2[j]] =
                $root.sonarjs.analyzeproject.v1.StringList.toObject(
                  message.compilerOptions[keys2[j]],
                  options,
                  _depth + 1,
                );
            }
          }
          if (message.ecmaScriptVersions && message.ecmaScriptVersions.length) {
            object.ecmaScriptVersions = Array(message.ecmaScriptVersions.length);
            for (let j = 0; j < message.ecmaScriptVersions.length; ++j)
              object.ecmaScriptVersions[j] = message.ecmaScriptVersions[j];
          }
          if (message.programCreation != null && message.hasOwnProperty('programCreation'))
            object.programCreation =
              $root.sonarjs.analyzeproject.v1.ProgramCreationTelemetry.toObject(
                message.programCreation,
                options,
                _depth + 1,
              );
          if (message.esmFileCount != null && message.hasOwnProperty('esmFileCount'))
            object.esmFileCount = message.esmFileCount;
          if (message.cjsFileCount != null && message.hasOwnProperty('cjsFileCount'))
            object.cjsFileCount = message.cjsFileCount;
          if (message.denoImportCounts && (keys2 = Object.keys(message.denoImportCounts)).length) {
            object.denoImportCounts = {};
            for (let j = 0; j < keys2.length; ++j) {
              if (keys2[j] === '__proto__') $util.makeProp(object.denoImportCounts, keys2[j]);
              object.denoImportCounts[keys2[j]] = message.denoImportCounts[keys2[j]];
            }
          }
          if (message.generatedSources != null && message.hasOwnProperty('generatedSources'))
            object.generatedSources =
              $root.sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.toObject(
                message.generatedSources,
                options,
                _depth + 1,
              );
          return object;
        };

        /**
         * Converts this ProjectAnalysisTelemetry to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ProjectAnalysisTelemetry.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for ProjectAnalysisTelemetry
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        ProjectAnalysisTelemetry.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.ProjectAnalysisTelemetry';
        };

        return ProjectAnalysisTelemetry;
      })();

      v1.ProgramCreationTelemetry = (function () {
        /**
         * Properties of a ProgramCreationTelemetry.
         * @typedef {Object} sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Properties
         * @property {number|null} [attempted] ProgramCreationTelemetry attempted
         * @property {number|null} [succeeded] ProgramCreationTelemetry succeeded
         * @property {number|null} [failed] ProgramCreationTelemetry failed
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of a ProgramCreationTelemetry.
         * @memberof sonarjs.analyzeproject.v1
         * @interface IProgramCreationTelemetry
         * @augments sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Properties instead.
         */

        /**
         * Shape of a ProgramCreationTelemetry.
         * @typedef {sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Properties} sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Shape
         */

        /**
         * Constructs a new ProgramCreationTelemetry.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents a ProgramCreationTelemetry.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function ProgramCreationTelemetry(properties) {
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * ProgramCreationTelemetry attempted.
         * @member {number} attempted
         * @memberof sonarjs.analyzeproject.v1.ProgramCreationTelemetry
         * @instance
         */
        ProgramCreationTelemetry.prototype.attempted = 0;

        /**
         * ProgramCreationTelemetry succeeded.
         * @member {number} succeeded
         * @memberof sonarjs.analyzeproject.v1.ProgramCreationTelemetry
         * @instance
         */
        ProgramCreationTelemetry.prototype.succeeded = 0;

        /**
         * ProgramCreationTelemetry failed.
         * @member {number} failed
         * @memberof sonarjs.analyzeproject.v1.ProgramCreationTelemetry
         * @instance
         */
        ProgramCreationTelemetry.prototype.failed = 0;

        /**
         * Creates a new ProgramCreationTelemetry instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.ProgramCreationTelemetry
         * @static
         * @param {sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.ProgramCreationTelemetry} ProgramCreationTelemetry instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Shape): sonarjs.analyzeproject.v1.ProgramCreationTelemetry & sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Properties): sonarjs.analyzeproject.v1.ProgramCreationTelemetry;
         * }}
         */
        ProgramCreationTelemetry.create = function create(properties) {
          return new ProgramCreationTelemetry(properties);
        };

        /**
         * Encodes the specified ProgramCreationTelemetry message. Does not implicitly {@link sonarjs.analyzeproject.v1.ProgramCreationTelemetry.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.ProgramCreationTelemetry
         * @static
         * @param {sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Properties} message ProgramCreationTelemetry message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ProgramCreationTelemetry.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.attempted != null && Object.hasOwnProperty.call(message, 'attempted'))
            writer.uint32(/* id 1, wireType 0 =*/ 8).int32(message.attempted);
          if (message.succeeded != null && Object.hasOwnProperty.call(message, 'succeeded'))
            writer.uint32(/* id 2, wireType 0 =*/ 16).int32(message.succeeded);
          if (message.failed != null && Object.hasOwnProperty.call(message, 'failed'))
            writer.uint32(/* id 3, wireType 0 =*/ 24).int32(message.failed);
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified ProgramCreationTelemetry message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.ProgramCreationTelemetry.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.ProgramCreationTelemetry
         * @static
         * @param {sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Properties} message ProgramCreationTelemetry message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ProgramCreationTelemetry.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a ProgramCreationTelemetry message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.ProgramCreationTelemetry
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.ProgramCreationTelemetry & sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Shape} ProgramCreationTelemetry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ProgramCreationTelemetry.decode = function decode(reader, length, _end, _depth, _target) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.ProgramCreationTelemetry(),
            value;
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            let wireType = tag & 7;
            switch ((tag >>>= 3)) {
              case 1: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.attempted = value;
                else delete message.attempted;
                continue;
              }
              case 2: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.succeeded = value;
                else delete message.succeeded;
                continue;
              }
              case 3: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.failed = value;
                else delete message.failed;
                continue;
              }
            }
            reader.skipType(wireType, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes a ProgramCreationTelemetry message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.ProgramCreationTelemetry
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.ProgramCreationTelemetry & sonarjs.analyzeproject.v1.ProgramCreationTelemetry.$Shape} ProgramCreationTelemetry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ProgramCreationTelemetry.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ProgramCreationTelemetry message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.ProgramCreationTelemetry
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ProgramCreationTelemetry.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          if (message.attempted != null && message.hasOwnProperty('attempted'))
            if (!$util.isInteger(message.attempted)) return 'attempted: integer expected';
          if (message.succeeded != null && message.hasOwnProperty('succeeded'))
            if (!$util.isInteger(message.succeeded)) return 'succeeded: integer expected';
          if (message.failed != null && message.hasOwnProperty('failed'))
            if (!$util.isInteger(message.failed)) return 'failed: integer expected';
          return null;
        };

        /**
         * Creates a ProgramCreationTelemetry message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.ProgramCreationTelemetry
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.ProgramCreationTelemetry} ProgramCreationTelemetry
         */
        ProgramCreationTelemetry.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.ProgramCreationTelemetry)
            return object;
          if (!$util.isObject(object))
            throw TypeError('.sonarjs.analyzeproject.v1.ProgramCreationTelemetry: object expected');
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let message = new $root.sonarjs.analyzeproject.v1.ProgramCreationTelemetry();
          if (object.attempted != null)
            if (Number(object.attempted) !== 0) message.attempted = object.attempted | 0;
          if (object.succeeded != null)
            if (Number(object.succeeded) !== 0) message.succeeded = object.succeeded | 0;
          if (object.failed != null)
            if (Number(object.failed) !== 0) message.failed = object.failed | 0;
          return message;
        };

        /**
         * Creates a plain object from a ProgramCreationTelemetry message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.ProgramCreationTelemetry
         * @static
         * @param {sonarjs.analyzeproject.v1.ProgramCreationTelemetry} message ProgramCreationTelemetry
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ProgramCreationTelemetry.toObject = function toObject(message, options, _depth) {
          if (!options) options = {};
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let object = {};
          if (options.defaults) {
            object.attempted = 0;
            object.succeeded = 0;
            object.failed = 0;
          }
          if (message.attempted != null && message.hasOwnProperty('attempted'))
            object.attempted = message.attempted;
          if (message.succeeded != null && message.hasOwnProperty('succeeded'))
            object.succeeded = message.succeeded;
          if (message.failed != null && message.hasOwnProperty('failed'))
            object.failed = message.failed;
          return object;
        };

        /**
         * Converts this ProgramCreationTelemetry to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.ProgramCreationTelemetry
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ProgramCreationTelemetry.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for ProgramCreationTelemetry
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.ProgramCreationTelemetry
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        ProgramCreationTelemetry.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.ProgramCreationTelemetry';
        };

        return ProgramCreationTelemetry;
      })();

      v1.GeneratedSourcesTelemetry = (function () {
        /**
         * Properties of a GeneratedSourcesTelemetry.
         * @typedef {Object} sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Properties
         * @property {number|null} [familyCount] GeneratedSourcesTelemetry familyCount
         * @property {number|null} [resolvedFileCount] GeneratedSourcesTelemetry resolvedFileCount
         * @property {number|null} [taggedFileCount] GeneratedSourcesTelemetry taggedFileCount
         * @property {Array.<sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Properties>|null} [families] GeneratedSourcesTelemetry families
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of a GeneratedSourcesTelemetry.
         * @memberof sonarjs.analyzeproject.v1
         * @interface IGeneratedSourcesTelemetry
         * @augments sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Properties instead.
         */

        /**
         * Shape of a GeneratedSourcesTelemetry.
         * @typedef {sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Properties} sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Shape
         */

        /**
         * Constructs a new GeneratedSourcesTelemetry.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents a GeneratedSourcesTelemetry.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function GeneratedSourcesTelemetry(properties) {
          this.families = [];
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * GeneratedSourcesTelemetry familyCount.
         * @member {number} familyCount
         * @memberof sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry
         * @instance
         */
        GeneratedSourcesTelemetry.prototype.familyCount = 0;

        /**
         * GeneratedSourcesTelemetry resolvedFileCount.
         * @member {number} resolvedFileCount
         * @memberof sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry
         * @instance
         */
        GeneratedSourcesTelemetry.prototype.resolvedFileCount = 0;

        /**
         * GeneratedSourcesTelemetry taggedFileCount.
         * @member {number} taggedFileCount
         * @memberof sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry
         * @instance
         */
        GeneratedSourcesTelemetry.prototype.taggedFileCount = 0;

        /**
         * GeneratedSourcesTelemetry families.
         * @member {Array.<sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Properties>} families
         * @memberof sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry
         * @instance
         */
        GeneratedSourcesTelemetry.prototype.families = $util.emptyArray;

        /**
         * Creates a new GeneratedSourcesTelemetry instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry
         * @static
         * @param {sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry} GeneratedSourcesTelemetry instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Shape): sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry & sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Properties): sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry;
         * }}
         */
        GeneratedSourcesTelemetry.create = function create(properties) {
          return new GeneratedSourcesTelemetry(properties);
        };

        /**
         * Encodes the specified GeneratedSourcesTelemetry message. Does not implicitly {@link sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry
         * @static
         * @param {sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Properties} message GeneratedSourcesTelemetry message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GeneratedSourcesTelemetry.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.familyCount != null && Object.hasOwnProperty.call(message, 'familyCount'))
            writer.uint32(/* id 1, wireType 0 =*/ 8).int32(message.familyCount);
          if (
            message.resolvedFileCount != null &&
            Object.hasOwnProperty.call(message, 'resolvedFileCount')
          )
            writer.uint32(/* id 2, wireType 0 =*/ 16).int32(message.resolvedFileCount);
          if (
            message.taggedFileCount != null &&
            Object.hasOwnProperty.call(message, 'taggedFileCount')
          )
            writer.uint32(/* id 3, wireType 0 =*/ 24).int32(message.taggedFileCount);
          if (message.families != null && message.families.length)
            for (let i = 0; i < message.families.length; ++i)
              $root.sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.encode(
                message.families[i],
                writer.uint32(/* id 6, wireType 2 =*/ 50).fork(),
                _depth + 1,
              ).ldelim();
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified GeneratedSourcesTelemetry message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry
         * @static
         * @param {sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Properties} message GeneratedSourcesTelemetry message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GeneratedSourcesTelemetry.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a GeneratedSourcesTelemetry message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry & sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Shape} GeneratedSourcesTelemetry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GeneratedSourcesTelemetry.decode = function decode(reader, length, _end, _depth, _target) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message = _target || new $root.sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry(),
            value;
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            let wireType = tag & 7;
            switch ((tag >>>= 3)) {
              case 1: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.familyCount = value;
                else delete message.familyCount;
                continue;
              }
              case 2: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.resolvedFileCount = value;
                else delete message.resolvedFileCount;
                continue;
              }
              case 3: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.taggedFileCount = value;
                else delete message.taggedFileCount;
                continue;
              }
              case 6: {
                if (wireType !== 2) break;
                if (!(message.families && message.families.length)) message.families = [];
                message.families.push(
                  $root.sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.decode(
                    reader,
                    reader.uint32(),
                    undefined,
                    _depth + 1,
                  ),
                );
                continue;
              }
            }
            reader.skipType(wireType, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes a GeneratedSourcesTelemetry message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry & sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.$Shape} GeneratedSourcesTelemetry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GeneratedSourcesTelemetry.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GeneratedSourcesTelemetry message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GeneratedSourcesTelemetry.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          if (message.familyCount != null && message.hasOwnProperty('familyCount'))
            if (!$util.isInteger(message.familyCount)) return 'familyCount: integer expected';
          if (message.resolvedFileCount != null && message.hasOwnProperty('resolvedFileCount'))
            if (!$util.isInteger(message.resolvedFileCount))
              return 'resolvedFileCount: integer expected';
          if (message.taggedFileCount != null && message.hasOwnProperty('taggedFileCount'))
            if (!$util.isInteger(message.taggedFileCount))
              return 'taggedFileCount: integer expected';
          if (message.families != null && message.hasOwnProperty('families')) {
            if (!Array.isArray(message.families)) return 'families: array expected';
            for (let i = 0; i < message.families.length; ++i) {
              let error = $root.sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.verify(
                message.families[i],
                _depth + 1,
              );
              if (error) return 'families.' + error;
            }
          }
          return null;
        };

        /**
         * Creates a GeneratedSourcesTelemetry message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry} GeneratedSourcesTelemetry
         */
        GeneratedSourcesTelemetry.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry)
            return object;
          if (!$util.isObject(object))
            throw TypeError(
              '.sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry: object expected',
            );
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let message = new $root.sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry();
          if (object.familyCount != null)
            if (Number(object.familyCount) !== 0) message.familyCount = object.familyCount | 0;
          if (object.resolvedFileCount != null)
            if (Number(object.resolvedFileCount) !== 0)
              message.resolvedFileCount = object.resolvedFileCount | 0;
          if (object.taggedFileCount != null)
            if (Number(object.taggedFileCount) !== 0)
              message.taggedFileCount = object.taggedFileCount | 0;
          if (object.families) {
            if (!Array.isArray(object.families))
              throw TypeError(
                '.sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.families: array expected',
              );
            message.families = Array(object.families.length);
            for (let i = 0; i < object.families.length; ++i) {
              if (!$util.isObject(object.families[i]))
                throw TypeError(
                  '.sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry.families: object expected',
                );
              message.families[i] =
                $root.sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.fromObject(
                  object.families[i],
                  _depth + 1,
                );
            }
          }
          return message;
        };

        /**
         * Creates a plain object from a GeneratedSourcesTelemetry message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry
         * @static
         * @param {sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry} message GeneratedSourcesTelemetry
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GeneratedSourcesTelemetry.toObject = function toObject(message, options, _depth) {
          if (!options) options = {};
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let object = {};
          if (options.arrays || options.defaults) object.families = [];
          if (options.defaults) {
            object.familyCount = 0;
            object.resolvedFileCount = 0;
            object.taggedFileCount = 0;
          }
          if (message.familyCount != null && message.hasOwnProperty('familyCount'))
            object.familyCount = message.familyCount;
          if (message.resolvedFileCount != null && message.hasOwnProperty('resolvedFileCount'))
            object.resolvedFileCount = message.resolvedFileCount;
          if (message.taggedFileCount != null && message.hasOwnProperty('taggedFileCount'))
            object.taggedFileCount = message.taggedFileCount;
          if (message.families && message.families.length) {
            object.families = Array(message.families.length);
            for (let j = 0; j < message.families.length; ++j)
              object.families[j] =
                $root.sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.toObject(
                  message.families[j],
                  options,
                  _depth + 1,
                );
          }
          return object;
        };

        /**
         * Converts this GeneratedSourcesTelemetry to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GeneratedSourcesTelemetry.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for GeneratedSourcesTelemetry
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        GeneratedSourcesTelemetry.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.GeneratedSourcesTelemetry';
        };

        return GeneratedSourcesTelemetry;
      })();

      v1.GeneratedSourceFamilyTelemetry = (function () {
        /**
         * Properties of a GeneratedSourceFamilyTelemetry.
         * @typedef {Object} sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Properties
         * @property {string|null} [family] GeneratedSourceFamilyTelemetry family
         * @property {number|null} [resolvedFileCount] GeneratedSourceFamilyTelemetry resolvedFileCount
         * @property {number|null} [taggedFileCount] GeneratedSourceFamilyTelemetry taggedFileCount
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */

        /**
         * Properties of a GeneratedSourceFamilyTelemetry.
         * @memberof sonarjs.analyzeproject.v1
         * @interface IGeneratedSourceFamilyTelemetry
         * @augments sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Properties
         * @deprecated Use sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Properties instead.
         */

        /**
         * Shape of a GeneratedSourceFamilyTelemetry.
         * @typedef {sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Properties} sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Shape
         */

        /**
         * Constructs a new GeneratedSourceFamilyTelemetry.
         * @memberof sonarjs.analyzeproject.v1
         * @classdesc Represents a GeneratedSourceFamilyTelemetry.
         * @constructor
         * @param {sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
         */
        function GeneratedSourceFamilyTelemetry(properties) {
          if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
              if (properties[keys[i]] != null && keys[i] !== '__proto__')
                this[keys[i]] = properties[keys[i]];
        }

        /**
         * GeneratedSourceFamilyTelemetry family.
         * @member {string} family
         * @memberof sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry
         * @instance
         */
        GeneratedSourceFamilyTelemetry.prototype.family = '';

        /**
         * GeneratedSourceFamilyTelemetry resolvedFileCount.
         * @member {number} resolvedFileCount
         * @memberof sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry
         * @instance
         */
        GeneratedSourceFamilyTelemetry.prototype.resolvedFileCount = 0;

        /**
         * GeneratedSourceFamilyTelemetry taggedFileCount.
         * @member {number} taggedFileCount
         * @memberof sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry
         * @instance
         */
        GeneratedSourceFamilyTelemetry.prototype.taggedFileCount = 0;

        /**
         * Creates a new GeneratedSourceFamilyTelemetry instance using the specified properties.
         * @function create
         * @memberof sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry
         * @static
         * @param {sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Properties=} [properties] Properties to set
         * @returns {sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry} GeneratedSourceFamilyTelemetry instance
         * @type {{
         *   (properties: sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Shape): sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry & sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Shape;
         *   (properties?: sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Properties): sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry;
         * }}
         */
        GeneratedSourceFamilyTelemetry.create = function create(properties) {
          return new GeneratedSourceFamilyTelemetry(properties);
        };

        /**
         * Encodes the specified GeneratedSourceFamilyTelemetry message. Does not implicitly {@link sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.verify|verify} messages.
         * @function encode
         * @memberof sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry
         * @static
         * @param {sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Properties} message GeneratedSourceFamilyTelemetry message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GeneratedSourceFamilyTelemetry.encode = function encode(message, writer, _depth) {
          if (!writer) writer = $Writer.create();
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          if (message.family != null && Object.hasOwnProperty.call(message, 'family'))
            writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.family);
          if (
            message.resolvedFileCount != null &&
            Object.hasOwnProperty.call(message, 'resolvedFileCount')
          )
            writer.uint32(/* id 2, wireType 0 =*/ 16).int32(message.resolvedFileCount);
          if (
            message.taggedFileCount != null &&
            Object.hasOwnProperty.call(message, 'taggedFileCount')
          )
            writer.uint32(/* id 3, wireType 0 =*/ 24).int32(message.taggedFileCount);
          if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
            for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
          return writer;
        };

        /**
         * Encodes the specified GeneratedSourceFamilyTelemetry message, length delimited. Does not implicitly {@link sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry
         * @static
         * @param {sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Properties} message GeneratedSourceFamilyTelemetry message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GeneratedSourceFamilyTelemetry.encodeDelimited = function encodeDelimited(message, writer) {
          return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a GeneratedSourceFamilyTelemetry message from the specified reader or buffer.
         * @function decode
         * @memberof sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry & sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Shape} GeneratedSourceFamilyTelemetry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GeneratedSourceFamilyTelemetry.decode = function decode(
          reader,
          length,
          _end,
          _depth,
          _target,
        ) {
          if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
          if (_depth === undefined) _depth = 0;
          if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
          let end = length === undefined ? reader.len : reader.pos + length,
            message =
              _target || new $root.sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry(),
            value;
          while (reader.pos < end) {
            let start = reader.pos;
            let tag = reader.tag();
            if (tag === _end) {
              _end = undefined;
              break;
            }
            let wireType = tag & 7;
            switch ((tag >>>= 3)) {
              case 1: {
                if (wireType !== 2) break;
                if ((value = reader.string()).length) message.family = value;
                else delete message.family;
                continue;
              }
              case 2: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.resolvedFileCount = value;
                else delete message.resolvedFileCount;
                continue;
              }
              case 3: {
                if (wireType !== 0) break;
                if ((value = reader.int32())) message.taggedFileCount = value;
                else delete message.taggedFileCount;
                continue;
              }
            }
            reader.skipType(wireType, _depth, tag);
            if (!reader.discardUnknown) {
              $util.makeProp(message, '$unknowns', false);
              (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
            }
          }
          if (_end !== undefined) throw Error('missing end group');
          return message;
        };

        /**
         * Decodes a GeneratedSourceFamilyTelemetry message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry & sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry.$Shape} GeneratedSourceFamilyTelemetry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GeneratedSourceFamilyTelemetry.decodeDelimited = function decodeDelimited(reader) {
          if (!(reader instanceof $Reader)) reader = new $Reader(reader);
          return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GeneratedSourceFamilyTelemetry message.
         * @function verify
         * @memberof sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GeneratedSourceFamilyTelemetry.verify = function verify(message, _depth) {
          if (typeof message !== 'object' || message === null) return 'object expected';
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) return 'max depth exceeded';
          if (message.family != null && message.hasOwnProperty('family'))
            if (!$util.isString(message.family)) return 'family: string expected';
          if (message.resolvedFileCount != null && message.hasOwnProperty('resolvedFileCount'))
            if (!$util.isInteger(message.resolvedFileCount))
              return 'resolvedFileCount: integer expected';
          if (message.taggedFileCount != null && message.hasOwnProperty('taggedFileCount'))
            if (!$util.isInteger(message.taggedFileCount))
              return 'taggedFileCount: integer expected';
          return null;
        };

        /**
         * Creates a GeneratedSourceFamilyTelemetry message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry} GeneratedSourceFamilyTelemetry
         */
        GeneratedSourceFamilyTelemetry.fromObject = function fromObject(object, _depth) {
          if (object instanceof $root.sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry)
            return object;
          if (!$util.isObject(object))
            throw TypeError(
              '.sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry: object expected',
            );
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let message = new $root.sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry();
          if (object.family != null)
            if (typeof object.family !== 'string' || object.family.length)
              message.family = String(object.family);
          if (object.resolvedFileCount != null)
            if (Number(object.resolvedFileCount) !== 0)
              message.resolvedFileCount = object.resolvedFileCount | 0;
          if (object.taggedFileCount != null)
            if (Number(object.taggedFileCount) !== 0)
              message.taggedFileCount = object.taggedFileCount | 0;
          return message;
        };

        /**
         * Creates a plain object from a GeneratedSourceFamilyTelemetry message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry
         * @static
         * @param {sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry} message GeneratedSourceFamilyTelemetry
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GeneratedSourceFamilyTelemetry.toObject = function toObject(message, options, _depth) {
          if (!options) options = {};
          if (_depth === undefined) _depth = 0;
          if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
          let object = {};
          if (options.defaults) {
            object.family = '';
            object.resolvedFileCount = 0;
            object.taggedFileCount = 0;
          }
          if (message.family != null && message.hasOwnProperty('family'))
            object.family = message.family;
          if (message.resolvedFileCount != null && message.hasOwnProperty('resolvedFileCount'))
            object.resolvedFileCount = message.resolvedFileCount;
          if (message.taggedFileCount != null && message.hasOwnProperty('taggedFileCount'))
            object.taggedFileCount = message.taggedFileCount;
          return object;
        };

        /**
         * Converts this GeneratedSourceFamilyTelemetry to JSON.
         * @function toJSON
         * @memberof sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GeneratedSourceFamilyTelemetry.prototype.toJSON = function toJSON() {
          return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for GeneratedSourceFamilyTelemetry
         * @function getTypeUrl
         * @memberof sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        GeneratedSourceFamilyTelemetry.getTypeUrl = function getTypeUrl(prefix) {
          if (prefix === undefined) prefix = 'type.googleapis.com';
          return prefix + '/sonarjs.analyzeproject.v1.GeneratedSourceFamilyTelemetry';
        };

        return GeneratedSourceFamilyTelemetry;
      })();

      return v1;
    })();

    return analyzeproject;
  })();

  return sonarjs;
})());

export const google = ($root.google = (() => {
  /**
   * Namespace google.
   * @exports google
   * @namespace
   */
  const google = {};

  google.protobuf = (function () {
    /**
     * Namespace protobuf.
     * @memberof google
     * @namespace
     */
    const protobuf = {};

    protobuf.Empty = (function () {
      /**
       * Properties of an Empty.
       * @typedef {Object} google.protobuf.Empty.$Properties
       * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
       */

      /**
       * Properties of an Empty.
       * @memberof google.protobuf
       * @interface IEmpty
       * @augments google.protobuf.Empty.$Properties
       * @deprecated Use google.protobuf.Empty.$Properties instead.
       */

      /**
       * Shape of an Empty.
       * @typedef {google.protobuf.Empty.$Properties} google.protobuf.Empty.$Shape
       */

      /**
       * Constructs a new Empty.
       * @memberof google.protobuf
       * @classdesc Represents an Empty.
       * @constructor
       * @param {google.protobuf.Empty.$Properties=} [properties] Properties to set
       * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
       */
      function Empty(properties) {
        if (properties)
          for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
            if (properties[keys[i]] != null && keys[i] !== '__proto__')
              this[keys[i]] = properties[keys[i]];
      }

      /**
       * Creates a new Empty instance using the specified properties.
       * @function create
       * @memberof google.protobuf.Empty
       * @static
       * @param {google.protobuf.Empty.$Properties=} [properties] Properties to set
       * @returns {google.protobuf.Empty} Empty instance
       * @type {{
       *   (properties: google.protobuf.Empty.$Shape): google.protobuf.Empty & google.protobuf.Empty.$Shape;
       *   (properties?: google.protobuf.Empty.$Properties): google.protobuf.Empty;
       * }}
       */
      Empty.create = function create(properties) {
        return new Empty(properties);
      };

      /**
       * Encodes the specified Empty message. Does not implicitly {@link google.protobuf.Empty.verify|verify} messages.
       * @function encode
       * @memberof google.protobuf.Empty
       * @static
       * @param {google.protobuf.Empty.$Properties} message Empty message or plain object to encode
       * @param {$protobuf.Writer} [writer] Writer to encode to
       * @returns {$protobuf.Writer} Writer
       */
      Empty.encode = function encode(message, writer, _depth) {
        if (!writer) writer = $Writer.create();
        if (_depth === undefined) _depth = 0;
        if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
        if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
          for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
        return writer;
      };

      /**
       * Encodes the specified Empty message, length delimited. Does not implicitly {@link google.protobuf.Empty.verify|verify} messages.
       * @function encodeDelimited
       * @memberof google.protobuf.Empty
       * @static
       * @param {google.protobuf.Empty.$Properties} message Empty message or plain object to encode
       * @param {$protobuf.Writer} [writer] Writer to encode to
       * @returns {$protobuf.Writer} Writer
       */
      Empty.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
      };

      /**
       * Decodes an Empty message from the specified reader or buffer.
       * @function decode
       * @memberof google.protobuf.Empty
       * @static
       * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
       * @param {number} [length] Message length if known beforehand
       * @returns {google.protobuf.Empty & google.protobuf.Empty.$Shape} Empty
       * @throws {Error} If the payload is not a reader or valid buffer
       * @throws {$protobuf.util.ProtocolError} If required fields are missing
       */
      Empty.decode = function decode(reader, length, _end, _depth, _target) {
        if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
        if (_depth === undefined) _depth = 0;
        if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
        let end = length === undefined ? reader.len : reader.pos + length,
          message = _target || new $root.google.protobuf.Empty();
        while (reader.pos < end) {
          let start = reader.pos;
          let tag = reader.tag();
          if (tag === _end) {
            _end = undefined;
            break;
          }
          reader.skipType(tag & 7, _depth, tag);
          if (!reader.discardUnknown) {
            $util.makeProp(message, '$unknowns', false);
            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
          }
        }
        if (_end !== undefined) throw Error('missing end group');
        return message;
      };

      /**
       * Decodes an Empty message from the specified reader or buffer, length delimited.
       * @function decodeDelimited
       * @memberof google.protobuf.Empty
       * @static
       * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
       * @returns {google.protobuf.Empty & google.protobuf.Empty.$Shape} Empty
       * @throws {Error} If the payload is not a reader or valid buffer
       * @throws {$protobuf.util.ProtocolError} If required fields are missing
       */
      Empty.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader)) reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
      };

      /**
       * Verifies an Empty message.
       * @function verify
       * @memberof google.protobuf.Empty
       * @static
       * @param {Object.<string,*>} message Plain object to verify
       * @returns {string|null} `null` if valid, otherwise the reason why it is not
       */
      Empty.verify = function verify(message, _depth) {
        if (typeof message !== 'object' || message === null) return 'object expected';
        if (_depth === undefined) _depth = 0;
        if (_depth > $util.recursionLimit) return 'max depth exceeded';
        return null;
      };

      /**
       * Creates an Empty message from a plain object. Also converts values to their respective internal types.
       * @function fromObject
       * @memberof google.protobuf.Empty
       * @static
       * @param {Object.<string,*>} object Plain object
       * @returns {google.protobuf.Empty} Empty
       */
      Empty.fromObject = function fromObject(object, _depth) {
        if (object instanceof $root.google.protobuf.Empty) return object;
        if (!$util.isObject(object)) throw TypeError('.google.protobuf.Empty: object expected');
        if (_depth === undefined) _depth = 0;
        if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
        return new $root.google.protobuf.Empty();
      };

      /**
       * Creates a plain object from an Empty message. Also converts values to other types if specified.
       * @function toObject
       * @memberof google.protobuf.Empty
       * @static
       * @param {google.protobuf.Empty} message Empty
       * @param {$protobuf.IConversionOptions} [options] Conversion options
       * @returns {Object.<string,*>} Plain object
       */
      Empty.toObject = function toObject() {
        return {};
      };

      /**
       * Converts this Empty to JSON.
       * @function toJSON
       * @memberof google.protobuf.Empty
       * @instance
       * @returns {Object.<string,*>} JSON object
       */
      Empty.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
      };

      /**
       * Gets the type url for Empty
       * @function getTypeUrl
       * @memberof google.protobuf.Empty
       * @static
       * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
       * @returns {string} The type url
       */
      Empty.getTypeUrl = function getTypeUrl(prefix) {
        if (prefix === undefined) prefix = 'type.googleapis.com';
        return prefix + '/google.protobuf.Empty';
      };

      return Empty;
    })();

    protobuf.Struct = (function () {
      /**
       * Properties of a Struct.
       * @typedef {Object} google.protobuf.Struct.$Properties
       * @property {Object.<string,google.protobuf.Value.$Properties>|null} [fields] Struct fields
       * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
       */

      /**
       * Properties of a Struct.
       * @memberof google.protobuf
       * @interface IStruct
       * @augments google.protobuf.Struct.$Properties
       * @deprecated Use google.protobuf.Struct.$Properties instead.
       */

      /**
       * Shape of a Struct.
       * @typedef {{
       *   fields?: Object.<string,google.protobuf.Value.$Shape>|null;
       *   $unknowns?: Array.<Uint8Array>;
       * }} google.protobuf.Struct.$Shape
       */

      /**
       * Constructs a new Struct.
       * @memberof google.protobuf
       * @classdesc Represents a Struct.
       * @constructor
       * @param {google.protobuf.Struct.$Properties=} [properties] Properties to set
       * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
       */
      function Struct(properties) {
        this.fields = {};
        if (properties)
          for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
            if (properties[keys[i]] != null && keys[i] !== '__proto__')
              this[keys[i]] = properties[keys[i]];
      }

      /**
       * Struct fields.
       * @member {Object.<string,google.protobuf.Value.$Properties>} fields
       * @memberof google.protobuf.Struct
       * @instance
       */
      Struct.prototype.fields = $util.emptyObject;

      /**
       * Creates a new Struct instance using the specified properties.
       * @function create
       * @memberof google.protobuf.Struct
       * @static
       * @param {google.protobuf.Struct.$Properties=} [properties] Properties to set
       * @returns {google.protobuf.Struct} Struct instance
       * @type {{
       *   (properties: google.protobuf.Struct.$Shape): google.protobuf.Struct & google.protobuf.Struct.$Shape;
       *   (properties?: google.protobuf.Struct.$Properties): google.protobuf.Struct;
       * }}
       */
      Struct.create = function create(properties) {
        return new Struct(properties);
      };

      /**
       * Encodes the specified Struct message. Does not implicitly {@link google.protobuf.Struct.verify|verify} messages.
       * @function encode
       * @memberof google.protobuf.Struct
       * @static
       * @param {google.protobuf.Struct.$Properties} message Struct message or plain object to encode
       * @param {$protobuf.Writer} [writer] Writer to encode to
       * @returns {$protobuf.Writer} Writer
       */
      Struct.encode = function encode(message, writer, _depth) {
        if (!writer) writer = $Writer.create();
        if (_depth === undefined) _depth = 0;
        if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
        if (message.fields != null && Object.hasOwnProperty.call(message, 'fields'))
          for (let keys = Object.keys(message.fields), i = 0; i < keys.length; ++i) {
            writer
              .uint32(/* id 1, wireType 2 =*/ 10)
              .fork()
              .uint32(/* id 1, wireType 2 =*/ 10)
              .string(keys[i]);
            $root.google.protobuf.Value.encode(
              message.fields[keys[i]],
              writer.uint32(/* id 2, wireType 2 =*/ 18).fork(),
              _depth + 1,
            )
              .ldelim()
              .ldelim();
          }
        if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
          for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
        return writer;
      };

      /**
       * Encodes the specified Struct message, length delimited. Does not implicitly {@link google.protobuf.Struct.verify|verify} messages.
       * @function encodeDelimited
       * @memberof google.protobuf.Struct
       * @static
       * @param {google.protobuf.Struct.$Properties} message Struct message or plain object to encode
       * @param {$protobuf.Writer} [writer] Writer to encode to
       * @returns {$protobuf.Writer} Writer
       */
      Struct.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
      };

      /**
       * Decodes a Struct message from the specified reader or buffer.
       * @function decode
       * @memberof google.protobuf.Struct
       * @static
       * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
       * @param {number} [length] Message length if known beforehand
       * @returns {google.protobuf.Struct & google.protobuf.Struct.$Shape} Struct
       * @throws {Error} If the payload is not a reader or valid buffer
       * @throws {$protobuf.util.ProtocolError} If required fields are missing
       */
      Struct.decode = function decode(reader, length, _end, _depth, _target) {
        if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
        if (_depth === undefined) _depth = 0;
        if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
        let end = length === undefined ? reader.len : reader.pos + length,
          message = _target || new $root.google.protobuf.Struct(),
          key,
          value;
        while (reader.pos < end) {
          let start = reader.pos;
          let tag = reader.tag();
          if (tag === _end) {
            _end = undefined;
            break;
          }
          let wireType = tag & 7;
          switch ((tag >>>= 3)) {
            case 1: {
              if (wireType !== 2) break;
              if (message.fields === $util.emptyObject) message.fields = {};
              let end2 = reader.uint32() + reader.pos;
              key = '';
              value = null;
              while (reader.pos < end2) {
                let tag2 = reader.tag();
                wireType = tag2 & 7;
                switch ((tag2 >>>= 3)) {
                  case 1:
                    if (wireType !== 2) break;
                    key = reader.string();
                    continue;
                  case 2:
                    if (wireType !== 2) break;
                    value = $root.google.protobuf.Value.decode(
                      reader,
                      reader.uint32(),
                      undefined,
                      _depth + 1,
                    );
                    continue;
                }
                reader.skipType(wireType, _depth, tag2);
              }
              if (key === '__proto__') $util.makeProp(message.fields, key);
              message.fields[key] = value || new $root.google.protobuf.Value();
              continue;
            }
          }
          reader.skipType(wireType, _depth, tag);
          if (!reader.discardUnknown) {
            $util.makeProp(message, '$unknowns', false);
            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
          }
        }
        if (_end !== undefined) throw Error('missing end group');
        return message;
      };

      /**
       * Decodes a Struct message from the specified reader or buffer, length delimited.
       * @function decodeDelimited
       * @memberof google.protobuf.Struct
       * @static
       * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
       * @returns {google.protobuf.Struct & google.protobuf.Struct.$Shape} Struct
       * @throws {Error} If the payload is not a reader or valid buffer
       * @throws {$protobuf.util.ProtocolError} If required fields are missing
       */
      Struct.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader)) reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
      };

      /**
       * Verifies a Struct message.
       * @function verify
       * @memberof google.protobuf.Struct
       * @static
       * @param {Object.<string,*>} message Plain object to verify
       * @returns {string|null} `null` if valid, otherwise the reason why it is not
       */
      Struct.verify = function verify(message, _depth) {
        if (typeof message !== 'object' || message === null) return 'object expected';
        if (_depth === undefined) _depth = 0;
        if (_depth > $util.recursionLimit) return 'max depth exceeded';
        if (message.fields != null && message.hasOwnProperty('fields')) {
          if (!$util.isObject(message.fields)) return 'fields: object expected';
          let key = Object.keys(message.fields);
          for (let i = 0; i < key.length; ++i) {
            let error = $root.google.protobuf.Value.verify(message.fields[key[i]], _depth + 1);
            if (error) return 'fields.' + error;
          }
        }
        return null;
      };

      /**
       * Creates a Struct message from a plain object. Also converts values to their respective internal types.
       * @function fromObject
       * @memberof google.protobuf.Struct
       * @static
       * @param {Object.<string,*>} object Plain object
       * @returns {google.protobuf.Struct} Struct
       */
      Struct.fromObject = function fromObject(object, _depth) {
        if (object instanceof $root.google.protobuf.Struct) return object;
        if (!$util.isObject(object)) throw TypeError('.google.protobuf.Struct: object expected');
        if (_depth === undefined) _depth = 0;
        if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
        let message = new $root.google.protobuf.Struct();
        if (object.fields) {
          if (!$util.isObject(object.fields))
            throw TypeError('.google.protobuf.Struct.fields: object expected');
          message.fields = {};
          for (let keys = Object.keys(object.fields), i = 0; i < keys.length; ++i) {
            if (keys[i] === '__proto__') $util.makeProp(message.fields, keys[i]);
            if (!$util.isObject(object.fields[keys[i]]))
              throw TypeError('.google.protobuf.Struct.fields: object expected');
            message.fields[keys[i]] = $root.google.protobuf.Value.fromObject(
              object.fields[keys[i]],
              _depth + 1,
            );
          }
        }
        return message;
      };

      /**
       * Creates a plain object from a Struct message. Also converts values to other types if specified.
       * @function toObject
       * @memberof google.protobuf.Struct
       * @static
       * @param {google.protobuf.Struct} message Struct
       * @param {$protobuf.IConversionOptions} [options] Conversion options
       * @returns {Object.<string,*>} Plain object
       */
      Struct.toObject = function toObject(message, options, _depth) {
        if (!options) options = {};
        if (_depth === undefined) _depth = 0;
        if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
        let object = {};
        if (options.objects || options.defaults) object.fields = {};
        let keys2;
        if (message.fields && (keys2 = Object.keys(message.fields)).length) {
          object.fields = {};
          for (let j = 0; j < keys2.length; ++j) {
            if (keys2[j] === '__proto__') $util.makeProp(object.fields, keys2[j]);
            object.fields[keys2[j]] = $root.google.protobuf.Value.toObject(
              message.fields[keys2[j]],
              options,
              _depth + 1,
            );
          }
        }
        return object;
      };

      /**
       * Converts this Struct to JSON.
       * @function toJSON
       * @memberof google.protobuf.Struct
       * @instance
       * @returns {Object.<string,*>} JSON object
       */
      Struct.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
      };

      /**
       * Gets the type url for Struct
       * @function getTypeUrl
       * @memberof google.protobuf.Struct
       * @static
       * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
       * @returns {string} The type url
       */
      Struct.getTypeUrl = function getTypeUrl(prefix) {
        if (prefix === undefined) prefix = 'type.googleapis.com';
        return prefix + '/google.protobuf.Struct';
      };

      return Struct;
    })();

    protobuf.Value = (function () {
      /**
       * Properties of a Value.
       * @typedef {Object} google.protobuf.Value.$Properties
       * @property {google.protobuf.NullValue|null} [nullValue] Value nullValue
       * @property {number|null} [numberValue] Value numberValue
       * @property {string|null} [stringValue] Value stringValue
       * @property {boolean|null} [boolValue] Value boolValue
       * @property {google.protobuf.Struct.$Properties|null} [structValue] Value structValue
       * @property {google.protobuf.ListValue.$Properties|null} [listValue] Value listValue
       * @property {"nullValue"|"numberValue"|"stringValue"|"boolValue"|"structValue"|"listValue"} [kind] Value kind
       * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
       */

      /**
       * Properties of a Value.
       * @memberof google.protobuf
       * @interface IValue
       * @augments google.protobuf.Value.$Properties
       * @deprecated Use google.protobuf.Value.$Properties instead.
       */

      /**
       * Narrowed shape of a Value.
       * @typedef {{
       *   nullValue?: google.protobuf.NullValue|null;
       *   numberValue?: number|null;
       *   stringValue?: string|null;
       *   boolValue?: boolean|null;
       *   structValue?: google.protobuf.Struct.$Shape|null;
       *   listValue?: google.protobuf.ListValue.$Shape|null;
       *   $unknowns?: Array.<Uint8Array>;
       * } & (
       *   ({ kind?: undefined; nullValue?: null; numberValue?: null; stringValue?: null; boolValue?: null; structValue?: null; listValue?: null }|{ kind?: "nullValue"; nullValue: google.protobuf.NullValue; numberValue?: null; stringValue?: null; boolValue?: null; structValue?: null; listValue?: null }|{ kind?: "numberValue"; nullValue?: null; numberValue: number; stringValue?: null; boolValue?: null; structValue?: null; listValue?: null }|{ kind?: "stringValue"; nullValue?: null; numberValue?: null; stringValue: string; boolValue?: null; structValue?: null; listValue?: null }|{ kind?: "boolValue"; nullValue?: null; numberValue?: null; stringValue?: null; boolValue: boolean; structValue?: null; listValue?: null }|{ kind?: "structValue"; nullValue?: null; numberValue?: null; stringValue?: null; boolValue?: null; structValue: google.protobuf.Struct.$Shape; listValue?: null }|{ kind?: "listValue"; nullValue?: null; numberValue?: null; stringValue?: null; boolValue?: null; structValue?: null; listValue: google.protobuf.ListValue.$Shape })
       * )} google.protobuf.Value.$Shape
       */

      /**
       * Constructs a new Value.
       * @memberof google.protobuf
       * @classdesc Represents a Value.
       * @constructor
       * @param {google.protobuf.Value.$Properties=} [properties] Properties to set
       * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
       */
      function Value(properties) {
        if (properties)
          for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
            if (properties[keys[i]] != null && keys[i] !== '__proto__')
              this[keys[i]] = properties[keys[i]];
      }

      /**
       * Value nullValue.
       * @member {google.protobuf.NullValue|null|undefined} nullValue
       * @memberof google.protobuf.Value
       * @instance
       */
      Value.prototype.nullValue = null;

      /**
       * Value numberValue.
       * @member {number|null|undefined} numberValue
       * @memberof google.protobuf.Value
       * @instance
       */
      Value.prototype.numberValue = null;

      /**
       * Value stringValue.
       * @member {string|null|undefined} stringValue
       * @memberof google.protobuf.Value
       * @instance
       */
      Value.prototype.stringValue = null;

      /**
       * Value boolValue.
       * @member {boolean|null|undefined} boolValue
       * @memberof google.protobuf.Value
       * @instance
       */
      Value.prototype.boolValue = null;

      /**
       * Value structValue.
       * @member {google.protobuf.Struct.$Properties|null|undefined} structValue
       * @memberof google.protobuf.Value
       * @instance
       */
      Value.prototype.structValue = null;

      /**
       * Value listValue.
       * @member {google.protobuf.ListValue.$Properties|null|undefined} listValue
       * @memberof google.protobuf.Value
       * @instance
       */
      Value.prototype.listValue = null;

      // OneOf field names bound to virtual getters and setters
      let $oneOfFields;

      /**
       * Value kind.
       * @member {"nullValue"|"numberValue"|"stringValue"|"boolValue"|"structValue"|"listValue"|undefined} kind
       * @memberof google.protobuf.Value
       * @instance
       */
      Object.defineProperty(Value.prototype, 'kind', {
        get: $util.oneOfGetter(
          ($oneOfFields = [
            'nullValue',
            'numberValue',
            'stringValue',
            'boolValue',
            'structValue',
            'listValue',
          ]),
        ),
        set: $util.oneOfSetter($oneOfFields),
      });

      /**
       * Creates a new Value instance using the specified properties.
       * @function create
       * @memberof google.protobuf.Value
       * @static
       * @param {google.protobuf.Value.$Properties=} [properties] Properties to set
       * @returns {google.protobuf.Value} Value instance
       * @type {{
       *   (properties: google.protobuf.Value.$Shape): google.protobuf.Value & google.protobuf.Value.$Shape;
       *   (properties?: google.protobuf.Value.$Properties): google.protobuf.Value;
       * }}
       */
      Value.create = function create(properties) {
        return new Value(properties);
      };

      /**
       * Encodes the specified Value message. Does not implicitly {@link google.protobuf.Value.verify|verify} messages.
       * @function encode
       * @memberof google.protobuf.Value
       * @static
       * @param {google.protobuf.Value.$Properties} message Value message or plain object to encode
       * @param {$protobuf.Writer} [writer] Writer to encode to
       * @returns {$protobuf.Writer} Writer
       */
      Value.encode = function encode(message, writer, _depth) {
        if (!writer) writer = $Writer.create();
        if (_depth === undefined) _depth = 0;
        if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
        if (message.nullValue != null && Object.hasOwnProperty.call(message, 'nullValue'))
          writer.uint32(/* id 1, wireType 0 =*/ 8).int32(message.nullValue);
        if (message.numberValue != null && Object.hasOwnProperty.call(message, 'numberValue'))
          writer.uint32(/* id 2, wireType 1 =*/ 17).double(message.numberValue);
        if (message.stringValue != null && Object.hasOwnProperty.call(message, 'stringValue'))
          writer.uint32(/* id 3, wireType 2 =*/ 26).string(message.stringValue);
        if (message.boolValue != null && Object.hasOwnProperty.call(message, 'boolValue'))
          writer.uint32(/* id 4, wireType 0 =*/ 32).bool(message.boolValue);
        if (message.structValue != null && Object.hasOwnProperty.call(message, 'structValue'))
          $root.google.protobuf.Struct.encode(
            message.structValue,
            writer.uint32(/* id 5, wireType 2 =*/ 42).fork(),
            _depth + 1,
          ).ldelim();
        if (message.listValue != null && Object.hasOwnProperty.call(message, 'listValue'))
          $root.google.protobuf.ListValue.encode(
            message.listValue,
            writer.uint32(/* id 6, wireType 2 =*/ 50).fork(),
            _depth + 1,
          ).ldelim();
        if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
          for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
        return writer;
      };

      /**
       * Encodes the specified Value message, length delimited. Does not implicitly {@link google.protobuf.Value.verify|verify} messages.
       * @function encodeDelimited
       * @memberof google.protobuf.Value
       * @static
       * @param {google.protobuf.Value.$Properties} message Value message or plain object to encode
       * @param {$protobuf.Writer} [writer] Writer to encode to
       * @returns {$protobuf.Writer} Writer
       */
      Value.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
      };

      /**
       * Decodes a Value message from the specified reader or buffer.
       * @function decode
       * @memberof google.protobuf.Value
       * @static
       * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
       * @param {number} [length] Message length if known beforehand
       * @returns {google.protobuf.Value & google.protobuf.Value.$Shape} Value
       * @throws {Error} If the payload is not a reader or valid buffer
       * @throws {$protobuf.util.ProtocolError} If required fields are missing
       */
      Value.decode = function decode(reader, length, _end, _depth, _target) {
        if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
        if (_depth === undefined) _depth = 0;
        if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
        let end = length === undefined ? reader.len : reader.pos + length,
          message = _target || new $root.google.protobuf.Value();
        while (reader.pos < end) {
          let start = reader.pos;
          let tag = reader.tag();
          if (tag === _end) {
            _end = undefined;
            break;
          }
          let wireType = tag & 7;
          switch ((tag >>>= 3)) {
            case 1: {
              if (wireType !== 0) break;
              message.nullValue = reader.int32();
              message.kind = 'nullValue';
              continue;
            }
            case 2: {
              if (wireType !== 1) break;
              message.numberValue = reader.double();
              message.kind = 'numberValue';
              continue;
            }
            case 3: {
              if (wireType !== 2) break;
              message.stringValue = reader.string();
              message.kind = 'stringValue';
              continue;
            }
            case 4: {
              if (wireType !== 0) break;
              message.boolValue = reader.bool();
              message.kind = 'boolValue';
              continue;
            }
            case 5: {
              if (wireType !== 2) break;
              message.structValue = $root.google.protobuf.Struct.decode(
                reader,
                reader.uint32(),
                undefined,
                _depth + 1,
                message.structValue,
              );
              message.kind = 'structValue';
              continue;
            }
            case 6: {
              if (wireType !== 2) break;
              message.listValue = $root.google.protobuf.ListValue.decode(
                reader,
                reader.uint32(),
                undefined,
                _depth + 1,
                message.listValue,
              );
              message.kind = 'listValue';
              continue;
            }
          }
          reader.skipType(wireType, _depth, tag);
          if (!reader.discardUnknown) {
            $util.makeProp(message, '$unknowns', false);
            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
          }
        }
        if (_end !== undefined) throw Error('missing end group');
        return message;
      };

      /**
       * Decodes a Value message from the specified reader or buffer, length delimited.
       * @function decodeDelimited
       * @memberof google.protobuf.Value
       * @static
       * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
       * @returns {google.protobuf.Value & google.protobuf.Value.$Shape} Value
       * @throws {Error} If the payload is not a reader or valid buffer
       * @throws {$protobuf.util.ProtocolError} If required fields are missing
       */
      Value.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader)) reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
      };

      /**
       * Verifies a Value message.
       * @function verify
       * @memberof google.protobuf.Value
       * @static
       * @param {Object.<string,*>} message Plain object to verify
       * @returns {string|null} `null` if valid, otherwise the reason why it is not
       */
      Value.verify = function verify(message, _depth) {
        if (typeof message !== 'object' || message === null) return 'object expected';
        if (_depth === undefined) _depth = 0;
        if (_depth > $util.recursionLimit) return 'max depth exceeded';
        let properties = {};
        if (message.nullValue != null && message.hasOwnProperty('nullValue')) {
          properties.kind = 1;
          switch (message.nullValue) {
            default:
              return 'nullValue: enum value expected';
            case 0:
              break;
          }
        }
        if (message.numberValue != null && message.hasOwnProperty('numberValue')) {
          if (properties.kind === 1) return 'kind: multiple values';
          properties.kind = 1;
          if (typeof message.numberValue !== 'number') return 'numberValue: number expected';
        }
        if (message.stringValue != null && message.hasOwnProperty('stringValue')) {
          if (properties.kind === 1) return 'kind: multiple values';
          properties.kind = 1;
          if (!$util.isString(message.stringValue)) return 'stringValue: string expected';
        }
        if (message.boolValue != null && message.hasOwnProperty('boolValue')) {
          if (properties.kind === 1) return 'kind: multiple values';
          properties.kind = 1;
          if (typeof message.boolValue !== 'boolean') return 'boolValue: boolean expected';
        }
        if (message.structValue != null && message.hasOwnProperty('structValue')) {
          if (properties.kind === 1) return 'kind: multiple values';
          properties.kind = 1;
          {
            let error = $root.google.protobuf.Struct.verify(message.structValue, _depth + 1);
            if (error) return 'structValue.' + error;
          }
        }
        if (message.listValue != null && message.hasOwnProperty('listValue')) {
          if (properties.kind === 1) return 'kind: multiple values';
          properties.kind = 1;
          {
            let error = $root.google.protobuf.ListValue.verify(message.listValue, _depth + 1);
            if (error) return 'listValue.' + error;
          }
        }
        return null;
      };

      /**
       * Creates a Value message from a plain object. Also converts values to their respective internal types.
       * @function fromObject
       * @memberof google.protobuf.Value
       * @static
       * @param {Object.<string,*>} object Plain object
       * @returns {google.protobuf.Value} Value
       */
      Value.fromObject = function fromObject(object, _depth) {
        if (object instanceof $root.google.protobuf.Value) return object;
        if (!$util.isObject(object)) throw TypeError('.google.protobuf.Value: object expected');
        if (_depth === undefined) _depth = 0;
        if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
        let message = new $root.google.protobuf.Value();
        switch (object.nullValue) {
          default:
            if (typeof object.nullValue === 'number') {
              message.nullValue = object.nullValue;
              break;
            }
            break;
          case 'NULL_VALUE':
          case 0:
            message.nullValue = 0;
            break;
        }
        if (object.numberValue != null) message.numberValue = Number(object.numberValue);
        if (object.stringValue != null) message.stringValue = String(object.stringValue);
        if (object.boolValue != null) message.boolValue = Boolean(object.boolValue);
        if (object.structValue != null) {
          if (!$util.isObject(object.structValue))
            throw TypeError('.google.protobuf.Value.structValue: object expected');
          message.structValue = $root.google.protobuf.Struct.fromObject(
            object.structValue,
            _depth + 1,
          );
        }
        if (object.listValue != null) {
          if (!$util.isObject(object.listValue))
            throw TypeError('.google.protobuf.Value.listValue: object expected');
          message.listValue = $root.google.protobuf.ListValue.fromObject(
            object.listValue,
            _depth + 1,
          );
        }
        return message;
      };

      /**
       * Creates a plain object from a Value message. Also converts values to other types if specified.
       * @function toObject
       * @memberof google.protobuf.Value
       * @static
       * @param {google.protobuf.Value} message Value
       * @param {$protobuf.IConversionOptions} [options] Conversion options
       * @returns {Object.<string,*>} Plain object
       */
      Value.toObject = function toObject(message, options, _depth) {
        if (!options) options = {};
        if (_depth === undefined) _depth = 0;
        if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
        let object = {};
        if (message.nullValue != null && message.hasOwnProperty('nullValue')) {
          object.nullValue =
            options.enums === String
              ? $root.google.protobuf.NullValue[message.nullValue] === undefined
                ? message.nullValue
                : $root.google.protobuf.NullValue[message.nullValue]
              : message.nullValue;
          if (options.oneofs) object.kind = 'nullValue';
        }
        if (message.numberValue != null && message.hasOwnProperty('numberValue')) {
          object.numberValue =
            options.json && !isFinite(message.numberValue)
              ? String(message.numberValue)
              : message.numberValue;
          if (options.oneofs) object.kind = 'numberValue';
        }
        if (message.stringValue != null && message.hasOwnProperty('stringValue')) {
          object.stringValue = message.stringValue;
          if (options.oneofs) object.kind = 'stringValue';
        }
        if (message.boolValue != null && message.hasOwnProperty('boolValue')) {
          object.boolValue = message.boolValue;
          if (options.oneofs) object.kind = 'boolValue';
        }
        if (message.structValue != null && message.hasOwnProperty('structValue')) {
          object.structValue = $root.google.protobuf.Struct.toObject(
            message.structValue,
            options,
            _depth + 1,
          );
          if (options.oneofs) object.kind = 'structValue';
        }
        if (message.listValue != null && message.hasOwnProperty('listValue')) {
          object.listValue = $root.google.protobuf.ListValue.toObject(
            message.listValue,
            options,
            _depth + 1,
          );
          if (options.oneofs) object.kind = 'listValue';
        }
        return object;
      };

      /**
       * Converts this Value to JSON.
       * @function toJSON
       * @memberof google.protobuf.Value
       * @instance
       * @returns {Object.<string,*>} JSON object
       */
      Value.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
      };

      /**
       * Gets the type url for Value
       * @function getTypeUrl
       * @memberof google.protobuf.Value
       * @static
       * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
       * @returns {string} The type url
       */
      Value.getTypeUrl = function getTypeUrl(prefix) {
        if (prefix === undefined) prefix = 'type.googleapis.com';
        return prefix + '/google.protobuf.Value';
      };

      return Value;
    })();

    /**
     * NullValue enum.
     * @name google.protobuf.NullValue
     * @enum {number}
     * @property {number} NULL_VALUE=0 NULL_VALUE value
     */
    protobuf.NullValue = (function () {
      const valuesById = {},
        values = Object.create(valuesById);
      values[(valuesById[0] = 'NULL_VALUE')] = 0;
      return values;
    })();

    protobuf.ListValue = (function () {
      /**
       * Properties of a ListValue.
       * @typedef {Object} google.protobuf.ListValue.$Properties
       * @property {Array.<google.protobuf.Value.$Properties>|null} [values] ListValue values
       * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
       */

      /**
       * Properties of a ListValue.
       * @memberof google.protobuf
       * @interface IListValue
       * @augments google.protobuf.ListValue.$Properties
       * @deprecated Use google.protobuf.ListValue.$Properties instead.
       */

      /**
       * Shape of a ListValue.
       * @typedef {{
       *   values?: Array.<google.protobuf.Value.$Shape>|null;
       *   $unknowns?: Array.<Uint8Array>;
       * }} google.protobuf.ListValue.$Shape
       */

      /**
       * Constructs a new ListValue.
       * @memberof google.protobuf
       * @classdesc Represents a ListValue.
       * @constructor
       * @param {google.protobuf.ListValue.$Properties=} [properties] Properties to set
       * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding
       */
      function ListValue(properties) {
        this.values = [];
        if (properties)
          for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
            if (properties[keys[i]] != null && keys[i] !== '__proto__')
              this[keys[i]] = properties[keys[i]];
      }

      /**
       * ListValue values.
       * @member {Array.<google.protobuf.Value.$Properties>} values
       * @memberof google.protobuf.ListValue
       * @instance
       */
      ListValue.prototype.values = $util.emptyArray;

      /**
       * Creates a new ListValue instance using the specified properties.
       * @function create
       * @memberof google.protobuf.ListValue
       * @static
       * @param {google.protobuf.ListValue.$Properties=} [properties] Properties to set
       * @returns {google.protobuf.ListValue} ListValue instance
       * @type {{
       *   (properties: google.protobuf.ListValue.$Shape): google.protobuf.ListValue & google.protobuf.ListValue.$Shape;
       *   (properties?: google.protobuf.ListValue.$Properties): google.protobuf.ListValue;
       * }}
       */
      ListValue.create = function create(properties) {
        return new ListValue(properties);
      };

      /**
       * Encodes the specified ListValue message. Does not implicitly {@link google.protobuf.ListValue.verify|verify} messages.
       * @function encode
       * @memberof google.protobuf.ListValue
       * @static
       * @param {google.protobuf.ListValue.$Properties} message ListValue message or plain object to encode
       * @param {$protobuf.Writer} [writer] Writer to encode to
       * @returns {$protobuf.Writer} Writer
       */
      ListValue.encode = function encode(message, writer, _depth) {
        if (!writer) writer = $Writer.create();
        if (_depth === undefined) _depth = 0;
        if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
        if (message.values != null && message.values.length)
          for (let i = 0; i < message.values.length; ++i)
            $root.google.protobuf.Value.encode(
              message.values[i],
              writer.uint32(/* id 1, wireType 2 =*/ 10).fork(),
              _depth + 1,
            ).ldelim();
        if (message.$unknowns != null && Object.hasOwnProperty.call(message, '$unknowns'))
          for (let i = 0; i < message.$unknowns.length; ++i) writer.raw(message.$unknowns[i]);
        return writer;
      };

      /**
       * Encodes the specified ListValue message, length delimited. Does not implicitly {@link google.protobuf.ListValue.verify|verify} messages.
       * @function encodeDelimited
       * @memberof google.protobuf.ListValue
       * @static
       * @param {google.protobuf.ListValue.$Properties} message ListValue message or plain object to encode
       * @param {$protobuf.Writer} [writer] Writer to encode to
       * @returns {$protobuf.Writer} Writer
       */
      ListValue.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
      };

      /**
       * Decodes a ListValue message from the specified reader or buffer.
       * @function decode
       * @memberof google.protobuf.ListValue
       * @static
       * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
       * @param {number} [length] Message length if known beforehand
       * @returns {google.protobuf.ListValue & google.protobuf.ListValue.$Shape} ListValue
       * @throws {Error} If the payload is not a reader or valid buffer
       * @throws {$protobuf.util.ProtocolError} If required fields are missing
       */
      ListValue.decode = function decode(reader, length, _end, _depth, _target) {
        if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
        if (_depth === undefined) _depth = 0;
        if (_depth > $Reader.recursionLimit) throw Error('max depth exceeded');
        let end = length === undefined ? reader.len : reader.pos + length,
          message = _target || new $root.google.protobuf.ListValue();
        while (reader.pos < end) {
          let start = reader.pos;
          let tag = reader.tag();
          if (tag === _end) {
            _end = undefined;
            break;
          }
          let wireType = tag & 7;
          switch ((tag >>>= 3)) {
            case 1: {
              if (wireType !== 2) break;
              if (!(message.values && message.values.length)) message.values = [];
              message.values.push(
                $root.google.protobuf.Value.decode(reader, reader.uint32(), undefined, _depth + 1),
              );
              continue;
            }
          }
          reader.skipType(wireType, _depth, tag);
          if (!reader.discardUnknown) {
            $util.makeProp(message, '$unknowns', false);
            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
          }
        }
        if (_end !== undefined) throw Error('missing end group');
        return message;
      };

      /**
       * Decodes a ListValue message from the specified reader or buffer, length delimited.
       * @function decodeDelimited
       * @memberof google.protobuf.ListValue
       * @static
       * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
       * @returns {google.protobuf.ListValue & google.protobuf.ListValue.$Shape} ListValue
       * @throws {Error} If the payload is not a reader or valid buffer
       * @throws {$protobuf.util.ProtocolError} If required fields are missing
       */
      ListValue.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader)) reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
      };

      /**
       * Verifies a ListValue message.
       * @function verify
       * @memberof google.protobuf.ListValue
       * @static
       * @param {Object.<string,*>} message Plain object to verify
       * @returns {string|null} `null` if valid, otherwise the reason why it is not
       */
      ListValue.verify = function verify(message, _depth) {
        if (typeof message !== 'object' || message === null) return 'object expected';
        if (_depth === undefined) _depth = 0;
        if (_depth > $util.recursionLimit) return 'max depth exceeded';
        if (message.values != null && message.hasOwnProperty('values')) {
          if (!Array.isArray(message.values)) return 'values: array expected';
          for (let i = 0; i < message.values.length; ++i) {
            let error = $root.google.protobuf.Value.verify(message.values[i], _depth + 1);
            if (error) return 'values.' + error;
          }
        }
        return null;
      };

      /**
       * Creates a ListValue message from a plain object. Also converts values to their respective internal types.
       * @function fromObject
       * @memberof google.protobuf.ListValue
       * @static
       * @param {Object.<string,*>} object Plain object
       * @returns {google.protobuf.ListValue} ListValue
       */
      ListValue.fromObject = function fromObject(object, _depth) {
        if (object instanceof $root.google.protobuf.ListValue) return object;
        if (!$util.isObject(object)) throw TypeError('.google.protobuf.ListValue: object expected');
        if (_depth === undefined) _depth = 0;
        if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
        let message = new $root.google.protobuf.ListValue();
        if (object.values) {
          if (!Array.isArray(object.values))
            throw TypeError('.google.protobuf.ListValue.values: array expected');
          message.values = Array(object.values.length);
          for (let i = 0; i < object.values.length; ++i) {
            if (!$util.isObject(object.values[i]))
              throw TypeError('.google.protobuf.ListValue.values: object expected');
            message.values[i] = $root.google.protobuf.Value.fromObject(
              object.values[i],
              _depth + 1,
            );
          }
        }
        return message;
      };

      /**
       * Creates a plain object from a ListValue message. Also converts values to other types if specified.
       * @function toObject
       * @memberof google.protobuf.ListValue
       * @static
       * @param {google.protobuf.ListValue} message ListValue
       * @param {$protobuf.IConversionOptions} [options] Conversion options
       * @returns {Object.<string,*>} Plain object
       */
      ListValue.toObject = function toObject(message, options, _depth) {
        if (!options) options = {};
        if (_depth === undefined) _depth = 0;
        if (_depth > $util.recursionLimit) throw Error('max depth exceeded');
        let object = {};
        if (options.arrays || options.defaults) object.values = [];
        if (message.values && message.values.length) {
          object.values = Array(message.values.length);
          for (let j = 0; j < message.values.length; ++j)
            object.values[j] = $root.google.protobuf.Value.toObject(
              message.values[j],
              options,
              _depth + 1,
            );
        }
        return object;
      };

      /**
       * Converts this ListValue to JSON.
       * @function toJSON
       * @memberof google.protobuf.ListValue
       * @instance
       * @returns {Object.<string,*>} JSON object
       */
      ListValue.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
      };

      /**
       * Gets the type url for ListValue
       * @function getTypeUrl
       * @memberof google.protobuf.ListValue
       * @static
       * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
       * @returns {string} The type url
       */
      ListValue.getTypeUrl = function getTypeUrl(prefix) {
        if (prefix === undefined) prefix = 'type.googleapis.com';
        return prefix + '/google.protobuf.ListValue';
      };

      return ListValue;
    })();

    return protobuf;
  })();

  return google;
})());

export { $root as default };
