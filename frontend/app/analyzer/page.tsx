"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function CaseAnalyzerPage() {
  const [emailThread, setEmailThread] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [generatedReply, setGeneratedReply] = useState<string | null>(null);
  const [selectedCaseKey, setSelectedCaseKey] = useState<string | null>(null);
  const [step, setStep] = useState<"edit" | "select_case" | "reply">("edit");
  const [readyForResolution, setReadyForResolution] = useState(false);
  const [isSolved, setIsSolved] = useState<boolean | null>(null);

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

    requiredFieldsFilled ? setReadyForResolution(true) : false;
  };

  const confirmAndUpdateSummary = async () => {
    setFinalizing(true);
    setError(null);
    console.log(analysis);
    
    try {
      const res = await fetch("http://localhost:8000/update-case-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      setAnalysis((prev: any) => ({
        ...prev,
        ...data.analysis,
      }));

      // Avanzar al paso de selección de case key

      setSelectedCaseKey(data.analysis.selected_case_key ?? "others")
      setStep("select_case");
      isReadyForResolution();
      console.log(data)
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFinalizing(false);
    }
  };
  const generateReply = async () => {
    setLoading(true);
    const formData = new FormData();

    formData.append("problem_description", analysis.case_summary);
    formData.append("case_key", selectedCaseKey!);

    const res = await fetch("http://localhost:8000/support-agent-replier", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setGeneratedReply(data.reply);
    setLoading(false);
  };

  const analyzeEmail = async () => {
    setLoading(true); // Muestra un mensaje en donde la informacion esta cargando
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
      console.log(data);

      // 🔎 Soporta ambos formatos: plano o { analysis }
      const backendAnalysis = data.analysis ?? data;
      // Crea un esqueleto para que la informacion de backendAnalysis pueda ingresar sin
      // Errores en caso la IA no encuentre un campo especifico.
      const normalizedAnalysis = {
        case_summary: "",
        generated_problem_description: "",

        supplier_entities: {
          contact_name: "",
          company_name: "",
          email: "",
          graphite_id: "",
          registration_number: "",
          admin_users: {
            name: "",
            email: "",
          },
        },

        customer_entities: {
          customer_company: "",
          contact_name: "",
          email: "",
          graphite_id: "",
        },

        connection: {
          status: "",
          action_required: [], // array de strings
          deadline: "",
          error_type: "",
        },

        email: {
          questions: [],
          detected_issues: [],
          missing_information: [],
          confidence_notes: {},
          issue_category: "",
          urgency: "",
          document_type: "",
          solved: false,
        },

        suggested_case_keys: [],
        ready_for_resolution: false,

        // 👇 El backend pisa SOLO lo que sí encontró
        ...backendAnalysis,
      };

      setAnalysis(normalizedAnalysis);
    } catch (err: any) {
      setError(err.message || "Unexpected error");
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (path: string, value: unknown) => {
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
            {/* <p>{analysis.case_summary || "—"}</p> */}
            <div className="prose prose-sm max-w-none bg-white p-4 rounded shadow">
              <ReactMarkdown>{analysis.case_summary || "—"}</ReactMarkdown>
            </div>
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
          {/* Connection data */}
          <section className="border rounded p-4 space-y-2">
            <h2 className="font-semibold">⭐​Connection status</h2>
            <label>Required actions</label>
            {Array.isArray(analysis.connection?.action_required) &&
              analysis.connection.action_required.map(
                (a: string, index: number) => (
                  <input
                    key={index}
                    className="border p-2 w-full"
                    placeholder={`Required action ${index + 1}`}
                    value={a || ""}
                    onChange={(e) => {
                      const newActions = [
                        ...analysis.connection.action_required,
                      ];
                      newActions[index] = e.target.value;

                      updateField("connection.action_required", newActions);
                    }}
                  />
                ),
              )}
            <label>Status</label>
            <input
              className="border p-2 w-full"
              placeholder="Connection status"
              value={analysis.connection?.status || ""}
              onChange={(e) => updateField("connection.status", e.target.value)}
            />
            <label>Deadline</label>
            <input
              className="border p-2 w-full"
              placeholder="Deadline"
              value={analysis.connection?.deadline || ""}
              onChange={(e) =>
                updateField("connection.deadline", e.target.value)
              }
            />
            <label>Error type</label>
            <input
              className="border p-2 w-full"
              placeholder="Error Type"
              value={analysis.connection?.error_type || ""}
              onChange={(e) =>
                updateField("connection.error_type", e.target.value)
              }
            />
          </section>

          {/* Email Data */}
          <section className="border rounded p-4">
            <h2 className="font-semibold mb-2">📧​ Email</h2>
            <label>Detected issues</label>
            {Array.isArray(analysis.email?.detected_issues) &&
              analysis.email?.detected_issues.map(
                (i: string, index: number) => (
                  <input
                    key={index}
                    className="border p-2 w-full"
                    placeholder={`Detected issue ${index + 1}`}
                    value={i || ""}
                    onChange={(e) => {
                      const newActions = [...analysis.email.detected_issues];
                      newActions[index] = e.target.value;

                      updateField("email.detected_issues", newActions);
                    }}
                  />
                ),
              )}
            <label>Document type</label>
            <input
              className="border p-2 w-full"
              placeholder="Please enter the document type if relevant"
              value={analysis.email?.document_type || ""}
              onChange={(e) =>
                updateField("email.document_type", e.target.value)
              }
            />
            <label>Issue Category</label>
            <input
              className="border p-2 w-full"
              placeholder="Please enter the document type if relevant"
              value={analysis.email?.issue_category || ""}
              onChange={(e) =>
                updateField("email.issue_category", e.target.value)
              }
            />
            <label>Questions</label>
            {Array.isArray(analysis.email?.questions) &&
              analysis.email?.questions.map((q: string, index: number) => (
                <input
                  key={index}
                  className="border p-2 w-full"
                  placeholder={`Question ${index + 1}`}
                  value={q || ""}
                  onChange={(e) => {
                    const newActions = [...analysis.email.questions];
                    newActions[index] = e.target.value;

                    updateField("email.questions", newActions);
                  }}
                />
              ))}
            <label> The issue is solved?</label>
            <label className="block mb-2">
              <input
                type="radio"
                checked={analysis.email.solved === true}
                onChange={(e) => updateField("email.solved", e.target.checked)}
              />{" "}
              Yes
            </label>

            <label className="block mb-2">
              <input
                type="radio"
                checked={analysis.email.solved === false}
                onChange={(e) => updateField("email.solved", e.target.checked)}
              />{" "}
              No
            </label>

            <label>Urgency</label>
            <input
              className="border p-2 w-full"
              placeholder="Urgency"
              value={analysis.email?.urgency || ""}
              onChange={(e) => updateField("email.urgency", e.target.value)}
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

            {analysis.email.missing_information?.length === 0 ? (
              <p className="text-green-600">
                All required information is present
              </p>
            ) : (
              <ul className="list-disc ml-6">
                {Array.isArray(analysis.email.missing_information) &&
                  analysis.email.missing_information.map((m: string) => (
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
              {readyForResolution ? "Yes" : "No"}
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
              disabled={finalizing}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Confirm & Update Summary
            </button>
          </section>

          {step === "select_case" && (
            <section className="border rounded p-4">
              <h2 className="font-semibold mb-2">🧠 Select Case Type</h2>

              {Array.isArray(analysis.suggested_case_keys) &&
                analysis.suggested_case_keys.map((key: string) => (
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
          {loading && <p>Creating a wonderful reply...</p>}

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
