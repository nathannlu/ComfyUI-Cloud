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
    // await createMetaNode();
    setButtonDefault()

    // check auth
    const apiToken = getApiToken();
    const doesApiTokenExist = !!apiToken;

    if(!doesApiTokenExist) {
      // Request auth
      setButtonDefault()
      return authDialog.show();
    }

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
    await nimbus.workflowRun.create()

    infoDialog.showMessage(
      "Item queued!",
      "You can view your generation results by clicking the 'Menu' button in your Comfy Cloud custom node."
    )
    workflowState.setState("workflowState", WorkflowState.PROCESSING);
  } catch (e) {
    // handle error
    infoDialog.showMessage("Error", e);
  } finally {
    setButtonDefault()
    setMessage("")
  }
}

