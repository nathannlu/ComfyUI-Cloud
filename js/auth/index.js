import { ComfyCloudDialog } from '../comfy/ui.js';
import van from '../lib/van.js';

import { Login } from './login.js';
import { Register } from './register.js';

const Auth = (dialogInstance) => {
  const activeTab = van.state(1)

  return () => van.tags.div(
    activeTab.val == 0 ? Login(dialogInstance, activeTab) : Register(dialogInstance, activeTab)
  )
}

export const authDialog = new ComfyCloudDialog(Auth)
