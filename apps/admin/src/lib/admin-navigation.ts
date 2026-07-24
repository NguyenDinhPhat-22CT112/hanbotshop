export function shouldShowAdminNavigation(pathname: string) {
  return pathname !== '/login';
}
