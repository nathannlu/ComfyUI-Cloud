import { 
  resolveDependencies,
  pollSyncDependencies, 
} from "./dependencies.js"
import { 
  createMetaNode, 
  getWorkflowName,
  setWorkflowId,
  getWorkflowId,
  getApiToken, 
  validatePrompt, 
  compareWorkflows, 
  isWorkflowUpToDate
} from "../utils.js"
import { app } from '../comfy/comfy.js'; 
import { infoDialog } from '../comfy/ui.js'; 
import { 
  setButtonDefault,
  setButtonLoading,
  setMessage,
} from './ui.js'; 
import { authDialog } from '../auth/index.js';
import { nimbus, local } from '../resource/index.js';
import { endpoint } from '../constants.js';
import workflowState, { WorkflowState } from '../assistant/state.js';
import { 
  // ComfyCloudDialog,
  ComfyCloudPopover } from '../comfy/ui.js';

import {
   taskId,
   Progress } from '../ui/uploadProgress.js';

export const progressDialog = new ComfyCloudPopover(Progress, "Uploading dependencies...")

export async function onGeneration() {
  try {
    setButtonDefault()
    // check auth
    const apiToken = getApiToken();
    const doesApiTokenExist = !!apiToken;

    if(!doesApiTokenExist) {
      // Request auth
      setButtonDefault()
      return authDialog.show();
    }

    await nimbus.workflow.init();

    // check if ComfyCloud meta node exists
    const deployMeta = app.graph.findNodesByType("ComfyCloud");
    let isNewWorkflow = deployMeta.length == 0

    // This case usually happens when user manually adds the ComfyCloud node
    // and doesn't delete it
    const hasNoId = !isNewWorkflow && !getWorkflowId()
    if(hasNoId) {
      app.graph.remove(deployMeta[0])
      isNewWorkflow = true
    }

    const localWorkflow = await app.graphToPrompt();
    const isValid = await validatePrompt(localWorkflow.output);
    if(!isValid) {
      throw new Error("Prompt is not valid")
    }

    // Start execution
    setButtonLoading();

    if(isNewWorkflow) {
      // Wait for user to input workflow name
      await createMetaNode();
      workflowState.setState("workflowState", WorkflowState.CREATING);
      //await createEmptyWorkflow()
      const newWorkflow = await nimbus.workflow.create({ 
        name: getWorkflowName(),
      })
      setWorkflowId(newWorkflow.id)


      setMessage("Creating new workflow. This may take awhile");
    }

    // compare workflow
    const existing_workflow = await nimbus.workflow.retrieve()

    const diffDeps = compareWorkflows(localWorkflow.output, existing_workflow.workflow_api);

    // sync workflow
    if(!isWorkflowUpToDate(diffDeps)) {
      setMessage("Syncing dependencies...");
      workflowState.setState("workflowState", WorkflowState.SYNCING);

      const { dependencies, workflow_patch } = await resolveDependencies(diffDeps)
      const res = await local.uploadDependencies({
        workflow_id: getWorkflowId(),
        endpoint,
        ...dependencies,
      })


      const uploadTaskId = res.task_id
      if(uploadTaskId) {
        taskId.val = uploadTaskId
        // Open UI window
        progressDialog.show();
      
        await pollSyncDependencies(uploadTaskId)
      }

      setMessage("Updating workflow...");
      workflowState.setState("workflowState", WorkflowState.UPDATING);

      await nimbus.workflow.update({
        workflow: localWorkflow.workflow,
        workflow_api: localWorkflow.output,
        workflow_patch: workflow_patch,
        dependencies: dependencies,
      })
    }

    // Beyond this point, we assume all dependencies
    // and workflow api is synced to the cloud
    
    // create run
    //await createRun()
    const newWorkflowRun = await nimbus.workflowRun.create()

    infoDialog.showMessage(
      "Item queued! Comfy Cloud node has been created on the ComfyUI interface",
      "You can view your generation results by clicking 'View Results' on the newly-created node."
    )

    const e = new CustomEvent('workflowRunCreated', {
      detail: {
        workflowRunId: newWorkflowRun.id
      }
    });
    document.dispatchEvent(e);

    workflowState.setState("workflowState", WorkflowState.PROCESSING);
  } catch (e) {
    // handle error
    await nimbus.workflow.error({ e });
    infoDialog.showMessage("Error", e);
  } finally {
    setButtonDefault()
    setMessage("")
  }
}

document.addEventListener('workflowRunCreated', async (e) => {
  let poll = true; // Use a boolean variable to control the loop

  while (poll) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds before the next poll

    try {
      const { workflowRun } = await nimbus.workflowRun.pollRun(e.detail.workflowRunId);
      if (workflowRun?.status === "success" || workflowRun?.status === "failed" || workflowRun?.status === "terminated") {
        poll = false; // Exit the loop when a terminal status is reached
      }
    } catch (error) {
      console.error("Poll workflow run error:", error);
      poll = false; // Exit the loop if an error occurs
    }
  }

  console.log("Show notif: Workflow run completed", e.detail.workflowRunId);
  infoDialog.showMessage(
    "Workflow run completed!",
    "You got an extra +6 credits for running this workflow. You can use these credits to run more workflows. View your generation results by clicking the 'Menu' button in your Comfy Cloud custom node."
  );
});