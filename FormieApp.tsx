import { useEffect, useState } from "react"

import "./style.css"

import { extractFormData } from "~lib/extract"

import { generateAnswers } from "./lib/ai"
import type { Answer, AnswerResponse, FormData } from "./lib/ai"

export default function FormieApp() {
  const [currentFormUrl, setCurrentFormUrl] = useState<string>("")
  const [isFormUrl, setIsFormUrl] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    questions: []
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

      chrome.storage.local.set({ currentFormUrl: url })
    })
  }, [])

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

          if (results && results[0].result) {
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

  function clearData() {
    chrome.storage.local.clear(() => {
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
      className={`${processing ? "gradient-animation" : ""} overflow-y-auto w-full h-full relative bg-dark-bg transition-all duration-300 ease-in-out`}>
      <div className="absolute flex p-8 pb-10 flex-col h-full z-10 w-full">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Formie
            </h1>
          </div>
          {(formData.questions.length > 0 || answers.length > 0) && (
            <button
              onClick={clearData}
              className="text-xs px-4 py-2.5 rounded-full bg-dark-primary/10 text-dark-primary hover:bg-dark-primary/20 transition-all duration-200 ease-in-out border border-dark-primary/20 hover:border-dark-primary/40 font-medium">
              Clear
            </button>
          )}
        </div>

        {!isFormUrl && (
          <div className="text-error-500 p-8 bg-error-900/10 backdrop-blur-sm border border-error-900/20 rounded-2xl min-h-[400px] text-sm text-center flex items-center justify-center h-full mb-6 shadow-xl">
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-error-900/20 flex items-center justify-center mb-6">
                <span className="text-error-500 text-2xl">⚠</span>
              </div>
              <p className="font-semibold text-lg text-error-400">
                Form Not Detected
              </p>
              <p className="text-error-500/80 max-w-sm mx-auto leading-relaxed">
                Please navigate to a Google or Microsoft Form to use this
                extension.
              </p>
              <div className="mt-6 p-4 bg-error-900/10 rounded-lg border border-error-900/20">
                <p className="text-xs text-error-600 font-mono break-all">
                  Current URL: {currentFormUrl}
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-error-500 p-6 bg-error-900/10 backdrop-blur-sm border border-error-900/20 rounded-xl mb-6 shadow-lg animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-start space-x-3">
              <span className="text-error-500 text-lg mt-0.5">⚠</span>
              <div>
                <p className="font-semibold text-error-400 mb-1">Error</p>
                <p className="text-sm text-error-500/90">{error}</p>
              </div>
            </div>
          </div>
        )}

        {formData && formData.questions && formData.questions.length > 0 ? (
          <div className="text-white -mx-2 mb-32 space-y-4">
            <div className="space-y-5">
              {formData.questions.map((q, i) => (
                <div
                  key={i}
                  className="transition-all duration-300 ease-in-out group">
                  {q.image && (
                    <div className="overflow-hidden rounded-t-xl border border-dark-surface/60">
                      <img
                        src={q.image}
                        alt="Question Image"
                        className="w-full h-auto transition-transform duration-300 rounded-t-xl "
                      />
                    </div>
                  )}
                  <div
                    className={`bg-dark-surface/70 border border-dark-surface/40 ${q.image ? "rounded-b-2xl p-4 pt-2" : "rounded-2xl p-4"} hover:bg-dark-surface/70`}>
                    <div className="mb-3">
                      <p className="font-semibold text-base leading-relaxed text-white/95">
                        {q.required
                          ? q.text.replace("*", "").trim()
                          : q.text.trim()}{" "}
                        <span className="text-dark-error text-sm font-bold">
                          {q.required ? "*" : ""}
                        </span>
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-dark-primary/20 text-dark-primary border border-dark-primary/30">
                          {q.type
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                      </div>
                    </div>

                    {q.options && q.options.length > 0 && (
                      <div className="mt-4">
                        <div className="grid gap-2">
                          {q.type === "multiple_choice"
                            ? q.options.slice(1).map((opt, j) => {
                                // Check if this option is selected in the answers
                                const isSelected =
                                  answers.length > 0 &&
                                  answers[i] &&
                                  answers[i].answer !== null &&
                                  (Array.isArray(answers[i].answer)
                                    ? (answers[i].answer as Answer[]).some(
                                        (a: Answer) => a.answer === opt.text
                                      )
                                    : (answers[i].answer as Answer)?.answer ===
                                      opt.text)

                                return (
                                  <div
                                    key={j}
                                    className="flex items-center space-x-3 p-2 rounded-lg transition-colors duration-200">
                                    {/* Radio button for multiple choice */}
                                    <div
                                      className={`w-4 h-4 aspect-square rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                                        isSelected
                                          ? "border-success bg-success"
                                          : "border-gray-500 bg-transparent"
                                      }`}>
                                      {isSelected && (
                                        <div className="w-2 h-2 rounded-full bg-dark-bg"></div>
                                      )}
                                    </div>
                                    <span
                                      className={`text-sm ${
                                        isSelected
                                          ? "text-success font-semibold"
                                          : "text-gray-200"
                                      }`}>
                                      {opt.text}
                                    </span>
                                  </div>
                                )
                              })
                            : q.options.map((opt, j) => {
                                // Check if this option is selected in the answers
                                const isSelected =
                                  answers.length > 0 &&
                                  answers[i] &&
                                  answers[i].answer !== null &&
                                  (Array.isArray(answers[i].answer)
                                    ? (answers[i].answer as Answer[]).some(
                                        (a: Answer) => a.answer === opt.text
                                      )
                                    : (answers[i].answer as Answer)?.answer ===
                                      opt.text)

                                return (
                                  <div
                                    key={j}
                                    className="flex items-center space-x-3 p-2 rounded-lg transition-colors duration-200">
                                    {/* Checkbox for checkbox questions and other multi-select types */}
                                    <div
                                      className={`w-4 h-4 aspect-square rounded border-2 flex items-center justify-center transition-all duration-200 ${
                                        isSelected
                                          ? "border-success bg-success"
                                          : "border-gray-500 bg-transparent"
                                      }`}>
                                      {isSelected && (
                                        <svg
                                          className="w-2.5 h-2.5 text-dark-bg"
                                          fill="currentColor"
                                          viewBox="0 0 20 20">
                                          <path
                                            fillRule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                      )}
                                    </div>
                                    <span
                                      className={`text-sm ${
                                        isSelected
                                          ? "text-success font-semibold"
                                          : "text-gray-200"
                                      }`}>
                                      {opt.text}
                                    </span>
                                  </div>
                                )
                              })}
                        </div>
                      </div>
                    )}

                    {/* Show skipped status or text answers that don't have options */}
                    {answers.length > 0 &&
                      answers[i] &&
                      (answers[i].answer === "SKIP" ||
                      answers[i].answer === null ||
                      (answers[i].answer as any)?.answer === "SKIP" ? (
                        <div className="mt-5 p-2 px-4 bg-orange-500/10 backdrop-blur-sm border border-orange-500/20 rounded-xl shadow-md">
                          <div className="flex items-center space-x-3">
                            <div>
                              <p className="text-sm font-semibold text-orange-400">
                                Skipped
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : answers[i].answer &&
                        !Array.isArray(answers[i].answer) &&
                        (answers[i].answer as Answer).otherText ? (
                        <div className="mt-5 p-2 px-4 bg-success/10 backdrop-blur-sm border border-success/20 rounded-xl shadow-md">
                          <div className="flex items-start space-x-3">
                            <div className="flex-1">
                              <p className="text-sm text-success/90 leading-relaxed">
                                {(answers[i].answer as Answer).otherText}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        (!q.options || q.options.length === 0) && (
                          <div className="mt-5 p-2 px-4 bg-success/10 backdrop-blur-sm border border-success/20 rounded-xl shadow-md">
                            <div className="flex items-start space-x-3">
                              <div className="flex-1">
                                <p className="text-sm text-success/90 leading-relaxed">
                                  {Array.isArray(answers[i].answer)
                                    ? (answers[i].answer as Answer[])
                                        .map((a) =>
                                          a.otherText
                                            ? `${a.answer}: ${a.otherText}`
                                            : a.answer
                                        )
                                        .join(", ")
                                    : answers[i].answer !== null
                                      ? (() => {
                                          const answerObj = answers[i]
                                            .answer as Answer
                                          return answerObj.otherText
                                            ? `${answerObj.answer}: ${answerObj.otherText}`
                                            : answerObj.answer
                                        })()
                                      : ""}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          formData &&
          formData.questions && (
            <div className="text-white mt-8 text-center">
              <div className="p-8 bg-dark-surface/40 rounded-2xl border border-dark-surface/40">
                <div className="w-16 h-16 mx-auto rounded-full bg-dark-primary/20 flex items-center justify-center mb-4">
                  <span className="text-dark-primary text-2xl">?</span>
                </div>
                <p className="text-gray-300 text-lg">
                  No questions found in the form.
                </p>
              </div>
            </div>
          )
        )}

        <div className="w-full flex justify-center items-center p-4 sticky bottom-4">
          <div className="w-full h-56 bg-gradient-to-t from-dark-bg via-dark-bg/95 to-transparent fixed bottom-0 left-0 pointer-events-none" />
          <button
            onClick={autofillWithAI}
            disabled={
              loading ||
              processing ||
              formData.questions.length === 0 ||
              !isFormUrl
            }
            className={`flex items-center justify-center space-x-3 py-3 px-6 rounded-full max-w-[240px] w-fit bg-gradient-to-r from-dark-primary to-dark-primary/90 hover:from-dark-primary/90 hover:to-dark-primary text-dark-bg font-bold text-base transition-all duration-300 ease-in-out shadow-xl hover:shadow-2xl transform hover:scale-105 border border-dark-primary/20 ${loading || processing || formData.questions.length === 0 || !isFormUrl ? "opacity-50 cursor-not-allowed hover:scale-100" : ""}`}>
            {processing ? (
              <>
                <div className="w-5 h-5 border-2 border-dark-bg/30 border-t-dark-bg rounded-full animate-spin"></div>
                <span>Thinking...</span>
              </>
            ) : (
              <>
                <span>Find Answers</span>
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  )
}
