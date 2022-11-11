import {
  endGroup,
  error as coreError,
  getInput,
  info,
  setFailed,
  startGroup,
} from "@actions/core";
import { context } from "@actions/github";
import axios from "axios";

startGroup("Preparing CircleCI Pipeline Trigger");
const repoOrg = context.repo.owner;
const repoName = context.repo.repo;
info(`Org: ${repoOrg}`);
info(`Repo: ${repoName}`);
const ref = context.ref;
const headRef = process.env.GITHUB_HEAD_REF;

const getBranch = () => {
  if (ref.startsWith("refs/heads/")) {
    return ref.substring(11);
  } else if (ref.startsWith("refs/pull/") && headRef) {
    info(`This is a PR. Using head ref ${headRef} instead of ${ref}`);
    return headRef;
  }
  return ref;
};

const getSha = () => {
  return context.payload?.pull_request?.head?.sha ?? context.sha;
};

const headers = {
  "content-type": "application/json",
  "x-attribution-login": context.actor,
  "x-attribution-actor-id": context.actor,
  "Circle-Token": `${process.env.CCI_TOKEN}`,
};
const parameters = {
  GHA_Actor: context.actor,
  GHA_Action: context.action,
  GHA_Event: context.eventName,
  GHA_Branch: getBranch(),
};

const metaData = getInput("GHA_Meta");
if (metaData.length > 0) {
  Object.assign(parameters, { GHA_Meta: metaData });
}

const body = {
  parameters: parameters,
};

const tag = getSha();

Object.assign(body, { tag: tag });

const url = `https://circleci.com/api/v2/project/gh/${repoOrg}/${repoName}/pipeline`;

info(`Triggering CircleCI Pipeline for ${repoOrg}/${repoName}`);
info(`Triggering URL: ${url}`);
info(`Triggering tag: ${tag}`);
info(`Parameters:\n${JSON.stringify(parameters)}`);
endGroup();

axios
  .post(url, body, { headers: headers })
  .then((response) => {
    startGroup("Successfully triggered CircleCI Pipeline");
    info(`CircleCI API Response: ${JSON.stringify(response.data)}`);
    endGroup();
  })
  .catch((error) => {
    startGroup("Failed to trigger CircleCI Pipeline");
    coreError(error);
    setFailed(error.message);
    endGroup();
  });
