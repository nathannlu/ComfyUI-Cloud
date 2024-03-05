import { 
  uploadLocalWorkflow, 
  syncDependencies, 
  pollSyncDependencies, 
  buildVenv, 
  //buildVenvPartial, 
  getCloudWorkflow, 
  createEmptyWorkflow,
  createRun
} from "./client.js"
import { 
  getData, 
  createMetaNode, 
  getApiToken, 
  validatePrompt, 
  getWorkflowId, 
  compareWorkflows, 
  isWorkflowUpToDate
} from "./utils.js"
import { 
  configDialog, 
  infoDialog,
  setButtonDefault,
  setButtonLoading,
  setMessage,
} from './ui.js'; 
import { logger } from './logger.js';

export async function onGeneration() {
  logger.newLog();
  try {
    const { endpoint } = getData();
    setButtonDefault()

    // check auth
    const apiToken = getApiToken();
    const doesApiTokenExist = !!apiToken;

    if(!doesApiTokenExist) {
      // Request auth
      configDialog.show();
    }

    // check if ComfyCloud meta node exists
    const deployMeta = graph.findNodesByType("ComfyCloud");
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
      const { taskId, nodesToUpload } = await syncDependencies(localWorkflow.output)
      await pollSyncDependencies(taskId)

      setMessage("Building environment...");
      await buildVenv(nodesToUpload)

      await uploadLocalWorkflow()
    }

    // compare workflow
    const existing_workflow = await getCloudWorkflow() 

    const diffDeps = compareWorkflows(localWorkflow.output, existing_workflow.workflow_api);

    // sync workflow
    if(!isWorkflowUpToDate(diffDeps)) {

      setMessage("Syncing dependencies...");
      const { taskId, nodesToUpload } = await syncDependencies(diffDeps)
      await pollSyncDependencies(taskId)

      if(nodesToUpload) {
        setMessage("Building environment...");
        await buildVenv(nodesToUpload)
      }

      await uploadLocalWorkflow()
    }

    // Beyond this point, we assume all dependencies
    // and workflow api is synced to the cloud
    
    // create run
    const workflow_id = getWorkflowId()
    await createRun()
    infoDialog.showMessage(
      "Item queued!",
      `View your generation results at this URL: ${endpoint}/workflows/${workflow_id}`,
    )
  } catch (e) {
    // handle error
    // @todo - log to error logger
    logger.error("onGeneration error", e)

    infoDialog.showMessage("Error", e);
  } finally {
    await logger.saveLog()
    setButtonDefault()
    setMessage("")
  }
}

