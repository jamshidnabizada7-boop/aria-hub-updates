/** Social publication and configuration require a publishing role. */
export function canManageSocial(role: string): boolean {
  return ['super_admin', 'admin', 'content_manager'].includes(role);
}
