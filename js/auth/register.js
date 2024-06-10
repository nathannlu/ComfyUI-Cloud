import van from '../lib/van.js';
import { setData } from '../store.js';
import { nimbus } from '../resource/index.js';
import { infoDialog } from '../comfy/ui.js';
import { generateForm } from '../ui/form.js';

const { a, div, p } = van.tags

const registerUser = async ({email, password, confirmPassword}, dialogInstance) => {
  // Retrieve values from the input fields

  try {
    if(password !== confirmPassword) {
      throw new Error("Password does not match with Confirm Password")
    }
    const data = await nimbus.auth.register({ 
      email, 
      password
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

export const Register = (dialogInstance, activeTab) => {
  const schema = {
    title: "Get 150 credits for free by signing up",
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
      },
      confirmPassword: {
        label: "Confirm password",
        type: "password",
        placeholder: "Re-enter your password",
        required: true
      }
    },
    onSubmit: registerUser,
    submitButtonText: "Sign up"
  };

  return () => div(
    generateForm(schema, dialogInstance),
    p({style: "color: #eee; text-align: center; margin-top: 20px; cursor: pointer;"},
      a({onclick: () => activeTab.val = 0}, "Already have an account? Click here to Log in")
    ),
    p({style: "color: #808080; text-align: center; margin-top: 18px;"},
      "All workflows are private and secured"
    )
  );
}
