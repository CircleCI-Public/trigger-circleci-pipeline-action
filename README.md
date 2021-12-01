# Trigger CircleCI Pipeline GitHub Action
Trigger your [CircleCI](https://circleci.com/) pipelines from any [event](https://docs.github.com/en/actions/learn-github-actions/events-that-trigger-workflows) on Github with [Github Actions](https://github.com/features/actions).


# How to Use

1. Create a Github Action's workflow for the desired CircleCI pipeline.

    Do this by adding a workflow YAML file (we'll use `main.yml`) to `./.github/workflows`.



    A `release` trigger is shown in this example. Try any of the Github events for triggering workflows:
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
        uses: circleci/trigger_circleci_pipeline@v1.0
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
        uses: circleci/trigger_circleci_pipeline@v1.0
        with:
          GHA_Meta: "<custom data>"
        env:
          CCI_TOKEN: ${{ secrets.CCI_TOKEN }}
```

# Things To Know

## GitHub Actions runs _along side_ native CircleCI integration.
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
  when: << pipeline.parameters.GHA_Action >>
  test:
    jobs:
      - test
```