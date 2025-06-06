import type { Answer, AnswerResponse } from "~types/Answer"

export function autoFillAnswer(answer: AnswerResponse[]) {
  try {
    const numberedQuestions = Array.from(
      document.querySelectorAll(
        ".freebirdFormviewerViewNumberedItemContainer, .m2RWDe, .Qr7Oae"
      )
    ).filter((container) => {
      const hasQuestionTitle = container.querySelector(
        ".freebirdFormviewerViewItemsItemItemTitle, .m7w28, [role='heading'], .freebirdFormviewerComponentsQuestionBaseTitle, .M0HnIe, .z6Bv3b"
      )
      const hasInputElements = container.querySelector(
        'input, textarea, select, [role="radio"], [role="checkbox"], [role="listbox"]'
      )
      return hasQuestionTitle || hasInputElements
    })

    numberedQuestions.forEach((container, index) => {
      const fromAnswer = answer.find((a) => a.questionId === index)

      if (!fromAnswer || !fromAnswer.answer) {
        return
      }

      const questionFull = container.textContent?.trim() || ""
      let questionText = ""

      const questionElement = container.querySelector(
        ".freebirdFormviewerViewItemsItemItemTitle, .m7w28, [role='heading'], .freebirdFormviewerComponentsQuestionBaseTitle, .M0HnIe, .z6Bv3b"
      )

      if (questionElement) {
        questionText = questionElement.textContent?.trim() || ""
      } else {
        const match = questionFull.match(
          /\d+\.\s+(.*?)(?:Excellent|Good|Average|Poor|Very Poor|\*)/
        )
        questionText =
          match && match[1] ? match[1].trim() : `Question ${index + 1}`
      }

      const hasRatingScale =
        questionFull.includes("Excellent") &&
        questionFull.includes("Good") &&
        questionFull.includes("Average") &&
        questionFull.includes("Poor")

      let questionType = "unknown"
      const options: Array<{ id: number; text: string }> = []

      if (hasRatingScale) {
        questionType = "multiple_choice"
        const ratingOptions = ["Excellent", "Good", "Average", "Poor"]
        if (questionFull.includes("Very Poor")) {
          ratingOptions.push("Very Poor")
        }
        ratingOptions.forEach((text, idx) => {
          options.push({ id: idx, text: text })
        })
      } else {
        const radioElements = container.querySelectorAll(
          'input[type="radio"], [role="radio"]'
        )
        const checkboxElements = container.querySelectorAll(
          'input[type="checkbox"], [role="checkbox"]'
        )
        const textInputs = container.querySelectorAll(
          'input[type="text"], textarea'
        )
        const selectElements = container.querySelectorAll(
          'select, [role="listbox"], .vRMGwf'
        )
        const hasDropdownIndicator =
          container.querySelector('.MocG8c, .OA0qNb, [role="listbox"]') !== null

        if (radioElements.length > 0) {
          questionType = "multiple_choice"
        } else if (checkboxElements.length > 0) {
          questionType = "checkbox"
        } else if (selectElements.length > 0 || hasDropdownIndicator) {
          questionType = "dropdown"
        } else if (textInputs.length > 0) {
          questionType =
            textInputs[0].tagName.toLowerCase() === "textarea"
              ? "paragraph"
              : "short_answer"
        }
      }

      let answersToApply: Answer[] = []
      if (typeof fromAnswer.answer === "string") {
        answersToApply.push({ id: -1, answer: fromAnswer.answer })
      } else if (Array.isArray(fromAnswer.answer)) {
        answersToApply = fromAnswer.answer
      } else {
        answersToApply.push(fromAnswer.answer as Answer)
      }

      if (questionType === "multiple_choice") {
        answersToApply.forEach((ansObject) => {
          const ansText = ansObject.answer
          const inputElements = container.querySelectorAll(
            ".docssharedWizToggleLabeledLabelText, .ulDsOb, .nWQGrd, .oyXaNc"
          )
          inputElements.forEach((input, idx) => {
            if (input.textContent?.trim().replaceAll(":", "") === ansText) {
              setTimeout(() => {
                try {
                  if (input instanceof HTMLInputElement) {
                    input.checked = true
                    input.dispatchEvent(new Event("change", { bubbles: true }))
                    input.dispatchEvent(new Event("input", { bubbles: true }))
                  } else {
                    ;(input as HTMLElement).click()
                  }
                } catch (error) {}
                if (ansObject?.otherText) {
                  const textInput = container.querySelector(
                    'input[type="text"], textarea'
                  ) as HTMLInputElement | HTMLTextAreaElement
                  if (textInput) {
                    textInput.value = ansObject.otherText
                    textInput.dispatchEvent(
                      new Event("input", { bubbles: true })
                    )
                  }
                }
              }, 100)
            } else if (ansObject.id === idx) {
              setTimeout(() => {
                try {
                  if (input instanceof HTMLInputElement) {
                    input.checked = true
                    input.dispatchEvent(new Event("change", { bubbles: true }))
                    input.dispatchEvent(new Event("input", { bubbles: true }))
                  } else {
                    ;(input as HTMLElement).click()
                  }
                } catch (error) {}
                if (ansObject?.otherText) {
                  const textInput = container.querySelector(
                    'input[type="text"], textarea'
                  ) as HTMLInputElement | HTMLTextAreaElement
                  if (textInput) {
                    textInput.value = ansObject.otherText
                    textInput.dispatchEvent(
                      new Event("input", { bubbles: true })
                    )
                  }
                }
              }, 100)
            }
          })
        })
      } else if (questionType === "checkbox") {
        answersToApply.forEach((ansObject) => {
          const answerId = ansObject.id
          const inputElements = container.querySelectorAll(
            'input[type="radio"], input[type="checkbox"], [role="radio"], [role="checkbox"]'
          )
          inputElements.forEach((input, idx) => {
            if (answerId === idx) {
              setTimeout(() => {
                try {
                  if (input instanceof HTMLInputElement) {
                    input.checked = true
                    input.dispatchEvent(new Event("change", { bubbles: true }))
                    input.dispatchEvent(new Event("input", { bubbles: true }))
                  } else {
                    ;(input as HTMLElement).click()
                  }
                } catch (error) {
                  console.error(`Error selecting input ${idx}:`, error)
                }
              }, 100)
            }
          })
        })
      } else if (questionType === "dropdown") {
        // For dropdown, we still expect a single answer (even if it was part of an array, we take the first)
        const ansObject = answersToApply[0]
        if (!ansObject) return // No answer for dropdown

        const answerId = ansObject.id

        const selectElement = container.querySelector("select")
        if (selectElement) {
          const options = Array.from(selectElement.querySelectorAll("option"))
          options.forEach((opt, idx) => {
            if (idx > 0 && answerId === idx - 1) {
              setTimeout(() => {
                try {
                  selectElement.focus()
                  selectElement.selectedIndex = idx
                  selectElement.dispatchEvent(
                    new Event("focus", { bubbles: true })
                  )
                  selectElement.dispatchEvent(
                    new Event("change", { bubbles: true })
                  )
                  selectElement.dispatchEvent(
                    new Event("blur", { bubbles: true })
                  )
                  selectElement.dispatchEvent(
                    new Event("input", { bubbles: true })
                  )
                } catch (error) {
                  console.error(
                    `Error selecting dropdown option ${idx}:`,
                    error
                  )
                }
              }, 100)
            }
          })
        } else {
          const dropdownTrigger = container.querySelector(
            '.MocG8c, .OA0qNb, [role="listbox"], .vRMGwf'
          ) as HTMLElement

          if (dropdownTrigger) {
            setTimeout(() => {
              try {
                dropdownTrigger.click()
                dropdownTrigger.dispatchEvent(
                  new Event("mousedown", { bubbles: true })
                )
                dropdownTrigger.dispatchEvent(
                  new Event("mouseup", { bubbles: true })
                )

                setTimeout(() => {
                  const dropdownOptions = document.querySelectorAll(
                    '.OA0qNb > [role="option"], .MocG8c [role="option"], .vRMGwf option, [role="listbox"] [role="option"]'
                  )

                  dropdownOptions.forEach((opt, idx) => {
                    const optText = opt.textContent?.trim()
                    if (optText && optText !== "Choose" && answerId === idx) {
                      setTimeout(() => {
                        try {
                          const optElement = opt as HTMLElement
                          optElement.focus()
                          optElement.click()
                          optElement.dispatchEvent(
                            new Event("mousedown", { bubbles: true })
                          )
                          optElement.dispatchEvent(
                            new Event("mouseup", { bubbles: true })
                          )
                          optElement.dispatchEvent(
                            new Event("change", { bubbles: true })
                          )
                        } catch (error) {
                          console.error(
                            `Error clicking custom dropdown option ${idx}:`,
                            error
                          )
                        }
                      }, 50)
                    }
                  })

                  if (dropdownOptions.length === 0) {
                    const listbox = container.querySelector('[role="listbox"]')
                    if (listbox) {
                      const ariaLabel = listbox.getAttribute("aria-label")
                      if (ariaLabel && ariaLabel.includes(",")) {
                        const possibleOptions = ariaLabel
                          .split(",")
                          .map((opt) => opt.trim())

                        possibleOptions.forEach((opt, idx) => {
                          if (
                            opt &&
                            !opt.includes("Choose") &&
                            answerId === idx
                          ) {
                            setTimeout(() => {
                              try {
                                const clickableElement = listbox.querySelector(
                                  `[aria-label*="${opt}"], [title*="${opt}"]`
                                ) as HTMLElement
                                if (clickableElement) {
                                  clickableElement.focus()
                                  clickableElement.click()
                                  clickableElement.dispatchEvent(
                                    new Event("mousedown", { bubbles: true })
                                  )
                                  clickableElement.dispatchEvent(
                                    new Event("mouseup", { bubbles: true })
                                  )
                                  clickableElement.dispatchEvent(
                                    new Event("change", { bubbles: true })
                                  )
                                }
                              } catch (error) {
                                console.error(
                                  `Error clicking listbox option ${idx}:`,
                                  error
                                )
                              }
                            }, 50)
                          }
                        })
                      }
                    }
                  }
                }, 200)
              } catch (error) {
                console.error("Error opening dropdown:", error)
              }
            }, 100)
          }
        }
      } else if (
        questionType === "short_answer" ||
        questionType === "paragraph"
      ) {
        // For text inputs, we still expect a single answer (even if it was part of an array, we take the first)
        const ansObject = answersToApply[0]
        if (!ansObject) return // No answer for text input

        const answerText = ansObject.answer || ""

        if (answerText.trim().toLowerCase() === "skip") {
          return
        }

        const textInput = container.querySelector(
          'input[type="text"], textarea'
        ) as HTMLInputElement | HTMLTextAreaElement

        if (textInput && answerText) {
          setTimeout(() => {
            try {
              textInput.value = answerText
              textInput.dispatchEvent(new Event("input", { bubbles: true }))
            } catch (error) {
              console.error(`Error filling text input:`, error)
            }
          }, 100)
        }
      }
    })
  } catch (error) {
    console.error("Error extracting form data:", error)
  }
}

export function getQuestionImage(questionId: number): string | null {
  try {
    const questionContainers = document.querySelectorAll(
      '.freebirdFormviewerViewNumberedItemContainer, .m3kCof, [role="list"] > [role="listitem"]'
    )

    if (questionId >= 0 && questionId < questionContainers.length) {
      const container = questionContainers[questionId]
      const imageElement = container.querySelector("img") as HTMLImageElement
      return imageElement?.src || null
    }

    return null
  } catch (error) {
    console.error("Error getting question image:", error)
    return null
  }
}

export function getAllFormImages(): { questionId: number; imageUrl: string }[] {
  try {
    const images: { questionId: number; imageUrl: string }[] = []
    const questionContainers = document.querySelectorAll(
      '.freebirdFormviewerViewNumberedItemContainer, .m3kCof, [role="list"] > [role="listitem"]'
    )

    questionContainers.forEach((container, index) => {
      const imageElement = container.querySelector("img") as HTMLImageElement
      if (imageElement?.src) {
        images.push({
          questionId: index,
          imageUrl: imageElement.src
        })
      }
    })

    return images
  } catch (error) {
    console.error("Error getting all form images:", error)
    return []
  }
}
