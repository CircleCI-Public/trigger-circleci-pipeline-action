import {
  getInput,
  info,
} from "@actions/core";
import { Context } from "@actions/github/lib/context";

export class CircleCIBase {
  vcs: string;
  owner: string;
  repo: string;
  tag?: string;
  branch?: string;
  host: string;
  context: Context;
  base_url: string;
  project_url: string;

  constructor(context: Context, host = process.env.CCI_HOST || "circleci.com") {
    this.context = context;
    this.host = host;
    const slug = process.env.TARGET_SLUG ?? getInput("target-slug");
    const { vcs, owner, repo } = slug
      ? this.parseSlug(slug)
      : { ...context.repo, vcs: "gh" };
    this.vcs = vcs;
    this.owner = owner;
    this.repo = repo;
    this.base_url = `https://${this.host}/api/v2`;
    this.project_url = `${this.base_url}/project/${this.vcs}/${this.owner}/${this.repo}`;
    this.tag = this.getTag();
    this.branch = this.getBranch();
  }

  parseSlug(slug: string) {
    const [vcs, owner, repo] = slug.split("/");
    if (!owner || !repo || !vcs) {
      throw new Error(`Invalid target-slug: ${slug}`);
    }
    return { vcs, owner, repo };
  }

  getTag() {
    let tag = process.env.TARGET_TAG ?? getInput("target-tag");
    if (!tag) {
      const tagRef = "refs/tags/";
      if (this.context.ref.startsWith(tagRef)) {
        tag = this.context.ref.substring(tagRef.length);
      }
    }
    return tag;
  }

  getBranch() {
    let branch = process.env.TARGET_BRANCH ?? getInput("target-branch");
    if (!branch) {
      if (this.context.ref.startsWith("refs/heads/")) {
        branch = this.context.ref.substring(11);
      } else if (this.context.ref.startsWith("refs/pull/")) {
        info(`This is a PR. Using head PR branch`);
        const pullRequestNumber = (
          this.context.ref.match(/refs\/pull\/([0-9]*)\//) as RegExpMatchArray
        )[1];
        const newref = `pull/${pullRequestNumber}/head`;
        branch = newref;
      }
    }
    return branch;
  }
}