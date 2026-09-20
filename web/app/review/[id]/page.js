import results from "../../../data/results.json";
import CaseActions from "./case-actions";

export const dynamicParams = true;

export function generateStaticParams() {
  return (results || [])
    .filter((r) => r.status === "NEEDS_REVIEW")
    .map((r) => ({ id: r.email_id }));
}

export default function ReviewCasePage({ params }) {
  const rec = (results || []).find((r) => r.email_id === params.id) || null;
  return <CaseActions rec={rec} id={params.id} />;
}
