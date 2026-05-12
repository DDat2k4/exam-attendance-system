// Verification API disabled — verification is handled by the external mobile app.
// Keep these stubs so existing imports continue to resolve.

export const verifyCccd = async () => {
  console.warn('verifyCccd called but verification is handled externally; stubbed.')
  return null
}

export const verifyIdentity = async (_request) => {
  console.warn('verifyIdentity called but verification is handled externally; stubbed.')
  return null
}

export const readCccd = async () => {
  console.warn('readCccd called but verification is handled externally; stubbed.')
  return null
}
