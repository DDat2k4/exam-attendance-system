const inflightGetRequests = new Map()

const stableStringify = (value) => {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }
  if (typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

export const dedupeGet = (axiosInstance, url, config = {}) => {
  const key = stableStringify({
    url,
    params: config.params ?? null,
    responseType: config.responseType ?? null,
    authorization: config.headers?.Authorization ?? null,
  })

  if (inflightGetRequests.has(key)) {
    return inflightGetRequests.get(key)
  }

  const request = axiosInstance.get(url, config)
  inflightGetRequests.set(key, request)

  const cleanup = () => {
    if (inflightGetRequests.get(key) === request) {
      inflightGetRequests.delete(key)
    }
  }

  request.then(cleanup, cleanup)
  return request
}
