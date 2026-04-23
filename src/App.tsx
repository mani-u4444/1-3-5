import { useState, useEffect } from "react";
import { useConcepts } from "./hooks/useConcepts";
import { getApiUrl, setApiUrl } from "./api";

export default function App() {
  const {
    todaysConcepts,
    recapConcepts,
    completedConcepts,
    addConcept,
    markRecapDone,
    deleteConcept,
    formatDate,
    todayStr,
    loading,
    syncing,
    error,
    refresh,
    apiEnabled,
  } = useConcepts();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activeTab, setActiveTab] = useState<"today" | "recap" | "completed">("today");
  const [showSettings, setShowSettings] = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState(getApiUrl());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setApiUrlInput(getApiUrl());
  }, [showSettings]);

  const handleAdd = () => {
    if (!title.trim()) return;
    addConcept(title.trim(), description.trim());
    setTitle("");
    setDescription("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleSaveSettings = () => {
    setApiUrl(apiUrlInput.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setShowSettings(false);
      refresh();
    }, 800);
  };

  const handleDisconnect = () => {
    setApiUrl("");
    setApiUrlInput("");
    setShowSettings(false);
    refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-white">
      {/* Header */}
      <header className="border-b border-slate-200/60 bg-white/70 backdrop-blur-xl sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-indigo-200">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">StudyPrep</h1>
              <p className="text-xs text-slate-500">Spaced Repetition Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Sync / Connection indicator */}
            <div className="hidden sm:flex items-center gap-2">
              {syncing && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                  <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="50" strokeLinecap="round" />
                  </svg>
                  Syncing
                </span>
              )}
              {apiEnabled && !syncing && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Connected
                </span>
              )}
              {!apiEnabled && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                  Local
                </span>
              )}
            </div>

            {/* Settings gear */}
            <button
              onClick={() => setShowSettings(true)}
              className="rounded-lg p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Settings"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>

            <div className="text-right">
              <p className="text-sm font-medium text-slate-700">{formatDate(todayStr())}</p>
              <p className="text-xs text-slate-400">Today</p>
            </div>
          </div>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="mx-auto max-w-4xl px-4 pt-4">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button
              onClick={() => refresh()}
              className="text-xs font-medium text-red-600 hover:text-red-800 underline shrink-0 ml-3"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex-1 py-6 rounded-lg bg-slate-200 animate-pulse" />
              ))}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
              <div className="h-5 w-48 bg-slate-200 rounded animate-pulse" />
              <div className="h-10 bg-slate-200 rounded-xl animate-pulse" />
              <div className="h-20 bg-slate-200 rounded-xl animate-pulse" />
              <div className="h-12 bg-slate-200 rounded-xl animate-pulse" />
            </div>
          </div>
        )}

        {/* Main content */}
        {!loading && (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
              {(["today", "recap", "completed"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab === "today" && `📝 Today (${todaysConcepts.length})`}
                  {tab === "recap" && `🔄 Recap (${recapConcepts.length})`}
                  {tab === "completed" && `✅ Completed (${completedConcepts.length})`}
                </button>
              ))}
            </div>

            {/* Section 1: Today's Input */}
            {activeTab === "today" && (
              <section className="space-y-5">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                  <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600 text-sm">
                      📝
                    </span>
                    What did you learn today?
                  </h2>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Concept title (e.g., Binary Search Trees)"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all"
                    />
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.shiftKey) return;
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAdd();
                        }
                      }}
                      placeholder="Add notes or description (optional)..."
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all resize-none"
                    />
                    <button
                      onClick={handleAdd}
                      disabled={!title.trim()}
                      className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                    >
                      + Add Concept
                    </button>
                  </div>
                </div>

                {/* Today's entries */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                    Learned Today
                  </h3>
                  {todaysConcepts.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white/50 p-8 text-center">
                      <p className="text-sm text-slate-400">No concepts added yet today. Start learning! 🚀</p>
                    </div>
                  ) : (
                    todaysConcepts.map((concept) => (
                      <ConceptCard
                        key={concept.id}
                        concept={concept}
                        formatDate={formatDate}
                        onDelete={deleteConcept}
                        showRecapBadge={false}
                      />
                    ))
                  )}
                </div>
              </section>
            )}

            {/* Section 2: Recap */}
            {activeTab === "recap" && (
              <section className="space-y-5">
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-5">
                  <h2 className="text-base font-semibold text-amber-800 mb-1 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-200 text-amber-700 text-sm">
                      🔄
                    </span>
                    Recap Queue
                  </h2>
                  <p className="text-xs text-amber-600 ml-9">
                    Review concepts from 3 and 7 days ago to strengthen your memory.
                  </p>
                </div>

                {recapConcepts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white/50 p-10 text-center">
                    <div className="text-4xl mb-3">🎉</div>
                    <p className="text-sm font-medium text-slate-500">All caught up!</p>
                    <p className="text-xs text-slate-400 mt-1">Nothing to review right now. Keep learning!</p>
                  </div>
                ) : (
                  <RecapList
                    recapConcepts={recapConcepts}
                    todayStr={todayStr()}
                    formatDate={formatDate}
                    onDelete={deleteConcept}
                    onRecapDone={markRecapDone}
                  />
                )}
              </section>
            )}

            {/* Section 3: Completed */}
            {activeTab === "completed" && (
              <section className="space-y-5">
                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-5">
                  <h2 className="text-base font-semibold text-emerald-800 mb-1 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-200 text-emerald-700 text-sm">
                      ✅
                    </span>
                    Completed
                  </h2>
                  <p className="text-xs text-emerald-600 ml-9">
                    Concepts that have passed both the 3-day and 7-day review milestones.
                  </p>
                </div>

                {completedConcepts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white/50 p-10 text-center">
                    <div className="text-4xl mb-3">📚</div>
                    <p className="text-sm font-medium text-slate-500">No completed concepts yet.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Concepts will appear here after completing both recaps.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {completedConcepts.map((concept) => (
                      <ConceptCard
                        key={concept.id}
                        concept={concept}
                        formatDate={formatDate}
                        onDelete={deleteConcept}
                        showRecapBadge={false}
                        isCompleted
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">⚙️ Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Google Sheets API URL
                </label>
                <input
                  type="url"
                  value={apiUrlInput}
                  onChange={(e) => setApiUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all"
                />
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  Deploy the <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">gas-code.js</code> script from your Google Sheet via{" "}
                  <strong>Extensions → Apps Script → Deploy → Web App</strong>.{" "}
                  Make sure to set access to <strong>"Anyone"</strong>.
                </p>
              </div>

              {apiEnabled && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                  Currently connected. To switch, paste a new URL and save. To go back to local-only, disconnect.
                </div>
              )}

              {!apiEnabled && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                  No API configured. Data is stored locally in your browser.
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSaveSettings}
                disabled={!apiUrlInput.trim() || saved}
                className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {saved ? "✅ Saved!" : "Save & Connect"}
              </button>
              {apiEnabled && (
                <button
                  onClick={handleDisconnect}
                  className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Concept Card Component ─── */
function ConceptCard({
  concept,
  formatDate,
  onDelete,
  onRecapDone,
  showRecapBadge,
  recapLabel,
  isCompleted,
}: {
  concept: { id: string; title: string; description: string; learnedDate: string; recapDay3Done: boolean; recapDay7Done: boolean };
  formatDate: (d: string) => string;
  onDelete: (id: string) => void;
  onRecapDone?: (id: string) => void;
  showRecapBadge: boolean;
  recapLabel?: string;
  isCompleted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md group ${
        isCompleted
          ? "border-emerald-200/80"
          : showRecapBadge
          ? "border-amber-200/80"
          : "border-slate-200/80"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-slate-800 text-sm truncate">{concept.title}</h4>
            {showRecapBadge && recapLabel && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                <span className="h-1 w-1 rounded-full bg-amber-500" />
                {recapLabel}
              </span>
            )}
            {isCompleted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                ✅ Done
              </span>
            )}
          </div>
          {concept.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{concept.description}</p>
          )}
          <p className="text-xs text-slate-400 mt-2">
            Learned on {formatDate(concept.learnedDate)}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {onRecapDone && (
            <button
              onClick={() => onRecapDone(concept.id)}
              className="flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors border border-amber-200"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Done
            </button>
          )}
          <button
            onClick={() => onDelete(concept.id)}
            className="rounded-lg p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
            title="Delete"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Recap List Component ─── */
function RecapList({
  recapConcepts,
  todayStr,
  formatDate,
  onDelete,
  onRecapDone,
}: {
  recapConcepts: { id: string; title: string; description: string; learnedDate: string; recapDay3Done: boolean; recapDay7Done: boolean }[];
  todayStr: string;
  formatDate: (d: string) => string;
  onDelete: (id: string) => void;
  onRecapDone: (id: string) => void;
}) {
  const day3Recaps = recapConcepts.filter((c) => {
    const learned = new Date(c.learnedDate + "T00:00:00");
    const today = new Date(todayStr + "T00:00:00");
    const diffDays = Math.floor((today.getTime() - learned.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 3 && !c.recapDay3Done;
  });

  const day7Recaps = recapConcepts.filter((c) => {
    const learned = new Date(c.learnedDate + "T00:00:00");
    const today = new Date(todayStr + "T00:00:00");
    const diffDays = Math.floor((today.getTime() - learned.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 7 && !c.recapDay7Done;
  });

  return (
    <div className="space-y-6">
      {day3Recaps.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-amber-600 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Day 3 Review — First Recap
          </h3>
          {day3Recaps.map((concept) => (
            <ConceptCard
              key={concept.id}
              concept={concept}
              formatDate={formatDate}
              onDelete={onDelete}
              onRecapDone={onRecapDone}
              showRecapBadge={true}
              recapLabel="Day 3"
            />
          ))}
        </div>
      )}

      {day7Recaps.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-amber-600 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Day 7 Review — Second Recap
          </h3>
          {day7Recaps.map((concept) => (
            <ConceptCard
              key={concept.id}
              concept={concept}
              formatDate={formatDate}
              onDelete={onDelete}
              onRecapDone={onRecapDone}
              showRecapBadge={true}
              recapLabel="Day 7"
            />
          ))}
        </div>
      )}
    </div>
  );
}
