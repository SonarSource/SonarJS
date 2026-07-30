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
import { pathToFileURL } from 'node:url';

const nonBlockingResults = new Set(['success', 'skipped']);

/**
 * Parses the serialized GitHub Actions needs context.
 * @param {string} serializedNeedsContext JSON-encoded needs context
 * @returns {Record<string, { result?: string }>} parsed needs context
 */
export function parseNeedsContext(serializedNeedsContext) {
  const needsContext = JSON.parse(serializedNeedsContext);

  if (needsContext === null || typeof needsContext !== 'object' || Array.isArray(needsContext)) {
    throw new Error('NEEDS_CONTEXT must decode to an object');
  }

  return needsContext;
}

/**
 * Extracts upstream jobs whose results should block promotion.
 * @param {Record<string, { result?: string }>} needsContext GitHub Actions needs context
 * @returns {{ jobId: string; result: string }[]} blocking upstream jobs
 */
export function getBlockingNeeds(needsContext) {
  return Object.entries(needsContext).flatMap(([jobId, need]) => {
    const result = need?.result;

    if (typeof result !== 'string' || nonBlockingResults.has(result)) {
      return [];
    }

    return [{ jobId, result }];
  });
}

/**
 * Formats a promotion-blocking needs summary.
 * @param {{ jobId: string; result: string }[]} blockingNeeds blocking upstream jobs
 * @returns {string} human-readable blocking summary
 */
export function formatBlockingNeeds(blockingNeeds) {
  return [
    'Promotion is blocked because required upstream jobs did not complete successfully:',
    ...blockingNeeds.map(blockingNeed => `- ${blockingNeed.jobId}: ${blockingNeed.result}`),
  ].join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const serializedNeedsContext = process.env.NEEDS_CONTEXT;

    if (!serializedNeedsContext) {
      throw new Error('NEEDS_CONTEXT must be set');
    }

    const blockingNeeds = getBlockingNeeds(parseNeedsContext(serializedNeedsContext));

    if (blockingNeeds.length > 0) {
      throw new Error(formatBlockingNeeds(blockingNeeds));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}
