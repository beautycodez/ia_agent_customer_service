"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function Page() {
  const [caseKey, setCaseKey] = useState("profile_mismatch");
  const [problemDescription, setProblemDescription] = useState("");
  const [emailThread, setEmailThread] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setReply("");

    const formData = new FormData();
    formData.append("case_key", caseKey);
    formData.append("problem_description", problemDescription);
    formData.append("email_thread", emailThread);

    const res = await fetch("http://localhost:8000/support-agent", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setReply(data.reply);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-10">
      <div className="mx-auto max-w-3xl rounded-xl bg-white p-8 shadow">
        <h1 className="mb-6 text-2xl font-semibold">Graphite Support Agent</h1>

        {/* CASE KEY */}
        <label className="mb-2 block font-medium">Case type</label>

        <select
          className="mb-4 w-full rounded border p-3"
          value={caseKey}
          onChange={(e) => setCaseKey(e.target.value)}
        >
          <option value="mismatch_profile_document">
            Profile and document mismatch
          </option>

          <option value="duplicate_profile">Duplicate profile detected</option>

          <option value="bank_approval_pending">
            Bank approval pending (approver has access)
          </option>

          <option value="bank_approval_pending_invitation_sent">
            Bank approval pending (invitation sent)
          </option>

          <option value="bank_approval_no_second_user">
            Bank approval – no second user
          </option>

          <option value="share_bank">Share bank with customer</option>

          <option value="2FA_reset">Reset 2FA method</option>

          <option value="Veriff_refusal">
            Veriff verification explanation
          </option>

          <option value="Task_completed">Task completed but not cleared</option>

          <option value="add_new_users">Add new users</option>

          <option value="password_update">Password reset</option>

          <option value="w9_outdated">Outdated W9 form</option>

          <option value="Others">Others</option>

          <option value="w9_no_individual_issue">
            W9 – individual / company info issue
          </option>
          <option value="validation_bank_invalid_document">
            validation error bank invalid document
          </option>
          <option value="status">Status</option>
        </select>

        <label className="mb-2 block font-medium">Problem description</label>
        <textarea
          className="mb-4 w-full rounded border p-3"
          rows={3}
          value={problemDescription}
          onChange={(e) => setProblemDescription(e.target.value)}
        />

        <label className="mb-2 block font-medium">Email thread</label>
        <textarea
          className="mb-4 w-full rounded border p-3"
          rows={6}
          value={emailThread}
          onChange={(e) => setEmailThread(e.target.value)}
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="rounded bg-black px-6 py-2 text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate reply"}
        </button>

        {reply && (
          <div className="mt-6 rounded bg-zinc-100 p-4">
            <h2 className="mb-2 font-medium">Generated reply</h2>
            <pre className="whitespace-pre-wrap text-sm">{reply}</pre>
          </div>
        )}
      </div>
    </main>
  );
}
