> [!NOTE]  
>
> This GitHub Action does not yet support CircleCI projects that are integrated with the [CircleCI GitHub App](https://circleci.com/docs/github-apps-integration/).  If your CircleCI project URL looks like this: `https://app.circleci.com/projects/organizations/circleci%`, you are integrating with the CircleCI GitHub App and this GitHub Action is not yet supported.  Contact sebastian@circleci.com with any questions/feedback.  If your CircleCI project URL looks like this: `https://app.circleci.com/projects/project-dashboard/github/`, you are using [CircleCI's OAuth App integration](https://circleci.com/docs/github-integration/) and this GitHub Action is supported.

# Trigger CircleCI Pipeline

Trigger your [CircleCI](https://circleci.com/) pipelines from any [event](https://docs.github.com/en/actions/learn-github-actions/events-that-trigger-workflows) on GitHub with [GitHub Actions](https://github.com/features/actions).

# How to Use

1. Create a GitHub Action's workflow for the desired CircleCI pipeline.

   Do this by adding a workflow YAML file (we'll use `main.yml`) to `./.github/workflows`.

   A `release` trigger is shown in this example. Try any of the GitHub events for triggering workflows:
   https://docs.github.com/en/actions/learn-github-actions/events-that-trigger-workflows

   Select a custom name and id for the step for additional contextual metadata in your CircleCI pipeline

```yaml
on:
  release:
    types: [published]
jobs:
  trigger-circleci:
    runs-on: ubuntu-latest
    steps:
      - name: <customize name>
        id: <customize id>
        uses: CircleCI-Public/trigger-circleci-pipeline-action@v1.0.5
        env:
          CCI_TOKEN: ${{ secrets.CCI_TOKEN }}
```

2. Create an [encrypted secret](https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-a-repository) named `CCI_TOKEN` containing the [Personal API Token](https://circleci.com/docs/2.0/managing-api-tokens/) that will be used to trigger the pipelines. This is suggested to be a [machine user](https://docs.github.com/en/developers/overview/managing-deploy-keys#machine-users).

3. Add the [Pipeline Parameter](https://circleci.com/docs/2.0/pipeline-variables/) definitions to your CircleCI config. This data will be entered by the GitHub Action when triggered.

   Add the following to the top of your `.circleci/config.yml` file. Ensure you are specifying version `2.1`

   ```yaml
   version: 2.1
   parameters:
     GHA_Actor:
       type: string
       default: ""
     GHA_Action:
       type: string
       default: ""
     GHA_Event:
       type: string
       default: ""
     GHA_Meta:
       type: string
       default: ""
   ```

4. Use the Pipeline Parameter data to run [workflows conditionally](https://circleci.com/docs/2.0/pipeline-variables/#conditional-workflows).

   **_See: [Examples](https://github.com/CircleCI-Public/trigger-circleci-pipeline-action/tree/main/examples)_**

# Inputs

Optional [input parameters](https://docs.github.com/en/actions/creating-actions/metadata-syntax-for-github-actions#inputs) that allow you to specify additional metadata.

### GHA_Meta

**required:** false

**description**: An optional additional metadata parameter. Will be available on the CircleCI pipeline as GHA_Meta.

```yaml
jobs:
  trigger-circleci:
    runs-on: ubuntu-latest
    steps:
      - name: <customize name>
        id: <customize id>
        uses: CircleCI-Public/trigger-circleci-pipeline-action@v1.0.5
        with:
          GHA_Meta: "<custom data>"
        env:
          CCI_TOKEN: ${{ secrets.CCI_TOKEN }}
```

### target-slug

**required:** false

**description**: The [CircleCI project slug](https://circleci.com/docs/api-developers-guide/#github-and-bitbucket-projects) of the target project (ex: `github/<org>/<repo>`). If not specified, the slug of the current GitHub repository will be used.

```yaml
jobs:
  trigger-circleci:
    runs-on: ubuntu-latest
    steps:
      - name: <customize name>
        id: <customize id>
        uses: CircleCI-Public/trigger-circleci-pipeline-action@v1.0.5
        with:
          target-slug: "gh/<org>/<repo>" # Will trigger the pipeline for external project
        env:
          CCI_TOKEN: ${{ secrets.CCI_TOKEN }}
```

# Outputs

Field | Data Type | Description
-- | -- | --
`id` | string (uuid) | The unique ID of the pipeline.
`state` | string (Enum: "created" "errored" "setup-pending" "setup" "pending") | The current state of the pipeline.
`number` | integer (int64) | The number of the pipeline.
`created_at` | string (date-time) | The date and time the pipeline was created.

# Things To Know

## GitHub Actions runs _alongside_ native CircleCI integration.

By default, when a repository is connected to CircleCI, if the workflows within that project's configuration does not specify any conditionals or filters that would otherwise prevent execution, the workflow will execute on every `push` event by default.

This may mean it is possible to accidentally run a job twice, once on the `push` event from CircleCI, as well as other events triggered by the GitHub Action.

### To prevent double execution

If you are relying on GitHub Actions to provide all of your API triggers, ensure that each of your CircleCI configuration's workflows contains a [conditional](https://circleci.com/docs/2.0/pipeline-variables/#conditional-workflows) limiting it's execution to only the GitHub Action trigger.

**Example**

```yaml
workflows:
  # This workflow is set to be conditionally triggered,
  # only via the GitHub Action.
  # With no other unfiltered workflows, normal push events will be ignored.
  test:
    when: << pipeline.parameters.GHA_Action >>
    jobs:
      - test
```
