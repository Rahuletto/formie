export interface Answer {
  id: number
  answer: string
  otherText?: string
}
export interface AnswerResponse {
  questionId: number
  answer: Answer | Answer[] | string
}
