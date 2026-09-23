import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty-state">
      <h2>Page not found</h2>
      <p>
        That story may have moved. <Link href="/">Back to the front page</Link>
      </p>
    </div>
  );
}
