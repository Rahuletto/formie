export const GOOGLE_API_KEY = process.env.PLASMO_PUBLIC_GOOGLE_API_KEY || ""

if (!GOOGLE_API_KEY) {
  console.warn("Google API key is not set. AI functionality will not work.")
}
