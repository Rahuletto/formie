import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { generateText } from "ai"

import { GOOGLE_API_KEY } from "./env"

export interface FormQuestion {
  id: number
  text: string
  type: string
  required: boolean
  options: {
    id: number
    text: string
    selector?: string
  }[]
  image?: string
}

export interface FormData {
  title: string
  description: string
  questions: FormQuestion[]
}

export interface Answer {
  id: number
  answer: string
  otherText?: string
}
export interface AnswerResponse {
  questionId: number
  answer: Answer | Answer[]
}

const googleAI = createGoogleGenerativeAI({
  apiKey: GOOGLE_API_KEY
})
const model = googleAI("gemini-2.5-flash-preview-04-17")

export async function generateAnswers(
  formData: FormData
): Promise<AnswerResponse[]> {
  try {
    if (!formData.questions || formData.questions.length === 0) {
      throw new Error("No form questions found")
    }

    const prompt = createPrompt(formData)

    const result = await generateText({
      model,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: prompt }]
        }
      ]
    })

    console.log("AI Response:", result.text)
    const parsedAnswers = parseAIResponse(result.text, formData.questions)
    console.log("Parsed Answers:", parsedAnswers)
    console.log(
      "Form Questions with options:",
      formData.questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options,
        hasImage: !!q.image
      }))
    )

    return parsedAnswers
  } catch (error) {
    console.error("Error generating answers:", error)
    throw error
  }
}

// Alternative function for simpler cases where you just want to add prompt parameter
function createPrompt(formData: FormData): string {
  let prompt = `
You are an AI assistant helping to fill out a form with the following structure:

Title: ${formData.title}
Description: ${formData.description}

For each question, I need you to provide an appropriate answer. Only answer objective questions that do not require personal information. For any question asking for personal information (name, address, phone, email, specific personal experiences), respond with "SKIP" so we know to leave it blank.

For multiple choice, checkbox, or dropdown questions, only select from the available options.

Please provide your answers in a structured format like this:
[
  { "questionId": 0, "answer": {"id": 2, "answer": "Option text"} },
  { "questionId": 1, "answer": [{"id": 0, "answer": "Option 1"}, {"id": 2, "answer": "Option 3"}] }, 
  { "questionId": 2, "answer": {"id": 5, "answer": "Other", "otherText": "Custom answer text"} },
  ...
]

Here are the questions:

`

  formData.questions.forEach((question, index) => {
    const questionCopy = { ...question }
    if (questionCopy.image) {
      questionCopy.text += ` [IMAGE URL: ${questionCopy.image} - analyze this image to answer the question]`
      delete questionCopy.image
    }
    prompt += JSON.stringify(questionCopy, null, 2) + "\n\n"
  })

  prompt += `
Remember:
1. Skip any personal related questions
2. For multiple choice/dropdown, return {"id": optionId, "answer": "option text"}
3. For checkbox questions, return an array of {"id": optionId, "answer": "option text"} objects
4. For short answer or paragraph, return {"id": 1, "answer": "your text response"}
5. Use the exact option IDs and text from the provided options
6. If you select "Other" option, add "otherText" field with your custom text: {"id": otherId, "answer": "Other", "otherText": "your custom answer"}
7. Format your response as a JSON array with questionId and answer fields
`

  return prompt
}

function parseAIResponse(
  text: string,
  questions: FormQuestion[]
): AnswerResponse[] {
  try {
    console.log("Parsing AI response text:", text)
    const jsonMatch = text.match(/\[\s*\{.+\}\s*\]/s)

    if (jsonMatch) {
      console.log("Found JSON match:", jsonMatch[0])
      const parsed = JSON.parse(jsonMatch[0])
      console.log("Successfully parsed JSON:", parsed)

      // Add selectors to the parsed answers
      return parsed.map((answer: any) => {
        const question = questions.find((q) => q.id === answer.questionId)
        if (!question || !answer.answer) return answer

        if (Array.isArray(answer.answer)) {
          // For checkbox answers, match each selected option with its selector
          answer.answer = answer.answer.map((optionAnswer: any) => {
            const matchingOption = question.options.find(
              (opt) =>
                opt.text === optionAnswer.answer || opt.id === optionAnswer.id
            )
            return {
              ...optionAnswer,
              selector: matchingOption?.selector || ""
            }
          })
        } else {
          // For single answers (radio, dropdown), find the matching option selector
          const matchingOption = question.options.find(
            (opt) =>
              opt.text === answer.answer.answer || opt.id === answer.answer.id
          )
          answer.answer.selector = matchingOption?.selector || ""
        }

        return answer
      })
    }

    console.log("No JSON found, falling back to manual parsing")

    const answers: AnswerResponse[] = []

    questions.forEach((question, index) => {
      const pattern = new RegExp(
        `Question\\s*${index + 1}.*?answer\\s*:.*?["\\[]([^"\\]]+)["\\]]`,
        "is"
      )
      const match = text.match(pattern)

      if (match) {
        const answer = match[1].trim()
        if (answer === "SKIP" || answer.includes("personal")) {
          answers.push({ questionId: question.id, answer: null })
        } else if (
          question.type === "short_answer" ||
          question.type === "paragraph"
        ) {
          // For text questions, use the input selector
          answers.push({
            questionId: question.id,
            answer: {
              id: -1,
              answer: answer,
              otherText: answer
            }
          })
        } else {
          console.log(
            `Looking for option "${answer}" in question ${question.id} options:`,
            question.options
          )
          const matchingOption = question.options.find(
            (opt) =>
              opt.text.toLowerCase().includes(answer.toLowerCase()) ||
              answer.toLowerCase().includes(opt.text.toLowerCase())
          )
          if (matchingOption) {
            console.log(`Found matching option:`, matchingOption)
            answers.push({
              questionId: question.id,
              answer: {
                id: matchingOption.id,
                answer: matchingOption.text,
                selector: matchingOption.selector || ""
              }
            })
          } else {
            console.log(`No matching option found for "${answer}"`)
            answers.push({ questionId: question.id, answer: null })
          }
        }
      } else {
        answers.push({ questionId: question.id, answer: null })
      }
    })

    return answers
  } catch (error) {
    console.error("Error parsing AI response:", error)
    return questions.map((q) => ({ questionId: q.id, answer: null }))
  }
}
