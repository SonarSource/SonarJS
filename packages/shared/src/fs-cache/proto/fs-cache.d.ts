import * as $protobuf from 'protobufjs';
import Long = require('long');
/** Namespace fscache. */
export namespace fscache {
  /** Properties of a FsCacheData. */
  interface IFsCacheData {
    /** FsCacheData projectId */
    projectId?: string | null;

    /** FsCacheData createdAt */
    createdAt?: number | Long | null;

    /** FsCacheData lastModified */
    lastModified?: number | Long | null;

    /** FsCacheData nodes */
    nodes?: fscache.IFsNodeEntry[] | null;
  }

  /** Represents a FsCacheData. */
  class FsCacheData implements IFsCacheData {
    /**
     * Constructs a new FsCacheData.
     * @param [properties] Properties to set
     */
    constructor(properties?: fscache.IFsCacheData);

    /** FsCacheData projectId. */
    public projectId: string;

    /** FsCacheData createdAt. */
    public createdAt: number | Long;

    /** FsCacheData lastModified. */
    public lastModified: number | Long;

    /** FsCacheData nodes. */
    public nodes: fscache.IFsNodeEntry[];

    /**
     * Creates a new FsCacheData instance using the specified properties.
     * @param [properties] Properties to set
     * @returns FsCacheData instance
     */
    public static create(properties?: fscache.IFsCacheData): fscache.FsCacheData;

    /**
     * Encodes the specified FsCacheData message. Does not implicitly {@link fscache.FsCacheData.verify|verify} messages.
     * @param message FsCacheData message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: fscache.IFsCacheData,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified FsCacheData message, length delimited. Does not implicitly {@link fscache.FsCacheData.verify|verify} messages.
     * @param message FsCacheData message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: fscache.IFsCacheData,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a FsCacheData message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns FsCacheData
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): fscache.FsCacheData;

    /**
     * Decodes a FsCacheData message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns FsCacheData
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): fscache.FsCacheData;

    /**
     * Verifies a FsCacheData message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a FsCacheData message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns FsCacheData
     */
    public static fromObject(object: { [k: string]: any }): fscache.FsCacheData;

    /**
     * Creates a plain object from a FsCacheData message. Also converts values to other types if specified.
     * @param message FsCacheData
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: fscache.FsCacheData,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this FsCacheData to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for FsCacheData
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a FsNodeEntry. */
  interface IFsNodeEntry {
    /** FsNodeEntry path */
    path?: string | null;

    /** FsNodeEntry exists */
    exists?: boolean | null;

    /** FsNodeEntry timestamp */
    timestamp?: number | Long | null;

    /** FsNodeEntry type */
    type?: string | null;

    /** FsNodeEntry content */
    content?: Uint8Array | null;

    /** FsNodeEntry encoding */
    encoding?: string | null;

    /** FsNodeEntry stat */
    stat?: fscache.IFsNodeStat | null;

    /** FsNodeEntry children */
    children?: fscache.IFsChildEntry[] | null;

    /** FsNodeEntry resolvedPath */
    resolvedPath?: string | null;

    /** FsNodeEntry resolvedPathNative */
    resolvedPathNative?: string | null;

    /** FsNodeEntry accessModes */
    accessModes?: fscache.IAccessMode[] | null;
  }

  /** Represents a FsNodeEntry. */
  class FsNodeEntry implements IFsNodeEntry {
    /**
     * Constructs a new FsNodeEntry.
     * @param [properties] Properties to set
     */
    constructor(properties?: fscache.IFsNodeEntry);

    /** FsNodeEntry path. */
    public path: string;

    /** FsNodeEntry exists. */
    public exists: boolean;

    /** FsNodeEntry timestamp. */
    public timestamp: number | Long;

    /** FsNodeEntry type. */
    public type: string;

    /** FsNodeEntry content. */
    public content: Uint8Array;

    /** FsNodeEntry encoding. */
    public encoding: string;

    /** FsNodeEntry stat. */
    public stat?: fscache.IFsNodeStat | null;

    /** FsNodeEntry children. */
    public children: fscache.IFsChildEntry[];

    /** FsNodeEntry resolvedPath. */
    public resolvedPath: string;

    /** FsNodeEntry resolvedPathNative. */
    public resolvedPathNative: string;

    /** FsNodeEntry accessModes. */
    public accessModes: fscache.IAccessMode[];

    /**
     * Creates a new FsNodeEntry instance using the specified properties.
     * @param [properties] Properties to set
     * @returns FsNodeEntry instance
     */
    public static create(properties?: fscache.IFsNodeEntry): fscache.FsNodeEntry;

    /**
     * Encodes the specified FsNodeEntry message. Does not implicitly {@link fscache.FsNodeEntry.verify|verify} messages.
     * @param message FsNodeEntry message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: fscache.IFsNodeEntry,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified FsNodeEntry message, length delimited. Does not implicitly {@link fscache.FsNodeEntry.verify|verify} messages.
     * @param message FsNodeEntry message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: fscache.IFsNodeEntry,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a FsNodeEntry message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns FsNodeEntry
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): fscache.FsNodeEntry;

    /**
     * Decodes a FsNodeEntry message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns FsNodeEntry
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): fscache.FsNodeEntry;

    /**
     * Verifies a FsNodeEntry message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a FsNodeEntry message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns FsNodeEntry
     */
    public static fromObject(object: { [k: string]: any }): fscache.FsNodeEntry;

    /**
     * Creates a plain object from a FsNodeEntry message. Also converts values to other types if specified.
     * @param message FsNodeEntry
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: fscache.FsNodeEntry,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this FsNodeEntry to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for FsNodeEntry
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a FsNodeStat. */
  interface IFsNodeStat {
    /** FsNodeStat size */
    size?: number | Long | null;

    /** FsNodeStat mtimeMs */
    mtimeMs?: number | Long | null;

    /** FsNodeStat mode */
    mode?: number | null;

    /** FsNodeStat isFile */
    isFile?: boolean | null;

    /** FsNodeStat isDirectory */
    isDirectory?: boolean | null;

    /** FsNodeStat isSymbolicLink */
    isSymbolicLink?: boolean | null;
  }

  /** Represents a FsNodeStat. */
  class FsNodeStat implements IFsNodeStat {
    /**
     * Constructs a new FsNodeStat.
     * @param [properties] Properties to set
     */
    constructor(properties?: fscache.IFsNodeStat);

    /** FsNodeStat size. */
    public size: number | Long;

    /** FsNodeStat mtimeMs. */
    public mtimeMs: number | Long;

    /** FsNodeStat mode. */
    public mode: number;

    /** FsNodeStat isFile. */
    public isFile: boolean;

    /** FsNodeStat isDirectory. */
    public isDirectory: boolean;

    /** FsNodeStat isSymbolicLink. */
    public isSymbolicLink: boolean;

    /**
     * Creates a new FsNodeStat instance using the specified properties.
     * @param [properties] Properties to set
     * @returns FsNodeStat instance
     */
    public static create(properties?: fscache.IFsNodeStat): fscache.FsNodeStat;

    /**
     * Encodes the specified FsNodeStat message. Does not implicitly {@link fscache.FsNodeStat.verify|verify} messages.
     * @param message FsNodeStat message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: fscache.IFsNodeStat, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified FsNodeStat message, length delimited. Does not implicitly {@link fscache.FsNodeStat.verify|verify} messages.
     * @param message FsNodeStat message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: fscache.IFsNodeStat,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a FsNodeStat message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns FsNodeStat
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): fscache.FsNodeStat;

    /**
     * Decodes a FsNodeStat message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns FsNodeStat
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): fscache.FsNodeStat;

    /**
     * Verifies a FsNodeStat message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a FsNodeStat message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns FsNodeStat
     */
    public static fromObject(object: { [k: string]: any }): fscache.FsNodeStat;

    /**
     * Creates a plain object from a FsNodeStat message. Also converts values to other types if specified.
     * @param message FsNodeStat
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: fscache.FsNodeStat,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this FsNodeStat to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for FsNodeStat
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a FsChildEntry. */
  interface IFsChildEntry {
    /** FsChildEntry name */
    name?: string | null;

    /** FsChildEntry type */
    type?: string | null;
  }

  /** Represents a FsChildEntry. */
  class FsChildEntry implements IFsChildEntry {
    /**
     * Constructs a new FsChildEntry.
     * @param [properties] Properties to set
     */
    constructor(properties?: fscache.IFsChildEntry);

    /** FsChildEntry name. */
    public name: string;

    /** FsChildEntry type. */
    public type: string;

    /**
     * Creates a new FsChildEntry instance using the specified properties.
     * @param [properties] Properties to set
     * @returns FsChildEntry instance
     */
    public static create(properties?: fscache.IFsChildEntry): fscache.FsChildEntry;

    /**
     * Encodes the specified FsChildEntry message. Does not implicitly {@link fscache.FsChildEntry.verify|verify} messages.
     * @param message FsChildEntry message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: fscache.IFsChildEntry,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified FsChildEntry message, length delimited. Does not implicitly {@link fscache.FsChildEntry.verify|verify} messages.
     * @param message FsChildEntry message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: fscache.IFsChildEntry,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a FsChildEntry message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns FsChildEntry
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): fscache.FsChildEntry;

    /**
     * Decodes a FsChildEntry message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns FsChildEntry
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): fscache.FsChildEntry;

    /**
     * Verifies a FsChildEntry message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a FsChildEntry message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns FsChildEntry
     */
    public static fromObject(object: { [k: string]: any }): fscache.FsChildEntry;

    /**
     * Creates a plain object from a FsChildEntry message. Also converts values to other types if specified.
     * @param message FsChildEntry
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: fscache.FsChildEntry,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this FsChildEntry to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for FsChildEntry
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an AccessMode. */
  interface IAccessMode {
    /** AccessMode mode */
    mode?: number | null;

    /** AccessMode accessible */
    accessible?: boolean | null;
  }

  /** Represents an AccessMode. */
  class AccessMode implements IAccessMode {
    /**
     * Constructs a new AccessMode.
     * @param [properties] Properties to set
     */
    constructor(properties?: fscache.IAccessMode);

    /** AccessMode mode. */
    public mode: number;

    /** AccessMode accessible. */
    public accessible: boolean;

    /**
     * Creates a new AccessMode instance using the specified properties.
     * @param [properties] Properties to set
     * @returns AccessMode instance
     */
    public static create(properties?: fscache.IAccessMode): fscache.AccessMode;

    /**
     * Encodes the specified AccessMode message. Does not implicitly {@link fscache.AccessMode.verify|verify} messages.
     * @param message AccessMode message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: fscache.IAccessMode, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified AccessMode message, length delimited. Does not implicitly {@link fscache.AccessMode.verify|verify} messages.
     * @param message AccessMode message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: fscache.IAccessMode,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an AccessMode message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns AccessMode
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): fscache.AccessMode;

    /**
     * Decodes an AccessMode message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns AccessMode
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): fscache.AccessMode;

    /**
     * Verifies an AccessMode message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an AccessMode message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns AccessMode
     */
    public static fromObject(object: { [k: string]: any }): fscache.AccessMode;

    /**
     * Creates a plain object from an AccessMode message. Also converts values to other types if specified.
     * @param message AccessMode
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: fscache.AccessMode,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this AccessMode to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for AccessMode
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }
}
