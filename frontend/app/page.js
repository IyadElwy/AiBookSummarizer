import { auth0 } from "../lib/auth0";
import ClientNavbar from "../components/navbar";
import BookSummaryInterface from "../components/bookSummaryInterface";
import { redirect } from 'next/navigation';

export default async function App() {
  const session = await auth0.getSession();

  if (!session) {
    redirect('/auth/login');
  }


  return (
    <>
      <ClientNavbar session={session} />
      <BookSummaryInterface session={session} />
    </>
  );
}