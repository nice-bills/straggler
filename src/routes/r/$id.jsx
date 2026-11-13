import { createFileRoute, Link } from "@tanstack/react-router";
import ReviewCard from "@/components/upgrade/ReviewCard";
import { recentReviews } from "@/lib/upgrade-fns";

export const Route = createFileRoute("/r/$id")({
  loader: async ({ params }) => {
    const rows = await recentReviews();
    const row = rows.find((item) => item.id === params.id);
    if (!row) throw new Error("Review not found");
    return row;
  },
  component: ReviewDetail,
});

function ReviewDetail() {
  const row = Route.useLoaderData();
  let result;
  try { result = JSON.parse(row.result); } catch { result = null; }
  return <main className="shell">
    <header><Link to="/" className="brand">STRAGGLER <span>· PROXY WATCH</span></Link><Link to="/">← Recent reviews</Link></header>
    <ReviewCard result={result} />
  </main>;
}
