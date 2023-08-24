import { CircleCIPipelineTrigger } from "./lib/CircleCIPipelineTrigger";
import { context } from "@actions/github";
import { CircleCIPipelineWait } from "./lib/CircleCIPipelineWait";

async function main() {
  const trigger = new CircleCIPipelineTrigger(context);
  const pipelineID = await trigger.triggerPipeline();
  if (pipelineID) {
    const waiter = new CircleCIPipelineWait(context);
    waiter.waitForPipeline(pipelineID);
  }
}

main();
