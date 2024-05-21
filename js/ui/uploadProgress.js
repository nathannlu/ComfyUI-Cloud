import van from '../lib/van.js';
import { Await } from '../lib/van-ui.js';
import { nimbus, local } from '../resource/index.js';
import { pollSyncDependenciesStatus } from '../button/dependencies.js';
import { fileIcon } from './html.js';

const { h2, img, a, button, div, b, span, source } = van.tags
const { path, svg} = van.tags("http://www.w3.org/2000/svg")

// Show the first 4 characters, and last 18 characters of this string
function cropString(str) {
  const firstThree = str.substring(0, 4);
  const lastTen = str.substring(str.length - 36);
  const middlePart = '...';
  return firstThree + middlePart + lastTen;
}


const ProgressBar = (progress) => {
  const progressPercentage = 100 - (progress.value/progress.max * 100)
  return () => div({style: "height: 18px; width: 100%; background: rgba(255,255,255,.1); transition: all .2s; border-radius: 4px; overflow: hidden;"},
    div({style: `width: ${progressPercentage}%; background-color: #1D4AFF; border-radius: 4px;`},
      span({style: "font-size: 12px"}, `${progressPercentage.toFixed(2)}%`)
    )
  )
}

export const taskId = van.state(null)
export const Progress = (dialogInstance) => {
  
  const data = van.state(local.pollUploadStatus(taskId.val)) // workflowRun data

  const combineCustomNodeData = (data) => {
    const result = {};

    for (const [path, obj] of Object.entries(data)) {
      if (path.includes('custom_nodes')) {
        const parts = path.split('/');
        const nodeIndex = parts.indexOf('custom_nodes') + 1;
        const nodePath = parts.slice(0, nodeIndex + 1).join('/');

        if (!result[nodePath]) {
          result[nodePath] = { "max": 0, "value": 0 };
        }

        result[nodePath]["max"] += obj["max"];
        result[nodePath]["value"] += obj["value"];

      } else {
        result[path] = obj;
      }
    }

    return result;
  }

  const start = () => dialogInstance.poll = dialogInstance.poll || setInterval(async () => {
    const res = await local.pollUploadStatus(taskId.val)
    
    if(!(
      res.status == pollSyncDependenciesStatus.STARTED ||
      res.status == pollSyncDependenciesStatus.UPLOADING ||
      res.status == pollSyncDependenciesStatus.HASHING)
    ) {
      // Stop poll
      clearInterval(dialogInstance.poll)
      dialogInstance.close()
      dialogInstance, dialogInstance.poll = 0;
    } 

    const formattedData = { ...res, progress: combineCustomNodeData(res.progress)}
    data.val = Promise.resolve(formattedData)
  }, 2500)

  start()

  return () => div({style: 'width: 360px; overflow-y: scroll; height: 480px;'}, 
    Await({
      value: data.val, 
      container: span,
      Loading: () => "Loading",
      Error: () => "Request failed.",
    }, data => div(

      div({style: "margin-bottom: 16px"},
        b("Status:"),
        data.status
      ),

      Object.entries(data.progress).map(([key, val]) => {
        return () => div({style: "margin-bottom: 16px;"}, 
          div({style: "display: flex; align-items: center; gap: 8px;"},
            div({style: 'width: 12px; color: white;'},
              svg({xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 384 512"},
                path({"d": "M320 464c8.8 0 16-7.2 16-16V160H256c-17.7 0-32-14.3-32-32V48H64c-8.8 0-16 7.2-16 16V448c0 8.8 7.2 16 16 16H320zM0 64C0 28.7 28.7 0 64 0H229.5c17 0 33.3 6.7 45.3 18.7l90.5 90.5c12 12 18.7 28.3 18.7 45.3V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V64z", "fill": "currentColor"}),
              )
            ),
            span({style: "font-size: 12px"}, b(cropString(key))),
          ),

          div({style: "width: 100%"},
            ProgressBar({value: val.value, max: val.max})
          )
        )
      })

    )
  ))
}


