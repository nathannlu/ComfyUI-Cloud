import { 
  getUser, 
  getWorkflowId, 
  generateUUID,
} from "./utils.js"

/**
 * Basic error logger for customer service debugging
/* creates log.txt files in /logs dir
 */


class Logger {
  constructor() {
    this.currentLogs = {}
  }

  newLog() {
    this.currentLogs = {
      logId: generateUUID(),
      logs: [],
    }
  }

  info(message) {
    this.currentLogs.logs.push(`[INFO] ${message}`)
  }

  error(message, error) {
    console.log(message, error)
    const stacktrace = typeof error == 'object' ? error?.message : error
    this.currentLogs.logs.push(`[ERROR] ${message}. Stacktrace: ${stacktrace}`)
  }

  async saveLog() {
    const user = await getUser();
    this.currentLogs.userId = user.id
    this.currentLogs.workflowId = getWorkflowId()

    // send to py backend 
    console.log(this.currentLogs)
    const body = {
      log: this.currentLogs,
    }

    const data = await fetch("/comfy-cloud/save-log", {
      method: "POST",
      body: JSON.stringify(body),
    }).then((x) => x.json())
  }
}

export const logger = new Logger()
