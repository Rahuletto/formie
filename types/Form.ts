export interface FormQuestion {
  id: number
  text: string
  type: string
  required: boolean
  options: {
    id: number
    text: string
  }[]
  image?: string
}

export interface FormData {
  title: string
  description: string
  questions: FormQuestion[]
}
