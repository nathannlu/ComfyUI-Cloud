# Get Started

Once you have installed the custom node, you will notice a new button appearing on your right-hand panel labeled "Generate on Cloud" below the "Queue Prompt" button. Click on this button to begin.

**NOTE**: DO NOT attempt to manually search and create the ComfyUI Cloud node. The custom node will handle this process automatically for you at a later stage.

## Log in

Create an account to commence using the node. Currently, this account is utilized to keep your generated images private and to manage your generation credits if you opt to purchase more.

Upon logging in, click the "Generate on Cloud" button once more to name and upload your workflow.

## Uploading Your Workflow

After providing a name, the custom node will search for models, custom nodes, and images your workflow relies on. It will subsequently upload them to your cloud. This step may take some time, particularly if your workflow utilizes numerous custom nodes and models. Feel free to take a coffee break!

**IMPORTANT**: This node exclusively searches for models, images, and custom nodes within your ComfyUI folder. Thus, if your ComfyUI utilizes models from Automatic1111 installation via extra_model_paths.yaml, you must relocate the models to inside ComfyUI and deactivate Comfy's extra_model_paths.yaml.

## Running Your Workflow

Upon completion of the upload process, a Comfy Cloud node will be created in your workflow, automatically executing your workflow in the cloud once.

Should you delete this Comfy Cloud node, you will be required to re-upload your workflow.

You can access all cloud workflow runs by clicking the blue "View past runs" button in your Comfy Cloud node.

To locate your most recent generation, scroll to the bottom of the table that pops up after clicking "View past runs" and select the item with the latest timestamp. If your workflow requires significant time for generation, it will display progress, iterations per second, an estimated time for completion, and an option to halt execution. Stopping the execution will result in charges only up to the point of termination.

Upon successful generation, the panel will automatically display your generated image.
