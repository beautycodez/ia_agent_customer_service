"use client";

import { useState, useEffect } from "react";
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
  const [resolutionGuides, setResolutionGuides] = useState<Record<string, any>>(
    {},
  );
  const [loadingGuides, setLoadingGuides] = useState(false);
  const [informationStatus, setInformationStatus] = useState<
    "edit" | "supplier" | "customer" | "connection" | "email" | "summary" | null
  >(null);
  useEffect(() => {
    const fetchResolutionGuides = async () => {
      try {
        setLoadingGuides(true);

        const res = await fetch("http://localhost:8000/resolution-guides");
        if (!res.ok) throw new Error("Failed to fetch resolution guides");

        const data = await res.json();
        setResolutionGuides(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoadingGuides(false);
      }
    };

    fetchResolutionGuides();
  }, []);
  const caseKeys = Object.keys(resolutionGuides);

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

    try {
      const res = await fetch("http://localhost:8000/update-case-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      console.log(data);
      setAnalysis((prev: any) => ({
        ...prev,
        ...data.analysis,
      }));

      // Avanzar al paso de selección de case key

      setSelectedCaseKey(
        (prev) => prev ?? data.analysis.selected_case_key ?? "others",
      );
      setStep("select_case");
      isReadyForResolution();
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

      // 🔎 Soporta ambos formatos: plano o { analysis }
      const backendAnalysis = data.analysis ?? data;
      // Crea un esqueleto para que la informacion de backendAnalysis pueda ingresar sin
      // Errores en caso la IA no encuentre un campo especifico.
      const normalizedAnalysis = {
        case_summary: "",
        generated_problem_description: "",
        extra_information: "",
        detected_issue: "",
        resolution: "",
        supplier_entities: {
          supplier_details: [
            {
              name: "",
              email: "",
            },
          ],
          company_name: "",
          graphite_id: "",
          registration_number: "",
          admin_users: [
            {
              name: "",
              email: "",
            },
          ],
        },

        customer_entities: {
          customer_company: "",
          customer_details: [
            {
              name: "",
              email: "",
            },
          ],
          graphite_id: "",
        },

        connection: {
          status: "",
          error_type: "",
        },

        email: {
          requester: "",
          graphite_validation__team_message: "",
          questions: [],
          missing_information: [],
          confidence_notes: {},
          urgency: "",
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

      {/*buttons to analyze, confirm and update and update, and generate support reply  */}
      <section>
        <button
          onClick={analyzeEmail}
          disabled={loading || !emailThread}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Analyze Email
        </button>

        {analysis && (
          <button
            onClick={confirmAndUpdateSummary}
            disabled={finalizing}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Confirm & Update Summary
          </button>
        )}
        {step === "reply" && (
          <button
            onClick={generateReply}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Generate Support Reply
          </button>
        )}
        {loading && step === "reply" && <p>Creating a wonderful reply...</p>}
      </section>

      {loading && step != "reply" && <p>Analyzing...</p>}

      {error && <p className="text-red-600">{error}</p>}

      {/*Select case menu*/}
      {step === "select_case" && (
        <section className="border rounded p-4">
          <h2 className="font-semibold mb-2">🧠 Select Case Type</h2>
          {/* dropdown case key */}
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Case key</label>

            <select
              className="border p-2 w-full rounded bg-white"
              value={selectedCaseKey ?? ""}
              onChange={(e) => setSelectedCaseKey(e.target.value)}
            >
              <option value="" disabled>
                Select a case key
              </option>

              {caseKeys.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
              <option value="others">Others</option>
            </select>
          </div>

          <button
            disabled={!selectedCaseKey}
            onClick={() => setStep("reply")}
            className="mt-3 bg-black text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Confirm Case Key
          </button>
        </section>
      )}

      {/* ================== ANALYSIS ================== */}
      {analysis && (
        <>
          {/* Buttons to display data */}
          <section className="border rounded p-4">
            <div className="flex gap-3">
              {[
                { key: "summary", label: "Show Summary" },
                { key: "edit", label: "Edit Summary" },
                { key: "supplier", label: "Supplier" },
                { key: "customer", label: "Customer" },
                { key: "connection", label: "Connection" },
                { key: "email", label: "Email" },
              ].map((btn) => (
                <button
                  key={btn.key}
                  onClick={() =>
                    setInformationStatus(btn.key as typeof informationStatus)
                  }
                  className={`
          px-4 py-2 rounded font-medium text-sm
          transition
          ${
            informationStatus === btn.key
              ? "bg-red-700 text-white"
              : "bg-red-500 text-white hover:bg-red-600"
          }
        `}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </section>

          {/* CASE SUMMARY */}
          {informationStatus == "summary" && (
            <section className="border rounded p-4">
              <h2 className="font-semibold mb-2">📄 Case Summary</h2>
              {/* <p>{analysis.case_summary || "—"}</p> */}
              <div className="prose prose-sm max-w-none bg-white p-4 rounded shadow">
                <ReactMarkdown>{analysis.case_summary || "—"}</ReactMarkdown>
              </div>
            </section>
          )}

          {/* SUPPLIER */}
          {informationStatus === "supplier" && step !== "reply" && (
            <section className="border rounded p-4 space-y-4">
              <h2 className="font-semibold">🏢 Supplier Information</h2>

              {/* Company Name */}
              <input
                className="border p-2 w-full rounded"
                placeholder="Supplier Company Name"
                value={analysis.supplier_entities?.company_name || ""}
                onChange={(e) =>
                  updateField("supplier_entities.company_name", e.target.value)
                }
              />

              {/* Graphite ID */}
              <input
                className="border p-2 w-full rounded"
                placeholder="Graphite ID"
                value={analysis.supplier_entities?.graphite_id || ""}
                onChange={(e) =>
                  updateField("supplier_entities.graphite_id", e.target.value)
                }
              />

              {/* Registration Number */}
              <input
                className="border p-2 w-full rounded"
                placeholder="Registration Number"
                value={analysis.supplier_entities?.registration_number || ""}
                onChange={(e) =>
                  updateField(
                    "supplier_entities.registration_number",
                    e.target.value,
                  )
                }
              />
              {/* Supplier Contact */}
              <div className="border rounded p-3 space-y-2 bg-gray-50">
                <h3 className="font-medium">👤 Supplier Contact</h3>

                <input
                  className="border p-2 w-full rounded"
                  placeholder="Contact Name"
                  value={
                    analysis.supplier_entities?.supplier_details?.[0]?.name ||
                    ""
                  }
                  onChange={(e) =>
                    updateField(
                      "supplier_entities.supplier_details.0.name",
                      e.target.value,
                    )
                  }
                />

                <input
                  className="border p-2 w-full rounded"
                  placeholder="Contact Email"
                  value={
                    analysis.supplier_entities?.supplier_details?.[0]?.email ||
                    ""
                  }
                  onChange={(e) =>
                    updateField(
                      "supplier_entities.supplier_details.0.email",
                      e.target.value,
                    )
                  }
                />
              </div>
              {/* Admin User */}
              <div className="border rounded p-3 space-y-2 bg-gray-50">
                <h3 className="font-medium">🛡️ Admin User</h3>

                <input
                  className="border p-2 w-full rounded"
                  placeholder="Admin Name"
                  value={
                    analysis.supplier_entities?.admin_users?.[0]?.name || ""
                  }
                  onChange={(e) =>
                    updateField(
                      "supplier_entities.admin_users.0.name",
                      e.target.value,
                    )
                  }
                />

                <input
                  className="border p-2 w-full rounded"
                  placeholder="Admin Email"
                  value={
                    analysis.supplier_entities?.admin_users?.[0]?.email || ""
                  }
                  onChange={(e) =>
                    updateField(
                      "supplier_entities.admin_users.0.email",
                      e.target.value,
                    )
                  }
                />
              </div>
            </section>
          )}

          {/* CUSTOMER */}
          {informationStatus === "customer" && step !== "reply" && (
            <section className="border rounded p-4 space-y-4">
              <h2 className="font-semibold">👤 Customer Information</h2>

              {/* Customer Company */}
              <input
                className="border p-2 w-full rounded"
                placeholder="Customer Company"
                value={analysis.customer_entities?.customer_company || ""}
                onChange={(e) =>
                  updateField(
                    "customer_entities.customer_company",
                    e.target.value,
                  )
                }
              />

              {/* Graphite ID */}
              <input
                className="border p-2 w-full rounded"
                placeholder="Graphite ID"
                value={analysis.customer_entities?.graphite_id || ""}
                onChange={(e) =>
                  updateField("customer_entities.graphite_id", e.target.value)
                }
              />

              {/* Customer Contact */}
              <div className="border rounded p-3 space-y-2 bg-gray-50">
                <h3 className="font-medium">📇 Customer Contact</h3>

                <input
                  className="border p-2 w-full rounded"
                  placeholder="Contact Name"
                  value={
                    analysis.customer_entities?.customer_details?.[0]?.name ||
                    ""
                  }
                  onChange={(e) =>
                    updateField(
                      "customer_entities.customer_details.0.name",
                      e.target.value,
                    )
                  }
                />

                <input
                  className="border p-2 w-full rounded"
                  placeholder="Contact Email"
                  value={
                    analysis.customer_entities?.customer_details?.[0]?.email ||
                    ""
                  }
                  onChange={(e) =>
                    updateField(
                      "customer_entities.customer_details.0.email",
                      e.target.value,
                    )
                  }
                />
              </div>
            </section>
          )}

          {/* Connection data */}
          {informationStatus == "connection" && step != "reply" && (
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
                onChange={(e) =>
                  updateField("connection.status", e.target.value)
                }
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
          )}

          {/* Email Data */}
          {informationStatus == "email" && step != "reply" && (
            <>
              <section className="border rounded p-4">
                <h2 className="font-semibold mb-2">📧​ Email</h2>

                {/* Requester */}
                <div>
                  <label className="text-sm font-medium block mb-1">
                    🙋 Requester
                  </label>
                  <input
                    className="border p-2 w-full rounded"
                    placeholder="Requester name or email"
                    value={analysis.email?.requester || ""}
                    onChange={(e) =>
                      updateField("email.requester", e.target.value)
                    }
                  />
                </div>

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
                    onChange={(e) =>
                      updateField("email.solved", e.target.checked)
                    }
                  />{" "}
                  Yes
                </label>

                <label className="block mb-2">
                  <input
                    type="radio"
                    checked={analysis.email.solved === false}
                    onChange={(e) =>
                      updateField("email.solved", e.target.checked)
                    }
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
                {/* Graphite validation team message */}
                <div>
                  <label className="text-sm font-medium block mb-1">
                    🛡️ Graphite Validation Team Message
                  </label>
                  <textarea
                    className="border p-2 w-full h-28 rounded"
                    placeholder="Internal message for the Graphite validation team..."
                    value={
                      analysis.email?.graphite_validation_team_message || ""
                    }
                    onChange={(e) =>
                      updateField(
                        "email.graphite_validation_team_message",
                        e.target.value,
                      )
                    }
                  />
                </div>
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
            </>
          )}

          {/* Edit information */}
          {informationStatus == "edit" && step != "reply" && (
            <section className="border rounded p-4">
              <h2 className="font-semibold mb-2">
                🖼️ Edit the case summary and add more context
              </h2>

              <textarea
                className="border p-2 w-full h-28"
                placeholder="Describe the error or reference any screenshot provided..."
                value={analysis.generated_problem_description || ""}
                onChange={(e) =>
                  updateField("generated_problem_description", e.target.value)
                }
              />
              {/* Extra information */}
              <div>
                <label className="text-sm font-medium block mb-1">
                  📝 Additional Information
                </label>
                <textarea
                  className="border p-2 w-full h-24 rounded"
                  placeholder="Any additional context, attempts made, or notes..."
                  value={analysis.extra_information || ""}
                  onChange={(e) =>
                    updateField("extra_information", e.target.value)
                  }
                />
              </div>
              {/* Detected issue */}
              <div>
                <label className="text-sm font-medium block mb-1">
                  🔍 Detected Issue
                </label>
                <textarea
                  className="border p-2 w-full h-24 rounded"
                  placeholder="What is the core issue detected?"
                  value={analysis.detected_issue || ""}
                  onChange={(e) =>
                    updateField("detected_issue", e.target.value)
                  }
                />
              </div>
              {/* Resolution */}
              <div>
                <label className="text-sm font-medium block mb-1">
                  ✅ Proposed Resolution
                </label>
                <textarea
                  className="border p-2 w-full h-24 rounded"
                  placeholder="Describe the proposed or final resolution..."
                  value={analysis.resolution || ""}
                  onChange={(e) => updateField("resolution", e.target.value)}
                />
              </div>
            </section>
          )}

          {/* --------------------- GENERATED REPLY MODAL --------------------- */}
          {generatedReply && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              {/* Overlay */}
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setGeneratedReply(null)}
              />

              {/* Modal */}
              <div className="relative z-10 w-full max-w-3xl bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-semibold text-lg">
                    ✉️ Generated Support Reply
                  </h2>

                  <button
                    onClick={() => setGeneratedReply(null)}
                    className="text-gray-500 hover:text-gray-700 text-xl"
                  >
                    ✕
                  </button>
                </div>

                <textarea
                  className="w-full h-64 border p-3 rounded resize-none"
                  value={generatedReply}
                  readOnly
                />

                <div className="flex justify-end mt-4 gap-2">
                  <button
                    onClick={() => setGeneratedReply(null)}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/*---------------------GENERATED REPLY-------------------------*/}
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
