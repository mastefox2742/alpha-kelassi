'use client'

import {
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  type User,
  type ConfirmationResult,
} from 'firebase/auth'
import { auth } from './client'

export type { User, ConfirmationResult }

// Stockage de la confirmation en cours (évite la sérialisation URL)
let _pendingConfirmation: ConfirmationResult | null = null
export function setPendingConfirmation(c: ConfirmationResult) { _pendingConfirmation = c }
export function getPendingConfirmation() { return _pendingConfirmation }
export function clearPendingConfirmation() { _pendingConfirmation = null }

/** Après connexion Firebase : envoie le token au serveur pour poser le cookie HttpOnly */
async function persistSessionCookie(user: User) {
  const token = await user.getIdToken()
  await fetch('/api/auth/set-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  }).catch(() => {/* Silencieux — le cookie est optionnel pour les SSC */})
}

/** Connexion email + mot de passe */
export async function signInWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  await persistSessionCookie(cred.user)
  return cred.user
}

/** Création de compte email + mot de passe */
export async function registerWithEmail(
  email: string,
  password: string,
  fullName: string,
  studyLevel: string
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName: fullName })
  // Crée le profil utilisateur via l'API
  const token = await cred.user.getIdToken()
  await fetch('/api/users/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ full_name: fullName, study_level: studyLevel }),
  }).catch(() => {})
  await persistSessionCookie(cred.user)
  return cred.user
}

/** Connexion Google OAuth */
export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider()
  const cred = await signInWithPopup(auth, provider)
  await persistSessionCookie(cred.user)
  return cred.user
}

/**
 * Initialise le reCAPTCHA invisible et envoie un OTP par SMS.
 * containerOrId : ID du div DOM qui recevra le widget invisible.
 */
export async function sendPhoneOtp(
  phone: string,
  containerOrId: string
): Promise<ConfirmationResult> {
  const verifier = new RecaptchaVerifier(auth, containerOrId, { size: 'invisible' })
  const formatted = phone.startsWith('+') ? phone : `+242${phone}`
  const confirmation = await signInWithPhoneNumber(auth, formatted, verifier)
  setPendingConfirmation(confirmation)
  return confirmation
}

/** Vérifie l'OTP et connecte l'utilisateur */
export async function verifyPhoneOtp(otp: string): Promise<User> {
  const confirmation = getPendingConfirmation()
  if (!confirmation) throw new Error('Aucune confirmation en attente — renvoie le SMS.')
  const result = await confirmation.confirm(otp)
  clearPendingConfirmation()
  await persistSessionCookie(result.user)
  return result.user
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
  // Supprime le cookie côté serveur
  await fetch('/api/auth/set-token', { method: 'DELETE' }).catch(() => {})
}

/** Retourne l'ID token courant (refresh auto si expiré) */
export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser
  if (!user) return null
  return user.getIdToken()
}

/** Abonne un callback aux changements d'état d'auth */
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}
