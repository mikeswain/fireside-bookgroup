import MessageForm from "@/components/MessageForm";
import UserNav from "@/components/UserNav";

export const runtime = "edge";

export default function MessagesPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-amber-900">Messages</h1>
          <p className="mt-1 text-sm text-amber-600">
            Send a message to book group members.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
          >
            &larr; Back to site
          </a>
          <UserNav variant="page" currentPage="messages" />
        </div>
      </div>
      <MessageForm />
    </main>
  );
}
