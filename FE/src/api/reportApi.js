import axiosClient from '../services/axiosClient'

const API_URL = import.meta.env.VITE_API_BASE_URL

/**
 * Export full exam room report as Excel
 * @param {number} roomId - The exam room ID to export
 * @returns {Promise<Blob>} - Excel file blob
 */
export const exportSessionReportExcel = async (roomId) => {
  try {
    const response = await axiosClient.get(
      `${API_URL}/reports/export-excel?roomId=${roomId}`,
      {
        responseType: 'blob',
      }
    )
    return response.data
  } catch (err) {
    const message = err.response?.data?.message || err.message || 'Failed to export report'
    const error = new Error(message)
    error.response = err.response
    throw error
  }
}

/**
 * Download blob as file
 * @param {Blob} blob - File blob to download
 * @param {string} fileName - Name of the file to save
 */
export const downloadFile = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
