import {
  getInput,
  setFailed,
  setOutput,
  startGroup,
  endGroup,
  info,
  error as coreError,
} from "@actions/core";
import { context } from "@actions/github";
import axios from "axios";

const getTag = (ref: string) => {
  if (ref.startsWith("refs/tags/")) {
    return ref.substring(10);
  }
};

const getBranch = (ref: string) => {
  if (ref.startsWith("refs/heads/")) {
    return ref.substring(11);
  } else if (ref.startsWith("refs/pull/")) {
    info(`This is a PR. Using head PR branch`);
    const pullRequestNumber = (
      ref.match(/refs\/pull\/([0-9]*)\//) as RegExpMatchArray
    )[1];
    const newref = `pull/${pullRequestNumber}/head`;
    return newref;
  }
  return ref;
};

const { owner, repo } = context.repo;
const host = `${process.env.CCI_HOST}` || "circleci.com";
const url = `https://${host}/api/v2/project/gh/${owner}/${repo}/pipeline`;
const metaData = getInput("GHA_Meta");
const tag = getTag(context.ref);
const branch = getBranch(context.ref);
const parameters: CircleCIPipelineParams = {
  GHA_Actor: context.actor,
  GHA_Action: context.action,
  GHA_Event: context.eventName,
};
const body: CircleCITriggerPipelineRequest = {
  parameters: parameters,
};

startGroup("Preparing CircleCI Pipeline Trigger");
info(`Org: ${owner}`);
info(`Repo: ${repo}`);

if (metaData.length > 0) {
  parameters.GHA_Meta = metaData;
}
body[tag ? "tag" : "branch"] = tag || branch;

info(`Triggering CircleCI Pipeline for ${owner}/${repo}`);
info(`  Triggering URL: ${url}`);
const trigger = tag ? `tag: ${tag}` : `branch: ${branch}`;
info(`  Triggering ${trigger}`);
info(`    Parameters:\n${JSON.stringify(parameters)}`);
endGroup();

axios
  .post(url, body, {
    headers: {
      "content-type": "application/json",
      "x-attribution-login": context.actor,
      "x-attribution-actor-id": context.actor,
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
