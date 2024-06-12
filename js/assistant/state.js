export const WorkflowState = {
    INSUFFICIENT_CREDITS: "Borked.\nNot enough credits to run another workflow.\nPress 'Account' to top up. ",
    IDLE: "No workflows running.\nLet's generate something! Woof.",
    CREATING: "Creating new workflow.\nThis may take a while. Woof.",
    SYNCING: "Syncing dependencies to the cloud.\nWoof.",
    UPDATING: "Updating workflows with the cloud.\nWoof.",
    PROCESSING: "Processing workflow for execution.\nClick 'View Results' to see its progress.",
    RUNNING: "Workflow's running.\nLet's get a coffeee. Woof.",
    FINISHED: "Workflow's done,\nlet's have a peep!",
};

class State {
    constructor() {
        if (!State.instance) {
            this.state = {workflowState: WorkflowState.IDLE};
            State.instance = this;
        }
        return State.instance;
    }

    getState(key) {
        return this.state[key];
    }

    setState(key, value) {
        this.state[key] = value;
    }
}

const instance = new State();
Object.freeze(instance);

export default instance;