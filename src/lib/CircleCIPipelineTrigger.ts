import {
  getInput,
  info,
  setFailed,
  setOutput,
  startGroup,
  error as coreError,
  endGroup,
} from "@actions/core";
import axios from "axios";
import { Context } from "@actions/github/lib/context";

export class CircleCIPipelineTrigger {
  vcs: string;
  owner: string;
  repo: string;
  tag?: string;
  branch?: string;
  host: string;
  context: Context;
  url: string;
  metaData: string;
  parameters: CircleCIPipelineParams;

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
    this.url = `https://${this.host}/api/v2/project/${this.vcs}/${this.owner}/${this.repo}/pipeline`;
    this.metaData = getInput("GHA_Meta");
    this.tag = this.getTag();
    this.branch = this.getBranch();
    this.parameters = {
      GHA_Actor: context.actor,
      GHA_Action: context.action,
      GHA_Event: context.eventName,
    };
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

  triggerPipeline() {
    const body: CircleCITriggerPipelineRequest = {
      parameters: this.parameters,
    };
    startGroup("Preparing CircleCI Pipeline Trigger");
    info(`Org: ${this.owner}`);
    info(`Repo: ${this.repo}`);
    if (this.metaData.length > 0) {
      this.parameters.GHA_Meta = this.metaData;
    }
    body[this.tag ? "tag" : "branch"] = this.tag || this.branch;
    info(`Triggering CircleCI Pipeline for ${this.owner}/${this.repo}`);
    info(`  Triggering URL: ${this.url}`);
    const trigger = this.tag ? `tag: ${this.tag}` : `branch: ${this.branch}`;
    info(`  Triggering ${trigger}`);
    info(`    Parameters:\n${JSON.stringify(this.parameters)}`);
    endGroup();
    axios
      .post(this.url, body, {
        headers: {
          "content-type": "application/json",
          "x-attribution-login": this.context.actor,
          "x-attribution-actor-id": this.context.actor,
          "Circle-Token": `${process.env.CCI_TOKEN}`,
        },
      })
      .then((response) => {
        startGroup("Successfully triggered CircleCI Pipeline");
        info(`CircleCI API Response: ${JSON.stringify(response.data)}`);
        setOutput("created_at", response.data.created_at);
        setOutput("id", response.data.id);
        setOutput("number", response.data.number);
        setOutput("state", response.data.state);
        endGroup();
      })
      .catch((error) => {
        startGroup("Failed to trigger CircleCI Pipeline");
        coreError(error);
        setFailed(error.message);
        endGroup();
      });
  }
}

type CircleCIPipelineParams = {
  GHA_Actor: string;
  GHA_Action: string;
  GHA_Event: string;
  GHA_Meta?: string;
};

type CircleCITriggerPipelineRequest = {
  parameters: CircleCIPipelineParams;
  branch?: string;
  tag?: string;
};
