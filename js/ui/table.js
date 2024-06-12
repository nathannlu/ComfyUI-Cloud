import van from '../lib/van.js';
import {Await} from '../lib/van-ui.js';
import { nimbus } from '../resource/index.js';
import { formatTimestamp, formatDuration, compareDates } from '../utils.js';
import  workflowState, { WorkflowState } from '../assistant/state.js';

const Status = {
  NOT_STARTED: "not-started",
  RUNNING: "running",
  SUCCESS: "success",
  FAILED: "failed",
  UPLOADING: "uploading"
};

const {div, table, th, tr, td, tbody, thead, span } = van.tags


export const WorkflowRunsTable = (activeTab, runId) => {
  const data = van.state(nimbus.workflow.retrieve())
  const tableColumns = ["Number", "Time", "Duration", "Status"]

  function getFinalStatus(statuses) {
    if (statuses.includes(Status.NOT_STARTED)) {
        return WorkflowState.PROCESSING;
    } else if (statuses.includes(Status.RUNNING)) {
        return WorkflowState.RUNNING;
    } else if (statuses.every(status => status === Status.SUCCESS)) {
        return WorkflowState.FINISHED;
    } else if (statuses.includes(Status.FAILED)) {
        return WorkflowState.IDLE;
    } else {
        return Status.IDLE;
    }
}

  return [
    () => div(
      Await({
        value: data.val, 
        container: span,
        Loading: () => "Loading...",
        Error: () => "Request failed.",

      }, workflow => 
        table({style: "border-collapse: collapse; width: 100%;"},
          thead({},
            tr({style: "background-color: #f4f4f4; color: #333; border-bottom: 2px solid #ddd; text-align: left;"},
              tableColumns.map(title =>
                th({style: "padding: 12px"},
                  title
                )
              )
            )
          ),

          tbody({style: "padding: 0 10px"}, 

            workflow.runs.sort(compareDates).map((run, i) => {
              const statusToSet = getFinalStatus(["not-started", "running", "success", "failed", "uploading"])
              workflowState.setState("workflow", statusToSet)

              return tr({ onclick: () => (activeTab.val = 1, runId.val = run.id), style: "border-bottom: 1px solid #ddd; cursor: pointer;"},
                  [i, formatTimestamp(run.created_at), formatDuration(run.duration), run.status].map(item =>
                    td({style: "padding: 12px;"}, item)
                  )
                )
              }
            )
          )
        )
      )
    ),
  ]
  
}


