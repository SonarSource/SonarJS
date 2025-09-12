/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import v8 from 'node:v8';
import os from 'node:os';
import { readFile } from 'node:fs/promises';
import { constants, NodeGCPerformanceDetail, PerformanceObserver } from 'node:perf_hooks';
import { debug, error, info, warn } from '../../shared/src/helpers/logging.js';

const MB = 1024 * 1024;

export async function logMemoryConfiguration() {
  const osMem = Math.floor(os.totalmem() / MB);
  const heapSize = getHeapSize();
  const dockerMemLimit = await readDockerMemoryLimit();
  const dockerMem = dockerMemLimit ? `, Docker (${dockerMemLimit} MB),` : ',';
  info(`Memory configuration: OS (${osMem} MB)${dockerMem} Node.js (${heapSize} MB).`);
  if (heapSize > osMem) {
    warn(
      `Node.js heap size limit ${heapSize} is higher than available memory ${osMem}. Check your configuration of sonar.javascript.node.maxspace`,
    );
  }
}

async function readDockerMemoryLimit() {
  return (
    (await readDockerMemoryLimitFrom('/sys/fs/cgroup/memory.max')) ??
    (await readDockerMemoryLimitFrom('/sys/fs/cgroup/memory.limit_in_bytes'))
  );
}

async function readDockerMemoryLimitFrom(cgroupPath: string) {
  try {
    const mem = Number.parseInt(await readFile(cgroupPath, { encoding: 'utf8' }));
    if (Number.isInteger(mem)) {
      return mem / MB;
    }
  } catch (e) {
    // probably not a docker env
  }
  return undefined;
}

function getHeapSize() {
  return Math.floor(v8.getHeapStatistics().heap_size_limit / MB);
}

export function logMemoryError(err: any) {
  switch (err?.code) {
    case 'ERR_WORKER_OUT_OF_MEMORY':
      error(
        `The analysis will stop due to the Node.js process running out of memory (heap size limit ${getHeapSize()} MB)`,
      );
      error(
        `You can see how Node.js heap usage evolves during analysis with "sonar.javascript.node.debugMemory=true"`,
      );
      error(
        'Try setting "sonar.javascript.node.maxspace" to a higher value to increase Node.js heap size limit',
      );
      error(
        'If the problem persists, please report the issue at https://community.sonarsource.com',
      );
      break;
    default:
      error(`The analysis will stop due to an unexpected error: ${err}`);
      error('Please report the issue at https://community.sonarsource.com');
      break;
  }
}

export function registerGarbageCollectionObserver() {
  const obs = new PerformanceObserver(items => {
    items
      .getEntries()
      .filter(
        item =>
          (item.detail as NodeGCPerformanceDetail)?.kind === constants.NODE_PERFORMANCE_GC_MAJOR,
      )
      .forEach(item => {
        debug(`Major GC event`);
        debug(JSON.stringify(item));
        logHeapStatistics(true);
      });
  });
  obs.observe({ entryTypes: ['gc'] });
  return () => {
    obs.disconnect();
  };
}

export function logHeapStatistics(debugMemory: boolean) {
  if (debugMemory) {
    debug(JSON.stringify(v8.getHeapStatistics()));
  }
}
