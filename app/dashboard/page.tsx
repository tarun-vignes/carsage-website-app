import Link from "next/link";
import { redirect } from "next/navigation";
import { listReportsForUser } from "@/lib/reports";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const isSupabaseConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default async function DashboardPage() {
  if (!isSupabaseConfigured) {
    return (
      <main className="page-wrap py-10">
        <div className="surface-card p-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Supabase not configured</h1>
          <p className="mt-2 text-sm text-slate-600">Set Supabase environment variables to use dashboard features.</p>
        </div>
      </main>
    );
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const reports = await listReportsForUser(user.id);

  return (
    <main className="page-wrap py-10">
      <div className="space-y-6">
        <section className="surface-card p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Report history</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Your Reports</h1>
              <p className="mt-2 text-sm text-slate-600">Review your purchased and preview reports in one place.</p>
            </div>
            <Link href="/check" className="btn-secondary">
              New Check
            </Link>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="metric-card p-4">
              <p className="metric-label">Total reports</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{reports.length}</p>
            </div>
            <div className="metric-card p-4">
              <p className="metric-label">Unlocked</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{reports.filter((report) => report.is_paid).length}</p>
            </div>
            <div className="metric-card p-4">
              <p className="metric-label">Preview only</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{reports.filter((report) => !report.is_paid).length}</p>
            </div>
          </div>
        </section>

        <div className="surface-card p-6 sm:p-8">
          <div className="overflow-x-auto rounded-[28px] border border-slate-300/70 bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <table className="w-full min-w-[660px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-[linear-gradient(180deg,rgba(241,245,249,0.95),rgba(231,237,243,0.88))] text-slate-600">
                  <th className="px-4 py-3 font-medium">Vehicle</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Link</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-t border-slate-200/80 text-slate-700 hover:bg-white/65">
                    <td className="px-4 py-3">
                      {report.input_json.year} {report.input_json.make} {report.input_json.model}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{report.output_json.dealConfidenceScore}</td>
                    <td className="px-4 py-3">
                      {report.is_paid ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">Paid</span>
                      ) : (
                        <span className="rounded-full border border-[#b8d4ff] bg-[#e8f1ff] px-2.5 py-1 text-xs font-medium text-[#0b3f9e]">Preview</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{new Date(report.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <Link href={`/report/${report.id}`} className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4">
                        View report
                      </Link>
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td className="px-4 py-8" colSpan={5}>
                      <div className="hero-panel border-dashed px-5 py-8 text-center">
                        <p className="text-base font-semibold text-slate-900">No reports yet</p>
                        <p className="mt-2 text-sm text-slate-600">Run your first listing check to start building your dashboard.</p>
                        <Link href="/check" className="mt-4 inline-flex font-semibold text-[#0b3f9e] underline underline-offset-4">
                          Check your first listing
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

