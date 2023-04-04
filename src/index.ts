import { CircleCIPipelineTrigger } from "./lib/CircleCIPipelineTrigger";
import { context } from "@actions/github";

const trigger = new CircleCIPipelineTrigger(context);
trigger.triggerPipeline();
