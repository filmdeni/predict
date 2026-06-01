export function urgencyLevel(closesAt: string): 'normal' | 'soon' | 'critical' {
  const diff = new Date(closesAt).getTime() - Date.now()
  if (diff <= 1800000) return 'critical'
  if (diff <= 7200000) return 'soon'
  return 'normal'
}
