import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: [
    "https://*.google.com/forms/*",
    "https://*.forms.office.com/*",
    "https://*.microsoft.com/forms/*"
  ],
  world: "MAIN"
}
