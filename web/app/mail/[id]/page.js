import { notFound } from "next/navigation";
import results from "../../../data/results.json";
import MailView from "../../mail-view";

export function generateStaticParams() {
  return (results || []).map((r) => ({ id: r.email_id }));
}

export default function MailPage({ params }) {
  const rec = (results || []).find((r) => r.email_id === params.id);
  if (!rec) notFound();
  return <MailView rec={rec} />;
}
