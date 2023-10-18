/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import * as v8 from 'v8';
import * as os from 'os';
import fs from 'fs';
import { debug, error, getContext, info, warn } from '@sonar/shared/helpers';
import { constants, PerformanceObserver } from 'node:perf_hooks';
import { NodeGCPerformanceDetail } from 'perf_hooks';

const MB = 1024 * 1024;

export function logMemoryConfiguration() {
  const osMem = Math.floor(os.totalmem() / MB);
  const heapSize = getHeapSize();
  const dockerMemLimit = readDockerMemoryLimit();
  const dockerMem = dockerMemLimit ? `, Docker (${dockerMemLimit} MB)` : ',';
  info(`Memory configuration: OS (${osMem} MB)${dockerMem} Node.js (${heapSize} MB).`);
  if (heapSize > osMem) {
    warn(
      `Node.js heap size limit ${heapSize} is higher than available memory ${osMem}. Check your configuration of sonar.javascript.node.maxspace`,
    );
  }
}

function readDockerMemoryLimit() {
  return (
    readDockerMemoryLimitFrom('/sys/fs/cgroup/memory.max') ||
    readDockerMemoryLimitFrom('/sys/fs/cgroup/memory.limit_in_bytes')
  );
}

function readDockerMemoryLimitFrom(cgroupPath: string) {
  try {
    const mem = Number.parseInt(fs.readFileSync(cgroupPath, { encoding: 'utf8' }));
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
        logHeapStatistics();
      });
  });
  obs.observe({ entryTypes: ['gc'] });
}

export function logHeapStatistics() {
  if (getContext().debugMemory) {
    debug(JSON.stringify(v8.getHeapStatistics()));
  }
}
