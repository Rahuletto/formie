import type { Answer, AnswerResponse } from "~types/Answer"

export function autoFillAnswer(answer: AnswerResponse[]) {
  function dispatchEvents(element: HTMLElement, events: string[]) {
    events.forEach((eventType) => {
      element.dispatchEvent(new Event(eventType, { bubbles: true }))
    })
  }

  function safeExecute(fn: () => void, delay = 100) {
    setTimeout(() => {
      try {
        fn()
      } catch (error) {}
    }, delay)
  }

  function interactWithInput(input: Element, ansObject?: Answer) {
    if (input instanceof HTMLInputElement) {
      input.checked = true
      dispatchEvents(input, ["change", "input"])
    } else {
      ;(input as HTMLElement).click()
    }

    if (ansObject?.otherText) {
      const textInput = input
        .closest(
          ".freebirdFormviewerViewNumberedItemContainer, .m2RWDe, .Qr7Oae"
        )
        ?.querySelector('input[type="text"], textarea') as
        | HTMLInputElement
        | HTMLTextAreaElement
      if (textInput) {
        textInput.value = ansObject.otherText
        textInput.dispatchEvent(new Event("input", { bubbles: true }))
      }
    }
  }

  
  function getQuestionTypeAndOptions(container: Element, questionFull: string) {
    const hasRatingScale = ["Excellent", "Good", "Average", "Poor"].every(
      (rating) => questionFull.includes(rating)
    )

    if (hasRatingScale) {
      const ratingOptions = ["Excellent", "Good", "Average", "Poor"]
      if (questionFull.includes("Very Poor")) {
        ratingOptions.push("Very Poor")
      }
      return {
        type: "multiple_choice" as const,
        options: ratingOptions.map((text, idx) => ({ id: idx, text }))
      }
    }

    const elementCounts = {
      radio: container.querySelectorAll('input[type="radio"], [role="radio"]')
        .length,
      checkbox: container.querySelectorAll(
        'input[type="checkbox"], [role="checkbox"]'
      ).length,
      text: container.querySelectorAll('input[type="text"], textarea').length,
      select: container.querySelectorAll('select, [role="listbox"], .vRMGwf')
        .length
    }

    const hasDropdownIndicator =
      container.querySelector('.MocG8c, .OA0qNb, [role="listbox"]') !== null

    if (elementCounts.radio > 0)
      return { type: "multiple_choice" as const, options: [] }
    if (elementCounts.checkbox > 0)
      return { type: "checkbox" as const, options: [] }
    if (elementCounts.select > 0 || hasDropdownIndicator)
      return { type: "dropdown" as const, options: [] }
    if (elementCounts.text > 0) {
      const firstTextInput = container.querySelector(
        'input[type="text"], textarea'
      )
      const textType =
        firstTextInput?.tagName.toLowerCase() === "textarea"
          ? ("paragraph" as const)
          : ("short_answer" as const)
      return {
        type: textType,
        options: []
      }
    }

    return { type: "unknown" as const, options: [] }
  }

  
  function normalizeAnswers(answer: string | Answer | Answer[]): Answer[] {
    if (typeof answer === "string") {
      return [{ id: -1, answer }]
    }
    return Array.isArray(answer) ? answer : [answer]
  }

  
  function handleMultipleChoice(container: Element, answersToApply: Answer[]) {
    const inputElements = container.querySelectorAll(
      ".docssharedWizToggleLabeledLabelText, .ulDsOb, .nWQGrd, .oyXaNc"
    )

    answersToApply.forEach((ansObject) => {
      inputElements.forEach((input, idx) => {
        const shouldSelect =
          input.textContent?.trim().replaceAll(":", "") === ansObject.answer ||
          ansObject.id === idx

        if (shouldSelect) {
          safeExecute(() => interactWithInput(input, ansObject))
        }
      })
    })
  }

  
  function handleCheckbox(container: Element, answersToApply: Answer[]) {
    const inputElements = container.querySelectorAll(
      'input[type="radio"], input[type="checkbox"], [role="radio"], [role="checkbox"]'
    )

    answersToApply.forEach((ansObject) => {
      inputElements.forEach((input, idx) => {
        if (ansObject.id === idx) {
          safeExecute(() => interactWithInput(input))
        }
      })
    })
  }

  
  function handleDropdownInteraction(element: HTMLElement, answerId: number) {
    element.click()
    dispatchEvents(element, ["mousedown", "mouseup"])

    setTimeout(() => {
      handleDropdownOptions(answerId)
    }, 200)
  }

  
  function handleDropdownOptions(answerId: number) {
    const dropdownOptions = document.querySelectorAll(
      '.OA0qNb > [role="option"], .MocG8c [role="option"], .vRMGwf option, [role="listbox"] [role="option"]'
    )

    dropdownOptions.forEach((opt, idx) => {
      const optText = opt.textContent?.trim()
      if (optText && optText !== "Choose" && answerId === idx) {
        safeExecute(() => {
          const optElement = opt as HTMLElement
          optElement.focus()
          optElement.click()
          dispatchEvents(optElement, ["mousedown", "mouseup", "change"])
        }, 50)
      }
    })

    
    if (dropdownOptions.length === 0) {
      handleAriaLabelListbox(answerId)
    }
  }

  
  function handleAriaLabelListbox(answerId: number) {
    const listbox = document.querySelector('[role="listbox"]')
    if (!listbox) return

    const ariaLabel = listbox.getAttribute("aria-label")
    if (!ariaLabel?.includes(",")) return

    const possibleOptions = ariaLabel.split(",").map((opt) => opt.trim())
    possibleOptions.forEach((opt, idx) => {
      if (opt && !opt.includes("Choose") && answerId === idx) {
        safeExecute(() => {
          const clickableElement = listbox.querySelector(
            `[aria-label*="${opt}"], [title*="${opt}"]`
          ) as HTMLElement

          if (clickableElement) {
            clickableElement.focus()
            clickableElement.click()
            dispatchEvents(clickableElement, ["mousedown", "mouseup", "change"])
          }
        }, 50)
      }
    })
  }

  
  function handleDropdown(container: Element, answersToApply: Answer[]) {
    const ansObject = answersToApply[0]
    if (!ansObject) return

    const answerId = ansObject.id
    const selectElement = container.querySelector("select")

    if (selectElement) {
      const options = Array.from(selectElement.querySelectorAll("option"))
      options.forEach((opt, idx) => {
        if (idx > 0 && answerId === idx - 1) {
          safeExecute(() => {
            selectElement.focus()
            selectElement.selectedIndex = idx
            dispatchEvents(selectElement, ["focus", "change", "blur", "input"])
          })
        }
      })
    } else {
      const dropdownTrigger = container.querySelector(
        '.MocG8c, .OA0qNb, [role="listbox"], .vRMGwf'
      ) as HTMLElement

      if (dropdownTrigger) {
        safeExecute(() => handleDropdownInteraction(dropdownTrigger, answerId))
      }
    }
  }

  
  function handleTextInput(container: Element, answersToApply: Answer[]) {
    const ansObject = answersToApply[0]
    if (!ansObject) return

    const answerText = ansObject.answer || ""
    if (answerText.trim().toLowerCase() === "skip") return

    const textInput = container.querySelector(
      'input[type="text"], textarea'
    ) as HTMLInputElement | HTMLTextAreaElement

    if (textInput && answerText) {
      safeExecute(() => {
        textInput.value = answerText
        textInput.dispatchEvent(new Event("input", { bubbles: true }))
      })
    }
  }

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
      if (!fromAnswer?.answer) return

      const questionFull = container.textContent?.trim() || ""
      const questionElement = container.querySelector(
        ".freebirdFormviewerViewItemsItemItemTitle, .m7w28, [role='heading'], .freebirdFormviewerComponentsQuestionBaseTitle, .M0HnIe, .z6Bv3b"
      )

      const questionText =
        questionElement?.textContent?.trim() ||
        questionFull
          .match(
            /\d+\.\s+(.*?)(?:Excellent|Good|Average|Poor|Very Poor|\*)/
          )?.[1]
          ?.trim() ||
        `Question ${index + 1}`

      const { type: questionType } = getQuestionTypeAndOptions(
        container,
        questionFull
      )
      const answersToApply = normalizeAnswers(fromAnswer.answer)

      
      const handlers = {
        multiple_choice: () => handleMultipleChoice(container, answersToApply),
        checkbox: () => handleCheckbox(container, answersToApply),
        dropdown: () => handleDropdown(container, answersToApply),
        short_answer: () => handleTextInput(container, answersToApply),
        paragraph: () => handleTextInput(container, answersToApply)
      }

      handlers[questionType]?.()
    })
  } catch (error) {
    console.error("Error extracting form data:", error)
  }
}
