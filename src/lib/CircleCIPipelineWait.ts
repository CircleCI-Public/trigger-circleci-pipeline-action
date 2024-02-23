import {
    getInput,
    setFailed,
    startGroup,
    endGroup,
} from "@actions/core";
import axios from "axios";
import {Context} from "@actions/github/lib/context";
import {CircleCIBase} from "./CircleCIBase";

export class CircleCIPipelineWait extends CircleCIBase {
    wait_for_pipeline?: CircleCIWaitRequest = undefined;

    constructor(context: Context, host = process.env.CCI_HOST || "circleci.com") {
        super(context, host)
        this.base_url = `https://${this.host}/api/v2/project/${this.vcs}/${this.owner}/${this.repo}`;
        if (JSON.parse(getInput("wait-for-pipeline").toLowerCase())) {
            this.wait_for_pipeline = {
                timeout: Number(getInput("wait-for-pipeline-timeout")),
                interval: Number(getInput("wait-for-pipeline-interval")),
            }
        }
    }

    checkWorkflow(workflow_url: string, params: { [key: string]: string } | undefined = undefined): Promise<boolean> {
        return axios
            .get(workflow_url, {
                headers: {
                    "content-type": "application/json",
                    "x-attribution-login": this.context.actor,
                    "x-attribution-actor-id": this.context.actor,
                    "Circle-Token": `${process.env.CCI_TOKEN}`,
                },
                params: params,
            })
            .then((response) => {
                let finished = true;
                // Check status of all workflows
                for (const workflow of response.data.items) {
                    switch (workflow.status) {
                        // Do not do anything special for failing, wait for failed state
                        case "failing":
                        case "running":
                        case "on_hold":
                            finished = false
                            break;
                        case "failed":
                        case "not_run":
                        case "error":
                        case "unauthorized":
                        case "canceled":
                            // Accumulate any failed workflow states
                            setFailed(`Failed workflow: ${workflow.name} as ${workflow.status}`)
                            break;
                        case "success":
                            break;
                        default:
                            setFailed(`Unrecognized workflow state: ${workflow.status}\nDetails: ${workflow}`);
                    }
                }
                // Accumulate the next page results
                if (response.data.next_page_token) {
                    params = {
                        "next_page_token": response.data.next_page_token,
                    }
                }
                if (params) {
                    // Finished only when all workflow pages are finished
                    return finished && this.checkWorkflow(workflow_url, params);
                }
                return finished;
            })
            .catch((error) => {
                setFailed(error);
                // Return as finished
                return true
            });
    }

    waitForPipeline(pipeline_id: string) {
        // If not requested to wait for pipeline just return
        if (!this.wait_for_pipeline)
            return
        const workflow_url = `https://${this.host}/api/v2/pipeline/${pipeline_id}/workflow`;
        startGroup("Waiting for pipeline to finish");
        const waitInterval = setInterval(
            async () => {
                const finished = await this.checkWorkflow(workflow_url);
                if (finished) {
                    clearInterval(waitInterval);
                    clearTimeout(waitTimeout);
                }
            }, this.wait_for_pipeline.interval * 1000
        );
        const waitTimeout = setTimeout(() => {
            clearInterval(waitInterval);
            setFailed(`Pipeline did not finish in ${this.wait_for_pipeline?.timeout} (s)`);
        }, this.wait_for_pipeline.timeout * 1000);
        endGroup()
    }
}

type CircleCIWaitRequest = {
    timeout: number;
    interval: number;
}

