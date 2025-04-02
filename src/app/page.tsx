import { redirect } from 'next/navigation';

export default function Home() {
  // Ana sayfaya gelen kullanıcıları giriş sayfasına yönlendir
  redirect('/auth/login');
} 