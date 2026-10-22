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
import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  binHeaderSize,
  writeBinHeader,
  MSGPACK_FIXARRAY3,
  MSGPACK_UINT8,
  MSGPACK_BIN8,
  MSGPACK_BIN16,
  MSGPACK_BIN32,
} from '#tsgo-wasm-msgpack';
import { createPipe, Pipe } from './pipe.mjs';

// The upstream sync SDK's unversioned MessagePack protocol, with shared memory
// replacing OS pipes. Preparation verifies that the SDK and WASM share a commit.
export class SyncRpcChannel {
  callbacks = new Map();
  lastBytesSent = 0;
  lastBytesReceived = 0;
  readBuffer = Buffer.alloc(65536);
  readOffset = 0;
  readLength = 0;

  constructor(executable, args) {
    const input = createPipe(),
      output = createPipe();
    this.input = new Pipe(input, 180_000);
    this.output = new Pipe(output, 180_000);
    this.worker = new Worker(pathToFileURL(path.join(path.dirname(executable), 'worker.mjs')), {
      workerData: { executable, args, input, output },
      // Do not inherit tsx/test/coverage loaders into the prebuilt WASM worker.
      execArgv: [],
    });
    this.worker.on('error', () => this.close());
    this.worker.unref();
  }

  registerCallback(name, callback) {
    this.callbacks.set(name, callback);
  }
  unregisterCallback(name) {
    this.callbacks.delete(name);
  }
  requestSync(method, payload) {
    return this.requestBinarySync(method, Buffer.from(payload)).toString('utf8');
  }

  requestBinarySync(method, payload) {
    this.lastBytesSent = payload.length;
    this.writeTuple(1, method, payload);
    for (;;) {
      const { type, name, data } = this.readTuple();
      if (type === 4 && name === method) {
        this.lastBytesReceived = data.length;
        return data;
      }
      if (type === 5 && name === method) throw new Error(data.toString('utf8'));
      if (type !== 6) throw new Error(`Unexpected TSGo WASM response: ${type} ${name}`);
      try {
        const callback = this.callbacks.get(name);
        if (!callback) throw new Error(`Unknown callback: ${name}`);
        this.writeTuple(2, name, Buffer.from(callback(name, data.toString('utf8'))));
      } catch (cause) {
        // A callback failure leaves an unread response. Discard this session.
        this.close();
        throw new Error(`TSGo WASM callback ${name}: ${cause.message}`, { cause });
      }
    }
  }

  writeTuple(type, name, data) {
    const encoded = Buffer.from(name);
    const buffer = Buffer.allocUnsafe(
      2 + binHeaderSize(encoded.length) + encoded.length + binHeaderSize(data.length) + data.length,
    );
    buffer[0] = MSGPACK_FIXARRAY3;
    buffer[1] = type;
    let offset = writeBinHeader(buffer, 2, encoded.length);
    encoded.copy(buffer, offset);
    offset += encoded.length;
    offset = writeBinHeader(buffer, offset, data.length);
    buffer.set(data, offset);
    this.input.write(buffer);
  }

  byte() {
    if (this.readOffset === this.readLength) {
      this.readLength = this.output.read(this.readBuffer);
      this.readOffset = 0;
    }
    return this.readBuffer[this.readOffset++];
  }

  binary() {
    const marker = this.byte();
    let length;
    if (marker === MSGPACK_BIN8) length = this.byte();
    else if (marker === MSGPACK_BIN16) length = this.byte() * 256 + this.byte();
    else if (marker === MSGPACK_BIN32)
      length = this.byte() * 16777216 + this.byte() * 65536 + this.byte() * 256 + this.byte();
    else throw new Error(`Invalid TSGo WASM binary marker: ${marker}`);
    if (length > 1024 * 1024 * 1024) throw new Error('TSGo WASM response exceeds 1 GiB');
    // AST decoding addresses the backing ArrayBuffer from offset zero.
    const result = Buffer.allocUnsafeSlow(length);
    for (let offset = 0; offset < length;) {
      if (this.readOffset === this.readLength) {
        this.readLength = this.output.read(this.readBuffer);
        this.readOffset = 0;
      }
      const count = Math.min(length - offset, this.readLength - this.readOffset);
      this.readBuffer.copy(result, offset, this.readOffset, this.readOffset + count);
      this.readOffset += count;
      offset += count;
    }
    return result;
  }

  readTuple() {
    if (this.byte() !== MSGPACK_FIXARRAY3) throw new Error('Invalid TSGo WASM tuple');
    const marker = this.byte();
    const type = marker === MSGPACK_UINT8 ? this.byte() : marker;
    return { type, name: this.binary().toString('utf8'), data: this.binary() };
  }

  close() {
    this.input.close();
    this.output.close();
    void this.worker.terminate();
  }
}
