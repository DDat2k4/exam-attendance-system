/**
 * Utility functions for face capture and verification
 */

/**
 * Get user's device info
 */
export const getDeviceInfo = () => {
  return {
    deviceId: getDeviceId(),
    userAgent: navigator.userAgent,
    ipAddress: 'browser-client', // Server will extract actual IP
  }
}

/**
 * Generate or retrieve a unique device ID
 */
export const getDeviceId = () => {
  let deviceId = localStorage.getItem('device_id')
  if (!deviceId) {
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    localStorage.setItem('device_id', deviceId)
  }
  return deviceId
}

/**
 * Request camera access
 */
export const requestCameraAccess = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
      },
      audio: false,
    })
    return stream
  } catch (err) {
    const message =
      err.name === 'NotAllowedError'
        ? 'Camera permission denied'
        : err.name === 'NotFoundError'
          ? 'No camera found'
          : 'Failed to access camera: ' + err.message

    throw new Error(message)
  }
}

/**
 * Capture a frame from video element and convert to base64
 */
export const captureFrame = (videoElement) => {
  const canvas = document.createElement('canvas')
  canvas.width = videoElement.videoWidth
  canvas.height = videoElement.videoHeight

  const ctx = canvas.getContext('2d')
  ctx.drawImage(videoElement, 0, 0)

  return canvas.toDataURL('image/jpeg', 0.9)
}

/**
 * Capture multiple frames with delay
 */
export const captureMultipleFrames = async (videoElement, count = 3, delayMs = 500) => {
  const frames = []
  for (let i = 0; i < count; i++) {
    frames.push(captureFrame(videoElement))
    if (i < count - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
  return frames
}

/**
 * Stop camera stream
 */
export const stopCameraStream = (stream) => {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
  }
}

/**
 * Check if browser supports getUserMedia
 */
export const isCameraSupported = () => {
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  )
}
