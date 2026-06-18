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
import { readFile } from 'node:fs/promises';
import { COMMENT_MARKER } from './build-publish-payload.js';
import { isMain, parseOptionArgs, requireOption, resolvePathUnder } from './common.js';

const GRAPHQL_URL = 'https://api.github.com/graphql';
const LEGACY_COMMENT_HEADING = '## SIT/FPS PR Automation';
const LEGACY_DIFFSIT_MARKER = '<!-- sit-diffsit-report -->';
const GITHUB_ACTIONS_BOT_LOGINS = new Set(['github-actions', 'github-actions[bot]']);

const FETCH_COMMENTS_QUERY = `
query FetchPrComments($owner: String!, $name: String!, $number: Int!, $after: String) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      id
      comments(first: 100, after: $after) {
        nodes {
          id
          body
          isMinimized
          author {
            login
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
}
`;

const ADD_COMMENT_MUTATION = `
mutation AddComment($subjectId: ID!, $body: String!) {
  addComment(input: { subjectId: $subjectId, body: $body }) {
    commentEdge {
      node {
        id
      }
    }
  }
}
`;

const MINIMIZE_COMMENT_MUTATION = `
mutation MinimizeComment($subjectId: ID!) {
  minimizeComment(input: { subjectId: $subjectId, classifier: OUTDATED }) {
    minimizedComment {
      isMinimized
    }
  }
}
`;

export class Comment {
  constructor(id, body, isMinimized, authorLogin) {
    this.id = id;
    this.body = body;
    this.isMinimized = isMinimized;
    this.authorLogin = authorLogin;
  }
}

export class PullRequestComments {
  constructor(prId, comments) {
    this.prId = prId;
    this.comments = comments;
  }
}

export function splitRepository(repository) {
  const parts = repository.split('/', 2);
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('--repository must use owner/name form');
  }
  return parts;
}

export class GithubGraphqlClient {
  constructor(token, graphqlUrl = GRAPHQL_URL) {
    this.token = token;
    this.graphqlUrl = graphqlUrl;
  }

  async execute(query, variables) {
    const response = await fetch(this.graphqlUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'sonarjs-sit-pr-fps-publisher',
      },
      body: JSON.stringify({ query, variables }),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`GitHub GraphQL request failed with HTTP ${response.status}: ${text}`);
    }
    const payload = JSON.parse(text);
    if (payload.errors) {
      throw new Error(`GitHub GraphQL request failed: ${JSON.stringify(payload.errors)}`);
    }
    return payload.data;
  }

  async fetchPrComments(owner, name, prNumber) {
    const comments = [];
    let after = null;
    let prId = null;

    while (true) {
      const data = await this.execute(FETCH_COMMENTS_QUERY, {
        owner,
        name,
        number: prNumber,
        after,
      });
      const pr = data.repository.pullRequest;
      if (pr === null) {
        throw new Error(`Pull request #${prNumber} was not found`);
      }
      prId = pr.id;

      for (const node of pr.comments.nodes) {
        comments.push(
          new Comment(node.id, node.body, Boolean(node.isMinimized), node.author?.login ?? null),
        );
      }
      if (!pr.comments.pageInfo.hasNextPage) {
        return new PullRequestComments(prId, comments);
      }
      after = pr.comments.pageInfo.endCursor;
    }
  }

  async addComment(prId, body) {
    const data = await this.execute(ADD_COMMENT_MUTATION, { subjectId: prId, body });
    return data.addComment.commentEdge.node.id;
  }

  async minimizeComment(commentId) {
    await this.execute(MINIMIZE_COMMENT_MUTATION, { subjectId: commentId });
  }
}

export function selectPreviousSummaryCommentIds(comments) {
  return comments.filter(isPreviousSummaryComment).map(comment => comment.id);
}

export async function publishComment(client, repository, prNumber, body) {
  const [owner, name] = splitRepository(repository);
  const existing = await client.fetchPrComments(owner, name, prNumber);
  const commentIdsToMinimize = selectPreviousSummaryCommentIds(existing.comments);

  const newCommentId = await client.addComment(existing.prId, body);
  console.log(`Posted SIT/FPS summary comment ${newCommentId}`);

  let minimizedCount = 0;
  for (const commentId of commentIdsToMinimize) {
    try {
      await client.minimizeComment(commentId);
      minimizedCount += 1;
    } catch (error) {
      console.log(`::warning::Failed to minimize comment ${commentId}: ${error.message ?? error}`);
    }
  }
  console.log(`Minimized ${minimizedCount} previous SIT/FPS summary comment(s)`);
}

function isPreviousSummaryComment(comment) {
  if (comment.isMinimized) {
    return false;
  }
  if (comment.body.includes(COMMENT_MARKER) || comment.body.includes(LEGACY_DIFFSIT_MARKER)) {
    return true;
  }
  return (
    GITHUB_ACTIONS_BOT_LOGINS.has(comment.authorLogin) &&
    comment.body.trimStart().startsWith(LEGACY_COMMENT_HEADING)
  );
}

function resolveToken() {
  const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GH_TOKEN or GITHUB_TOKEN must be set');
  }
  return token;
}

async function main() {
  const args = parseOptionArgs(process.argv);
  const cwd = process.cwd();
  const repository = requireOption(args, '--repository');
  const prNumber = Number(requireOption(args, '--pr-number'));
  const bodyPath = resolvePathUnder(cwd, requireOption(args, '--body-path'), '--body-path');
  const body = await readFile(bodyPath, 'utf8');
  await publishComment(new GithubGraphqlClient(resolveToken()), repository, prNumber, body);
}

if (isMain(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
