/**
 * Communicating with internal and external
 * API resources
 */
import { getData } from '../store.js';
import { extractUrlParams, makeURLInterpolator } from './utils.js';
import { apiEndpoints } from './endpoints.js';
import {
  getWorkflowId, 
} from '../utils.js';
import { endpoint } from '../constants.js';

function gen(value) {
  return async function(...args) {
    const { apiKey } = getData();
    const workflowId = getWorkflowId()

    try {
      // Parse args to build full URL
      const urlParams = extractUrlParams(value.path)
      const urlData = urlParams.reduce((urlData, param) => {

        // @monkey patch
        // patch in workflow_id
        if(param == "workflow_id") {
          urlData[param] = workflowId 
          return urlData;
        }

        const arg = args.shift();
        if (typeof arg !== 'string') {
          throw new Error(
            `Stripe: Argument "${param}" must be a string, but got: ${arg} (on API request to \`${value.path}\`)`
          );
        }

        urlData[param] = arg;

        return urlData;
      }, {});
      const parsedPath = makeURLInterpolator(value.path)(urlData)
      const fullPath = endpoint + parsedPath

      // After url parsing, the next arg 
      // will be the options data
      let body;
      if (!Array.isArray(args) || !args[0] || typeof args[0] !== 'object') {
        body = {};
      }
      body = args.shift();

      const opts = {
        method: value.method,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + apiKey,
        },
      }

      if(value.method == "POST" || value.method == "PUT") {
        opts.body = JSON.stringify(body)
      }

      const res = await fetch(fullPath, opts)

      // Check if .json() exists in the response
      const data = res.headers.get('content-type').includes('application/json')
        ? await res.json()
        : null;

      if (res.status !== 200 && res.status !== 201) {
        const errorMessage = data?.message || "Server error"
        throw new Error(errorMessage)
      }

      return data;
    } catch(e) {
      console.log(e)
      const errorMessage = e?.message || "Something went wrong. Please try again"
      throw new Error(errorMessage)
    }
  }
}

function prepare() {
  let nimbus = {};
  for (const [cls, value] of Object.entries(apiEndpoints)) {
    nimbus[cls] = {}

    for (const [funcName, funcData] of Object.entries(value)) {
      const func = gen(funcData)

      nimbus[cls][funcName] = func
    }
  }

  return nimbus;
}

export const nimbus = prepare()

