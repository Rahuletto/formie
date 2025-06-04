import { useEffect, useState } from "react"

import "./style.css"

import { extractFormData } from "~lib/extract"

import { generateAnswers } from "./lib/ai"
import type { AnswerResponse, FormData } from "./lib/ai"

function IndexPopup() {
  const [currentFormUrl, setCurrentFormUrl] = useState<string>("")
  const [isFormUrl, setIsFormUrl] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    questions: [],
    answers: ""
  })
  const [loading, setLoading] = useState<boolean>(false)
  const [processing, setProcessing] = useState<boolean>(false)
  const [answers, setAnswers] = useState<AnswerResponse[]>([])

  useEffect(() => {
    chrome.storage.local.get(
      ["formData", "answers", "currentFormUrl"],
      (result) => {
        if (result.formData) {
          setFormData(result.formData)
        }
        if (result.answers) {
          setAnswers(result.answers)
        }
        if (result.currentFormUrl) {
          setCurrentFormUrl(result.currentFormUrl)
        }
      }
    )

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const url = tabs[0].url
      setCurrentFormUrl(url)

      // Save current URL
      chrome.storage.local.set({ currentFormUrl: url })
    })
  }, [])

  // Save data whenever it changes
  useEffect(() => {
    if (formData.questions.length > 0) {
      chrome.storage.local.set({
        formData: formData,
        timestamp: Date.now()
      })
    }
  }, [formData])

  useEffect(() => {
    if (answers.length > 0) {
      chrome.storage.local.set({
        answers: answers,
        timestamp: Date.now()
      })
    }
  }, [answers])

  function extractData() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          func: extractFormData
        },
        function (results) {
          if (chrome.runtime.lastError) {
            setError(chrome.runtime.lastError.message)
          }

          if (results && results[0] && results[0].result) {
            setFormData(results[0].result)
          } else {
            setError("No form data found")
          }
        }
      )
    })
  }

  async function autofillWithAI() {
    try {
      if (!formData || !formData.questions || formData.questions.length === 0) {
        setError("No form data found to autofill")
        return
      }

      setProcessing(true)
      setError("")

      try {
        const generatedAnswers = await generateAnswers(formData)
        setAnswers(generatedAnswers)

        // Save answers immediately after generation
        chrome.storage.local.set({
          answers: generatedAnswers,
          timestamp: Date.now()
        })
      } catch (aiError) {
        console.error("Error generating or applying answers:", aiError)
        setError(`Error: ${aiError.message || "Failed to generate answers"}`)
      }

      setProcessing(false)
    } catch (error) {
      console.error("Error autofilling form:", error)
      setError(`Error autofilling form: ${error.message || "Unknown error"}`)
      setProcessing(false)
    }
  }

  // Add function to clear saved data
  function clearData() {
    chrome.storage.local.clear(() => {
      setFormData({
        title: "",
        description: "",
        questions: [],
        answers: ""
      })
      setAnswers([])
      setError("")
    })
  }

  useEffect(() => {
    const isForm =
      currentFormUrl.includes("forms.google.com") ||
      currentFormUrl.includes("forms.office.com") ||
      currentFormUrl.includes("forms.microsoft.com") ||
      currentFormUrl.includes("docs.google.com/forms") ||
      /docs\.google\.com\/.*\/forms\/.*/.test(currentFormUrl) ||
      /docs\.google\.com\/.*\/viewform.*/.test(currentFormUrl) ||
      /forms\.gle\//.test(currentFormUrl)

    setIsFormUrl(isForm)
    if (isForm) {
      extractData()
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.scripting.executeScript(
          {
            target: { tabId: tabs[0].id },
            func: () => {
              return (
                document.querySelectorAll(
                  'form, [role="form"], .freebirdFormviewerViewFormCard, .m3kCof'
                ).length > 0
              )
            }
          },
          function (results) {
            if (results && results[0] && results[0].result === true) {
              setIsFormUrl(true)
              extractData()
            }
          }
        )
      })
    }
  }, [currentFormUrl])

  return (
    <main
      className={`${processing ? "gradient-animation" : ""} overflow-y-auto min-h-[550px]  h-screen w-screen relative bg-dark-bg`}>
      <div className="absolute flex p-6 pb-8 px-8 flex-col h-full z-10">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold text-white">Scout</h1>
          {(formData.questions.length > 0 || answers.length > 0) && (
            <button
              onClick={clearData}
              className="text-xs px-3 py-2 rounded-full bg-dark-primary/20 text-dark-primary">
              Clear
            </button>
          )}
        </div>

        {!isFormUrl && (
          <div className="text-error-500 p-4 bg-error-900/20 break-all min-h-[400px] text-md text-center flex items-center justify-center rounded-xl h-full mb-4">
            Please navigate to a Google or Microsoft Form to use this extension.
            Current URL: {currentFormUrl}
          </div>
        )}

        {error && (
          <div className="text-error-500 p-4 bg-error-900/20 rounded-lg mb-4">
            {error}
          </div>
        )}

        {formData && formData.questions && formData.questions.length > 0 ? (
          <div className="text-white -mx-2 mb-24">
            <div>
              {formData.questions.map((q, i) => (
                <div
                  key={i}
                  className="mb-3 py-3 px-5 bg-dark-surface/40 w-full rounded-xl">
                  <p className="font-medium text-base">
                    {q.required
                      ? q.text.replace("*", "").trim()
                      : q.text.trim()}{" "}
                    <span className="text-dark-error text-xs relative -top-1">
                      {q.required ? "*" : ""}
                    </span>
                  </p>
                  <p className="text-gray-400 text-sm">Type: {q.type}</p>
                  {q.options && q.options.length > 0 && (
                    <div className="ml-4 mt-1">
                      <p className="text-sm text-gray-400">Options:</p>
                      <ul className="list-disc ml-4">
                        {q.options.slice(1).map((opt, j) => (
                          <li key={j} className="text-sm">
                            {opt.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {answers.length > 0 &&
                    answers[i] &&
                    (answers[i].answer === null ? (
                      <div className="mt-4 p-2 bg-success/10 rounded-lg px-6">
                        <p className="text-sm font-semibold text-success">
                          Skipped (personal question)
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 p-2 bg-success/10 rounded-lg px-6">
                        <p className="text-sm font-semibold text-success">
                          {Array.isArray(answers[i].answer)
                            ? (
                                answers[i].answer as {
                                  id: number
                                  answer: string
                                  otherText?: string
                                }[]
                              )
                                .map((a) =>
                                  a.otherText
                                    ? `${a.answer}: ${a.otherText}`
                                    : a.answer
                                )
                                .join(", ")
                            : typeof answers[i].answer === "object" &&
                                answers[i].answer !== null
                              ? (() => {
                                  const answerObj = answers[i].answer as {
                                    id: number
                                    answer: string
                                    otherText?: string
                                  }
                                  return answerObj.otherText
                                    ? `${answerObj.answer}: ${answerObj.otherText}`
                                    : answerObj.answer
                                })()
                              : String(answers[i].answer)}
                        </p>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          formData &&
          formData.questions && (
            <div className="text-white mt-4">
              <p>No questions found in the form.</p>
            </div>
          )
        )}

        <div className="w-full h-48 bg-gradient-to-t from-dark-bg via-dark-bg to-transparent fixed bottom-0 left-0 pointer-events-none"></div>
        <div className="w-full flex justify-center items-center p-3 sticky bottom-3">
          <button
            onClick={autofillWithAI}
            disabled={
              loading ||
              processing ||
              formData.questions.length === 0 ||
              !isFormUrl
            }
            className={`flex-1 py-3 px-6 max-w-[200px] rounded-full w-fit bg-dark-primary hover:opacity-80 text-dark-bg font-semibold text-lg transition-colors ${loading || processing || formData.questions.length === 0 || !isFormUrl ? "opacity-50 cursor-not-allowed" : ""}`}>
            {processing ? "Thinking..." : "Find Answers"}
          </button>
        </div>
      </div>
    </main>
  )
}

export default IndexPopup
