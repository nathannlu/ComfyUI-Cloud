import { headerHtml, loadingIcon } from '../ui.js';
import { loginUser, registerUser } from '../client.js';
import { ComfyDialog, $el } from '../comfy/comfy.js';
import { infoDialog } from '../comfy/ui.js';

class AuthDialog extends ComfyDialog {
  container = null;

  constructor() {
    super();
    this.element.classList.add("comfy-normal-modal");
    this.element.style.paddingBottom = "20px";

    this.container = document.createElement("div");
    this.container.style.color = "white";

    this.header = document.createElement("div");
    this.header.innerHTML = headerHtml
    this.element.querySelector(".comfy-modal-content").prepend(this.container);
    this.element.querySelector(".comfy-modal-content").prepend(this.header);
  }

  createButtons() {
    return [
      $el(
        "div",
        [
          $el("button", {
            type: "button",
            textContent: "Close",
            onclick: () => this.close(),
          }),
        ],
      ),
    ];
  }

  close() {
    this.element.style.display = "none";
  }

  show() {
    this.showRegister();
  }

  showLogin() {
    this.container.innerHTML = loginPageHtml;
    const form = this.container.querySelector("#auth-form");
    form.onsubmit = async () => {
      event.preventDefault();
      this.clearErrorMessage();

      // Retrieve values from the input fields
      const email = this.container.querySelector('#email').value;
      const password = this.container.querySelector('#password').value;

      this.setButtonLoading(true)

      const data = await loginUser({ email, password })
      if(data.status !== 200 && data.message) {
        this.setErrorMessage(data.message)
      }

      this.setButtonLoading(false, "Login")

      console.log(data)

      if(data.status == 200) {
        infoDialog.show();
        infoDialog.showMessage(
          "Authenticated",
          "You are now logged in",
        );
        this.close()
      }
    }
    const link = this.container.querySelector("#go-to-register");
    link.onclick = () => {
      this.showRegister()
    };

    this.element.style.display = "flex";
    this.element.style.zIndex = 1001;
  }

  showRegister() {
    this.container.innerHTML = registerPageHtml;
    const form = this.container.querySelector("#auth-form");
    form.onsubmit = async () => {
      event.preventDefault();
      this.clearErrorMessage()

      // Retrieve values from the input fields
      const email = this.container.querySelector('#email').value;
      const password = this.container.querySelector('#password').value;
      const confirmPassword = this.container.querySelector('#password2').value;

      if(password !== confirmPassword) {
        throw new Error("Passwords don't match")
      }

      this.setButtonLoading(true)

      const data = await registerUser({ email, password })
      if(data.status !== 200 && data.message) {
        this.setErrorMessage(data.message)
      }
      this.setButtonLoading(false, "Sign up")

      if(data.status == 201) {
        infoDialog.show();
        infoDialog.showMessage(
          "Authenticated",
          "You are now logged in",
        );
        this.close()
      }
    }
    const link = this.container.querySelector("#go-to-login");
    link.onclick = () =>{
      this.showLogin();
    }

    this.element.style.display = "flex";
    this.element.style.zIndex = 1001;

  }

  clearErrorMessage() {
    this.container.querySelector('#error-message').innerHTML = "";
  }
  setErrorMessage(message)  {
    this.container.querySelector('#error-message').innerHTML = message;
  }

  setButtonLoading(isLoading, text) {
    const btn = this.container.querySelector('#auth-button')
    if(isLoading) {
      btn.innerHTML = loadingIcon;
      btn.disabled = true;
    } else {
      btn.innerHTML = text;
      btn.disabled = false;
    }
  }
}
export const authDialog = new AuthDialog()

const loginPageHtml = `
  <div style="width: 420px;">
    <h2 style="text-align: center;">Login</h2>
    <p style="color: white; text-align: center; margin-top: 20px;">
      <a style="color: #eee;" href="#" id="go-to-register">No account? Sign up here</a>
    </p>
    <form id="auth-form" style="margin-top: 20px;">
      <label for="email" style="display: block; margin-bottom: 10px;">Email</label>
      <input type="email" id="email" name="email" style="width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" placeholder="Enter your email" required>

      <label for="password" style="display: block; margin-top: 15px; margin-bottom: 10px;">Password</label>
      <input type="password" id="password" name="password" style="width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" placeholder="Enter your password" required>

      <button id="auth-button" type="submit" style="width: 100%; padding: 10px; background-color: #1D4AFF; color: #fff; border: none; border-radius: 5px; cursor: pointer; margin-top: 20px;">Login</button>

      <p id="error-message" style="color: red; text-align: center;">

      </p>
    </form>
  </div>
`;

const registerPageHtml = `
  <div style="width: 420px;">
    <h2 style="text-align: center;">Sign up for an account</h2>
    <p style="color: white; text-align: center; margin-top: 20px;">
      <a style="color: #eee;" href="#" id="go-to-login">Already have an account? Log in here</a>
    </p>

    <form id="auth-form" style="margin-top: 20px;">
      <label for="email" style="display: block; margin-bottom: 10px;">Email</label>
      <input type="email" id="email" name="email" style="width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" placeholder="Enter your email" required>

      <label for="password" style="display: block; margin-top: 15px; margin-bottom: 10px;">Password</label>
      <input type="password" id="password" name="password" style="width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" placeholder="Enter your password" required>

      <label for="password2" style="display: block; margin-top: 15px; margin-bottom: 10px;">Confirm password</label>
      <input type="password" id="password2" name="password2" style="width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" placeholder="Confirm your password" required>

      <button id="auth-button" type="submit" style="width: 100%; padding: 10px; background-color: #1D4AFF; color: #fff; border: none; border-radius: 5px; cursor: pointer; margin-top: 20px;">Sign up</button>
      <p id="error-message" style="color: red; text-align: center;">

      </p>
    </form>
  </div>
`;

