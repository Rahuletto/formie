chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "fillForm") {
      fillFormInTab(request.answers, sendResponse);
      return true; // Indicates we will respond asynchronously
    } else if (request.action === "extractForm") {
      extractFormFromTab(sendResponse);
      return true; // Indicates we will respond asynchronously
    } else if (request.action === "submitForm") {
      submitFormInTab(sendResponse);
      return true; // Indicates we will respond asynchronously
    }
  });