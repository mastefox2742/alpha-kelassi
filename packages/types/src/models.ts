export type UserRole = 'student' | 'admin'
export type UserPlan = 'free' | 'premium'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing'
export type DocumentType = 'cours' | 'examen'
export type ExamSession = 'normale' | 'rattrapage'
export type Level = 'bepc' | 'bac_a' | 'bac_c' | 'bac_d'
export type MessageRole = 'user' | 'assistant'

export interface User {
  id: string
  email: string | null
  phone: string | null
  full_name: string | null
  role: UserRole
  plan: UserPlan
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  stripe_sub_id: string | null
  cinetpay_ref: string | null
  plan: UserPlan
  status: SubscriptionStatus
  expires_at: string | null
  created_at: string
}

export interface Subject {
  id: string
  name: string
  level: Level
  country_code: string
  icon: string | null
  created_at: string
}

export interface Document {
  id: string
  subject_id: string
  type: DocumentType
  title: string
  level: Level
  year: number | null
  session: ExamSession | null
  country_code: string
  pdf_url: string
  text_content: string | null
  is_premium: boolean
  created_at: string
}

export interface DocumentChunk {
  id: string
  document_id: string
  content: string
  chunk_index: number
  metadata: Record<string, unknown>
  created_at: string
}

export interface ChatSession {
  id: string
  user_id: string
  document_id: string | null
  title: string | null
  created_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  role: MessageRole
  content: string
  created_at: string
}

export interface Flashcard {
  id: string
  user_id: string
  document_id: string
  front: string
  back: string
  next_review: string
  ease_factor: number
  interval: number
  reps: number
  created_at: string
}

export interface UserProgress {
  id: string
  user_id: string
  subject_id: string
  flashcards_reviewed: number
  score_avg: number
  streak_days: number
  last_active: string
}
