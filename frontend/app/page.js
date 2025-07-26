import { auth0 } from "../lib/auth0";
import ClientNavbar from "../components/navbar";
import BookSummaryInterface from "../components/bookSummaryInterface";
import { redirect } from 'next/navigation';

export default async function App() {
  const session = await auth0.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  const accessToken = (await auth0.getAccessToken()).token;
  const response = await fetch('http://localhost:5004', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });



  return (
    <>
      <ClientNavbar session={session} />
      <BookSummaryInterface session={session} />
    </>
  );
}