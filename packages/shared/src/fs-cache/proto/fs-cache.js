/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
import * as $protobuf from 'protobufjs/minimal';

// Common aliases
const $Reader = $protobuf.Reader,
  $Writer = $protobuf.Writer,
  $util = $protobuf.util;

// Exported root namespace
const $root = $protobuf.roots['default'] || ($protobuf.roots['default'] = {});

export const fscache = ($root.fscache = (() => {
  /**
   * Namespace fscache.
   * @exports fscache
   * @namespace
   */
  const fscache = {};

  fscache.FsCacheData = (function () {
    /**
     * Properties of a FsCacheData.
     * @memberof fscache
     * @interface IFsCacheData
     * @property {string|null} [projectId] FsCacheData projectId
     * @property {number|Long|null} [createdAt] FsCacheData createdAt
     * @property {number|Long|null} [lastModified] FsCacheData lastModified
     * @property {Array.<fscache.IFsNodeEntry>|null} [nodes] FsCacheData nodes
     */

    /**
     * Constructs a new FsCacheData.
     * @memberof fscache
     * @classdesc Represents a FsCacheData.
     * @implements IFsCacheData
     * @constructor
     * @param {fscache.IFsCacheData=} [properties] Properties to set
     */
    function FsCacheData(properties) {
      this.nodes = [];
      if (properties)
        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
          if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
    }

    /**
     * FsCacheData projectId.
     * @member {string} projectId
     * @memberof fscache.FsCacheData
     * @instance
     */
    FsCacheData.prototype.projectId = '';

    /**
     * FsCacheData createdAt.
     * @member {number|Long} createdAt
     * @memberof fscache.FsCacheData
     * @instance
     */
    FsCacheData.prototype.createdAt = $util.Long ? $util.Long.fromBits(0, 0, false) : 0;

    /**
     * FsCacheData lastModified.
     * @member {number|Long} lastModified
     * @memberof fscache.FsCacheData
     * @instance
     */
    FsCacheData.prototype.lastModified = $util.Long ? $util.Long.fromBits(0, 0, false) : 0;

    /**
     * FsCacheData nodes.
     * @member {Array.<fscache.IFsNodeEntry>} nodes
     * @memberof fscache.FsCacheData
     * @instance
     */
    FsCacheData.prototype.nodes = $util.emptyArray;

    /**
     * Creates a new FsCacheData instance using the specified properties.
     * @function create
     * @memberof fscache.FsCacheData
     * @static
     * @param {fscache.IFsCacheData=} [properties] Properties to set
     * @returns {fscache.FsCacheData} FsCacheData instance
     */
    FsCacheData.create = function create(properties) {
      return new FsCacheData(properties);
    };

    /**
     * Encodes the specified FsCacheData message. Does not implicitly {@link fscache.FsCacheData.verify|verify} messages.
     * @function encode
     * @memberof fscache.FsCacheData
     * @static
     * @param {fscache.IFsCacheData} message FsCacheData message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    FsCacheData.encode = function encode(message, writer) {
      if (!writer) writer = $Writer.create();
      if (message.projectId != null && Object.hasOwnProperty.call(message, 'projectId'))
        writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.projectId);
      if (message.createdAt != null && Object.hasOwnProperty.call(message, 'createdAt'))
        writer.uint32(/* id 2, wireType 0 =*/ 16).int64(message.createdAt);
      if (message.lastModified != null && Object.hasOwnProperty.call(message, 'lastModified'))
        writer.uint32(/* id 3, wireType 0 =*/ 24).int64(message.lastModified);
      if (message.nodes != null && message.nodes.length)
        for (let i = 0; i < message.nodes.length; ++i)
          $root.fscache.FsNodeEntry.encode(
            message.nodes[i],
            writer.uint32(/* id 4, wireType 2 =*/ 34).fork(),
          ).ldelim();
      return writer;
    };

    /**
     * Encodes the specified FsCacheData message, length delimited. Does not implicitly {@link fscache.FsCacheData.verify|verify} messages.
     * @function encodeDelimited
     * @memberof fscache.FsCacheData
     * @static
     * @param {fscache.IFsCacheData} message FsCacheData message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    FsCacheData.encodeDelimited = function encodeDelimited(message, writer) {
      return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a FsCacheData message from the specified reader or buffer.
     * @function decode
     * @memberof fscache.FsCacheData
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {fscache.FsCacheData} FsCacheData
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    FsCacheData.decode = function decode(reader, length, error) {
      if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length,
        message = new $root.fscache.FsCacheData();
      while (reader.pos < end) {
        let tag = reader.uint32();
        if (tag === error) break;
        switch (tag >>> 3) {
          case 1: {
            message.projectId = reader.string();
            break;
          }
          case 2: {
            message.createdAt = reader.int64();
            break;
          }
          case 3: {
            message.lastModified = reader.int64();
            break;
          }
          case 4: {
            if (!(message.nodes && message.nodes.length)) message.nodes = [];
            message.nodes.push($root.fscache.FsNodeEntry.decode(reader, reader.uint32()));
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
     * Decodes a FsCacheData message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof fscache.FsCacheData
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {fscache.FsCacheData} FsCacheData
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    FsCacheData.decodeDelimited = function decodeDelimited(reader) {
      if (!(reader instanceof $Reader)) reader = new $Reader(reader);
      return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a FsCacheData message.
     * @function verify
     * @memberof fscache.FsCacheData
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    FsCacheData.verify = function verify(message) {
      if (typeof message !== 'object' || message === null) return 'object expected';
      if (message.projectId != null && message.hasOwnProperty('projectId'))
        if (!$util.isString(message.projectId)) return 'projectId: string expected';
      if (message.createdAt != null && message.hasOwnProperty('createdAt'))
        if (
          !$util.isInteger(message.createdAt) &&
          !(
            message.createdAt &&
            $util.isInteger(message.createdAt.low) &&
            $util.isInteger(message.createdAt.high)
          )
        )
          return 'createdAt: integer|Long expected';
      if (message.lastModified != null && message.hasOwnProperty('lastModified'))
        if (
          !$util.isInteger(message.lastModified) &&
          !(
            message.lastModified &&
            $util.isInteger(message.lastModified.low) &&
            $util.isInteger(message.lastModified.high)
          )
        )
          return 'lastModified: integer|Long expected';
      if (message.nodes != null && message.hasOwnProperty('nodes')) {
        if (!Array.isArray(message.nodes)) return 'nodes: array expected';
        for (let i = 0; i < message.nodes.length; ++i) {
          let error = $root.fscache.FsNodeEntry.verify(message.nodes[i]);
          if (error) return 'nodes.' + error;
        }
      }
      return null;
    };

    /**
     * Creates a FsCacheData message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof fscache.FsCacheData
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {fscache.FsCacheData} FsCacheData
     */
    FsCacheData.fromObject = function fromObject(object) {
      if (object instanceof $root.fscache.FsCacheData) return object;
      let message = new $root.fscache.FsCacheData();
      if (object.projectId != null) message.projectId = String(object.projectId);
      if (object.createdAt != null)
        if ($util.Long)
          (message.createdAt = $util.Long.fromValue(object.createdAt)).unsigned = false;
        else if (typeof object.createdAt === 'string')
          message.createdAt = parseInt(object.createdAt, 10);
        else if (typeof object.createdAt === 'number') message.createdAt = object.createdAt;
        else if (typeof object.createdAt === 'object')
          message.createdAt = new $util.LongBits(
            object.createdAt.low >>> 0,
            object.createdAt.high >>> 0,
          ).toNumber();
      if (object.lastModified != null)
        if ($util.Long)
          (message.lastModified = $util.Long.fromValue(object.lastModified)).unsigned = false;
        else if (typeof object.lastModified === 'string')
          message.lastModified = parseInt(object.lastModified, 10);
        else if (typeof object.lastModified === 'number')
          message.lastModified = object.lastModified;
        else if (typeof object.lastModified === 'object')
          message.lastModified = new $util.LongBits(
            object.lastModified.low >>> 0,
            object.lastModified.high >>> 0,
          ).toNumber();
      if (object.nodes) {
        if (!Array.isArray(object.nodes))
          throw TypeError('.fscache.FsCacheData.nodes: array expected');
        message.nodes = [];
        for (let i = 0; i < object.nodes.length; ++i) {
          if (typeof object.nodes[i] !== 'object')
            throw TypeError('.fscache.FsCacheData.nodes: object expected');
          message.nodes[i] = $root.fscache.FsNodeEntry.fromObject(object.nodes[i]);
        }
      }
      return message;
    };

    /**
     * Creates a plain object from a FsCacheData message. Also converts values to other types if specified.
     * @function toObject
     * @memberof fscache.FsCacheData
     * @static
     * @param {fscache.FsCacheData} message FsCacheData
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    FsCacheData.toObject = function toObject(message, options) {
      if (!options) options = {};
      let object = {};
      if (options.arrays || options.defaults) object.nodes = [];
      if (options.defaults) {
        object.projectId = '';
        if ($util.Long) {
          let long = new $util.Long(0, 0, false);
          object.createdAt =
            options.longs === String
              ? long.toString()
              : options.longs === Number
                ? long.toNumber()
                : long;
        } else object.createdAt = options.longs === String ? '0' : 0;
        if ($util.Long) {
          let long = new $util.Long(0, 0, false);
          object.lastModified =
            options.longs === String
              ? long.toString()
              : options.longs === Number
                ? long.toNumber()
                : long;
        } else object.lastModified = options.longs === String ? '0' : 0;
      }
      if (message.projectId != null && message.hasOwnProperty('projectId'))
        object.projectId = message.projectId;
      if (message.createdAt != null && message.hasOwnProperty('createdAt'))
        if (typeof message.createdAt === 'number')
          object.createdAt =
            options.longs === String ? String(message.createdAt) : message.createdAt;
        else
          object.createdAt =
            options.longs === String
              ? $util.Long.prototype.toString.call(message.createdAt)
              : options.longs === Number
                ? new $util.LongBits(
                    message.createdAt.low >>> 0,
                    message.createdAt.high >>> 0,
                  ).toNumber()
                : message.createdAt;
      if (message.lastModified != null && message.hasOwnProperty('lastModified'))
        if (typeof message.lastModified === 'number')
          object.lastModified =
            options.longs === String ? String(message.lastModified) : message.lastModified;
        else
          object.lastModified =
            options.longs === String
              ? $util.Long.prototype.toString.call(message.lastModified)
              : options.longs === Number
                ? new $util.LongBits(
                    message.lastModified.low >>> 0,
                    message.lastModified.high >>> 0,
                  ).toNumber()
                : message.lastModified;
      if (message.nodes && message.nodes.length) {
        object.nodes = [];
        for (let j = 0; j < message.nodes.length; ++j)
          object.nodes[j] = $root.fscache.FsNodeEntry.toObject(message.nodes[j], options);
      }
      return object;
    };

    /**
     * Converts this FsCacheData to JSON.
     * @function toJSON
     * @memberof fscache.FsCacheData
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    FsCacheData.prototype.toJSON = function toJSON() {
      return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for FsCacheData
     * @function getTypeUrl
     * @memberof fscache.FsCacheData
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    FsCacheData.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
      if (typeUrlPrefix === undefined) {
        typeUrlPrefix = 'type.googleapis.com';
      }
      return typeUrlPrefix + '/fscache.FsCacheData';
    };

    return FsCacheData;
  })();

  fscache.FsNodeEntry = (function () {
    /**
     * Properties of a FsNodeEntry.
     * @memberof fscache
     * @interface IFsNodeEntry
     * @property {string|null} [path] FsNodeEntry path
     * @property {boolean|null} [exists] FsNodeEntry exists
     * @property {number|Long|null} [timestamp] FsNodeEntry timestamp
     * @property {string|null} [type] FsNodeEntry type
     * @property {Uint8Array|null} [content] FsNodeEntry content
     * @property {string|null} [encoding] FsNodeEntry encoding
     * @property {fscache.IFsNodeStat|null} [stat] FsNodeEntry stat
     * @property {Array.<fscache.IFsChildEntry>|null} [children] FsNodeEntry children
     * @property {string|null} [resolvedPath] FsNodeEntry resolvedPath
     * @property {string|null} [resolvedPathNative] FsNodeEntry resolvedPathNative
     * @property {Array.<fscache.IAccessMode>|null} [accessModes] FsNodeEntry accessModes
     */

    /**
     * Constructs a new FsNodeEntry.
     * @memberof fscache
     * @classdesc Represents a FsNodeEntry.
     * @implements IFsNodeEntry
     * @constructor
     * @param {fscache.IFsNodeEntry=} [properties] Properties to set
     */
    function FsNodeEntry(properties) {
      this.children = [];
      this.accessModes = [];
      if (properties)
        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
          if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
    }

    /**
     * FsNodeEntry path.
     * @member {string} path
     * @memberof fscache.FsNodeEntry
     * @instance
     */
    FsNodeEntry.prototype.path = '';

    /**
     * FsNodeEntry exists.
     * @member {boolean} exists
     * @memberof fscache.FsNodeEntry
     * @instance
     */
    FsNodeEntry.prototype.exists = false;

    /**
     * FsNodeEntry timestamp.
     * @member {number|Long} timestamp
     * @memberof fscache.FsNodeEntry
     * @instance
     */
    FsNodeEntry.prototype.timestamp = $util.Long ? $util.Long.fromBits(0, 0, false) : 0;

    /**
     * FsNodeEntry type.
     * @member {string} type
     * @memberof fscache.FsNodeEntry
     * @instance
     */
    FsNodeEntry.prototype.type = '';

    /**
     * FsNodeEntry content.
     * @member {Uint8Array} content
     * @memberof fscache.FsNodeEntry
     * @instance
     */
    FsNodeEntry.prototype.content = $util.newBuffer([]);

    /**
     * FsNodeEntry encoding.
     * @member {string} encoding
     * @memberof fscache.FsNodeEntry
     * @instance
     */
    FsNodeEntry.prototype.encoding = '';

    /**
     * FsNodeEntry stat.
     * @member {fscache.IFsNodeStat|null|undefined} stat
     * @memberof fscache.FsNodeEntry
     * @instance
     */
    FsNodeEntry.prototype.stat = null;

    /**
     * FsNodeEntry children.
     * @member {Array.<fscache.IFsChildEntry>} children
     * @memberof fscache.FsNodeEntry
     * @instance
     */
    FsNodeEntry.prototype.children = $util.emptyArray;

    /**
     * FsNodeEntry resolvedPath.
     * @member {string} resolvedPath
     * @memberof fscache.FsNodeEntry
     * @instance
     */
    FsNodeEntry.prototype.resolvedPath = '';

    /**
     * FsNodeEntry resolvedPathNative.
     * @member {string} resolvedPathNative
     * @memberof fscache.FsNodeEntry
     * @instance
     */
    FsNodeEntry.prototype.resolvedPathNative = '';

    /**
     * FsNodeEntry accessModes.
     * @member {Array.<fscache.IAccessMode>} accessModes
     * @memberof fscache.FsNodeEntry
     * @instance
     */
    FsNodeEntry.prototype.accessModes = $util.emptyArray;

    /**
     * Creates a new FsNodeEntry instance using the specified properties.
     * @function create
     * @memberof fscache.FsNodeEntry
     * @static
     * @param {fscache.IFsNodeEntry=} [properties] Properties to set
     * @returns {fscache.FsNodeEntry} FsNodeEntry instance
     */
    FsNodeEntry.create = function create(properties) {
      return new FsNodeEntry(properties);
    };

    /**
     * Encodes the specified FsNodeEntry message. Does not implicitly {@link fscache.FsNodeEntry.verify|verify} messages.
     * @function encode
     * @memberof fscache.FsNodeEntry
     * @static
     * @param {fscache.IFsNodeEntry} message FsNodeEntry message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    FsNodeEntry.encode = function encode(message, writer) {
      if (!writer) writer = $Writer.create();
      if (message.path != null && Object.hasOwnProperty.call(message, 'path'))
        writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.path);
      if (message.exists != null && Object.hasOwnProperty.call(message, 'exists'))
        writer.uint32(/* id 2, wireType 0 =*/ 16).bool(message.exists);
      if (message.timestamp != null && Object.hasOwnProperty.call(message, 'timestamp'))
        writer.uint32(/* id 3, wireType 0 =*/ 24).int64(message.timestamp);
      if (message.type != null && Object.hasOwnProperty.call(message, 'type'))
        writer.uint32(/* id 4, wireType 2 =*/ 34).string(message.type);
      if (message.content != null && Object.hasOwnProperty.call(message, 'content'))
        writer.uint32(/* id 5, wireType 2 =*/ 42).bytes(message.content);
      if (message.encoding != null && Object.hasOwnProperty.call(message, 'encoding'))
        writer.uint32(/* id 6, wireType 2 =*/ 50).string(message.encoding);
      if (message.stat != null && Object.hasOwnProperty.call(message, 'stat'))
        $root.fscache.FsNodeStat.encode(
          message.stat,
          writer.uint32(/* id 7, wireType 2 =*/ 58).fork(),
        ).ldelim();
      if (message.children != null && message.children.length)
        for (let i = 0; i < message.children.length; ++i)
          $root.fscache.FsChildEntry.encode(
            message.children[i],
            writer.uint32(/* id 8, wireType 2 =*/ 66).fork(),
          ).ldelim();
      if (message.resolvedPath != null && Object.hasOwnProperty.call(message, 'resolvedPath'))
        writer.uint32(/* id 9, wireType 2 =*/ 74).string(message.resolvedPath);
      if (
        message.resolvedPathNative != null &&
        Object.hasOwnProperty.call(message, 'resolvedPathNative')
      )
        writer.uint32(/* id 10, wireType 2 =*/ 82).string(message.resolvedPathNative);
      if (message.accessModes != null && message.accessModes.length)
        for (let i = 0; i < message.accessModes.length; ++i)
          $root.fscache.AccessMode.encode(
            message.accessModes[i],
            writer.uint32(/* id 11, wireType 2 =*/ 90).fork(),
          ).ldelim();
      return writer;
    };

    /**
     * Encodes the specified FsNodeEntry message, length delimited. Does not implicitly {@link fscache.FsNodeEntry.verify|verify} messages.
     * @function encodeDelimited
     * @memberof fscache.FsNodeEntry
     * @static
     * @param {fscache.IFsNodeEntry} message FsNodeEntry message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    FsNodeEntry.encodeDelimited = function encodeDelimited(message, writer) {
      return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a FsNodeEntry message from the specified reader or buffer.
     * @function decode
     * @memberof fscache.FsNodeEntry
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {fscache.FsNodeEntry} FsNodeEntry
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    FsNodeEntry.decode = function decode(reader, length, error) {
      if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length,
        message = new $root.fscache.FsNodeEntry();
      while (reader.pos < end) {
        let tag = reader.uint32();
        if (tag === error) break;
        switch (tag >>> 3) {
          case 1: {
            message.path = reader.string();
            break;
          }
          case 2: {
            message.exists = reader.bool();
            break;
          }
          case 3: {
            message.timestamp = reader.int64();
            break;
          }
          case 4: {
            message.type = reader.string();
            break;
          }
          case 5: {
            message.content = reader.bytes();
            break;
          }
          case 6: {
            message.encoding = reader.string();
            break;
          }
          case 7: {
            message.stat = $root.fscache.FsNodeStat.decode(reader, reader.uint32());
            break;
          }
          case 8: {
            if (!(message.children && message.children.length)) message.children = [];
            message.children.push($root.fscache.FsChildEntry.decode(reader, reader.uint32()));
            break;
          }
          case 9: {
            message.resolvedPath = reader.string();
            break;
          }
          case 10: {
            message.resolvedPathNative = reader.string();
            break;
          }
          case 11: {
            if (!(message.accessModes && message.accessModes.length)) message.accessModes = [];
            message.accessModes.push($root.fscache.AccessMode.decode(reader, reader.uint32()));
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
     * Decodes a FsNodeEntry message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof fscache.FsNodeEntry
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {fscache.FsNodeEntry} FsNodeEntry
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    FsNodeEntry.decodeDelimited = function decodeDelimited(reader) {
      if (!(reader instanceof $Reader)) reader = new $Reader(reader);
      return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a FsNodeEntry message.
     * @function verify
     * @memberof fscache.FsNodeEntry
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    FsNodeEntry.verify = function verify(message) {
      if (typeof message !== 'object' || message === null) return 'object expected';
      if (message.path != null && message.hasOwnProperty('path'))
        if (!$util.isString(message.path)) return 'path: string expected';
      if (message.exists != null && message.hasOwnProperty('exists'))
        if (typeof message.exists !== 'boolean') return 'exists: boolean expected';
      if (message.timestamp != null && message.hasOwnProperty('timestamp'))
        if (
          !$util.isInteger(message.timestamp) &&
          !(
            message.timestamp &&
            $util.isInteger(message.timestamp.low) &&
            $util.isInteger(message.timestamp.high)
          )
        )
          return 'timestamp: integer|Long expected';
      if (message.type != null && message.hasOwnProperty('type'))
        if (!$util.isString(message.type)) return 'type: string expected';
      if (message.content != null && message.hasOwnProperty('content'))
        if (
          !(
            (message.content && typeof message.content.length === 'number') ||
            $util.isString(message.content)
          )
        )
          return 'content: buffer expected';
      if (message.encoding != null && message.hasOwnProperty('encoding'))
        if (!$util.isString(message.encoding)) return 'encoding: string expected';
      if (message.stat != null && message.hasOwnProperty('stat')) {
        let error = $root.fscache.FsNodeStat.verify(message.stat);
        if (error) return 'stat.' + error;
      }
      if (message.children != null && message.hasOwnProperty('children')) {
        if (!Array.isArray(message.children)) return 'children: array expected';
        for (let i = 0; i < message.children.length; ++i) {
          let error = $root.fscache.FsChildEntry.verify(message.children[i]);
          if (error) return 'children.' + error;
        }
      }
      if (message.resolvedPath != null && message.hasOwnProperty('resolvedPath'))
        if (!$util.isString(message.resolvedPath)) return 'resolvedPath: string expected';
      if (message.resolvedPathNative != null && message.hasOwnProperty('resolvedPathNative'))
        if (!$util.isString(message.resolvedPathNative))
          return 'resolvedPathNative: string expected';
      if (message.accessModes != null && message.hasOwnProperty('accessModes')) {
        if (!Array.isArray(message.accessModes)) return 'accessModes: array expected';
        for (let i = 0; i < message.accessModes.length; ++i) {
          let error = $root.fscache.AccessMode.verify(message.accessModes[i]);
          if (error) return 'accessModes.' + error;
        }
      }
      return null;
    };

    /**
     * Creates a FsNodeEntry message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof fscache.FsNodeEntry
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {fscache.FsNodeEntry} FsNodeEntry
     */
    FsNodeEntry.fromObject = function fromObject(object) {
      if (object instanceof $root.fscache.FsNodeEntry) return object;
      let message = new $root.fscache.FsNodeEntry();
      if (object.path != null) message.path = String(object.path);
      if (object.exists != null) message.exists = Boolean(object.exists);
      if (object.timestamp != null)
        if ($util.Long)
          (message.timestamp = $util.Long.fromValue(object.timestamp)).unsigned = false;
        else if (typeof object.timestamp === 'string')
          message.timestamp = parseInt(object.timestamp, 10);
        else if (typeof object.timestamp === 'number') message.timestamp = object.timestamp;
        else if (typeof object.timestamp === 'object')
          message.timestamp = new $util.LongBits(
            object.timestamp.low >>> 0,
            object.timestamp.high >>> 0,
          ).toNumber();
      if (object.type != null) message.type = String(object.type);
      if (object.content != null)
        if (typeof object.content === 'string')
          $util.base64.decode(
            object.content,
            (message.content = $util.newBuffer($util.base64.length(object.content))),
            0,
          );
        else if (object.content.length >= 0) message.content = object.content;
      if (object.encoding != null) message.encoding = String(object.encoding);
      if (object.stat != null) {
        if (typeof object.stat !== 'object')
          throw TypeError('.fscache.FsNodeEntry.stat: object expected');
        message.stat = $root.fscache.FsNodeStat.fromObject(object.stat);
      }
      if (object.children) {
        if (!Array.isArray(object.children))
          throw TypeError('.fscache.FsNodeEntry.children: array expected');
        message.children = [];
        for (let i = 0; i < object.children.length; ++i) {
          if (typeof object.children[i] !== 'object')
            throw TypeError('.fscache.FsNodeEntry.children: object expected');
          message.children[i] = $root.fscache.FsChildEntry.fromObject(object.children[i]);
        }
      }
      if (object.resolvedPath != null) message.resolvedPath = String(object.resolvedPath);
      if (object.resolvedPathNative != null)
        message.resolvedPathNative = String(object.resolvedPathNative);
      if (object.accessModes) {
        if (!Array.isArray(object.accessModes))
          throw TypeError('.fscache.FsNodeEntry.accessModes: array expected');
        message.accessModes = [];
        for (let i = 0; i < object.accessModes.length; ++i) {
          if (typeof object.accessModes[i] !== 'object')
            throw TypeError('.fscache.FsNodeEntry.accessModes: object expected');
          message.accessModes[i] = $root.fscache.AccessMode.fromObject(object.accessModes[i]);
        }
      }
      return message;
    };

    /**
     * Creates a plain object from a FsNodeEntry message. Also converts values to other types if specified.
     * @function toObject
     * @memberof fscache.FsNodeEntry
     * @static
     * @param {fscache.FsNodeEntry} message FsNodeEntry
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    FsNodeEntry.toObject = function toObject(message, options) {
      if (!options) options = {};
      let object = {};
      if (options.arrays || options.defaults) {
        object.children = [];
        object.accessModes = [];
      }
      if (options.defaults) {
        object.path = '';
        object.exists = false;
        if ($util.Long) {
          let long = new $util.Long(0, 0, false);
          object.timestamp =
            options.longs === String
              ? long.toString()
              : options.longs === Number
                ? long.toNumber()
                : long;
        } else object.timestamp = options.longs === String ? '0' : 0;
        object.type = '';
        if (options.bytes === String) object.content = '';
        else {
          object.content = [];
          if (options.bytes !== Array) object.content = $util.newBuffer(object.content);
        }
        object.encoding = '';
        object.stat = null;
        object.resolvedPath = '';
        object.resolvedPathNative = '';
      }
      if (message.path != null && message.hasOwnProperty('path')) object.path = message.path;
      if (message.exists != null && message.hasOwnProperty('exists'))
        object.exists = message.exists;
      if (message.timestamp != null && message.hasOwnProperty('timestamp'))
        if (typeof message.timestamp === 'number')
          object.timestamp =
            options.longs === String ? String(message.timestamp) : message.timestamp;
        else
          object.timestamp =
            options.longs === String
              ? $util.Long.prototype.toString.call(message.timestamp)
              : options.longs === Number
                ? new $util.LongBits(
                    message.timestamp.low >>> 0,
                    message.timestamp.high >>> 0,
                  ).toNumber()
                : message.timestamp;
      if (message.type != null && message.hasOwnProperty('type')) object.type = message.type;
      if (message.content != null && message.hasOwnProperty('content'))
        object.content =
          options.bytes === String
            ? $util.base64.encode(message.content, 0, message.content.length)
            : options.bytes === Array
              ? Array.prototype.slice.call(message.content)
              : message.content;
      if (message.encoding != null && message.hasOwnProperty('encoding'))
        object.encoding = message.encoding;
      if (message.stat != null && message.hasOwnProperty('stat'))
        object.stat = $root.fscache.FsNodeStat.toObject(message.stat, options);
      if (message.children && message.children.length) {
        object.children = [];
        for (let j = 0; j < message.children.length; ++j)
          object.children[j] = $root.fscache.FsChildEntry.toObject(message.children[j], options);
      }
      if (message.resolvedPath != null && message.hasOwnProperty('resolvedPath'))
        object.resolvedPath = message.resolvedPath;
      if (message.resolvedPathNative != null && message.hasOwnProperty('resolvedPathNative'))
        object.resolvedPathNative = message.resolvedPathNative;
      if (message.accessModes && message.accessModes.length) {
        object.accessModes = [];
        for (let j = 0; j < message.accessModes.length; ++j)
          object.accessModes[j] = $root.fscache.AccessMode.toObject(
            message.accessModes[j],
            options,
          );
      }
      return object;
    };

    /**
     * Converts this FsNodeEntry to JSON.
     * @function toJSON
     * @memberof fscache.FsNodeEntry
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    FsNodeEntry.prototype.toJSON = function toJSON() {
      return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for FsNodeEntry
     * @function getTypeUrl
     * @memberof fscache.FsNodeEntry
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    FsNodeEntry.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
      if (typeUrlPrefix === undefined) {
        typeUrlPrefix = 'type.googleapis.com';
      }
      return typeUrlPrefix + '/fscache.FsNodeEntry';
    };

    return FsNodeEntry;
  })();

  fscache.FsNodeStat = (function () {
    /**
     * Properties of a FsNodeStat.
     * @memberof fscache
     * @interface IFsNodeStat
     * @property {number|Long|null} [size] FsNodeStat size
     * @property {number|Long|null} [mtimeMs] FsNodeStat mtimeMs
     * @property {number|null} [mode] FsNodeStat mode
     * @property {boolean|null} [isFile] FsNodeStat isFile
     * @property {boolean|null} [isDirectory] FsNodeStat isDirectory
     * @property {boolean|null} [isSymbolicLink] FsNodeStat isSymbolicLink
     */

    /**
     * Constructs a new FsNodeStat.
     * @memberof fscache
     * @classdesc Represents a FsNodeStat.
     * @implements IFsNodeStat
     * @constructor
     * @param {fscache.IFsNodeStat=} [properties] Properties to set
     */
    function FsNodeStat(properties) {
      if (properties)
        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
          if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
    }

    /**
     * FsNodeStat size.
     * @member {number|Long} size
     * @memberof fscache.FsNodeStat
     * @instance
     */
    FsNodeStat.prototype.size = $util.Long ? $util.Long.fromBits(0, 0, false) : 0;

    /**
     * FsNodeStat mtimeMs.
     * @member {number|Long} mtimeMs
     * @memberof fscache.FsNodeStat
     * @instance
     */
    FsNodeStat.prototype.mtimeMs = $util.Long ? $util.Long.fromBits(0, 0, false) : 0;

    /**
     * FsNodeStat mode.
     * @member {number} mode
     * @memberof fscache.FsNodeStat
     * @instance
     */
    FsNodeStat.prototype.mode = 0;

    /**
     * FsNodeStat isFile.
     * @member {boolean} isFile
     * @memberof fscache.FsNodeStat
     * @instance
     */
    FsNodeStat.prototype.isFile = false;

    /**
     * FsNodeStat isDirectory.
     * @member {boolean} isDirectory
     * @memberof fscache.FsNodeStat
     * @instance
     */
    FsNodeStat.prototype.isDirectory = false;

    /**
     * FsNodeStat isSymbolicLink.
     * @member {boolean} isSymbolicLink
     * @memberof fscache.FsNodeStat
     * @instance
     */
    FsNodeStat.prototype.isSymbolicLink = false;

    /**
     * Creates a new FsNodeStat instance using the specified properties.
     * @function create
     * @memberof fscache.FsNodeStat
     * @static
     * @param {fscache.IFsNodeStat=} [properties] Properties to set
     * @returns {fscache.FsNodeStat} FsNodeStat instance
     */
    FsNodeStat.create = function create(properties) {
      return new FsNodeStat(properties);
    };

    /**
     * Encodes the specified FsNodeStat message. Does not implicitly {@link fscache.FsNodeStat.verify|verify} messages.
     * @function encode
     * @memberof fscache.FsNodeStat
     * @static
     * @param {fscache.IFsNodeStat} message FsNodeStat message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    FsNodeStat.encode = function encode(message, writer) {
      if (!writer) writer = $Writer.create();
      if (message.size != null && Object.hasOwnProperty.call(message, 'size'))
        writer.uint32(/* id 1, wireType 0 =*/ 8).int64(message.size);
      if (message.mtimeMs != null && Object.hasOwnProperty.call(message, 'mtimeMs'))
        writer.uint32(/* id 2, wireType 0 =*/ 16).int64(message.mtimeMs);
      if (message.mode != null && Object.hasOwnProperty.call(message, 'mode'))
        writer.uint32(/* id 3, wireType 0 =*/ 24).int32(message.mode);
      if (message.isFile != null && Object.hasOwnProperty.call(message, 'isFile'))
        writer.uint32(/* id 4, wireType 0 =*/ 32).bool(message.isFile);
      if (message.isDirectory != null && Object.hasOwnProperty.call(message, 'isDirectory'))
        writer.uint32(/* id 5, wireType 0 =*/ 40).bool(message.isDirectory);
      if (message.isSymbolicLink != null && Object.hasOwnProperty.call(message, 'isSymbolicLink'))
        writer.uint32(/* id 6, wireType 0 =*/ 48).bool(message.isSymbolicLink);
      return writer;
    };

    /**
     * Encodes the specified FsNodeStat message, length delimited. Does not implicitly {@link fscache.FsNodeStat.verify|verify} messages.
     * @function encodeDelimited
     * @memberof fscache.FsNodeStat
     * @static
     * @param {fscache.IFsNodeStat} message FsNodeStat message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    FsNodeStat.encodeDelimited = function encodeDelimited(message, writer) {
      return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a FsNodeStat message from the specified reader or buffer.
     * @function decode
     * @memberof fscache.FsNodeStat
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {fscache.FsNodeStat} FsNodeStat
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    FsNodeStat.decode = function decode(reader, length, error) {
      if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length,
        message = new $root.fscache.FsNodeStat();
      while (reader.pos < end) {
        let tag = reader.uint32();
        if (tag === error) break;
        switch (tag >>> 3) {
          case 1: {
            message.size = reader.int64();
            break;
          }
          case 2: {
            message.mtimeMs = reader.int64();
            break;
          }
          case 3: {
            message.mode = reader.int32();
            break;
          }
          case 4: {
            message.isFile = reader.bool();
            break;
          }
          case 5: {
            message.isDirectory = reader.bool();
            break;
          }
          case 6: {
            message.isSymbolicLink = reader.bool();
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
     * Decodes a FsNodeStat message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof fscache.FsNodeStat
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {fscache.FsNodeStat} FsNodeStat
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    FsNodeStat.decodeDelimited = function decodeDelimited(reader) {
      if (!(reader instanceof $Reader)) reader = new $Reader(reader);
      return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a FsNodeStat message.
     * @function verify
     * @memberof fscache.FsNodeStat
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    FsNodeStat.verify = function verify(message) {
      if (typeof message !== 'object' || message === null) return 'object expected';
      if (message.size != null && message.hasOwnProperty('size'))
        if (
          !$util.isInteger(message.size) &&
          !(message.size && $util.isInteger(message.size.low) && $util.isInteger(message.size.high))
        )
          return 'size: integer|Long expected';
      if (message.mtimeMs != null && message.hasOwnProperty('mtimeMs'))
        if (
          !$util.isInteger(message.mtimeMs) &&
          !(
            message.mtimeMs &&
            $util.isInteger(message.mtimeMs.low) &&
            $util.isInteger(message.mtimeMs.high)
          )
        )
          return 'mtimeMs: integer|Long expected';
      if (message.mode != null && message.hasOwnProperty('mode'))
        if (!$util.isInteger(message.mode)) return 'mode: integer expected';
      if (message.isFile != null && message.hasOwnProperty('isFile'))
        if (typeof message.isFile !== 'boolean') return 'isFile: boolean expected';
      if (message.isDirectory != null && message.hasOwnProperty('isDirectory'))
        if (typeof message.isDirectory !== 'boolean') return 'isDirectory: boolean expected';
      if (message.isSymbolicLink != null && message.hasOwnProperty('isSymbolicLink'))
        if (typeof message.isSymbolicLink !== 'boolean') return 'isSymbolicLink: boolean expected';
      return null;
    };

    /**
     * Creates a FsNodeStat message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof fscache.FsNodeStat
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {fscache.FsNodeStat} FsNodeStat
     */
    FsNodeStat.fromObject = function fromObject(object) {
      if (object instanceof $root.fscache.FsNodeStat) return object;
      let message = new $root.fscache.FsNodeStat();
      if (object.size != null)
        if ($util.Long) (message.size = $util.Long.fromValue(object.size)).unsigned = false;
        else if (typeof object.size === 'string') message.size = parseInt(object.size, 10);
        else if (typeof object.size === 'number') message.size = object.size;
        else if (typeof object.size === 'object')
          message.size = new $util.LongBits(
            object.size.low >>> 0,
            object.size.high >>> 0,
          ).toNumber();
      if (object.mtimeMs != null)
        if ($util.Long) (message.mtimeMs = $util.Long.fromValue(object.mtimeMs)).unsigned = false;
        else if (typeof object.mtimeMs === 'string') message.mtimeMs = parseInt(object.mtimeMs, 10);
        else if (typeof object.mtimeMs === 'number') message.mtimeMs = object.mtimeMs;
        else if (typeof object.mtimeMs === 'object')
          message.mtimeMs = new $util.LongBits(
            object.mtimeMs.low >>> 0,
            object.mtimeMs.high >>> 0,
          ).toNumber();
      if (object.mode != null) message.mode = object.mode | 0;
      if (object.isFile != null) message.isFile = Boolean(object.isFile);
      if (object.isDirectory != null) message.isDirectory = Boolean(object.isDirectory);
      if (object.isSymbolicLink != null) message.isSymbolicLink = Boolean(object.isSymbolicLink);
      return message;
    };

    /**
     * Creates a plain object from a FsNodeStat message. Also converts values to other types if specified.
     * @function toObject
     * @memberof fscache.FsNodeStat
     * @static
     * @param {fscache.FsNodeStat} message FsNodeStat
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    FsNodeStat.toObject = function toObject(message, options) {
      if (!options) options = {};
      let object = {};
      if (options.defaults) {
        if ($util.Long) {
          let long = new $util.Long(0, 0, false);
          object.size =
            options.longs === String
              ? long.toString()
              : options.longs === Number
                ? long.toNumber()
                : long;
        } else object.size = options.longs === String ? '0' : 0;
        if ($util.Long) {
          let long = new $util.Long(0, 0, false);
          object.mtimeMs =
            options.longs === String
              ? long.toString()
              : options.longs === Number
                ? long.toNumber()
                : long;
        } else object.mtimeMs = options.longs === String ? '0' : 0;
        object.mode = 0;
        object.isFile = false;
        object.isDirectory = false;
        object.isSymbolicLink = false;
      }
      if (message.size != null && message.hasOwnProperty('size'))
        if (typeof message.size === 'number')
          object.size = options.longs === String ? String(message.size) : message.size;
        else
          object.size =
            options.longs === String
              ? $util.Long.prototype.toString.call(message.size)
              : options.longs === Number
                ? new $util.LongBits(message.size.low >>> 0, message.size.high >>> 0).toNumber()
                : message.size;
      if (message.mtimeMs != null && message.hasOwnProperty('mtimeMs'))
        if (typeof message.mtimeMs === 'number')
          object.mtimeMs = options.longs === String ? String(message.mtimeMs) : message.mtimeMs;
        else
          object.mtimeMs =
            options.longs === String
              ? $util.Long.prototype.toString.call(message.mtimeMs)
              : options.longs === Number
                ? new $util.LongBits(
                    message.mtimeMs.low >>> 0,
                    message.mtimeMs.high >>> 0,
                  ).toNumber()
                : message.mtimeMs;
      if (message.mode != null && message.hasOwnProperty('mode')) object.mode = message.mode;
      if (message.isFile != null && message.hasOwnProperty('isFile'))
        object.isFile = message.isFile;
      if (message.isDirectory != null && message.hasOwnProperty('isDirectory'))
        object.isDirectory = message.isDirectory;
      if (message.isSymbolicLink != null && message.hasOwnProperty('isSymbolicLink'))
        object.isSymbolicLink = message.isSymbolicLink;
      return object;
    };

    /**
     * Converts this FsNodeStat to JSON.
     * @function toJSON
     * @memberof fscache.FsNodeStat
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    FsNodeStat.prototype.toJSON = function toJSON() {
      return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for FsNodeStat
     * @function getTypeUrl
     * @memberof fscache.FsNodeStat
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    FsNodeStat.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
      if (typeUrlPrefix === undefined) {
        typeUrlPrefix = 'type.googleapis.com';
      }
      return typeUrlPrefix + '/fscache.FsNodeStat';
    };

    return FsNodeStat;
  })();

  fscache.FsChildEntry = (function () {
    /**
     * Properties of a FsChildEntry.
     * @memberof fscache
     * @interface IFsChildEntry
     * @property {string|null} [name] FsChildEntry name
     * @property {string|null} [type] FsChildEntry type
     */

    /**
     * Constructs a new FsChildEntry.
     * @memberof fscache
     * @classdesc Represents a FsChildEntry.
     * @implements IFsChildEntry
     * @constructor
     * @param {fscache.IFsChildEntry=} [properties] Properties to set
     */
    function FsChildEntry(properties) {
      if (properties)
        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
          if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
    }

    /**
     * FsChildEntry name.
     * @member {string} name
     * @memberof fscache.FsChildEntry
     * @instance
     */
    FsChildEntry.prototype.name = '';

    /**
     * FsChildEntry type.
     * @member {string} type
     * @memberof fscache.FsChildEntry
     * @instance
     */
    FsChildEntry.prototype.type = '';

    /**
     * Creates a new FsChildEntry instance using the specified properties.
     * @function create
     * @memberof fscache.FsChildEntry
     * @static
     * @param {fscache.IFsChildEntry=} [properties] Properties to set
     * @returns {fscache.FsChildEntry} FsChildEntry instance
     */
    FsChildEntry.create = function create(properties) {
      return new FsChildEntry(properties);
    };

    /**
     * Encodes the specified FsChildEntry message. Does not implicitly {@link fscache.FsChildEntry.verify|verify} messages.
     * @function encode
     * @memberof fscache.FsChildEntry
     * @static
     * @param {fscache.IFsChildEntry} message FsChildEntry message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    FsChildEntry.encode = function encode(message, writer) {
      if (!writer) writer = $Writer.create();
      if (message.name != null && Object.hasOwnProperty.call(message, 'name'))
        writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.name);
      if (message.type != null && Object.hasOwnProperty.call(message, 'type'))
        writer.uint32(/* id 2, wireType 2 =*/ 18).string(message.type);
      return writer;
    };

    /**
     * Encodes the specified FsChildEntry message, length delimited. Does not implicitly {@link fscache.FsChildEntry.verify|verify} messages.
     * @function encodeDelimited
     * @memberof fscache.FsChildEntry
     * @static
     * @param {fscache.IFsChildEntry} message FsChildEntry message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    FsChildEntry.encodeDelimited = function encodeDelimited(message, writer) {
      return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a FsChildEntry message from the specified reader or buffer.
     * @function decode
     * @memberof fscache.FsChildEntry
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {fscache.FsChildEntry} FsChildEntry
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    FsChildEntry.decode = function decode(reader, length, error) {
      if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length,
        message = new $root.fscache.FsChildEntry();
      while (reader.pos < end) {
        let tag = reader.uint32();
        if (tag === error) break;
        switch (tag >>> 3) {
          case 1: {
            message.name = reader.string();
            break;
          }
          case 2: {
            message.type = reader.string();
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
     * Decodes a FsChildEntry message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof fscache.FsChildEntry
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {fscache.FsChildEntry} FsChildEntry
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    FsChildEntry.decodeDelimited = function decodeDelimited(reader) {
      if (!(reader instanceof $Reader)) reader = new $Reader(reader);
      return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a FsChildEntry message.
     * @function verify
     * @memberof fscache.FsChildEntry
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    FsChildEntry.verify = function verify(message) {
      if (typeof message !== 'object' || message === null) return 'object expected';
      if (message.name != null && message.hasOwnProperty('name'))
        if (!$util.isString(message.name)) return 'name: string expected';
      if (message.type != null && message.hasOwnProperty('type'))
        if (!$util.isString(message.type)) return 'type: string expected';
      return null;
    };

    /**
     * Creates a FsChildEntry message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof fscache.FsChildEntry
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {fscache.FsChildEntry} FsChildEntry
     */
    FsChildEntry.fromObject = function fromObject(object) {
      if (object instanceof $root.fscache.FsChildEntry) return object;
      let message = new $root.fscache.FsChildEntry();
      if (object.name != null) message.name = String(object.name);
      if (object.type != null) message.type = String(object.type);
      return message;
    };

    /**
     * Creates a plain object from a FsChildEntry message. Also converts values to other types if specified.
     * @function toObject
     * @memberof fscache.FsChildEntry
     * @static
     * @param {fscache.FsChildEntry} message FsChildEntry
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    FsChildEntry.toObject = function toObject(message, options) {
      if (!options) options = {};
      let object = {};
      if (options.defaults) {
        object.name = '';
        object.type = '';
      }
      if (message.name != null && message.hasOwnProperty('name')) object.name = message.name;
      if (message.type != null && message.hasOwnProperty('type')) object.type = message.type;
      return object;
    };

    /**
     * Converts this FsChildEntry to JSON.
     * @function toJSON
     * @memberof fscache.FsChildEntry
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    FsChildEntry.prototype.toJSON = function toJSON() {
      return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for FsChildEntry
     * @function getTypeUrl
     * @memberof fscache.FsChildEntry
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    FsChildEntry.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
      if (typeUrlPrefix === undefined) {
        typeUrlPrefix = 'type.googleapis.com';
      }
      return typeUrlPrefix + '/fscache.FsChildEntry';
    };

    return FsChildEntry;
  })();

  fscache.AccessMode = (function () {
    /**
     * Properties of an AccessMode.
     * @memberof fscache
     * @interface IAccessMode
     * @property {number|null} [mode] AccessMode mode
     * @property {boolean|null} [accessible] AccessMode accessible
     */

    /**
     * Constructs a new AccessMode.
     * @memberof fscache
     * @classdesc Represents an AccessMode.
     * @implements IAccessMode
     * @constructor
     * @param {fscache.IAccessMode=} [properties] Properties to set
     */
    function AccessMode(properties) {
      if (properties)
        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
          if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
    }

    /**
     * AccessMode mode.
     * @member {number} mode
     * @memberof fscache.AccessMode
     * @instance
     */
    AccessMode.prototype.mode = 0;

    /**
     * AccessMode accessible.
     * @member {boolean} accessible
     * @memberof fscache.AccessMode
     * @instance
     */
    AccessMode.prototype.accessible = false;

    /**
     * Creates a new AccessMode instance using the specified properties.
     * @function create
     * @memberof fscache.AccessMode
     * @static
     * @param {fscache.IAccessMode=} [properties] Properties to set
     * @returns {fscache.AccessMode} AccessMode instance
     */
    AccessMode.create = function create(properties) {
      return new AccessMode(properties);
    };

    /**
     * Encodes the specified AccessMode message. Does not implicitly {@link fscache.AccessMode.verify|verify} messages.
     * @function encode
     * @memberof fscache.AccessMode
     * @static
     * @param {fscache.IAccessMode} message AccessMode message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    AccessMode.encode = function encode(message, writer) {
      if (!writer) writer = $Writer.create();
      if (message.mode != null && Object.hasOwnProperty.call(message, 'mode'))
        writer.uint32(/* id 1, wireType 0 =*/ 8).int32(message.mode);
      if (message.accessible != null && Object.hasOwnProperty.call(message, 'accessible'))
        writer.uint32(/* id 2, wireType 0 =*/ 16).bool(message.accessible);
      return writer;
    };

    /**
     * Encodes the specified AccessMode message, length delimited. Does not implicitly {@link fscache.AccessMode.verify|verify} messages.
     * @function encodeDelimited
     * @memberof fscache.AccessMode
     * @static
     * @param {fscache.IAccessMode} message AccessMode message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    AccessMode.encodeDelimited = function encodeDelimited(message, writer) {
      return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes an AccessMode message from the specified reader or buffer.
     * @function decode
     * @memberof fscache.AccessMode
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {fscache.AccessMode} AccessMode
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    AccessMode.decode = function decode(reader, length, error) {
      if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length,
        message = new $root.fscache.AccessMode();
      while (reader.pos < end) {
        let tag = reader.uint32();
        if (tag === error) break;
        switch (tag >>> 3) {
          case 1: {
            message.mode = reader.int32();
            break;
          }
          case 2: {
            message.accessible = reader.bool();
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
     * Decodes an AccessMode message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof fscache.AccessMode
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {fscache.AccessMode} AccessMode
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    AccessMode.decodeDelimited = function decodeDelimited(reader) {
      if (!(reader instanceof $Reader)) reader = new $Reader(reader);
      return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies an AccessMode message.
     * @function verify
     * @memberof fscache.AccessMode
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    AccessMode.verify = function verify(message) {
      if (typeof message !== 'object' || message === null) return 'object expected';
      if (message.mode != null && message.hasOwnProperty('mode'))
        if (!$util.isInteger(message.mode)) return 'mode: integer expected';
      if (message.accessible != null && message.hasOwnProperty('accessible'))
        if (typeof message.accessible !== 'boolean') return 'accessible: boolean expected';
      return null;
    };

    /**
     * Creates an AccessMode message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof fscache.AccessMode
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {fscache.AccessMode} AccessMode
     */
    AccessMode.fromObject = function fromObject(object) {
      if (object instanceof $root.fscache.AccessMode) return object;
      let message = new $root.fscache.AccessMode();
      if (object.mode != null) message.mode = object.mode | 0;
      if (object.accessible != null) message.accessible = Boolean(object.accessible);
      return message;
    };

    /**
     * Creates a plain object from an AccessMode message. Also converts values to other types if specified.
     * @function toObject
     * @memberof fscache.AccessMode
     * @static
     * @param {fscache.AccessMode} message AccessMode
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    AccessMode.toObject = function toObject(message, options) {
      if (!options) options = {};
      let object = {};
      if (options.defaults) {
        object.mode = 0;
        object.accessible = false;
      }
      if (message.mode != null && message.hasOwnProperty('mode')) object.mode = message.mode;
      if (message.accessible != null && message.hasOwnProperty('accessible'))
        object.accessible = message.accessible;
      return object;
    };

    /**
     * Converts this AccessMode to JSON.
     * @function toJSON
     * @memberof fscache.AccessMode
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    AccessMode.prototype.toJSON = function toJSON() {
      return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for AccessMode
     * @function getTypeUrl
     * @memberof fscache.AccessMode
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    AccessMode.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
      if (typeUrlPrefix === undefined) {
        typeUrlPrefix = 'type.googleapis.com';
      }
      return typeUrlPrefix + '/fscache.AccessMode';
    };

    return AccessMode;
  })();

  return fscache;
})());

export { $root as default };
