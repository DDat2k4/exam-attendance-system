export const formatExamLabel = (exam) => {
	const title = String(exam?.title || '').trim()
	const examCode = String(exam?.examCode || '').trim()
	const semester = String(exam?.semester || '').trim()

	const metadata = [examCode, semester].filter(Boolean)
	if (title && metadata.length > 0) {
		return `${title} (${metadata.join(' - ')})`
	}

	if (title) {
		return title
	}

	if (metadata.length > 0) {
		return metadata.join(' - ')
	}

	return exam?.id ? `Kỳ thi ${exam.id}` : 'Kỳ thi'
}
