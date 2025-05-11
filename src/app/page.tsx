import { redirect } from 'next/navigation';

export default function RootPage() {
  // The (main) route group does not alter the URL structure,
  // so / will map to (main)/page.tsx if it exists.
  // If (main)/page.tsx is the dashboard, no redirect is needed here,
  // as Next.js will automatically serve it.
  // However, to be explicit if the dashboard is at a named route like /dashboard:
  // redirect('/dashboard'); 
  
  // Assuming (main)/page.tsx is the dashboard and accessible at '/'
  // No explicit redirect needed here if (main)/page.tsx is the entry point.
  // If you want a specific route like /dashboard, then use redirect('/dashboard')
  // and ensure (main)/dashboard/page.tsx exists.
  // For this setup, (main)/page.tsx will serve as the root dashboard.
  return null; 
}
