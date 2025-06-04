export function extractFormData() {
  try {
    const formData = {
      title: "",
      description: "",
      questions: [],
      answers: ""
    }

    const titleElement = document.querySelector(
      ".freebirdFormviewerViewHeaderTitle"
    )
    if (titleElement) {
      formData.title = titleElement.textContent.trim()
    }

    const descriptionElement = document.querySelector(
      ".freebirdFormviewerViewHeaderDescription"
    )
    if (descriptionElement) {
      formData.description = descriptionElement.textContent.trim()
    }

    const numberedQuestions = Array.from(
      document.querySelectorAll(
        '.freebirdFormviewerViewNumberedItemContainer, .m3kCof, [role="list"] > [role="listitem"]'
      )
    )

    numberedQuestions.forEach((container, index) => {
      const questionFull = container.textContent.trim()

      let questionText = ""
      const questionElement = container.querySelector(
        ".freebirdFormviewerViewItemsItemItemTitle, .m7w28, [role='heading'], .freebirdFormviewerComponentsQuestionBaseTitle, .M0HnIe, .z6Bv3b"
      )

      if (questionElement) {
        questionText = questionElement.textContent.trim()
      } else {
        const match = questionFull.match(
          /\d+\.\s+(.*?)(?:Excellent|Good|Average|Poor|Very Poor|\*)/
        )
        if (match && match[1]) {
          questionText = match[1].trim()
        } else {
          questionText = `Question ${index + 1}`
        }
      }

      const hasRatingScale =
        questionFull.includes("Excellent") &&
        questionFull.includes("Good") &&
        questionFull.includes("Average") &&
        questionFull.includes("Poor")

      const isRequired =
        container.querySelector('[aria-label="Required question"]') !== null ||
        container.textContent.includes("*") ||
        container.querySelector(
          ".freebirdFormviewerViewItemsItemRequiredAsterisk, .vnumgf"
        ) !== null

      let questionType = "unknown"
      const options = []

      if (hasRatingScale) {
        questionType = "multiple_choice"

        const ratingOptions = ["Excellent", "Good", "Average", "Poor"]
        if (questionFull.includes("Very Poor")) {
          ratingOptions.push("Very Poor")
        }

        ratingOptions.forEach((text, idx) => {
          options.push({
            id: idx,
            text: text
          })
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

        if (questionType === "multiple_choice" || questionType === "checkbox") {
          const optionLabels = container.querySelectorAll(
            '.docssharedWizToggleLabeledLabelText, .ulDsOb, .SG0AAe, [role="radio"], [role="checkbox"], .nWQGrd, .oyXaNc'
          )

          optionLabels.forEach((opt, idx) => {
            const optText = opt.textContent.trim()
            if (optText && !options.some((o) => o.text === optText)) {
              options.push({
                id: idx,
                text: optText
              })
            }
          })
        } else if (questionType === "dropdown") {
          const selectElement = container.querySelector("select")
          if (selectElement) {
            Array.from(selectElement.querySelectorAll("option")).forEach(
              (opt, idx) => {
                if (idx > 0) {
                  options.push({
                    id: idx - 1,
                    text: opt.textContent.trim()
                  })
                }
              }
            )
          }

          if (options.length === 0) {
            const dropdownOptions = container.querySelectorAll(
              '.OA0qNb > [role="option"], .MocG8c, .vRMGwf option, [role="listbox"] [role="option"]'
            )
            dropdownOptions.forEach((opt, idx) => {
              const optText = opt.textContent.trim()
              if (
                optText &&
                optText !== "Choose" &&
                !options.some((o) => o.text === optText)
              ) {
                options.push({
                  id: idx,
                  text: optText
                })
              }
            })

            if (options.length === 0) {
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
                      !options.some((o) => o.text === opt)
                    ) {
                      options.push({
                        id: idx,
                        text: opt
                      })
                    }
                  })
                }
              }
            }
          }
        }
      }

      formData.questions.push({
        id: index,
        text: questionText,
        type: questionType,
        required: isRequired,
        options: options
      })
    })

    if (formData.questions.length === 0) {
      const questionContainers = document.querySelectorAll(
        '[role="listitem"], .freebirdFormviewerViewNumberedItemContainer'
      )

      questionContainers.forEach((container, index) => {
        const questionElement = container.querySelector(
          ".freebirdFormviewerViewItemsItemItemTitle, .m7w28, [role='heading'], .freebirdFormviewerComponentsQuestionBaseTitle"
        )

        const requiredElement = container.querySelector(
          ".freebirdFormviewerViewItemsItemRequiredAsterisk, .vnumgf, [aria-label='Required question']"
        )

        const inputElements = container.querySelectorAll("input, textarea")
        const radioElements = container.querySelectorAll('input[type="radio"]')
        const radioContainers = container.querySelectorAll(
          ".docssharedWizToggleLabeledContainer, .ajBQVb, .SG0AAe"
        )
        const checkboxElements = container.querySelectorAll(
          'input[type="checkbox"]'
        )
        const checkboxContainers =
          container.querySelectorAll(".Y6Myld, .ECvBRb")
        const selectElement = container.querySelector("select")

        if (!questionElement) {
          return
        }

        let questionType = "unknown"
        if (inputElements.length > 0) {
          const inputType = inputElements[0].getAttribute("type")
          if (inputType === "text" || inputType === "email") {
            questionType = "short_answer"
          } else if (inputElements[0].tagName === "TEXTAREA") {
            questionType = "paragraph"
          }
        } else if (radioElements.length > 0 || radioContainers.length > 0) {
          questionType = "multiple_choice"
        } else if (
          checkboxElements.length > 0 ||
          checkboxContainers.length > 0
        ) {
          questionType = "checkbox"
        } else if (selectElement) {
          questionType = "dropdown"
        }

        const question = {
          id: index,
          text: questionElement
            ? questionElement.textContent.trim()
            : `Question ${index + 1}`,
          type: questionType,
          required: !!requiredElement,
          options: []
        }

        if (questionType === "multiple_choice" || questionType === "checkbox") {
          const optionElements = container.querySelectorAll(
            ".docssharedWizToggleLabeledLabelText, .ulDsOb, .d7L4fc, .oyXaNc"
          )

          if (optionElements.length === 0) {
            const alternativeOptionElements = container.querySelectorAll(
              'label span, .jgvuAb, [role="radio"], [role="checkbox"]'
            )
            alternativeOptionElements.forEach((optionElement, optionIndex) => {
              const optionText = optionElement.textContent.trim()
              if (
                optionText &&
                !question.options.some((opt) => opt.text === optionText)
              ) {
                question.options.push({
                  id: optionIndex,
                  text: optionText
                })
              }
            })
          } else {
            optionElements.forEach((optionElement, optionIndex) => {
              question.options.push({
                id: optionIndex,
                text: optionElement.textContent.trim()
              })
            })
          }
        } else if (questionType === "dropdown") {
          const optionElements = selectElement.querySelectorAll("option")
          optionElements.forEach((optionElement, optionIndex) => {
            if (optionIndex > 0) {
              question.options.push({
                id: optionIndex - 1,
                text: optionElement.textContent.trim()
              })
            }
          })
        }

        if (
          (questionType === "multiple_choice" || questionType === "checkbox") &&
          question.options.length === 0
        ) {
          const choiceContainers = container.querySelectorAll(
            ".SG0AAe, .nWQGrd, .oyXaNc"
          )
          choiceContainers.forEach((choiceContainer, idx) => {
            const text = choiceContainer.textContent.trim()
            if (
              text &&
              !["Excellent", "Good", "Average", "Poor", "Very Poor"].includes(
                text
              )
            ) {
              question.options.push({
                id: idx,
                text: text
              })
            }
          })

          if (question.options.length === 0) {
            const commonOptions = [
              "Excellent",
              "Good",
              "Average",
              "Poor",
              "Very Poor"
            ]
            commonOptions.forEach((optText, idx) => {
              if (container.textContent.includes(optText)) {
                question.options.push({
                  id: idx,
                  text: optText
                })
              }
            })
          }
        }

        formData.questions.push(question)
      })

      if (formData.questions.length === 0) {
        const newQuestionContainers = document.querySelectorAll(
          ".geS5n, .o3Dpx, .Qr7Oae"
        )

        newQuestionContainers.forEach((container, index) => {
          const questionText =
            container
              .querySelector('.M0HnIe, .z6Bv3b, [role="heading"]')
              ?.textContent?.trim() || `Question ${index + 1}`

          const isMultipleChoice =
            container.querySelectorAll('[role="radio"], .SG0AAe, .nWQGrd')
              .length > 0
          const isCheckbox =
            container.querySelectorAll('[role="checkbox"], .Y6Myld').length > 0

          let questionType = "unknown"
          if (isMultipleChoice) questionType = "multiple_choice"
          if (isCheckbox) questionType = "checkbox"

          const question = {
            id: index,
            text: questionText,
            type: questionType,
            required:
              container.textContent.includes("*") ||
              container.querySelector('[aria-label="Required question"]') !==
                null,
            options: []
          }

          if (isMultipleChoice || isCheckbox) {
            const optionElements = container.querySelectorAll(
              '[role="radio"], [role="checkbox"], .SG0AAe, .nWQGrd, .d7L4fc'
            )
            optionElements.forEach((opt, idx) => {
              question.options.push({
                id: idx,
                text: opt.textContent.trim()
              })
            })

            if (question.options.length === 0) {
              ;["Excellent", "Good", "Average", "Poor", "Very Poor"].forEach(
                (text, idx) => {
                  if (container.textContent.includes(text)) {
                    question.options.push({
                      id: idx,
                      text: text
                    })
                  }
                }
              )
            }
          }

          formData.questions.push(question)
        })
      }
    }

    formData.questions.forEach((question) => {
      if (question.type === "unknown" && /\d+\./.test(question.text)) {
        const container = document.querySelector(
          `.freebirdFormviewerViewNumberedItemContainer:nth-child(${question.id + 1}), [role="listitem"]:nth-child(${question.id + 1})`
        )

        if (container) {
          const fullText = container.textContent
          const hasRatingWords =
            fullText.includes("Excellent") &&
            fullText.includes("Good") &&
            fullText.includes("Average") &&
            fullText.includes("Poor")

          if (hasRatingWords) {
            question.type = "multiple_choice"

            if (question.options.length === 0) {
              ;["Excellent", "Good", "Average", "Poor", "Very Poor"].forEach(
                (text, idx) => {
                  if (fullText.includes(text)) {
                    question.options.push({
                      id: idx,
                      text: text
                    })
                  }
                }
              )
            }
          }
        }
      }
    })

    document
      .querySelectorAll('[role="listbox"], select, .vRMGwf')
      .forEach((dropdown) => {
        let container = dropdown.closest(
          '[role="listitem"], .freebirdFormviewerViewNumberedItemContainer, .m3kCof'
        )
        if (!container) return

        const questionIndex = Array.from(
          document.querySelectorAll(
            '[role="listitem"], .freebirdFormviewerViewNumberedItemContainer, .m3kCof'
          )
        ).indexOf(container)
        if (questionIndex === -1 || questionIndex >= formData.questions.length)
          return

        const question = formData.questions[questionIndex]

        if (question.type !== "dropdown") {
          question.type = "dropdown"

          if (question.options.length === 0) {
            if (dropdown.tagName === "SELECT") {
              Array.from(dropdown.querySelectorAll("option")).forEach(
                (opt, idx) => {
                  if (idx > 0) {
                    question.options.push({
                      id: idx - 1,
                      text: opt.textContent.trim()
                    })
                  }
                }
              )
            } else {
              const options = dropdown.querySelectorAll('[role="option"]')
              options.forEach((opt, idx) => {
                const optText = opt.textContent.trim()
                if (optText && optText !== "Choose") {
                  question.options.push({
                    id: idx,
                    text: optText
                  })
                }
              })
              question.options = question.options.slice(1)
            }
          }
        }
      })

    console.log("Extracted form data:", formData)
    return formData
  } catch (error) {
    console.error("Error extracting form data:", error)
    return {
      title: "Error extracting form",
      description: error.toString(),
      questions: [],
      answers: ""
    }
  }
}
