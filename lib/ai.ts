import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { generateText } from "ai"

import type { FormData, FormQuestion } from "../types/Form"
import { GOOGLE_API_KEY } from "./env"

export interface AnswerResponse {
  questionId: number
  answer:
    | { id: number; answer: string; otherText?: string }
    | { id: number; answer: string; otherText?: string }[]
}

const googleAI = createGoogleGenerativeAI({
  apiKey: GOOGLE_API_KEY
})
const model = googleAI("gemini-2.5-flash-preview-05-20")

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
      prompt
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
        options: q.options
      }))
    )

    return parsedAnswers
  } catch (error) {
    console.error("Error generating answers:", error)
    throw error
  }
}

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
    prompt += JSON.stringify(question)
  })

  prompt += `
Remember:
1. Skip any personal questions (respond with "SKIP")
2. For multiple choice/dropdown, return {"id": optionId, "answer": "option text"}
3. For checkbox questions, return an array of {"id": optionId, "answer": "option text"} objects
4. For short answer or paragraph, return just the text string
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
      return parsed
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
          answers.push({
            questionId: question.id,
            answer: { id: 0, answer: answer }
          })
        } else {
          // For multiple choice, checkbox, and dropdown, create object format
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
              answer: { id: matchingOption.id, answer: matchingOption.text }
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
