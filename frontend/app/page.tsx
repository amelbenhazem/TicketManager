import { redirect } from 'next/navigation'

export default function Home() {
  // La page de login est exposée sous `/login` (la route `/` redirige dessus).
  redirect('/login')
}
