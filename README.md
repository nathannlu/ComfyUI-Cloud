<p align="left">
  <img src="https://img.shields.io/badge/stability-beta-blue" />
  <img src="https://img.shields.io/badge/GPU-Nvidia_A10G_24GB_VRAM-green" />
</p>

Join [Discord](https://discord.gg/2PTNx3VCYa) to have your questions answered immediately!

## Run your workflow using cloud GPU resources, from your local ComfyUI
Don't have enough VRAM for certain nodes? Our custom node enables you to run ComfyUI locally with full control, while utilizing cloud GPU resources for your workflow. 

- Run workflows that require high VRAM
- Don't have to bother with importing custom nodes/models into cloud providers
- No need to spend cash for a new GPU


https://github.com/nathannlu/comfyui-cloud/assets/24965772/1c8ea638-edc3-49b8-ab77-9e4987764e70


## Comfy Cloud Plugin Installation

> Plugin lets you execute workflows on a cloud GPU, even if your laptop does not have one.

1. `cd custom_nodes`
2. `git clone https://github.com/nathannlu/comfyui-cloud.git`
3. Run your workflow!

## How to use 
After you first install the plugin...
1. The first time you click 'generate', you will be prompted to log into your account.
2. Subsequent generations after the first is faster (the first run it takes a while to process your workflow).
Once those two steps have been completed, you will be able to seamlessly generate your workflow on the cloud!

## Special Thanks

- comfyui
- modal
- bennykok
