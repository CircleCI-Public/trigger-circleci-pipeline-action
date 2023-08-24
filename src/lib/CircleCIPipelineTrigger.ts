import {
  getInput,
  info,
  setFailed,
  setOutput,
  startGroup,
  endGroup,
} from "@actions/core";
import axios from "axios";
import { Context } from "@actions/github/lib/context";
import {CircleCIBase} from "./CircleCIBase";

export class CircleCIPipelineTrigger extends CircleCIBase{
  pipeline_url: string;
  metaData: string;
  parameters: CircleCIPipelineParams;

  constructor(context: Context, host = process.env.CCI_HOST || "circleci.com") {
    super(context, host)
    this.pipeline_url = `${this.project_url}/pipeline`;
    this.metaData = getInput("GHA_Meta");
    this.parameters = {
      GHA_Actor: context.actor,
      GHA_Action: context.action,
      GHA_Event: context.eventName,
    };
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
    info(`  Triggering URL: ${this.pipeline_url}`);
    const trigger = this.tag ? `tag: ${this.tag}` : `branch: ${this.branch}`;
    info(`  Triggering ${trigger}`);
    info(`    Parameters:\n${JSON.stringify(this.parameters)}`);
    endGroup();
    return axios
      .post(this.pipeline_url, body, {
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
        return String(response.data.id);
      })
      .catch((error) => {
        startGroup("Failed to trigger CircleCI Pipeline");
        setFailed(error);
        endGroup();
        return ""
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
