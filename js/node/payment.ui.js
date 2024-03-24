import { headerHtml } from '../ui.js';
import { ComfyDialog, $el } from '../comfy/comfy.js';
import van from '../lib/van.js';

import { nimbus } from '../resource/index.js';

import { RemainingCredits } from '../ui/credits.js';

class PaymentTableDialog extends ComfyDialog {
  container = null;

  constructor() {
    super();

    this.element.classList.add("comfy-normal-modal");
    this.element.style.paddingBottom = "20px";
    this.element.style.overflowY = "auto";

    this.container = document.createElement("div");
    this.container.style.color = "white";

    this.header = document.createElement("div");
    this.header.innerHTML = headerHtml
    this.element.querySelector(".comfy-modal-content").prepend(this.container);
    this.element.querySelector(".comfy-modal-content").prepend(this.header);

    // set stripe script
    var script = document.createElement('script');
    script.src = "https://js.stripe.com/v3/buy-button.js"
    script.async = true
    this.container.appendChild(script);
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
    this.container.removeChild(this.component)
    this.component.remove()
    this.element.style.display = "none";
  }

  async show() {
    // Fetch customer sesh

    this.component = document.createElement("div");
    van.add(this.component, RemainingCredits())
    this.container.append(this.component)

    // fetch customer sesh
    const { customerSession } = await nimbus.billing.retrieveCustomerSession()
     
    var stripeEmbed = document.createElement('div');
    stripeEmbed.innerHTML = StripeEmbed(
      "pk_live_84RN49GepXnzAQjmBizHqqzP00Jon7hFeu",
      customerSession.client_secret
    );
    this.component.appendChild(stripeEmbed);

    this.element.style.display = "flex";
    this.element.style.zIndex = 1001;
  }
}

export const paymentTableDialog = new PaymentTableDialog()

const StripeEmbed = (publicKey, client_secret) => `
  <stripe-buy-button
    buy-button-id="buy_btn_1Oxf5MIO9d9HAC5qTz8GDWGA"
    publishable-key="${publicKey}"
    customer-session-client-secret="${client_secret}"
  >
  </stripe-buy-button>
`
