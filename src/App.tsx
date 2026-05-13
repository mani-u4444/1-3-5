import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Brain,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Cloud,
  Eye,
  Flame,
  GraduationCap,
  HardDrive,
  Loader2,
  Moon,
  Pencil,
  Percent,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  StickyNote,
  Sun,
  Trash2,
  Trophy,
  TrendingUp,
  X,
} from 'lucide-react';
import type { Concept, ImageAttachment, ReviewBucket } from './lib/types';
import { forgotPasswordCentral, loginCentral, signupCentral } from './lib/auth';
import { APPS_SCRIPT, getUrl, ping as pingSheets } from './lib/sheets';
import { ageInDays, daysAgo, prettyDate, toInputDate, today } from './lib/dates';
import { demoData } from './lib/demo';
import { useConceptStore } from './lib/useConceptStore';

type Page = 'dashboard' | 'library' | 'settings' | 'setup';

function bucketOf(concept: Concept): ReviewBucket {
  const age = ageInDays(concept.dateAdded);
  if (concept.reviewedDay3 && concept.reviewedDay7) return 'complete';
  if (!concept.reviewedDay3) return age >= 3 ? 'day3' : 'less3';
  return age >= 7 ? 'day7' : 'waiting7';
}

function bucketLabel(bucket: ReviewBucket) {
  return {
    less3: '< 3 days',
    day3: '3-day section',
    waiting7: 'Waiting Day 7',
    day7: '7-day section',
    complete: 'Complete',
  }[bucket];
}

function sortNewest(a: Concept, b: Concept) {
  return (b.dateAdded || '').localeCompare(a.dateAdded || '');
}

function noteBlock(notes: string) {
  if (!notes) return <p className="text-sm italic text-gray-400">No notes added.</p>;
  return (
    <div className="max-h-96 overflow-y-auto rounded-2xl bg-gray-50 p-4">
      <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">{notes}</p>
    </div>
  );
}

function readImageFiles(files: FileList | null): Promise<ImageAttachment[]> {
  if (!files?.length) return Promise.resolve([]);
  const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
  return Promise.all(imageFiles.map(file => new Promise<ImageAttachment>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSide = 1200;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve({ id: crypto.randomUUID(), name: file.name, dataUrl: String(reader.result || '') });
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ id: crypto.randomUUID(), name: file.name, dataUrl: canvas.toDataURL('image/jpeg', 0.78) });
      };
      img.onerror = () => resolve({ id: crypto.randomUUID(), name: file.name, dataUrl: String(reader.result || '') });
      img.src = String(reader.result || '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  })));
}

function ImageInput({ onAdd }: { onAdd: (images: ImageAttachment[]) => void }) {
  const [inputKey, setInputKey] = useState(0);

  return (
    <input
      key={inputKey}
      type="file"
      accept="image/*"
      multiple
      onChange={async event => {
        const uploaded = await readImageFiles(event.currentTarget.files);
        if (uploaded.length) onAdd(uploaded);
        setInputKey(key => key + 1);
      }}
      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm"
    />
  );
}

function ImageThumbs({ images, onRemove }: { images: ImageAttachment[]; onRemove: (id: string) => void }) {
  if (images.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-bold text-gray-400">{images.length} image{images.length === 1 ? '' : 's'} attached</p>
      <div className="grid grid-cols-3 gap-2">
        {images.map(image => (
          <div key={image.id} className="relative overflow-hidden rounded-xl border bg-white">
            <img src={image.dataUrl} alt={image.name} className="h-20 w-full object-cover" />
            <button type="button" onClick={() => onRemove(image.id)} className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-red-500 shadow-sm">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function NoteViewer({ concept, onClose }: { concept: Concept; onClose: () => void }) {
  const bucket = bucketOf(concept);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 p-4">
      <div className="mx-auto flex h-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-start gap-4 border-b border-gray-100 px-5 py-4">
          <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
            <Eye className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold text-gray-900">{concept.title || '(untitled)'}</h2>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
              <span>Learned {prettyDate(concept.dateAdded)}</span>
              <span>•</span>
              <span>{ageInDays(concept.dateAdded)} days ago</span>
              <span>•</span>
              <span>{bucketLabel(bucket)}</span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Exit viewer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {concept.images?.length > 0 && (
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              {concept.images.map(image => (
                <figure key={image.id} className="overflow-hidden rounded-3xl border border-gray-100 bg-gray-50">
                  <img src={image.dataUrl} alt={image.name} className="max-h-[520px] w-full object-contain" />
                  <figcaption className="border-t border-gray-100 px-3 py-2 text-xs text-gray-500">{image.name}</figcaption>
                </figure>
              ))}
            </div>
          )}
          {concept.notes ? (
            <article className="prose prose-sm max-w-none whitespace-pre-wrap leading-7 text-gray-800">
              {concept.notes}
            </article>
          ) : (
            <div className="rounded-3xl bg-gray-50 p-8 text-center text-gray-400">No detailed notes added for this concept.</div>
          )}
        </div>
        <div className="border-t border-gray-100 px-5 py-4">
          <button onClick={onClose} className="w-full rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-indigo-700">
            Exit Viewer
          </button>
        </div>
      </div>
    </div>
  );
}

function Pill({ children, tone = 'gray' }: { children: React.ReactNode; tone?: 'gray' | 'indigo' | 'amber' | 'orange' | 'green' }) {
  const tones = {
    gray: 'border-gray-200 bg-gray-50 text-gray-600',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    orange: 'border-orange-200 bg-orange-50 text-orange-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${tones[tone]}`}>{children}</span>;
}

function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('spacedmind-theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('spacedmind-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <button
      onClick={() => setDarkMode(value => !value)}
      className="fixed right-16 top-4 z-50 rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-sm hover:bg-indigo-50"
      title="Toggle dark mode"
    >
      {darkMode ? <Sun className="mr-1 inline h-3.5 w-3.5 text-amber-400" /> : <Moon className="mr-1 inline h-3.5 w-3.5" />}
      {darkMode ? 'Light' : 'Dark'}
    </button>
  );
}

function ConceptCard({ concept, onEdit, onRemove }: {
  concept: Concept;
  onEdit: (id: string, title: string, notes: string, dateAdded?: string, images?: ImageAttachment[]) => void;
  onRemove: (id: string) => void;
}) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(concept.title);
  const [notes, setNotes] = useState(concept.notes);
  const [images, setImages] = useState<ImageAttachment[]>(concept.images ?? []);
  const [dateAdded, setDateAdded] = useState(toInputDate(concept.dateAdded || today()));
  const bucket = bucketOf(concept);

  const save = () => {
    if (!title.trim()) return;
    onEdit(concept.id, title.trim(), notes, dateAdded, images);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-4">
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-indigo-500">Title</label>
          <input value={title} onChange={event => setTitle(event.target.value)} className="w-full rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          <label className="block text-xs font-bold uppercase tracking-wider text-indigo-500">Learned date</label>
          <input type="date" value={dateAdded} onChange={event => setDateAdded(event.target.value)} className="w-full rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          <label className="block text-xs font-bold uppercase tracking-wider text-indigo-500">Notes</label>
          <textarea value={notes} onChange={event => setNotes(event.target.value)} rows={8} className="min-h-40 w-full resize-y rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          <label className="block text-xs font-bold uppercase tracking-wider text-indigo-500">Images</label>
          <ImageInput onAdd={uploaded => setImages(prev => [...prev, ...uploaded])} />
          <ImageThumbs images={images} onRemove={id => setImages(prev => prev.filter(item => item.id !== id))} />
          <p className="rounded-2xl bg-white p-3 text-xs text-indigo-600">Changing the learned date resets review progress, so the concept returns to the correct section.</p>
          <div className="flex gap-2">
            <button onClick={save} disabled={!title.trim()} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:bg-gray-300"><Check className="h-4 w-4" />Save</button>
            <button onClick={() => setEditing(false)} className="flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {viewerOpen && <NoteViewer concept={concept} onClose={() => setViewerOpen(false)} />}
      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
        <button onClick={() => setViewerOpen(true)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-gray-850">{concept.title || '(untitled)'}</p>
            <p className="mt-0.5 text-xs text-gray-400">Learned {prettyDate(concept.dateAdded)} · {ageInDays(concept.dateAdded)} days ago</p>
          </div>
          <Pill tone={bucket === 'complete' ? 'green' : bucket === 'day7' ? 'orange' : bucket === 'day3' ? 'amber' : bucket === 'waiting7' ? 'indigo' : 'gray'}>{bucketLabel(bucket)}</Pill>
          {concept.notes && <StickyNote className="h-4 w-4 flex-none text-indigo-400" />}
        </button>
        {notesExpanded && (
          <button onClick={() => setViewerOpen(true)} className="w-full border-t border-gray-100 px-4 py-3 text-left hover:bg-gray-50">
            <p className="line-clamp-4 whitespace-pre-wrap text-xs leading-5 text-gray-600">
              {concept.notes || 'No notes added. Click to open the viewer.'}
            </p>
          </button>
        )}
        <div className="flex flex-wrap gap-2 border-t border-gray-100 px-4 py-3">
          <button onClick={() => setNotesExpanded(!notesExpanded)} className="flex items-center gap-1.5 rounded-xl bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100">{notesExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}{notesExpanded ? 'Hide Notes' : 'Show Notes'}</button>
          <button onClick={() => setViewerOpen(true)} className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"><Eye className="h-3.5 w-3.5" />View</button>
          <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"><Pencil className="h-3.5 w-3.5" />Edit</button>
          <button onClick={() => onRemove(concept.id)} className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100"><Trash2 className="h-3.5 w-3.5" />Remove</button>
        </div>
      </div>
    </>
  );
}

function AddPanel({ items, add, edit, remove }: {
  items: Concept[];
  add: (title: string, notes: string, dateAdded: string, images?: ImageAttachment[]) => void;
  edit: (id: string, title: string, notes: string, dateAdded?: string, images?: ImageAttachment[]) => void;
  remove: (id: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [dateAdded, setDateAdded] = useState(today());
  const [savedCollapsed, setSavedCollapsed] = useState(true);
  const [savedPage, setSavedPage] = useState(0);
  const savedPageSize = 5;
  const sortedInputs = [...items].sort(sortNewest);
  const maxSavedPage = Math.max(0, Math.ceil(sortedInputs.length / savedPageSize) - 1);
  const currentSavedPage = Math.min(savedPage, maxSavedPage);
  const pagedInputs = sortedInputs.slice(currentSavedPage * savedPageSize, currentSavedPage * savedPageSize + savedPageSize);

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    add(title.trim(), notes, dateAdded || today(), images);
    setTitle('');
    setNotes('');
    setImages([]);
  };

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-indigo-100 bg-white shadow-lg shadow-indigo-100/60">
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 px-5 py-5 text-white">
        <div className="flex items-center gap-3"><div className="rounded-2xl bg-white/20 p-2"><Sparkles className="h-5 w-5" /></div><div><h2 className="font-extrabold">Capture Learning</h2><p className="text-xs text-indigo-100">Input is always visible below</p></div></div>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <form onSubmit={save} className="space-y-3">
          <input value={title} onChange={event => setTitle(event.target.value)} placeholder="Short concept title" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => setDateAdded(today())} className="rounded-xl bg-gray-100 px-2 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200">Today</button>
            <button type="button" onClick={() => setDateAdded(daysAgo(3))} className="rounded-xl bg-amber-100 px-2 py-2 text-xs font-bold text-amber-700 hover:bg-amber-200">3 days ago</button>
            <button type="button" onClick={() => setDateAdded(daysAgo(7))} className="rounded-xl bg-orange-100 px-2 py-2 text-xs font-bold text-orange-700 hover:bg-orange-200">7 days ago</button>
          </div>
          <input type="date" value={dateAdded} onChange={event => setDateAdded(event.target.value)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          <textarea value={notes} onChange={event => setNotes(event.target.value)} rows={7} placeholder="Detailed notes for revision. Large notes are supported." className="min-h-40 w-full resize-y rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          <ImageInput onAdd={uploaded => setImages(prev => [...prev, ...uploaded])} />
          <ImageThumbs images={images} onRemove={id => setImages(prev => prev.filter(item => item.id !== id))} />
          <button disabled={!title.trim()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-indigo-700 disabled:bg-gray-300"><Plus className="h-4 w-4" />Save Concept</button>
        </form>
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-gray-400">Saved Inputs</p>
              <p className="text-[11px] text-gray-400">{savedCollapsed ? `${items.length} saved · collapsed` : `Showing ${pagedInputs.length ? currentSavedPage * savedPageSize + 1 : 0}-${Math.min((currentSavedPage + 1) * savedPageSize, sortedInputs.length)} of ${items.length}`}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSavedCollapsed(!savedCollapsed)}
                className="rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
              >
                {savedCollapsed ? 'Maximize' : 'Minimize'}
              </button>
              {!savedCollapsed && items.length > savedPageSize && (
                <>
                <button
                  type="button"
                  onClick={() => setSavedPage(page => Math.max(0, page - 1))}
                  disabled={currentSavedPage === 0}
                  className="rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-gray-100 disabled:text-gray-300"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setSavedPage(page => Math.min(maxSavedPage, page + 1))}
                  disabled={currentSavedPage >= maxSavedPage}
                  className="rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-gray-100 disabled:text-gray-300"
                >
                  Next
                </button>
                </>
              )}
            </div>
          </div>
          {savedCollapsed ? (
            <button
              type="button"
              onClick={() => setSavedCollapsed(false)}
              className="w-full rounded-3xl border border-dashed border-indigo-200 bg-indigo-50/60 p-5 text-center text-sm font-bold text-indigo-600 hover:bg-indigo-50"
            >
              Show saved inputs ({items.length})
            </button>
          ) : pagedInputs.length === 0 ? <div className="rounded-3xl bg-indigo-50 p-5 text-center text-sm text-indigo-500">No saved inputs yet.</div> : <div className="space-y-2">{pagedInputs.map(item => <ConceptCard key={item.id} concept={item} onEdit={edit} onRemove={remove} />)}</div>}
        </div>
      </div>
    </section>
  );
}

function ReviewPanel({ items, markReview }: { items: Concept[]; markReview: (id: string, day: 3 | 7) => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [viewerConcept, setViewerConcept] = useState<Concept | null>(null);
  const day3 = items.filter(item => bucketOf(item) === 'day3').sort(sortNewest);
  const day7 = items.filter(item => bucketOf(item) === 'day7').sort(sortNewest);

  const row = (item: Concept, day: 3 | 7) => (
    <div key={item.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => markReview(item.id, day)} className="text-gray-300 transition hover:scale-110 hover:text-green-500"><CheckCircle2 className="h-6 w-6" /></button>
        <button onClick={() => setViewerConcept(item)} className="min-w-0 flex-1 text-left"><p className="truncate text-sm font-bold text-gray-800">{item.title}</p><p className="text-xs text-gray-400">Learned {prettyDate(item.dateAdded)} · {ageInDays(item.dateAdded)} days ago</p></button>
        {item.notes && <StickyNote className="h-4 w-4 text-amber-400" />}
        <button onClick={() => setViewerConcept(item)} className="rounded-xl bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"><Eye className="inline h-3.5 w-3.5" /> View</button>
        <button onClick={() => setOpenId(openId === item.id ? null : item.id)} className="rounded-xl p-1.5 hover:bg-gray-100">{openId === item.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}</button>
      </div>
      {openId === item.id && (
        <button onClick={() => setViewerConcept(item)} className="w-full border-t border-gray-100 px-4 pb-4 pt-3 text-left hover:bg-gray-50">
          <p className="line-clamp-4 whitespace-pre-wrap text-xs leading-5 text-gray-600">{item.notes || 'No notes added.'}</p>
        </button>
      )}
    </div>
  );

  const block = (title: string, description: string, day: 3 | 7, list: Concept[]) => (
    <div className="overflow-hidden rounded-3xl border border-amber-100">
      <div className="bg-amber-50 px-4 py-3"><div className="flex items-center justify-between"><div><h3 className="text-sm font-extrabold text-gray-800">{title}</h3><p className="text-xs text-gray-500">{description}</p></div><Pill tone={day === 3 ? 'amber' : 'orange'}>{list.length}</Pill></div></div>
      <div className="space-y-2 p-3">{list.length ? list.map(item => row(item, day)) : <p className="py-5 text-center text-xs text-gray-400">Nothing pending</p>}</div>
    </div>
  );

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-amber-100 bg-white shadow-lg shadow-amber-100/60">
      {viewerConcept && <NoteViewer concept={viewerConcept} onClose={() => setViewerConcept(null)} />}
      <div className="bg-gradient-to-br from-amber-500 to-orange-500 px-5 py-5 text-white"><div className="flex items-center gap-3"><div className="rounded-2xl bg-white/20 p-2"><RotateCcw className="h-5 w-5" /></div><div><h2 className="font-extrabold">Review Queue</h2><p className="text-xs text-amber-100">Day 3 before Day 7, always</p></div></div></div>
      <div className="flex-1 space-y-4 overflow-y-auto p-5">{block('3-Day Review', 'Ticking hides it until Day 7', 3, day3)}{block('7-Day Review', 'Ticking sends it to Completed', 7, day7)}</div>
    </section>
  );
}

function ProgressPanel({ items, clear }: { items: Concept[]; clear: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const mastered = items.filter(item => bucketOf(item) === 'complete').sort(sortNewest);
  const waiting = items.filter(item => bucketOf(item) === 'waiting7');
  const percent = items.length ? Math.round((mastered.length / items.length) * 100) : 0;
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-lg shadow-emerald-100/60">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-600 px-5 py-5 text-white"><div className="flex items-center gap-3"><div className="rounded-2xl bg-white/20 p-2"><Trophy className="h-5 w-5" /></div><div><h2 className="font-extrabold">Progress</h2><p className="text-xs text-emerald-100">Completed concepts</p></div></div></div>
      <div className="border-b border-emerald-100 bg-emerald-50/60 p-5"><div className="grid grid-cols-3 gap-3 text-center"><div><p className="text-2xl font-extrabold text-gray-800">{items.length}</p><p className="text-xs text-gray-400">Total</p></div><div><p className="text-2xl font-extrabold text-amber-600">{waiting.length}</p><p className="text-xs text-gray-400">Waiting</p></div><div><p className="text-2xl font-extrabold text-emerald-600">{mastered.length}</p><p className="text-xs text-gray-400">Done</p></div></div><div className="mt-4 h-2 rounded-full bg-gray-200"><div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${percent}%` }} /></div></div>
      <div className="flex-1 overflow-y-auto p-5">{mastered.length === 0 ? <div className="rounded-3xl bg-emerald-50 p-5 text-center text-sm text-emerald-500">Complete Day 3 and Day 7 to see concepts here.</div> : <div className="space-y-2">{mastered.map(item => <div key={item.id} className="overflow-hidden rounded-2xl border border-emerald-100 bg-white"><button onClick={() => setOpenId(openId === item.id ? null : item.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-emerald-50"><Check className="h-4 w-4 text-emerald-500" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-gray-800">{item.title}</p><p className="text-xs text-gray-400">Learned {prettyDate(item.dateAdded)}</p></div>{openId === item.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}</button>{openId === item.id && <div className="border-t border-emerald-100 px-4 pb-4 pt-3">{noteBlock(item.notes)}</div>}</div>)}</div>}{items.length > 0 && <button onClick={clear} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-2 text-sm font-bold text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" />Clear All</button>}</div>
    </section>
  );
}

function ProgressDashboard({ items }: { items: Concept[] }) {
  const [collapsed, setCollapsed] = useState(true);
  const [range, setRange] = useState<7 | 15 | 30 | 90>(7);
  const [graphType, setGraphType] = useState<'bar' | 'line'>('bar');
  const total = items.length;
  const mastered = items.filter(item => bucketOf(item) === 'complete').length;
  const day3Done = items.filter(item => item.reviewedDay3).length;
  const day7Done = items.filter(item => item.reviewedDay7).length;
  const uniqueDays = Array.from(new Set(items.map(item => item.dateAdded).filter(Boolean)));
  const activeDays = uniqueDays.length;
  const thisWeek = items.filter(item => ageInDays(item.dateAdded) >= 0 && ageInDays(item.dateAdded) <= 6).length;
  const mastery = total ? Math.round((mastered / total) * 100) : 0;
  const overall = total ? Math.round(((day3Done + day7Done) / (total * 2)) * 100) : 0;

  const activeSet = new Set(uniqueDays);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const date = daysAgo(i);
    if (!activeSet.has(date)) break;
    streak += 1;
  }

  const activityBars = Array.from({ length: range }, (_, index) => {
    const date = daysAgo(range - 1 - index);
    const count = items.filter(item => item.dateAdded === date).length;
    return { date, count };
  });
  const maxCount = Math.max(1, ...activityBars.map(day => day.count));
  const midpoint = Math.floor(activityBars.length / 2);
  const firstHalf = activityBars.slice(0, midpoint).reduce((sum, day) => sum + day.count, 0);
  const secondHalf = activityBars.slice(midpoint).reduce((sum, day) => sum + day.count, 0);
  const trend = secondHalf - firstHalf;
  const linePoints = activityBars.map((day, index) => {
    const x = activityBars.length === 1 ? 0 : (index / (activityBars.length - 1)) * 100;
    const y = 100 - (day.count / maxCount) * 88;
    return { ...day, x, y };
  });
  const linePath = linePoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');

  const currentMonth = new Date();
  const currentYear = currentMonth.getFullYear();
  const currentMonthIndex = currentMonth.getMonth();
  const monthLabel = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
  const firstWeekday = new Date(currentYear, currentMonthIndex, 1).getDay();
  const toDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const monthCells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(currentYear, currentMonthIndex, index + 1);
      const dateKey = toDateKey(date);
      const count = items.filter(item => item.dateAdded === dateKey).length;
      return { date: dateKey, day: index + 1, count };
    }),
  ];
  const maxHeat = Math.max(1, ...monthCells.filter(Boolean).map(day => day!.count));
  const heatColor = (count: number) => {
    if (count === 0) return 'bg-gray-100 border-gray-200';
    const ratio = count / maxHeat;
    if (ratio >= 0.75) return 'bg-emerald-600 border-emerald-600';
    if (ratio >= 0.5) return 'bg-emerald-400 border-emerald-400';
    if (ratio >= 0.25) return 'bg-emerald-300 border-emerald-300';
    return 'bg-emerald-200 border-emerald-200';
  };

  const Stat = ({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string | number; sub: string; tone: string }) => (
    <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur">
      <div className="flex items-start gap-3">
        <div className={`rounded-2xl p-2 ${tone}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-extrabold text-gray-900">{value}</p>
          <p className="mt-0.5 text-xs text-gray-500">{sub}</p>
        </div>
      </div>
    </div>
  );

  return (
    <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-lg shadow-emerald-100/60">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 px-5 py-5 text-white">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/20 p-2">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold">Progress Dashboard</h3>
                <p className="text-sm text-emerald-100">Consistency, review completion, and learning momentum.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold text-white"><TrendingUp className="mr-1 h-3.5 w-3.5" />{trend >= 0 ? `+${trend}` : trend} vs early week</span>
              <ThemeToggle />
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm hover:bg-emerald-50"
              >
                {collapsed ? 'Maximize' : 'Minimize'}
              </button>
            </div>
          </div>
        </div>
        <div className="p-5">
        {collapsed ? (
          <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-indigo-100 bg-indigo-50/80 p-3 text-xs font-bold text-indigo-700">
            <span className="rounded-full bg-white px-3 py-1.5 shadow-sm">Streak: {streak}d</span>
            <span className="rounded-full bg-white px-3 py-1.5 shadow-sm">Mastery: {mastery}%</span>
            <span className="rounded-full bg-white px-3 py-1.5 shadow-sm">Overall: {overall}%</span>
            <span className="rounded-full bg-white px-3 py-1.5 shadow-sm">This week: {thisWeek}</span>
          </div>
        ) : (
          <>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Stat icon={<Flame className="h-5 w-5 text-orange-600" />} label="Current streak" value={`${streak}d`} sub="Consecutive active days" tone="bg-orange-50" />
          <Stat icon={<Percent className="h-5 w-5 text-emerald-600" />} label="Mastery" value={`${mastery}%`} sub={`${mastered}/${total || 0} mastered`} tone="bg-emerald-50" />
          <Stat icon={<CalendarCheck className="h-5 w-5 text-indigo-600" />} label="Active days" value={activeDays} sub="Unique study dates" tone="bg-indigo-50" />
          <Stat icon={<BarChart3 className="h-5 w-5 text-amber-600" />} label="This week" value={thisWeek} sub="Concepts learned" tone="bg-amber-50" />
          <Stat icon={<Trophy className="h-5 w-5 text-violet-600" />} label="Overall progress" value={`${overall}%`} sub="Day 3 + Day 7 reviews" tone="bg-violet-50" />
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-white bg-white/80 p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Activity graph</p>
                <p className="text-xs text-gray-400">Concepts learned per day</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['bar', 'line'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setGraphType(type)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize transition ${graphType === type ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {type}
                  </button>
                ))}
                {[7, 15, 30, 90].map(value => (
                  <button
                    key={value}
                    onClick={() => setRange(value as 7 | 15 | 30 | 90)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${range === value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {value}d
                  </button>
                ))}
              </div>
            </div>

            {graphType === 'bar' ? (
              <div className="overflow-x-auto pb-2">
                <div className="flex h-32 min-w-max items-end gap-1.5">
                  {activityBars.map(day => (
                    <div key={day.date} className="flex w-7 flex-col items-center gap-2 sm:w-8">
                      <div className="flex h-20 w-full items-end rounded-lg bg-gray-100 px-1">
                        <div className="w-full rounded-md bg-indigo-600 transition-all" style={{ height: `${Math.max(6, (day.count / maxCount) * 100)}%` }} />
                      </div>
                      <p className="text-[10px] font-bold text-gray-500">{day.count}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto pb-2">
                <div className="min-w-[420px] rounded-2xl bg-gray-50 p-3">
                  <svg viewBox="0 0 100 100" className="h-32 w-full overflow-visible" preserveAspectRatio="none">
                    <path d="M 0 100 H 100" stroke="#e5e7eb" strokeWidth="0.6" />
                    <path d={linePath || 'M 0 100'} fill="none" stroke="#4f46e5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                    {linePoints.map(point => (
                      <circle key={point.date} cx={point.x} cy={point.y} r="1.6" fill="#4f46e5" vectorEffect="non-scaling-stroke" />
                    ))}
                  </svg>
                  <div className="mt-2 flex justify-between text-[10px] font-bold text-gray-400">
                    <span>{activityBars[0]?.date.slice(5)}</span>
                    <span>{activityBars[activityBars.length - 1]?.date.slice(5)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white bg-white/80 p-4">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Monthly heatmap</p>
                <p className="text-xs text-gray-400">{monthLabel} · darker = more concepts</p>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                <span>Less</span>
                <span className="h-3 w-3 rounded-sm border bg-gray-100" />
                <span className="h-3 w-3 rounded-sm bg-emerald-200" />
                <span className="h-3 w-3 rounded-sm bg-emerald-400" />
                <span className="h-3 w-3 rounded-sm bg-emerald-600" />
                <span>More</span>
              </div>
            </div>
            <div className="mx-auto grid max-w-[210px] grid-cols-7 gap-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <div key={`${day}-${index}`} className="pb-0.5 text-center text-[8px] font-semibold text-gray-400">{day}</div>
              ))}
              {monthCells.map((cell, index) => cell ? (
                <div
                  key={cell.date}
                  title={`${cell.date}: ${cell.count} concept${cell.count === 1 ? '' : 's'}`}
                  className={`flex h-5 w-5 items-center justify-center rounded border text-[7px] font-semibold leading-none ${heatColor(cell.count)} ${cell.count ? 'text-white' : 'text-gray-400'}`}
                >
                  {cell.day}
                </div>
              ) : (
                <div key={`empty-${index}`} className="h-5 w-5" />
              ))}
            </div>
          </div>
        </div>
          </>
        )}
        </div>
      </div>
    </section>
  );
}

function LibraryPage({ items, edit, remove, onBack }: { items: Concept[]; edit: (id: string, title: string, notes: string, dateAdded?: string) => void; remove: (id: string) => void; onBack: () => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ReviewBucket | 'all'>('all');
  const tabs: { id: ReviewBucket | 'all'; label: string }[] = [
    { id: 'all', label: 'All' }, { id: 'less3', label: '< 3 days' }, { id: 'day3', label: '3-day section' }, { id: 'waiting7', label: 'Waiting Day 7' }, { id: 'day7', label: '7-day section' }, { id: 'complete', label: 'Complete' },
  ];
  const count = (id: ReviewBucket | 'all') => items.filter(item => id === 'all' || bucketOf(item) === id).length;
  const shown = [...items].sort(sortNewest).filter(item => (filter === 'all' || bucketOf(item) === filter) && `${item.title} ${item.notes}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3"><button onClick={onBack} className="rounded-xl p-2 hover:bg-gray-100"><ArrowLeft className="h-5 w-5 text-gray-500" /></button><div className="flex-1"><h1 className="font-extrabold text-gray-800">All Saved Inputs</h1><p className="text-xs text-gray-400">{shown.length} shown · {items.length} total</p></div></div><div className="mx-auto max-w-5xl space-y-3 px-4 pb-3"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search title or notes" className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500" /></div><div className="flex gap-2 overflow-x-auto pb-1">{tabs.map(tab => <button key={tab.id} onClick={() => setFilter(tab.id)} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold transition ${filter === tab.id ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>{tab.label} ({count(tab.id)})</button>)}</div></div></header>
      <main className="mx-auto max-w-5xl space-y-3 px-4 py-5">{shown.length ? shown.map(item => <ConceptCard key={item.id} concept={item} onEdit={edit} onRemove={remove} />) : <div className="rounded-3xl bg-white p-8 text-center text-gray-400">No concepts in this filter.</div>}</main>
    </div>
  );
}

function SettingsPage({ backend, syncing, error, onBack, onSync, onSetup, onDisconnect }: { backend: string; syncing: boolean; error: string | null; onBack: () => void; onSync: () => void; onSetup: () => void; onDisconnect: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <button onClick={onBack} className="rounded-xl p-2 hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="font-extrabold text-gray-800">Settings</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`rounded-2xl p-3 ${backend === 'sheets' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'}`}>{backend === 'sheets' ? <Cloud className="h-6 w-6" /> : <HardDrive className="h-6 w-6" />}</div>
            <div>
              <p className="font-extrabold text-gray-800">{backend === 'sheets' ? 'Google Sheets connected' : 'Local storage mode'}</p>
              <p className="break-all text-sm text-gray-500">{backend === 'sheets' ? getUrl() : 'Data is saved only in this browser.'}</p>
            </div>
          </div>
          {error && <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-600"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</div>}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            {backend === 'sheets' ? <><button onClick={onSync} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"><RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />Sync Now</button><button onClick={onDisconnect} className="flex-1 rounded-2xl bg-red-50 px-5 py-3 text-sm font-bold text-red-600 hover:bg-red-100">Disconnect</button></> : <button onClick={onSetup} className="flex-1 rounded-2xl bg-green-600 px-5 py-3 text-sm font-bold text-white hover:bg-green-700">Connect Google Sheets</button>}
          </div>
          <p className="mt-4 text-xs text-gray-400">When connected, the app auto-syncs every 5 seconds.</p>
          <button onClick={() => { localStorage.removeItem(AUTH_SESSION_KEY); window.location.reload(); }} className="mt-4 w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">Log out</button>
          <button onClick={() => { localStorage.removeItem(AUTH_SESSION_KEY); localStorage.removeItem(AUTH_SHEET_KEY); window.location.reload(); }} className="mt-2 w-full rounded-2xl bg-gray-100 px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-200">Log out and forget sheet URL</button>
        </div>
      </main>
    </div>
  );
}

function SetupPage({ onBack, onConnect }: { onBack: () => void; onConnect: (url: string) => Promise<void> }) {
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [ok, setOk] = useState<boolean | null>(null);
  const copy = async () => { await navigator.clipboard.writeText(APPS_SCRIPT); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const test = async () => { setTesting(true); localStorage.setItem('spacedmind-script-url', url.trim()); setOk(await pingSheets()); setTesting(false); };
  return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50"><header className="border-b border-gray-200 bg-white"><div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3"><button onClick={onBack} className="rounded-xl p-2 hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></button><h1 className="font-extrabold text-gray-800">Google Sheets Setup</h1></div></header><main className="mx-auto max-w-4xl space-y-4 px-4 py-6"><div className="rounded-3xl bg-white p-5 shadow-sm"><h2 className="font-bold text-gray-800">1. Paste this in Apps Script</h2><p className="mt-1 text-sm text-gray-500">Google Sheet → Extensions → Apps Script → delete old code → paste below → save.</p><button onClick={copy} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-bold text-white"><Clipboard className="h-4 w-4" />{copied ? 'Copied!' : 'Copy Code.gs'}</button><pre className="mt-3 max-h-72 overflow-auto rounded-2xl bg-gray-950 p-4 text-xs text-gray-200">{APPS_SCRIPT}</pre></div><div className="rounded-3xl bg-white p-5 shadow-sm"><h2 className="font-bold text-gray-800">2. Deploy and paste URL</h2><p className="mt-1 text-sm text-gray-500">Deploy → New deployment → Web app → Who has access: Anyone.</p><input value={url} onChange={event => { setUrl(event.target.value); setOk(null); }} placeholder="https://script.google.com/macros/s/.../exec" className="mt-4 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" /><div className="mt-3 flex gap-2"><button onClick={test} disabled={!url.trim() || testing} className="flex-1 rounded-2xl bg-gray-100 px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-200 disabled:text-gray-300">{testing ? 'Testing...' : 'Test'}</button><button onClick={() => onConnect(url.trim())} disabled={!url.trim() || ok !== true} className="flex-1 rounded-2xl bg-green-600 px-5 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:bg-gray-300">Connect</button></div>{ok === true && <p className="mt-3 text-sm font-bold text-green-600">Connected successfully.</p>}{ok === false && <p className="mt-3 text-sm font-bold text-red-600">Connection failed. Check deployment access.</p>}</div></main></div>;
}

const AUTH_SESSION_KEY = 'spacedmind-auth-session';
const AUTH_SHEET_KEY = 'spacedmind-auth-sheet-url';

function AuthPage({ onAuthenticated }: { onAuthenticated: (sheetUrl: string, username: string) => Promise<void> }) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sheetUrl, setSheetUrl] = useState(() => localStorage.getItem(AUTH_SHEET_KEY) || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showUrlHelp, setShowUrlHelp] = useState(false);
  const [scriptCopied, setScriptCopied] = useState(false);
  const [testingUrl, setTestingUrl] = useState(false);
  const [urlOk, setUrlOk] = useState<boolean | null>(null);

  const copySignupScript = async () => {
    await navigator.clipboard.writeText(APPS_SCRIPT);
    setScriptCopied(true);
    setTimeout(() => setScriptCopied(false), 1500);
  };

  const testSignupUrl = async () => {
    if (!sheetUrl.trim().startsWith('https://script.google.com/')) {
      setError('Paste your deployed Web App URL first.');
      return;
    }
    setTestingUrl(true);
    localStorage.setItem('spacedmind-script-url', sheetUrl.trim());
    setUrlOk(await pingSheets());
    setTestingUrl(false);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      let resolvedSheetUrl = sheetUrl.trim();
      if (mode === 'signup') {
        if (!sheetUrl.trim().startsWith('https://script.google.com/')) throw new Error('Enter your Google Sheets Web App URL during signup.');
        if (!username.trim() || !password.trim() || !email.trim()) return setError('Enter username, email, and password.');
        await signupCentral(username.trim(), password, email.trim(), sheetUrl.trim());
      } else if (mode === 'forgot') {
        if (!username.trim() || !email.trim()) return setError('Enter username and email.');
        await forgotPasswordCentral(username.trim(), email.trim());
        setError('Temporary password sent to your email.');
        return;
      } else {
        if (!username.trim() || !password.trim()) return setError('Enter username and password.');
        resolvedSheetUrl = await loginCentral(username.trim(), password);
        setSheetUrl(resolvedSheetUrl);
      }
      localStorage.setItem(AUTH_SESSION_KEY, username.trim());
      localStorage.setItem(AUTH_SHEET_KEY, resolvedSheetUrl);
      await onAuthenticated(resolvedSheetUrl, username.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-4">
      <div className="w-full max-w-3xl rounded-[2rem] border border-indigo-100 bg-white p-6 shadow-xl shadow-indigo-100/60">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white"><Brain className="h-7 w-7" /></div>
          <h1 className="text-2xl font-extrabold text-gray-900">SpacedMind</h1>
          <p className="text-sm text-gray-500">{mode === 'signup' ? 'Create access for your Google Sheet' : mode === 'forgot' ? 'Recover your password' : 'Log in to continue'}</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input value={username} onChange={event => setUsername(event.target.value)} placeholder="Username" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          {(mode === 'signup' || mode === 'forgot') && <input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="Email" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />}
          {mode !== 'forgot' && <input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Password" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />}
          {mode === 'signup' && (
            <>
              <button type="button" onClick={() => setShowUrlHelp(!showUrlHelp)} className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-bold text-amber-800 hover:bg-amber-100">
                {showUrlHelp ? 'Hide' : 'Show'} how to get Web App URL
              </button>
              {showUrlHelp && (
                <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-gray-800">1. Paste this in Apps Script</h3>
                    <p className="mt-1 text-xs text-gray-500">Google Sheet → Extensions → Apps Script → delete old code → paste below → save.</p>
                    <button type="button" onClick={copySignupScript} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-bold text-white">
                      <Clipboard className="h-4 w-4" />{scriptCopied ? 'Copied!' : 'Copy Code.gs'}
                    </button>
                    <pre className="mt-3 max-h-72 overflow-auto rounded-2xl bg-gray-950 p-4 text-xs text-gray-200">{APPS_SCRIPT}</pre>
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-gray-800">2. Deploy and paste URL</h3>
                    <p className="mt-1 text-xs text-gray-500">Deploy → New deployment → Web app → Who has access: Anyone.</p>
                  </div>
                </div>
              )}
              <input value={sheetUrl} onChange={event => { setSheetUrl(event.target.value); setUrlOk(null); }} placeholder="https://script.google.com/macros/s/.../exec" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              <div className="flex gap-2">
                <button type="button" onClick={testSignupUrl} disabled={!sheetUrl.trim() || testingUrl} className="flex-1 rounded-2xl bg-gray-100 px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-200 disabled:text-gray-300">{testingUrl ? 'Testing...' : 'Test URL'}</button>
                {urlOk === true && <span className="flex flex-1 items-center justify-center rounded-2xl bg-green-50 px-5 py-3 text-sm font-bold text-green-700">Connected</span>}
                {urlOk === false && <span className="flex flex-1 items-center justify-center rounded-2xl bg-red-50 px-5 py-3 text-sm font-bold text-red-600">Failed</span>}
              </div>
            </>
          )}
          {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</p>}
          <button disabled={busy} className="w-full rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-indigo-700 disabled:bg-gray-300">{busy ? 'Please wait...' : mode === 'signup' ? 'Sign Up' : mode === 'forgot' ? 'Send temporary password' : 'Log In'}</button>
        </form>
        <button onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); }} className="mt-4 w-full text-sm font-bold text-indigo-600 hover:text-indigo-800">{mode === 'signup' ? 'Already have access? Log in' : 'New user? Sign up'}</button>
        <button onClick={() => { setMode(mode === 'forgot' ? 'login' : 'forgot'); setError(''); }} className="mt-2 w-full text-sm font-bold text-gray-500 hover:text-indigo-700">{mode === 'forgot' ? 'Back to login' : 'Forgot password?'}</button>
        <p className="mt-4 text-center text-xs text-gray-400">After signup, this device remembers your Sheet URL. On a brand-new device, enter the same URL once to locate your backend.</p>
      </div>
    </div>
  );
}

export default function App() {
  const store = useConceptStore();
  const [page, setPage] = useState<Page>('dashboard');
  const [authenticated, setAuthenticated] = useState(() => Boolean(localStorage.getItem(AUTH_SESSION_KEY)));
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem(AUTH_SESSION_KEY) || '');
  const pending = store.items.filter(item => ['day3', 'day7'].includes(bucketOf(item))).length;

  if (!authenticated) {
    return <AuthPage onAuthenticated={async (sheetUrl, username) => { await store.connectSheets(sheetUrl); setCurrentUser(username); setAuthenticated(true); }} />;
  }

  if (store.loading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  if (page === 'library') return <LibraryPage items={store.items} edit={store.edit} remove={store.remove} onBack={() => setPage('dashboard')} />;
  if (page === 'settings') return <SettingsPage backend={store.backend} syncing={store.syncing} error={store.error} onBack={() => setPage('dashboard')} onSync={store.sync} onSetup={() => setPage('setup')} onDisconnect={store.disconnectSheets} />;
  if (page === 'setup') return <SetupPage onBack={() => setPage('settings')} onConnect={async url => { await store.connectSheets(url); setPage('dashboard'); }} />;

  return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50"><header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"><div className="flex items-center gap-3"><div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-2 text-white shadow-lg shadow-indigo-200"><Brain className="h-6 w-6" /></div><div><h1 className="text-xl font-extrabold text-gray-900">SpacedMind</h1><p className="hidden text-xs text-gray-400 sm:block">Spaced repetition study planner</p></div></div><div className="flex items-center gap-2"><span className="hidden rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 sm:inline-flex">Hi, {currentUser}</span><Pill tone={store.backend === 'sheets' ? 'green' : 'gray'}>{store.backend === 'sheets' ? <Cloud className="mr-1 h-3 w-3" /> : <HardDrive className="mr-1 h-3 w-3" />}{store.backend === 'sheets' ? 'Synced' : 'Local'}</Pill>{pending > 0 && <Pill tone="amber">{pending} due</Pill>}<button onClick={() => setPage('library')} className="flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"><GraduationCap className="h-4 w-4" />{store.items.length}</button><button onClick={() => setPage('settings')} className="rounded-full p-2 hover:bg-gray-100"><Settings className="h-5 w-5 text-gray-500" /></button></div></div></header><section className="mx-auto max-w-7xl px-4 pb-5 pt-8 text-center sm:px-6 lg:px-8"><h2 className="text-3xl font-extrabold text-gray-900">Capture once. Review at the right time.</h2><p className="mx-auto mt-2 max-w-2xl text-sm text-gray-500">Backdate concepts, edit dates safely, and keep everything synced with Google Sheets.</p>{store.items.length === 0 && <button onClick={() => store.replaceAll(demoData())} className="mt-5 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700">Load Demo Data</button>}</section><ProgressDashboard items={store.items} /><main className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 pb-16 sm:px-6 lg:grid-cols-3 lg:px-8"><AddPanel items={store.items} add={store.add} edit={store.edit} remove={store.remove} /><ReviewPanel items={store.items} markReview={store.markReview} /><ProgressPanel items={store.items} clear={store.clear} /></main></div>;
}