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
// A bounded byte stream shared by the synchronous caller and the WASM worker.
// Each direction has one producer and one consumer; large messages stream in chunks.
export function createPipe(capacity = 1024 * 1024) {
  return new SharedArrayBuffer(12 + capacity);
}

export class Pipe {
  constructor(buffer, timeout = Infinity) {
    this.state = new Int32Array(buffer, 0, 3);
    this.bytes = new Uint8Array(buffer, 12);
    this.offset = 0;
    this.timeout = timeout;
  }

  wait(expected) {
    if (Atomics.load(this.state, 2)) throw new Error('TSGo WASM channel is closed');
    if (Atomics.wait(this.state, 0, expected, this.timeout) === 'timed-out') {
      this.close();
      throw new Error('TSGo WASM channel timed out');
    }
  }

  read(target) {
    while (Atomics.load(this.state, 0) === 0) this.wait(0);
    if (Atomics.load(this.state, 2)) throw new Error('TSGo WASM channel is closed');
    const count = Math.min(target.length, Atomics.load(this.state, 1) - this.offset);
    target.set(this.bytes.subarray(this.offset, this.offset + count));
    this.offset += count;
    if (this.offset === Atomics.load(this.state, 1)) {
      this.offset = 0;
      Atomics.store(this.state, 0, 0);
      Atomics.notify(this.state, 0);
    }
    return count;
  }

  write(source) {
    for (let offset = 0; offset < source.length;) {
      while (Atomics.load(this.state, 0) === 1) this.wait(1);
      if (Atomics.load(this.state, 2)) throw new Error('TSGo WASM channel is closed');
      const count = Math.min(source.length - offset, this.bytes.length);
      this.bytes.set(source.subarray(offset, offset + count));
      Atomics.store(this.state, 1, count);
      Atomics.store(this.state, 0, 1);
      Atomics.notify(this.state, 0);
      offset += count;
    }
  }

  close() {
    Atomics.store(this.state, 2, 1);
    // Change the waited-on value as well: a close between the reader's check
    // and Atomics.wait must not lose its notification and wait forever.
    Atomics.store(this.state, 0, -1);
    Atomics.notify(this.state, 0);
  }
}
