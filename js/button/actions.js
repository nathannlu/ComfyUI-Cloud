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

import { ComfyCloudDialog, ComfyCloudPopover } from '../comfy/ui.js';
import van from '../lib/van.js';
import { Await } from '../lib/van-ui.js';

const {video, h2, img, a, button, div, b, span, source } = van.tags

const ProgressBar = (progress) => {
  const progressPercentage = 100 - (progress.value/progress.max * 100)
  return () => div({style: `width: ${progressPercentage}%; height: 24px; background-color: #1D4AFF; transition: all .2s;`}, `${progressPercentage.toFixed(2)}%`)
}

const taskId = van.state(null)
const Progress = (dialogInstance) => {
  
  const activeTab = van.state(0)
  const data = van.state(local.pollUploadStatus(taskId.val)) // workflowRun data

  const start = () => dialogInstance.poll = dialogInstance.poll || setInterval(async () => {
    const res = await local.pollUploadStatus(taskId.val)
    
    if(!(res.status == "Task started" || res.status == "Task uploading" || res.status == "Task hashing")) {
      // Stop poll
      clearInterval(dialogInstance.poll)
      dialogInstance.close()
      dialogInstance, dialogInstance.poll = 0;
    } 

    data.val = Promise.resolve(res)
  }, 1000)

  start()

  return () => van.tags.div({style: 'width: 320px'},
    div(
      h2("Uploading dependencies"),
    ),
    Await({
      value: data.val, 
      container: span,
      Loading: () => "Loading",
      Error: () => "Request failed.",
    }, data => div(
      div(
        b("Status:"),
        data.status
      ),
      Object.keys(data.progress).length === 0 ? "Loading" : 
      Object.entries(data.progress).map(([key, val]) => {
      return () => div(
        b(key),
        ProgressBar({value: val.value, max: val.max})
      )
    }))
  ))
}

export const progressDialog = new ComfyCloudPopover(Progress)
//progressDialog.show();

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
  } catch (e) {
    // handle error
    infoDialog.showMessage("Error", e);
  } finally {
    setButtonDefault()
    setMessage("")
  }
}

