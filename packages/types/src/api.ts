export interface ApiResponse<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: {
    code: string
    message: string
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface ChatRequest {
  message: string
  session_id?: string
  document_id?: string
}

export interface ChatResponse {
  session_id: string
  message: string
  flashcards?: Array<{ front: string; back: string }>
}

export interface EmbedJobPayload {
  document_id: string
  pdf_url: string
}
