"""Publish the SIT/FPS PR summary comment.

Posts the current summary and minimizes earlier SIT/FPS summaries so repeated
workflow runs do not leave a visible comment stack on the pull request.
"""

import argparse
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from build_publish_payload import COMMENT_MARKER
from common import resolve_path_under

GRAPHQL_URL = "https://api.github.com/graphql"
LEGACY_COMMENT_HEADING = "## SIT/FPS PR Automation"
GITHUB_ACTIONS_BOT_LOGINS = frozenset({"github-actions", "github-actions[bot]"})

FETCH_COMMENTS_QUERY = """
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
"""

ADD_COMMENT_MUTATION = """
mutation AddComment($subjectId: ID!, $body: String!) {
  addComment(input: { subjectId: $subjectId, body: $body }) {
    commentEdge {
      node {
        id
      }
    }
  }
}
"""

MINIMIZE_COMMENT_MUTATION = """
mutation MinimizeComment($subjectId: ID!) {
  minimizeComment(input: { subjectId: $subjectId, classifier: OUTDATED }) {
    minimizedComment {
      isMinimized
    }
  }
}
"""


@dataclass(frozen=True)
class Comment:
    id: str
    body: str
    is_minimized: bool
    author_login: str | None


@dataclass(frozen=True)
class PullRequestComments:
    pr_id: str
    comments: list[Comment]


def path_under_cwd(label: str):
    def parse_path(value: str) -> Path:
        try:
            return resolve_path_under(Path.cwd(), value, label)
        except ValueError as err:
            raise argparse.ArgumentTypeError(str(err)) from err

    return parse_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Publish the SIT/FPS PR summary comment")
    parser.add_argument("--repository", required=True, help="Repository in owner/name form")
    parser.add_argument("--pr-number", required=True, type=int)
    parser.add_argument("--body-path", required=True, type=path_under_cwd("--body-path"))
    return parser.parse_args()


def split_repository(repository: str) -> tuple[str, str]:
    parts = repository.split("/", 1)
    if len(parts) != 2 or not parts[0] or not parts[1]:
        raise ValueError("--repository must use owner/name form")
    return parts[0], parts[1]


class GithubGraphqlClient:
    def __init__(self, token: str, graphql_url: str = GRAPHQL_URL) -> None:
        self.token = token
        self.graphql_url = graphql_url

    def execute(self, query: str, variables: dict[str, Any]) -> dict[str, Any]:
        request = Request(
            self.graphql_url,
            data=json.dumps({"query": query, "variables": variables}).encode("utf-8"),
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
                "User-Agent": "sit-pr-fps-publisher",
            },
            method="POST",
        )

        try:
            with urlopen(request, timeout=30) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except HTTPError as err:
            details = err.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"GitHub GraphQL request failed with HTTP {err.code}: {details}") from err

        if payload.get("errors"):
            raise RuntimeError(f"GitHub GraphQL request failed: {payload['errors']}")
        return payload["data"]


def fetch_pr_comments(
    client: GithubGraphqlClient,
    owner: str,
    name: str,
    pr_number: int,
) -> PullRequestComments:
    comments: list[Comment] = []
    after = None
    pr_id = None

    while True:
        data = client.execute(
            FETCH_COMMENTS_QUERY,
            {"owner": owner, "name": name, "number": pr_number, "after": after},
        )
        pr = data["repository"]["pullRequest"]
        if pr is None:
            raise RuntimeError(f"Pull request #{pr_number} was not found")
        pr_id = pr["id"]

        connection = pr["comments"]
        for node in connection["nodes"]:
            author = node.get("author") or {}
            comments.append(
                Comment(
                    id=node["id"],
                    body=node["body"],
                    is_minimized=bool(node["isMinimized"]),
                    author_login=author.get("login"),
                )
            )

        page_info = connection["pageInfo"]
        if not page_info["hasNextPage"]:
            return PullRequestComments(pr_id=pr_id, comments=comments)
        after = page_info["endCursor"]


def is_previous_summary_comment(comment: Comment) -> bool:
    if comment.is_minimized:
        return False
    if COMMENT_MARKER in comment.body:
        return True
    return (
        comment.author_login in GITHUB_ACTIONS_BOT_LOGINS
        and comment.body.lstrip().startswith(LEGACY_COMMENT_HEADING)
    )


def select_previous_summary_comment_ids(comments: list[Comment]) -> list[str]:
    return [comment.id for comment in comments if is_previous_summary_comment(comment)]


def add_comment(client: GithubGraphqlClient, pr_id: str, body: str) -> str:
    data = client.execute(ADD_COMMENT_MUTATION, {"subjectId": pr_id, "body": body})
    return data["addComment"]["commentEdge"]["node"]["id"]


def minimize_comment(client: GithubGraphqlClient, comment_id: str) -> None:
    client.execute(MINIMIZE_COMMENT_MUTATION, {"subjectId": comment_id})


def publish_comment(
    client: GithubGraphqlClient,
    repository: str,
    pr_number: int,
    body: str,
) -> None:
    owner, name = split_repository(repository)
    existing = fetch_pr_comments(client, owner, name, pr_number)
    comment_ids_to_minimize = select_previous_summary_comment_ids(existing.comments)

    new_comment_id = add_comment(client, existing.pr_id, body)
    print(f"Posted SIT/FPS summary comment {new_comment_id}")

    minimized_count = 0
    for comment_id in comment_ids_to_minimize:
        try:
            minimize_comment(client, comment_id)
        except RuntimeError as err:
            print(f"::warning::Failed to minimize comment {comment_id}: {err}")
        else:
            minimized_count += 1
    print(f"Minimized {minimized_count} previous SIT/FPS summary comment(s)")


def resolve_token() -> str:
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if not token:
        raise RuntimeError("GH_TOKEN or GITHUB_TOKEN must be set")
    return token


def main() -> int:
    args = parse_args()
    token = resolve_token()
    body = args.body_path.read_text(encoding="utf-8")
    publish_comment(
        client=GithubGraphqlClient(token),
        repository=args.repository,
        pr_number=args.pr_number,
        body=body,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
