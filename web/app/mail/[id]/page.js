import results from "../../../data/results.json";
import MailView from "../../mail-view";

export const dynamicParams = true;

export function generateStaticParams() {
  return (results || []).map((r) => ({ id: r.email_id }));
}

export default function MailPage({ params }) {
  const rec = (results || []).find((r) => r.email_id === params.id) || null;
  return <MailView rec={rec} id={params.id} />;
}
