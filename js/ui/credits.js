import van from '../lib/van.js';
import { Await } from '../lib/van-ui.js';
import { nimbus } from '../resource/index.js';

const {div, b, span } = van.tags


export const RemainingCredits = () => {
  const credits = van.state(nimbus.billing.retrieveCredits())

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
    )
  )
}
