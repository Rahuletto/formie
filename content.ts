import type { PlasmoCSConfig } from "plasmo"


export const config: PlasmoCSConfig = {
  matches: [
    "https://*.google.com/forms/*",
    "https://*.forms.office.com/*",
    "https://*.microsoft.com/forms/*"
  ],
  world: "MAIN"
}

// Inject a script tag to expose window.fillFormWithAnswers
const script = document.createElement("script")
script.textContent = `
  // This function will be available to the page context
  window.fillFormWithAnswers = function(answers) {
    try {
      console.log('Form filling started with', answers)
      
      if (!Array.isArray(answers)) {
        console.error("Answers must be an array of objects")
        return { success: false, message: "Invalid answers format" }
      }

      // Send message to our content script
      window.postMessage({ type: "FILL_FORM_DATA", answers }, "*")
      
      // Listen for the result
      return new Promise((resolve) => {
        const listener = (event) => {
          if (event.data.type === "FILL_FORM_RESULT") {
            window.removeEventListener("message", listener)
            resolve(event.data.result)
          }
        }
        window.addEventListener("message", listener)
        
        // Timeout after 5 seconds
        setTimeout(() => {
          window.removeEventListener("message", listener)
          resolve({ success: false, message: "Operation timed out" })
        }, 5000)
      })
    } catch (error) {
      console.error("Error in fillFormWithAnswers:", error)
      return { success: false, message: error.message || "Unknown error" }
    }
  }
`
document.head.appendChild(script)
