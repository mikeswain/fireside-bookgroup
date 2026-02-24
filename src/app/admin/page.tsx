import AdminBookList from "@/components/AdminBookList";
import MemberList from "@/components/MemberList";
import UserNav from "@/components/UserNav";

export const runtime = "edge";

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-amber-900">
            Book Admin
          </h1>
          <p className="mt-1 text-sm text-amber-600">
            Add, edit, and delete books. Changes commit to GitHub and trigger a rebuild.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
          >
            &larr; Back to site
          </a>
          <UserNav variant="page" currentPage="admin" />
        </div>
      </div>
      <AdminBookList />

      <div className="mt-12">
        <h2 className="mb-4 text-2xl font-bold text-amber-900">Members</h2>
        <p className="mb-4 text-sm text-amber-600">
          Manage book group members. Changes commit to GitHub and trigger a rebuild.
        </p>
        <MemberList />
      </div>
    </main>
  );
}
