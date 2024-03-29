import van from '../lib/van.js';
import {Await} from '../lib/van-ui.js';
import { infoDialog } from '../comfy/ui.js';
import { nimbus } from '../resource/index.js';

const {video, img, a, button, div, b, span, source } = van.tags


const Alert = ({ title, message, status = "info" }) => {

  const colors = {
    INFO: "#bee3f8",
    WARNING: "#feebc8",
    ERROR: "#fed7d7",
    SUCCESS: "#c6f6d5",
  }

  return () => div({style: `color: black; padding: 16px; background-color: ${colors[status.toUpperCase()]}`},
    b(title),
    message
  )
}

const GenerateOutputs = (outputs) => {
  return outputs?.map((run) => {
    const fileName = run.data.images?.[0].filename ||
      run.data.files?.[0].filename ||
      run.data.gifs?.[0].filename;

    if (!fileName) {
      return () => div(
        div("Output"),
        div(`${JSON.stringify(run.data, null, 2)}`)
      )
    }

    // const filePath
    return () => div(
      div(`${fileName}`),
      RenderOutput(run.run_id, fileName)
    ) 
  })
}


const RenderOutput = (run_id, filename) => {
  const url = `https://comfyui-output.nyc3.digitaloceanspaces.com/comfyui-output/outputs/runs/${run_id}/${filename}`
  if (filename.endsWith(".mp4") || filename.endsWith(".webm")) {
    return () => video({controls: true, autoPlay: true},
      source({ src: url, type: "video/mp4" }),
      source({ src: url, type: "video/webm" }),
      "Your browser does not support the video tag."
    )
  }

  if (
    filename.endsWith(".png") ||
    filename.endsWith(".gif") ||
    filename.endsWith(".jpg") ||
    filename.endsWith(".jpeg")
  ) {
    return () => img({style: "max-width: 100%", src: url, alt: filename})
  } else {
    return () => a({download: true, href:url}, filename);
  }
}

const ETA = ({ workflowRun, progress }) => {
  const elapsedTimeInSeconds = van.state(0)
  if (workflowRun?.started_at) {
    let startTime = new Date(workflowRun.started_at).getTime(); // Convert start time to milliseconds

    // Current time in milliseconds
    let currentTime = Date.now(); 

    // Calculate elapsed time in seconds
    elapsedTimeInSeconds.val = (currentTime - startTime) / 1000;
  }

  const estimatedRunningTime = van.derive(() => {
    const remainingProgress = progress.max - progress.value
    const remainingProgressInSeconds = (remainingProgress * progress.iterationsPerSecond)
    return elapsedTimeInSeconds.val + remainingProgressInSeconds;
  })

  return () => div( 
    estimatedRunningTime.val !== undefined && estimatedRunningTime.val > 300 ? 
    Alert({ title: "Warning", status: "warning", message: () => div(
    "This execution will most likely not complete. Your current plan only supports generation time of 300 seconds. ",
     `This generation is estimated to be ${estimatedRunningTime.val}s`)}) : 
    div(
      b("Estimated total running time: "), 
      `${estimatedRunningTime.val || "--"}s`
    )
  )
}

const ProgressBar = (progress) => {
  const progressPercentage = progress.value/progress.max * 100
  return () => div({style: `width: ${progressPercentage}%; height: 24px; background-color: #1D4AFF; transition: all .2s;`},
    `${progressPercentage}% - ${progress.iterationsPerSecond} it/s`
  )
}

const LoadingButton = ({ onclick }, text) => {
  const isLoading = van.state(false)

  return () => isLoading.val ? 
    button({}, "Loading") : 
    button({onclick: async() => (isLoading.val = true, await onclick(), isLoading.val = false)}, text)
}


export const RunDetails = (activeTab, runId, poll, dialogInstance) => {
  const data = van.state(nimbus.workflowRun.pollRun(runId.val)) // workflowRun data
  const output = van.state(null)

  dialogInstance.closeCallback = () => {
    activeTab.val = 0
    runId.val = null
    clearInterval(poll)
  }

  const closeDialogWithMessage = (header, message) => {
    infoDialog.show();
    infoDialog.showMessage(
      header,
      message,
    );
    clearInterval(poll)
    dialogInstance.close()
  }

  //debug function
  //van.derive(async() => console.log(await data.val))

  const start = () => poll = poll || setInterval(async () => {
    const { workflowRun, progress } = await nimbus.workflowRun.pollRun(runId.val)

    if(workflowRun?.status == "success" || workflowRun?.status == "failed" || workflowRun?.status == "terminated") {
      // Stop poll
      clearInterval(poll)
      poll = 0;

      // query output only for failed / succeeded runs
      if (workflowRun?.status != "terminated") {
        output.val = nimbus.workflowRun.retrieveOutput(runId.val)
      }
    } 

    data.val = Promise.resolve({ workflowRun, progress })
  }, 2000)

  start()

  return [
    () => div(
      div(
        div({style: "border-collapse: collapse; width: 100%;"},
          div({style: "margin-bottom: 24px"},
            button({onclick: () => (activeTab.val = 0, runId.val = null)}, "back"),
          ),
          Await({
            value: data.val, 
            container: span,
            Loading: () => "Loading",
            Error: () => "Request failed.",
          }, ({workflowRun, progress }) => div({style: 'display: flex; flex-direction: column; gap: 8px'},
              div(
                b("Status: "),
                workflowRun.status,
              ),

              progress != null ? div({style: 'display: flex; flex-direction: column; gap: 8px'},
                ETA({workflowRun, progress}),

                ProgressBar(progress),

                div(
                  LoadingButton({onclick:async() => {
                    await nimbus.workflowRun.cancel(runId.val)
                    closeDialogWithMessage(
                      "Successfully terminated",
                      "You will only be billed for the time your workflow was running."
                    )

                  }}, "Terminate")
                ),
              ) : "",

              
              div(
                workflowRun?.status == "success" || workflowRun?.status == "failed" ? div(
                  output.val == null ? 
                  "Loading output" : 
                  Await({
                    value: output.val, 
                    container: span,
                    Loading: () => "Loading output",
                    Error: () => "Request failed.",
                  }, data => div(
                    data?.outputs ? GenerateOutputs(data.outputs) : ""
                  ))
                ) : "",
              ),
            )
          ),
        )
      )
    )
  ]
}



