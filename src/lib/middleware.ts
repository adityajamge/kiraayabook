export function getOrgId(req: Request): string {
  const org_id = req.headers.get('x-org-id')
  if (!org_id) throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  return org_id
}

export function getAuthContext(req: Request): { org_id: string; user_id: string; role: string } {
  const org_id = req.headers.get('x-org-id')
  const user_id = req.headers.get('x-user-id')
  const role = req.headers.get('x-user-role')
  if (!org_id || !user_id || !role) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }
  return { org_id, user_id, role }
}
