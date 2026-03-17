import type { ReportRecord, ReportOutput, QuoteInput } from "@/types/report";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function createReportRecord(userId: string, input: QuoteInput, output: ReportOutput) {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("reports")
    .insert({
      user_id: userId,
      input_json: input,
      output_json: output,
      is_paid: false
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data.id as string;
}

export async function getReportForUser(reportId: string, userId: string): Promise<ReportRecord | null> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("reports")
    .select("id,user_id,input_json,output_json,is_paid,created_at")
    .eq("id", reportId)
    .eq("user_id", userId)
    .single();

  if (error) {
    return null;
  }

  return data as ReportRecord;
}

export async function listReportsForUser(userId: string): Promise<ReportRecord[]> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("reports")
    .select("id,user_id,input_json,output_json,is_paid,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as ReportRecord[];
}
