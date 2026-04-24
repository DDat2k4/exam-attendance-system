import { useState } from 'react'
import { exportSessionReportExcel, downloadFile } from '../api/reportApi'

/**
 * Hook for exporting exam room reports to Excel
 * @returns {object} - { loading, error, exportReport }
 */
export const useExcelExport = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const exportReport = async (roomId) => {
    if (!roomId) {
      setError('Room ID is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const blob = await exportSessionReportExcel(roomId)
      const fileName = `report_room_${roomId}_${new Date().toISOString().split('T')[0]}.xlsx`
      downloadFile(blob, fileName)
    } catch (err) {
      setError(err.message || 'Failed to export report')
      console.error('Export error:', err)
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, exportReport }
}
