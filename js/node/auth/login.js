import van from '../../lib/van.js';
import { setData } from '../../store.js';
import { nimbus } from '../../resource/index.js';
import { infoDialog } from '../../comfy/ui.js';
import { generateForm } from '../../ui/form.js';

const { a, div, p } = van.tags


const loginUser = async ({email, password}, dialogInstance) => {
  // Retrieve values from the input fields
  try {
    const data = await nimbus.auth.login({ 
      email: email, 
      password: password,
    })
    setData({
      apiKey: data.token,
      user: data.user
    })

    infoDialog.show();
    infoDialog.showMessage(
      "Authenticated",
      "You are now logged in",
    );
    dialogInstance.close()

  } catch(e) {
    throw new Error(e.message)
  } 
}

export const Login = (dialogInstance, activeTab) => {
  const schema = {
    title: "Login",
    fields: {
      email: {
        label: "Email",
        type: "email",
        placeholder: "Enter your email",
        required: true
      },
      password: {
        label: "Password",
        type: "password",
        placeholder: "Enter your password",
        required: true
      }
    },
    onSubmit: loginUser,
    submitButtonText: "Login"
  };

  console.log(activeTab)

  return () => div(
    generateForm(schema, dialogInstance),
    p({style: "color: #eee; text-align: center; margin-top: 20px; cursor: pointer;"},
      a({onclick: () => activeTab.val = 1}, "Don't have an account? Click here to sign in")
    )
  );
}
