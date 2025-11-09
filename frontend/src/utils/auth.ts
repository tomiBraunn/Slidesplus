export function handleAuthError(response: Response): boolean {
  if (response.status === 401) {
    localStorage.removeItem("token")
    window.location.href = "/login"
    return true
  }
  return false
}

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("token")
  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const response = await fetch(url, { ...options, headers })

  if (response.status === 401) {
    localStorage.removeItem("token")
    window.location.href = "/login"
  }

  return response
}
