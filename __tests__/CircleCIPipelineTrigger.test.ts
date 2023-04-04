import { Context } from "@actions/github/lib/context";
import { CircleCIPipelineTrigger } from "../src/lib//CircleCIPipelineTrigger";

describe("CircleCIPipelineTrigger", () => {
  const contextBranch: Partial<Context> = {
    ref: "refs/heads/main",
    actor: "testActor",
  };

  const contextTag: Partial<Context> = {
    ref: "refs/tags/v1.0.0",
    actor: "testActor",
  };
  
  it("should be defined", () => {
    expect(CircleCIPipelineTrigger).toBeDefined();
  });

  it("should get branch from context", () => {
    const trigger = new CircleCIPipelineTrigger(contextBranch as Context);
    expect(trigger.branch).toEqual("main");
  });

  it("should get tag from context", () => {
    const trigger = new CircleCIPipelineTrigger(contextTag as Context);
    expect(trigger.tag).toEqual("v1.0.0");
  });

  it("should parse a slug", () => {
    const trigger = new CircleCIPipelineTrigger(contextBranch as Context);
    const slug = "gh/testOwner/testRepo";
    const { vcs, owner, repo } = trigger.parseSlug(slug);
    expect(vcs).toEqual("gh");
    expect(owner).toEqual("testOwner");
    expect(repo).toEqual("testRepo");
  });
});
