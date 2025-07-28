import { auth0 } from "../../lib/auth0";
import ClientNavbar from "../../components/navbar";
import BookHistoryTable from "../../components/historyInterface";
import { redirect } from 'next/navigation';

export default async function App() {
    const session = await auth0.getSession();

    if (!session) {
        redirect('/auth/login');
    }

  const accessToken = (await auth0.getAccessToken()).token;
  const response = await fetch('http://localhost:5004/all', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    const initial_summary_history_data = await response.json();

    return (
        <>
            <ClientNavbar session={session} />
            <BookHistoryTable session={session} summary_history_data={initial_summary_history_data}/>
        </>
    );
}
