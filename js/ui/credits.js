import van from '../lib/van.js';
import { Await } from '../lib/van-ui.js';
import { nimbus } from '../resource/index.js';

const {div, b, span } = van.tags

const StripeEmbed = (publicKey, client_secret) => `
  <stripe-buy-button
    buy-button-id="buy_btn_1Oxf5MIO9d9HAC5qTz8GDWGA"
    publishable-key="${publicKey}"
    customer-session-client-secret="${client_secret}"
  >
  </stripe-buy-button>
`

export const RemainingCredits = () => {
  const credits = van.state(nimbus.billing.retrieveCredits())
  const sesh = van.state(nimbus.billing.retrieveCustomerSession())

  return () => div({ style: "width: 500px"},
    Await({
      value: credits.val, 
      container: span,
      Loading: () => "Loading...",
      Error: () => "Request failed.",

    }, ({credits}) => 
      div(
        b("Remaining credits: "),
        `${credits}`
      )
    ),
    div({style: "margin-top: 24px; margin-bottom: 8px"},
      div(b("Purchase more credits")),
      div("$4.99 for 1650 Compute credits"),
      div("No subscription required. Only pay for what you use."),
    ),
    Await({
      value: sesh.val, 
      container: span,
      Loading: () => "Loading...",
      Error: () => "Request failed.",
    }, ({ customerSession}) => {
      const out = div()
      const script = document.createElement('script');
      const stripeEmbed = document.createElement('div');

      script.src = "https://js.stripe.com/v3/buy-button.js"
      script.async = true

      stripeEmbed.innerHTML = StripeEmbed(
        "pk_live_84RN49GepXnzAQjmBizHqqzP00Jon7hFeu",
        customerSession.client_secret
      );

      out.append(script)
      out.append(stripeEmbed)

      return out;
    })
  )
}
