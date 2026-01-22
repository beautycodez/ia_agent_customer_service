"use client";

import { useState } from "react";

export default function CaseAnalyzerPage() {
  const [emailThread, setEmailThread] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [generatedReply, setGeneratedReply] = useState<string | null>(null);
  const [selectedCaseKey, setSelectedCaseKey] = useState<string | null>(null);
  const [step, setStep] = useState<"edit" | "select_case" | "reply">("edit");

  const isReadyForResolution = () => {
    if (!analysis) return false;

    const supplier = analysis.supplier_entities;
    const customer = analysis.customer_entities;

    const requiredFieldsFilled =
      supplier?.company_name &&
      supplier?.email &&
      supplier?.registration_number &&
      customer?.customer_company &&
      customer?.email;

    return Boolean(requiredFieldsFilled);
  };

  const confirmAndUpdateSummary = async () => {
    setFinalizing(true);
    setError(null);

    try {
      const res = await fetch("http://localhost:8000/update-case-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setAnalysis(data.analysis);

      // Avanzar al paso de selección de case key
      setStep("select_case");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFinalizing(false);
    }
  };
  const generateReply = async () => {
    const formData = new FormData();

    formData.append("problem_description", analysis.case_summary);
    formData.append("email_thread", emailThread);
    formData.append("case_key", selectedCaseKey!);

    const res = await fetch("http://localhost:8000/support-agent", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setGeneratedReply(data.reply);
  };

  const analyzeEmail = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("http://localhost:8000/analyze-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_thread: emailThread }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const data = await res.json();

      // 🔎 Soporta ambos formatos: plano o { analysis }
      const backendAnalysis = data.analysis ?? data;

      const normalizedAnalysis = {
        case_summary: "",
        generated_problem_description: "",
        supplier_entities: {
          contact_name: "",
          company_name: "",
          email: "",
          graphite_id: "",
          registration_number: "",
        },
        customer_entities: {
          customer_company: "",
          contact_name: "",
          email: "",
        },
        questions: [],
        detected_issues: [],
        missing_information: [],
        confidence_notes: {},
        suggested_case_keys: [],
        ready_for_resolution: false,
        ...backendAnalysis, // 👈 seguro ahora
      };

      setAnalysis(normalizedAnalysis);
    } catch (err: any) {
      setError(err.message || "Unexpected error");
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (path: string, value: string) => {
    setAnalysis((prev: any) => {
      if (!prev) return prev;

      const updated = structuredClone(prev);
      const keys = path.split(".");
      let obj = updated;

      keys.slice(0, -1).forEach((k) => {
        if (!obj[k]) obj[k] = {};
        obj = obj[k];
      });

      obj[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">📨 Case Analyzer</h1>

      {/* EMAIL THREAD */}
      <textarea
        className="w-full h-40 border p-3 rounded"
        placeholder="Paste the email thread here..."
        value={emailThread}
        onChange={(e) => setEmailThread(e.target.value)}
      />

      <button
        onClick={analyzeEmail}
        disabled={loading || !emailThread}
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
      >
        Analyze Email
      </button>

      {loading && <p>Analyzing...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {/* ================== ANALYSIS ================== */}
      {analysis && (
        <>
          {/* CASE SUMMARY */}
          <section className="border rounded p-4">
            <h2 className="font-semibold mb-2">📄 Case Summary</h2>
            <p>{analysis.case_summary || "—"}</p>
          </section>

          {/* SUPPLIER */}
          <section className="border rounded p-4 space-y-2">
            <h2 className="font-semibold">🏢 Supplier Information</h2>

            <input
              className="border p-2 w-full"
              placeholder="Supplier Contact Name"
              value={analysis.supplier_entities?.contact_name || ""}
              onChange={(e) =>
                updateField("supplier_entities.contact_name", e.target.value)
              }
            />

            <input
              className="border p-2 w-full"
              placeholder="Supplier Company Name"
              value={analysis.supplier_entities?.company_name || ""}
              onChange={(e) =>
                updateField("supplier_entities.company_name", e.target.value)
              }
            />

            <input
              className="border p-2 w-full"
              placeholder="Supplier Email"
              value={analysis.supplier_entities?.email || ""}
              onChange={(e) =>
                updateField("supplier_entities.email", e.target.value)
              }
            />

            <input
              className="border p-2 w-full"
              placeholder="Graphite ID for Supplier"
              value={analysis.supplier_entities?.graphite_id || ""}
              onChange={(e) =>
                updateField("supplier_entities.graphite_id", e.target.value)
              }
            />

            <input
              className="border p-2 w-full"
              placeholder="Supplier Registration Number"
              value={analysis.supplier_entities?.registration_number || ""}
              onChange={(e) =>
                updateField(
                  "supplier_entities.registration_number",
                  e.target.value,
                )
              }
            />
          </section>

          {/* CUSTOMER */}
          <section className="border rounded p-4 space-y-2">
            <h2 className="font-semibold">👤 Customer Information</h2>

            <input
              className="border p-2 w-full"
              placeholder="Customer Company"
              value={analysis.customer_entities?.customer_company || ""}
              onChange={(e) =>
                updateField(
                  "customer_entities.customer_company",
                  e.target.value,
                )
              }
            />

            <input
              className="border p-2 w-full"
              placeholder="Customer Contact Name"
              value={analysis.customer_entities?.contact_name || ""}
              onChange={(e) =>
                updateField("customer_entities.contact_name", e.target.value)
              }
            />

            <input
              className="border p-2 w-full"
              placeholder="Customer Email Address"
              value={analysis.customer_entities?.email || ""}
              onChange={(e) =>
                updateField("customer_entities.email", e.target.value)
              }
            />
          </section>

          {/* ERROR / SCREENSHOT DETAILS */}
          <section className="border rounded p-4">
            <h2 className="font-semibold mb-2">
              🖼️ Error / Screenshot / Additional Details
            </h2>

            <textarea
              className="border p-2 w-full h-28"
              placeholder="Describe the error or reference any screenshot provided..."
              value={analysis.generated_problem_description || ""}
              onChange={(e) =>
                updateField("generated_problem_description", e.target.value)
              }
            />
          </section>

          {/* MISSING INFO */}
          <section className="border rounded p-4">
            <h2 className="font-semibold mb-2">❗ Missing Information</h2>

            {analysis.missing_information?.length === 0 ? (
              <p className="text-green-600">
                All required information is present
              </p>
            ) : (
              <ul className="list-disc ml-6">
                {Array.isArray(analysis.missing_information) &&
                  analysis.missing_information.map((m: string) => (
                    <li key={m}>{m}</li>
                  ))}
              </ul>
            )}
          </section>

          {/* READY */}
          <section className="border rounded p-4">
            <h2 className="font-semibold mb-2">✅ Ready for Resolution</h2>
            <p
              className={
                analysis.ready_for_resolution
                  ? "text-green-600"
                  : "text-red-600"
              }
            >
              {analysis.ready_for_resolution ? "Yes" : "No"}
            </p>
          </section>
          {/* button to finalize case */}
          <section className="border rounded p-4 flex justify-between items-center">
            <div>
              <h2 className="font-semibold">📦 Finalize Case</h2>
              <p className="text-sm text-gray-600">
                Confirm all fields are correct before finalizing
              </p>
            </div>
            <button
              onClick={confirmAndUpdateSummary}
              disabled={finalizing || !isReadyForResolution()}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Confirm & Update Summary
            </button>

            {/* <button
              onClick={finalizeCase}
              disabled={finalizing || !isReadyForResolution()}
              className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {finalizing ? "Finalizing..." : "Confirm & Finalize"}
            </button> */}
          </section>

          {step === "select_case" && (
            <section className="border rounded p-4">
              <h2 className="font-semibold mb-2">🧠 Select Case Type</h2>

              {analysis.suggested_case_keys.map((key: string) => (
                <label key={key} className="block mb-2">
                  <input
                    type="radio"
                    name="caseKey"
                    value={key}
                    checked={selectedCaseKey === key}
                    onChange={() => setSelectedCaseKey(key)}
                  />{" "}
                  {key}
                </label>
              ))}
              {/* Manual case key */}
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">
                  Or enter a case key manually
                </label>

                <input
                  className="border p-2 w-full rounded"
                  placeholder="e.g. bank_approval_pending"
                  value={selectedCaseKey ?? ""}
                  onChange={(e) => setSelectedCaseKey(e.target.value)}
                />
              </div>

              <button
                disabled={!selectedCaseKey}
                onClick={() => setStep("reply")}
                className="mt-3 bg-black text-white px-4 py-2 rounded disabled:opacity-50"
              >
                Generate Reply
              </button>
            </section>
          )}
          {step === "reply" && (
            <section className="border rounded p-4">
              <button
                onClick={generateReply}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Generate Support Reply
              </button>
            </section>
          )}

          {generatedReply && (
            <section className="border rounded p-4 bg-gray-50">
              <h2 className="font-semibold mb-2">✉️ Generated Support Reply</h2>

              <textarea
                className="w-full h-64 border p-3 rounded"
                value={generatedReply}
                readOnly
              />

              <p className="text-sm text-gray-500 mt-2">
                This reply is ready to be sent to the supplier or customer.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
