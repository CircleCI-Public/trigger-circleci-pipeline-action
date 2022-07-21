import {
  getInput,
  setFailed,
  startGroup,
  endGroup,
  info,
  error as coreError,
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
    info(`Ref substring ${ref.substring(11)}`)
    return ref.substring(11);
  } else if (ref.startsWith("refs/pull/")) {
    info(`This is a PR. Using head ref ${headRef} instead of ${ref}`);
    return headRef;
  }
  info(`Ref ${ref}`)
  return ref;
};
const getTag = () => {
  if (ref.startsWith("refs/tags/")) {
    return ref.substring(10);
  }
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
};

const metaData = getInput("GHA_Meta");
if (metaData.length > 0) {
  Object.assign(parameters, { GHA_Meta: metaData });
}

const body = {
  parameters: parameters,
};

const tag = getTag();
const branch = getBranch();

if (tag) {
  Object.assign(body, { tag });
} else {
  Object.assign(body, { branch });
}

const url = `https://circleci.com/api/v2/project/gh/${repoOrg}/${repoName}/pipeline`;
info(`HEADREF: ${process.env.GITHUB_HEAD_REF}`)
info(`Triggering CircleCI Pipeline for ${repoOrg}/${repoName}`);
info(`Triggering URL: ${url}`);
if (tag) {
  info(`Triggering tag: ${tag}`);
} else {
  info(`Triggering branch: ${branch}`);
}
info(`Parameters:\n${JSON.stringify(parameters)}`);
endGroup();
// Sample test
// axios
//   .post(url, body, { headers: headers })
//   .then((response) => {
//     startGroup("Successfully triggered CircleCI Pipeline");
//     info(`CircleCI API Response: ${JSON.stringify(response.data)}`);
//     endGroup();
//   })
//   .catch((error) => {
//     startGroup("Failed to trigger CircleCI Pipeline");
//     coreError(error);
//     setFailed(error.message);
//     endGroup();
//   });
