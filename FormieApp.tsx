import { useCallback, useEffect, useMemo, useState } from "react"

import "./style.css"

import { AiFillAlert } from "react-icons/ai"
import { RxReload } from "react-icons/rx"

import { autoFillAnswer } from "~lib/autofill"
import { extractFormData } from "~lib/extract"

import { generateAnswers } from "./lib/ai"
import type { Answer, AnswerResponse } from "./types/Answer"
import type { FormData } from "./types/Form"


const FORM_URL_PATTERNS = [
  /forms\.google\.com/,
  /forms\.office\.com/,
  /forms\.microsoft\.com/,
  /docs\.google\.com\/forms/,
  /docs\.google\.com\/.*\/forms\/.*/,
  /docs\.google\.com\/.*\/viewform.*/,
  /forms\.gle\//
]

const FORM_SELECTORS =
  'form, [role="form"], .freebirdFormviewerViewFormCard, .m3kCof'

export default function FormieApp() {
  const [currentFormUrl, setCurrentFormUrl] = useState<string>("")
  const [isFormUrl, setIsFormUrl] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    questions: []
  })
  const [processing, setProcessing] = useState<boolean>(false)
  const [answers, setAnswers] = useState<AnswerResponse[]>([])

  useEffect(() => {
    if (processing) {
      setError("")
      clearData()
    }
  }, [processing])

  
  const hasFormData = useMemo(
    () => formData.questions.length > 0,
    [formData.questions.length]
  )

  const hasAnswers = useMemo(() => answers.length > 0, [answers.length])

  const isFormUrlValid = useMemo(
    () => FORM_URL_PATTERNS.some((pattern) => pattern.test(currentFormUrl)),
    [currentFormUrl]
  )

  
  const chromeStorageSet = useCallback((data: Record<string, any>) => {
    return new Promise<void>((resolve) => {
      chrome.storage.local.set({ ...data, timestamp: Date.now() }, resolve)
    })
  }, [])

  const chromeStorageGet = useCallback((keys: string[]) => {
    return new Promise<Record<string, any>>((resolve) => {
      chrome.storage.local.get(keys, resolve)
    })
  }, [])

  const executeScript = useCallback(
    (func: (...args: any[]) => unknown, args?: any[]) => {
      return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs[0]?.id) {
            reject(new Error("No active tab found"))
            return
          }

          chrome.scripting.executeScript(
            {
              target: { tabId: tabs[0].id },
              func,
              args
            },
            (results) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message))
              } else if (results && results[0]) {
                resolve(results[0].result)
              } else {
                reject(new Error("No results returned"))
              }
            }
          )
        })
      })
    },
    []
  )

  
  const clearData = useCallback(() => {
    chrome.storage.local.clear(() => {
      setAnswers([])
      setError("")
    })
  }, [])

  
  const extractData = useCallback(async () => {
    try {
      const result = (await executeScript(extractFormData)) as FormData
      if (result) {
        setFormData(result)
        setError("")
      } else {
        setError("No form data found")
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to extract form data"
      )
    }
  }, [executeScript])

  
  const fillForm = useCallback(
    async (answersToFill: AnswerResponse[]) => {
      try {
        await executeScript(autoFillAnswer, [answersToFill])
        console.log("Form filled successfully")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fill form")
      }
    },
    [executeScript]
  )

  
  const checkForFormElements = useCallback(async (): Promise<boolean> => {
    try {
      const hasForm = await executeScript(() => {
        return document.querySelectorAll(FORM_SELECTORS).length > 0
      })
      return Boolean(hasForm)
    } catch {
      return false
    }
  }, [executeScript])

  
  const autofillWithAI = useCallback(async () => {
    if (!hasFormData) {
      setError("No form data found to autofill")
      return
    }

    setProcessing(true)
    setError("")

    try {
      const generatedAnswers = await generateAnswers(formData)
      setAnswers(generatedAnswers)

      await chromeStorageSet({ answers: generatedAnswers })
      await fillForm(generatedAnswers)
    } catch (aiError) {
      console.error("Error generating or applying answers:", aiError)
      setError(
        `Error: ${aiError instanceof Error ? aiError.message : "Failed to generate answers"}`
      )
    } finally {
      setProcessing(false)
    }
  }, [hasFormData, formData, chromeStorageSet, fillForm])

  
  useEffect(() => {
    const initializeData = async () => {
      try {
        const result = await chromeStorageGet([
          "formData",
          "answers",
          "currentFormUrl"
        ])

        if (result.formData) setFormData(result.formData)
        if (result.answers) setAnswers(result.answers)
        if (result.currentFormUrl) setCurrentFormUrl(result.currentFormUrl)

        
        chrome.tabs.query(
          { active: true, currentWindow: true },
          async (tabs) => {
            const url = tabs[0]?.url || ""
            setCurrentFormUrl(url)
            await chromeStorageSet({ currentFormUrl: url })
          }
        )
      } catch (err) {
        console.error("Failed to initialize data:", err)
      }
    }

    initializeData()
  }, [chromeStorageGet, chromeStorageSet])

  
  useEffect(() => {
    if (hasFormData) {
      chromeStorageSet({ formData })
    }
  }, [formData, hasFormData, chromeStorageSet])

  
  useEffect(() => {
    if (hasAnswers) {
      chromeStorageSet({ answers })
    }
  }, [answers, hasAnswers, chromeStorageSet])

  
  useEffect(() => {
    if (processing) {
      setError("")
    }
  }, [processing])

  
  useEffect(() => {
    const checkAndExtractForm = async () => {
      if (isFormUrlValid) {
        setIsFormUrl(true)
        await extractData()
      } else {
        
        const hasForm = await checkForFormElements()
        if (hasForm) {
          setIsFormUrl(true)
          await extractData()
        } else {
          setIsFormUrl(false)
        }
      }
    }

    if (currentFormUrl) {
      checkAndExtractForm()
    }
  }, [currentFormUrl, isFormUrlValid, extractData, checkForFormElements])

  const isOptionSelected = useCallback(
    (questionIndex: number, optionText: string, id: number): boolean => {
      if (
        !hasAnswers ||
        !answers[questionIndex] ||
        answers[questionIndex].answer === null
      ) {
        return false
      }

      const answer = answers[questionIndex].answer

      if (Array.isArray(answer)) {
        return answer.some((a: Answer) => a.id === id)
      } else if (typeof answer === "object" && answer !== null) {
        return (answer as Answer).id === id
      } 

      return false

    },
    [hasAnswers, answers]
  )

  
  const getAnswerDisplayText = useCallback(
    (questionIndex: number): string => {
      if (
        !hasAnswers ||
        !answers[questionIndex] ||
        answers[questionIndex].answer === null
      ) {
        return ""
      }

      const answer = answers[questionIndex].answer

      if (typeof answer === "string") {
        return answer
      }

      if (typeof answer === "object" && answer !== null) {
        const answerObj = answer as Answer
        return answerObj.otherText ? `${answerObj.otherText}` : ""
      }

      return ""
    },
    [hasAnswers, answers]
  )

  
  const isAnswerSkipped = useCallback(
    (questionIndex: number): boolean => {
      if (!hasAnswers || !answers[questionIndex]) return false

      const answer = answers[questionIndex].answer
      return (
        answer === "SKIP" ||
        answer === null ||
        (typeof answer === "object" &&
          answer !== null &&
          (answer as any).answer === "SKIP")
      )
    },
    [hasAnswers, answers]
  )

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
          {(hasFormData || hasAnswers) && (
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
              <AiFillAlert />
              <div>
                <p className="font-semibold text-error-400 mb-1">Error</p>
                <p className="text-sm text-error-500/90">{error}</p>
              </div>
            </div>
          </div>
        )}

        {hasFormData ? (
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
                                const isSelected = isOptionSelected(
                                  i,
                                  opt.text,
                                  opt.id
                                )

                                return (
                                  <div
                                    key={j}
                                    className="flex items-center space-x-3 p-2 rounded-lg transition-colors duration-200">
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
                                const isSelected = isOptionSelected(
                                  i,
                                  opt.text,
                                  opt.id
                                )

                                return (
                                  <div
                                    key={j}
                                    className="flex items-center space-x-3 p-2 rounded-lg transition-colors duration-200">
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

                    {/* Show answer status */}
                    {hasAnswers && answers[i] && (
                      <>
                        {isAnswerSkipped(i) ? (
                          <div className="mt-5 p-2 px-4 bg-orange-500/10 backdrop-blur-sm border border-orange-500/20 rounded-xl shadow-md">
                            <div className="flex items-center space-x-3">
                              <div>
                                <p className="text-sm font-semibold text-orange-400">
                                  Skipped
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          (() => {
                            const displayText = getAnswerDisplayText(i)
                            return displayText ? (
                              <div className="mt-5 p-2 px-4 bg-success/10 backdrop-blur-sm border border-success/20 rounded-xl shadow-md">
                                <div className="flex items-start space-x-3">
                                  <div className="flex-1">
                                    <p className="text-sm text-success/90 leading-relaxed">
                                      {displayText}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ) : null
                          })()
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          formData && (
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

        <div className="w-full flex justify-center items-center p-4 gap-1 sticky bottom-4">
          <button
            onClick={autofillWithAI}
            disabled={processing || !hasFormData || !isFormUrl}
            className={`${hasAnswers ? "bg-dark-primary/20 text-dark-primary backdrop-blur-xl rounded-l-3xl rounded-r-lg" : "rounded-full hover:bg-dark-primary/95 bg-dark-primary/90 text-dark-bg"} flex items-center justify-center space-x-3 py-3 px-6 w-fit  font-bold text-base transition-all duration-300 ease-in-out shadow-xl hover:shadow-2xl transform hover:scale-105 border border-dark-primary/20 ${processing || !hasFormData || !isFormUrl ? "!bg-dark-primary/60 opacity-70 cursor-not-allowed hover:scale-100" : ""}`}>
            {processing ? (
              <>
                <div className="w-5 h-5 border-2 border-dark-bg/30 border-t-dark-bg rounded-full animate-spin"></div>
                <span>Thinking...</span>
              </>
            ) : hasAnswers ? (
              <RxReload className="w-6 h-6" />
            ) : (
              <span>Find Answers</span>
            )}
          </button>
          {hasAnswers && (
            <button
              onClick={() => fillForm(answers)}
              className="flex items-center justify-center space-x-3 backdrop-blur-xl py-3 px-6 rounded-r-3xl rounded-l-lg max-w-[240px] w-fit bg-dark-primary/90 hover:bg-dark-primary/95 text-dark-bg font-bold text-base transition-all duration-300 ease-in-out shadow-xl hover:shadow-2xl transform hover:scale-105 border border-dark-primary/20">
              Fill Form
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
