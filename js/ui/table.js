import van from '../lib/van.js';
import {Await} from '../lib/van-ui.js';
import { nimbus } from '../resource/index.js';
import { formatTimestamp, formatDuration, compareDates } from '../utils.js';

const {div, table, th, tr, td, tbody, thead, span } = van.tags

export const WorkflowRunsTable = (activeTab, runId) => {
  const data = van.state(nimbus.workflow.retrieve())
  const tableColumns = ["Number", "Time", "Duration", "Status"]

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
            workflow.runs.sort(compareDates).map((run,i) => 
              tr({onclick: () => (activeTab.val = 1, runId.val = run.id), style: "border-bottom: 1px solid #ddd; cursor: pointer;"},
                [i,formatTimestamp(run.created_at), formatDuration(run.duration), run.status].map(item =>
                  td({style: "padding: 12px;"}, item)
                )
              )
            )
          )
        )
      )
    ),
  ]
}


