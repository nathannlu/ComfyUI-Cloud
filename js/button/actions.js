import { 
  uploadLocalWorkflow, 
  syncDependencies, 
  pollSyncDependencies, 
  getCloudWorkflow, 
  createEmptyWorkflow,
  createRun
} from "../client.js"
import { 
  createMetaNode, 
  getApiToken, 
  validatePrompt, 
  compareWorkflows, 
  isWorkflowUpToDate
} from "../utils.js"
import { 
  app,
} from '../comfy/comfy.js'; 
import { 
  infoDialog,
} from '../comfy/ui.js'; 
import { 
  setButtonDefault,
  setButtonLoading,
  setMessage,
} from './ui.js'; 
import { logger } from '../logger.js';
import { authDialog } from '../node/auth.ui.js';

export async function onGeneration() {
  logger.newLog();
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

    // check if ComfyCloud meta node exists
    const deployMeta = app.graph.findNodesByType("ComfyCloud");
    const isNewWorkflow = deployMeta.length == 0

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
      await createEmptyWorkflow()

      setMessage("Creating new workflow. This may take awhile");
    }

    // compare workflow
    const existing_workflow = await getCloudWorkflow() 

    const diffDeps = compareWorkflows(localWorkflow.output, existing_workflow.workflow_api);

    // sync workflow
    if(!isWorkflowUpToDate(diffDeps)) {
      setMessage("Syncing dependencies...");
      const { taskId:uploadTaskId, dependencies, workflow_patch } = await syncDependencies(diffDeps)
      if(uploadTaskId) {
        await pollSyncDependencies(uploadTaskId)
      }

      setMessage("Updating workflow...");

      await uploadLocalWorkflow(dependencies, workflow_patch)
    }

    // Beyond this point, we assume all dependencies
    // and workflow api is synced to the cloud
    
    // create run
    await createRun()
    infoDialog.showMessage(
      "Item queued!",
      "You can view your generation results by clicking the 'Menu' button in your Comfy Cloud custom node."
    )
  } catch (e) {
    // handle error
    logger.error("onGeneration error", e)
    infoDialog.showMessage("Error", e);
  } finally {
    await logger.saveLog()
    setButtonDefault()
    setMessage("")
  }
}

