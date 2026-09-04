import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Stethoscope,
  Clock,
  MapPin,
  Sparkles,
  Pill,
  Image as ImageIcon,
  Microscope,
  X,
  Check,
  ChevronRight,
  RotateCcw,
  Share2,
  Lock,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/*  Each puzzle has 6 clues, one per round. `leadModality` decides     */
/*  whether the image lives in an early round (image-first) or a late  */
/*  round (vignette-first). Schema is intentionally JSON-shaped so an  */
/*  AI-generation backend can later produce puzzles in the same form.  */
/* ------------------------------------------------------------------ */

const CLUE_ICONS = {
  history: Stethoscope,
  timeline: Clock,
  exam: MapPin,
  context: Pill,
  image: ImageIcon,
  pathology: Microscope,
  ancillary: Sparkles,
};

const PUZZLES = [
  {
    id: 'dermdle-001',
    diagnosis: 'Psoriasis vulgaris',
    aliases: ['psoriasis', 'plaque psoriasis', 'chronic plaque psoriasis'],
    leadModality: 'vignette',
    clues: [
      {
        round: 1,
        type: 'history',
        label: 'Presentation',
        text: 'A 35-year-old woman presents with a 6-month history of an itchy, scaly rash that waxes and wanes.',
      },
      {
        round: 2,
        type: 'timeline',
        label: 'Course',
        text: 'She reports recurrent flares since her early twenties. The current flare began 3 weeks ago during a period of work stress.',
      },
      {
        round: 3,
        type: 'exam',
        label: 'Examination',
        text: 'Symmetric, well-demarcated erythematous plaques (2–5 cm) with thick, silvery-white scale on extensor elbows, knees, and the scalp.',
      },
      {
        round: 4,
        type: 'context',
        label: 'History & Review',
        text: 'Mild nail pitting noted. Father had a similar condition. Denies joint pain. Not on any new medications.',
      },
      {
        round: 5,
        type: 'image',
        label: 'Clinical Image',
        caption: 'Extensor elbow: erythematous plaque with adherent silver scale.',
        imageDescription: 'Erythematous plaque with thick silvery scale on extensor elbow',
      },
      {
        round: 6,
        type: 'pathology',
        label: 'Histopathology',
        text: 'Biopsy: parakeratosis, hypogranulosis, regular acanthosis with elongated rete ridges, and neutrophilic microabscesses within the stratum corneum (Munro microabscesses).',
      },
    ],
    teach:
      'Psoriasis is a chronic immune-mediated disease driven by the IL-23 / Th17 axis. Classic findings include well-demarcated erythematous plaques with silvery scale on extensor surfaces, the scalp, and the lumbosacral region. Nail pitting and a positive family history are common clues. First-line therapy depends on severity: topical steroids and vitamin D analogs for limited disease; phototherapy or systemic biologics (anti-IL-17, anti-IL-23) for moderate–severe disease.',
  },

  {
    id: 'dermdle-002',
    diagnosis: 'Phytophotodermatitis',
    aliases: ['phytophotodermatitis', 'margarita dermatitis', 'lime dermatitis', 'berloque dermatitis'],
    leadModality: 'image',
    clues: [
      {
        round: 1,
        type: 'image',
        label: 'Clinical Image',
        caption: 'Forearms and chest: bizarre, drip-like linear hyperpigmented streaks.',
        imageDescription: 'Bizarre linear and drip-shaped hyperpigmented streaks on sun-exposed forearm',
      },
      {
        round: 2,
        type: 'history',
        label: 'Presentation',
        text: 'A 28-year-old previously healthy man presents 4 days after a beach day with non-painful but cosmetically striking streaks on his forearms and chest.',
      },
      {
        round: 3,
        type: 'timeline',
        label: 'Course',
        text: 'He recalls a stinging, burn-like sensation that began the evening of sun exposure. The lesions evolved from erythema to deep hyperpigmentation over 48–72 hours.',
      },
      {
        round: 4,
        type: 'exam',
        label: 'Examination',
        text: 'Sharply linear and drip-shaped hyperpigmented patches confined strictly to sun-exposed surfaces. No vesicles currently; no involvement of clothing-covered skin.',
      },
      {
        round: 5,
        type: 'context',
        label: 'History & Review',
        text: 'He prepared margaritas at the beach, hand-squeezing limes; juice ran down his forearms. Afebrile, no systemic symptoms, no pruritus.',
      },
      {
        round: 6,
        type: 'ancillary',
        label: 'Clinical Reasoning',
        text: 'No biopsy required — a clinical diagnosis. Pathogenesis: furocoumarins (psoralens) in lime peel oil are absorbed by keratinocytes, then activated by UVA, producing a phototoxic reaction followed by post-inflammatory hyperpigmentation.',
      },
    ],
    teach:
      'Phytophotodermatitis is a phototoxic (not allergic) reaction caused by skin contact with furocoumarin-containing plants — most commonly limes, but also lemons, parsnips, celery, figs, and giant hogweed — followed by UVA exposure. The acute phase mimics a sunburn or even bullous reaction; the chronic phase is striking hyperpigmentation in bizarre, drip-like patterns that can mimic abuse. Recognizing the pattern prevents misdiagnosis and unnecessary workup.',
  },

  {
    id: 'dermdle-003',
    diagnosis: 'Bullous pemphigoid',
    aliases: ['bullous pemphigoid', 'pemphigoid', 'BP'],
    leadModality: 'vignette',
    clues: [
      {
        round: 1,
        type: 'history',
        label: 'Presentation',
        text: 'A 78-year-old woman presents with a 6-week history of an intensely pruritic, widespread eruption.',
      },
      {
        round: 2,
        type: 'timeline',
        label: 'Course',
        text: 'It began as urticarial pink patches and plaques. Over the past 10 days, tense fluid-filled blisters have appeared on the trunk and inner thighs.',
      },
      {
        round: 3,
        type: 'exam',
        label: 'Examination',
        text: 'Multiple tense 1–3 cm bullae on erythematous and normal-appearing skin, favoring flexural sites and the lower abdomen. Nikolsky sign negative. No oral or conjunctival involvement.',
      },
      {
        round: 4,
        type: 'context',
        label: 'History & Review',
        text: 'PMH: type 2 diabetes, hypertension. Started a DPP-4 inhibitor (sitagliptin) ~8 months ago. No recent antibiotics. Mild eosinophilia on CBC.',
      },
      {
        round: 5,
        type: 'image',
        label: 'Clinical Image',
        caption: 'Lower abdomen and inner thigh: tense, intact bullae on erythematous and uninvolved skin.',
        imageDescription: 'Tense bullae on erythematous and normal-appearing skin, flexural distribution',
      },
      {
        round: 6,
        type: 'pathology',
        label: 'Pathology & DIF',
        text: 'Lesional biopsy: subepidermal blister with eosinophil-rich infiltrate. Perilesional DIF: linear IgG and C3 deposition along the basement membrane zone. Salt-split skin: IgG on the epidermal (roof) side.',
      },
    ],
    teach:
      'Bullous pemphigoid is the most common autoimmune subepidermal blistering disease, typically affecting adults over 70. Autoantibodies target BP180 (BPAG2) and BP230 hemidesmosomal proteins. Hallmarks: intense pruritus, often weeks of an urticarial prodrome, then tense bullae on flexural skin with little to no mucosal involvement. DPP-4 inhibitors are a recognized trigger. Linear IgG/C3 at the BMZ on DIF is diagnostic. First-line treatment is high-potency topical steroids (e.g., clobetasol whole-body) ± systemic immunomodulators for severe disease.',
  },

  /* ---------------------------------------------------------------- */
  /* The case below is the first one produced by the ingestion pipe-  */
  /* line: extracted from a real CC-BY 4.0 open-access case report.   */
  /* Source citation lives on the puzzle object and is shown to the   */
  /* player after solving.                                             */
  /* ---------------------------------------------------------------- */
  {
    id: 'dermdle-004',
    diagnosis: 'Hypocomplementemic urticarial vasculitis',
    aliases: [
      'hypocomplementemic urticarial vasculitis',
      'HUV',
      'urticarial vasculitis',
      'hypocomplementemic urticarial vasculitis syndrome',
      'HUVS',
    ],
    leadModality: 'vignette',
    clues: [
      {
        round: 1,
        type: 'history',
        label: 'Presentation',
        text: 'A 67-year-old woman presents with an 8-month history of an intensely pruritic eruption accompanied by migratory joint pains involving the wrists, elbows, and knees.',
      },
      {
        round: 2,
        type: 'timeline',
        label: 'Course',
        text: 'Individual lesions persist for more than 24 hours and often leave residual marks as they fade — distinctly atypical for ordinary hives.',
      },
      {
        round: 3,
        type: 'exam',
        label: 'Examination',
        text: 'Multiple pale-pink, well-demarcated wheals of variable size (up to 6 cm) with a soft, smooth surface, distributed across the décolleté, lateral arms, upper back, and epigastrium.',
      },
      {
        round: 4,
        type: 'context',
        label: 'History & Review',
        text: 'Family history of systemic lupus erythematosus. Otherwise well; takes only calcium and vitamin D for osteoporosis. No mucosal involvement, no fever, no recent infections.',
      },
      {
        round: 5,
        type: 'image',
        label: 'Clinical Image',
        caption: 'Décolleté and upper trunk: persistent, well-demarcated pink wheals (Aparicio et al., Cureus 2025, Fig 1, CC-BY 4.0).',
        imageDescription:
          'Disseminated pale-pink wheals of variable size on the décolleté and upper extremities',
      },
      {
        round: 6,
        type: 'pathology',
        label: 'Pathology & Labs',
        text: 'Biopsy: superficial and reticular dermal perivascular infiltrate with neutrophil and eosinophil predominance, abundant nuclear dust, and mild fibrinoid necrosis — leukocytoclastic vasculitis. Labs: C3 53 mg/dL (low), C4 3 mg/dL (low), elevated CRP. ANA weakly positive (1:100); anti-dsDNA, anti-Sm, anti-Ro/SSA, anti-La/SSB all negative.',
      },
    ],
    teach:
      'Urticarial vasculitis (UV) is a small-vessel vasculitis that mimics chronic urticaria but has one cardinal distinguishing feature: individual wheals persist for more than 24 hours, often leaving purpuric or hyperpigmented residue. The hypocomplementemic subtype (HUV) is rarer and carries a strong association with autoimmune disease — most often SLE — with up to half of patients eventually developing overt connective tissue disease. Diagnosis rests on the clinical picture, leukocytoclastic vasculitis on skin biopsy, and low serum complement (C3/C4 ± anti-C1q antibodies). First-line therapy is systemic corticosteroids; persistent or refractory disease may require dapsone, hydroxychloroquine, or immunosuppressants. Schwartz criteria support the related syndrome (HUVS) when systemic features are present.',
    source: {
      title: 'Hypocomplementemic Urticarial Vasculitis: A Case Report',
      authors: 'Aparicio EE, Guerrero DV, Alcántara VD, Gutiérrez SA, Arce GR',
      journal: 'Cureus',
      citation: 'Cureus 17(12): e100143',
      doi: '10.7759/cureus.100143',
      year: 2025,
      license: 'CC-BY 4.0',
    },
  },
  /* ---------------------------------------------------------------- */
  /* Case #5: real puzzle generated end-to-end by the extractor +     */
  /* image pipeline, sourced from a CC-BY Cureus case report.          */
  /* ---------------------------------------------------------------- */
  {
    id: 'dermdle-005',
    diagnosis: 'Eruptive collagenoma',
    aliases: [
      'eruptive collagenoma',
      'collagenoma',
      'connective tissue nevus',
      'connective tissue nevus of collagen type',
    ],
    leadModality: 'image',
    clues: [
      {
        round: 1,
        type: 'history',
        label: 'Presentation',
        text: "A 28-year-old woman: 'I've slowly been getting all these firm little bumps on my upper back over the last few years. They don't hurt or itch — they just keep showing up.'",
      },
      {
        round: 2,
        type: 'image',
        label: 'Clinical Image',
        caption: 'Upper back and shoulders: scattered, skin-colored papules and nodules.',
        imageDescription:
          'Multiple discrete skin-colored papules and small nodules across the upper back of a young adult',
        imageFile: 'data:image/jpeg;base64,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',
        imageType: 'case',
        imageLicense: 'CC-BY 4.0',
        imageAttribution:
          'Bousheheri FF, Mosbeh A, Albazali A, et al. Eruptive Collagenoma: A Rare Encounter in Clinical Dermatology. Cureus 17(12): e80127.',
        imageQualityScore: 0.8,
      },
      {
        round: 3,
        type: 'timeline',
        label: 'Course',
        text:
          'Three years of gradual onset and slow accumulation. No preceding trauma, no prior cutaneous lesions, and no similar complaints among family members.',
      },
      {
        round: 4,
        type: 'exam',
        label: 'Examination',
        text:
          'Firm, non-tender, freely mobile on palpation. No mucosal, nail, or scalp involvement. No café-au-lait macules, axillary freckling, or lipomas elsewhere.',
      },
      {
        round: 5,
        type: 'context',
        label: 'History & Review',
        text:
          'No systemic symptoms, no malignancy, no chronic disease, no new medications. No personal or family history of similar lesions, neurofibromatosis, or Buschke–Ollendorff syndrome.',
      },
      {
        round: 6,
        type: 'pathology',
        label: 'Histopathology',
        text:
          'Biopsy: dermal proliferation of dense, thickened, haphazardly arranged collagen bundles with relatively preserved elastic fibers. No inflammatory infiltrate — a connective tissue nevus of the collagen type.',
      },
    ],
    teach:
      'Eruptive collagenoma is a rare acquired connective tissue nevus characterized by the gradual or sudden appearance of multiple asymptomatic skin-colored papules and nodules, most often on the trunk, upper extremities, or head and neck of young adults. Histology shows excessive thickened collagen with normal or near-normal elastic fibers, distinguishing it from elastomas and Buschke–Ollendorff syndrome (which has both). The etiology is unclear; no consistent familial or systemic associations have been identified, and the lesions are benign. Treatment is cosmetic only.',
    source: {
      title: 'Eruptive Collagenoma: A Rare Encounter in Clinical Dermatology',
      authors: 'Bousheheri FF, Mosbeh A, Albazali A, et al.',
      journal: 'Cureus',
      citation: 'Cureus 17(12): e80127',
      doi: '10.7759/cureus.80127',
      year: 2025,
      license: 'CC-BY 4.0',
    },
  },
];

/* ------------------------------------------------------------------ */
/*  DIAGNOSIS LIBRARY                                                  */
/*  Used to power autocomplete. Start small; this is the pool an AI    */
/*  backend would later expand to cover most of dermatology.           */
/* ------------------------------------------------------------------ */

const DIAGNOSIS_LIBRARY = [
  'Acanthosis nigricans',
  'Acne vulgaris',
  'Actinic keratosis',
  'Allergic contact dermatitis',
  'Alopecia areata',
  'Angioedema',
  'Atopic dermatitis',
  'Basal cell carcinoma',
  'Bullous pemphigoid',
  'Cellulitis',
  'Chronic spontaneous urticaria',
  'Cutaneous larva migrans',
  'Cutaneous T-cell lymphoma (mycosis fungoides)',
  'Dermatitis herpetiformis',
  'Dermatofibroma',
  'Dermatomyositis',
  'Discoid lupus erythematosus',
  'Drug reaction with eosinophilia and systemic symptoms (DRESS)',
  'Eczema herpeticum',
  'Eruptive collagenoma',
  'Erythema migrans',
  'Erythema multiforme',
  'Erythema nodosum',
  'Folliculitis',
  'Granuloma annulare',
  'Guttate psoriasis',
  'Hand-foot-and-mouth disease',
  'Henoch-Schönlein purpura (IgA vasculitis)',
  'Herpes simplex',
  'Herpes zoster',
  'Hidradenitis suppurativa',
  'Hives (urticaria)',
  'Hypersensitivity vasculitis',
  'Hypocomplementemic urticarial vasculitis',
  'Impetigo',
  'Keratoacanthoma',
  'Kawasaki disease',
  'Lichen planus',
  'Lichen sclerosus',
  'Lupus (subacute cutaneous)',
  'Measles',
  'Melanoma',
  'Melasma',
  'Molluscum contagiosum',
  'Necrobiosis lipoidica',
  'Necrotizing fasciitis',
  'Neurofibromatosis',
  'Nummular eczema',
  'Onychomycosis',
  'Pemphigus vulgaris',
  'Perioral dermatitis',
  'Phytophotodermatitis',
  'Pityriasis rosea',
  'Pityriasis versicolor (tinea versicolor)',
  'Porphyria cutanea tarda',
  'Psoriasis vulgaris',
  'Pyoderma gangrenosum',
  'Rocky Mountain spotted fever',
  'Rosacea',
  'Scabies',
  'Scarlet fever',
  'Seborrheic dermatitis',
  'Seborrheic keratosis',
  'Squamous cell carcinoma',
  'Stasis dermatitis',
  'Stevens-Johnson syndrome / TEN',
  'Sweet syndrome',
  'Syphilis (secondary)',
  'Tinea corporis',
  'Tinea cruris',
  'Tinea pedis',
  'Toxic epidermal necrolysis',
  'Urticaria',
  'Varicella (chickenpox)',
  'Vitiligo',
  'Warts (verruca vulgaris)',
];

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

function normalize(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function matchesDiagnosis(guess, puzzle) {
  const g = normalize(guess);
  if (!g) return false;
  const candidates = [puzzle.diagnosis, ...(puzzle.aliases || [])].map(normalize);
  return candidates.some((c) => c === g);
}

/* ------------------------------------------------------------------ */
/*  COMPONENTS                                                         */
/* ------------------------------------------------------------------ */

function ClueCard({ clue, round, isNew }) {
  const Icon = CLUE_ICONS[clue.type] || Stethoscope;

  if (clue.type === 'image') {
    const hasRealImage =
      clue.imageFile &&
      (clue.imageFile.startsWith('data:image/') ||
        clue.imageFile.startsWith('http'));

    return (
      <article
        className={`border border-stone-300 bg-stone-50 p-5 ${isNew ? 'reveal-in' : ''}`}
      >
        <header className="flex items-center justify-between mb-3 pb-2 border-b border-stone-300">
          <div className="flex items-center gap-2">
            <Icon size={14} className="text-stone-600" strokeWidth={1.5} />
            <span
              className="text-[0.65rem] tracking-[0.18em] uppercase text-stone-600"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              Clue 0{round} — {clue.label}
            </span>
          </div>
          {hasRealImage && clue.imageType && (
            <span
              className={`text-[0.6rem] tracking-[0.14em] uppercase px-2 py-0.5 border ${
                clue.imageType === 'case'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {clue.imageType === 'case' ? 'Actual case' : 'Representative'}
            </span>
          )}
        </header>
        {hasRealImage ? (
          <div className="w-full bg-stone-100 border border-stone-300 overflow-hidden">
            <img
              src={clue.imageFile}
              alt={clue.imageDescription || clue.caption || 'Clinical image'}
              className="w-full h-auto block"
              loading="lazy"
            />
          </div>
        ) : (
          <div
            className="aspect-[4/3] w-full bg-gradient-to-br from-stone-200 via-stone-100 to-stone-200 border border-dashed border-stone-400 flex flex-col items-center justify-center text-center px-6"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(120,113,108,0.06) 0 2px, transparent 2px 10px)',
            }}
          >
            <ImageIcon size={32} className="text-stone-500 mb-3" strokeWidth={1.25} />
            <p
              className="text-xs text-stone-600 max-w-xs"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              [ clinical image placeholder ]
            </p>
            <p
              className="text-[0.7rem] text-stone-500 mt-2 italic max-w-xs"
              style={{ fontFamily: 'Newsreader, serif' }}
            >
              {clue.imageDescription}
            </p>
          </div>
        )}
        {clue.caption && (
          <p
            className="text-[0.78rem] text-stone-600 mt-3 italic"
            style={{ fontFamily: 'Newsreader, serif' }}
          >
            {clue.caption}
          </p>
        )}
      </article>
    );
  }

  return (
    <article
      className={`border border-stone-300 bg-stone-50 p-5 ${isNew ? 'reveal-in' : ''}`}
    >
      <header className="flex items-center gap-2 mb-3 pb-2 border-b border-stone-300">
        <Icon size={14} className="text-stone-600" strokeWidth={1.5} />
        <span
          className="text-[0.65rem] tracking-[0.18em] uppercase text-stone-600"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          Clue 0{round} — {clue.label}
        </span>
      </header>
      <p
        className="text-[0.95rem] leading-relaxed text-stone-900"
        style={{ fontFamily: 'Newsreader, serif' }}
      >
        {clue.text}
      </p>
    </article>
  );
}

function LockedSlot({ round }) {
  return (
    <article className="border border-dashed border-stone-300 bg-transparent p-5 opacity-60">
      <header className="flex items-center gap-2">
        <Lock size={12} className="text-stone-400" strokeWidth={1.5} />
        <span
          className="text-[0.65rem] tracking-[0.18em] uppercase text-stone-400"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          Clue 0{round} — locked
        </span>
      </header>
    </article>
  );
}

function DiagnosisInput({ value, onChange, onSubmit, disabled }) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  const matches = useMemo(() => {
    const v = normalize(value);
    if (!v) return [];
    return DIAGNOSIS_LIBRARY.filter((d) => normalize(d).includes(v)).slice(0, 7);
  }, [value]);

  useEffect(() => {
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function handleKey(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && matches[activeIdx]) {
        onChange(matches[activeIdx]);
        setOpen(false);
      } else {
        onSubmit();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIdx(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        disabled={disabled}
        placeholder="Enter a diagnosis…"
        className="w-full bg-stone-50 border border-stone-400 px-4 py-3 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 disabled:opacity-50"
        style={{ fontFamily: 'Newsreader, serif', fontSize: '0.95rem' }}
        autoComplete="off"
        spellCheck="false"
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-10 left-0 right-0 mt-1 bg-stone-50 border border-stone-400 shadow-md max-h-64 overflow-auto">
          {matches.map((m, i) => (
            <li
              key={m}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(m);
                setOpen(false);
              }}
              onMouseEnter={() => setActiveIdx(i)}
              className={`px-4 py-2 cursor-pointer text-sm ${
                i === activeIdx ? 'bg-stone-200 text-stone-900' : 'text-stone-700'
              }`}
              style={{ fontFamily: 'Newsreader, serif' }}
            >
              {m}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GuessHistory({ guesses }) {
  if (guesses.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p
        className="text-[0.65rem] tracking-[0.18em] uppercase text-stone-500 mb-2"
        style={{ fontFamily: 'JetBrains Mono, monospace' }}
      >
        Differential ruled out
      </p>
      {guesses.map((g, i) => (
        <div
          key={i}
          className="flex items-center gap-2 text-sm text-stone-500 line-through decoration-stone-400"
          style={{ fontFamily: 'Newsreader, serif' }}
        >
          <X size={12} className="text-red-900 flex-shrink-0" strokeWidth={2} />
          <span>{g}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN APP                                                           */
/* ------------------------------------------------------------------ */

export default function Dermdle() {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [round, setRound] = useState(1);
  const [guesses, setGuesses] = useState([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('playing'); // 'playing' | 'won' | 'lost'
  const [lastWrong, setLastWrong] = useState(null);
  const [prevRound, setPrevRound] = useState(0);

  const puzzle = PUZZLES[puzzleIndex];
  const totalRounds = puzzle.clues.length;

  function reset(idx = puzzleIndex) {
    setPuzzleIndex(idx);
    setRound(1);
    setGuesses([]);
    setInput('');
    setStatus('playing');
    setLastWrong(null);
    setPrevRound(0);
  }

  function nextPuzzle() {
    const next = (puzzleIndex + 1) % PUZZLES.length;
    reset(next);
  }

  function submitGuess() {
    if (status !== 'playing') return;
    const g = input.trim();
    if (!g) return;
    if (matchesDiagnosis(g, puzzle)) {
      setStatus('won');
      setInput('');
      return;
    }
    setGuesses((prev) => [...prev, g]);
    setInput('');
    setLastWrong(g);
    if (round >= totalRounds) {
      setStatus('lost');
    } else {
      setPrevRound(round);
      setRound(round + 1);
    }
    setTimeout(() => setLastWrong(null), 1200);
  }

  function skipClue() {
    if (status !== 'playing') return;
    if (round >= totalRounds) {
      setStatus('lost');
      return;
    }
    setGuesses((prev) => [...prev, '— (skipped)']);
    setPrevRound(round);
    setRound(round + 1);
  }

  const revealedClues = puzzle.clues.slice(0, round);
  const hiddenRounds = puzzle.clues.slice(round).map((c) => c.round);

  return (
    <div
      className="min-h-screen w-full"
      style={{
        backgroundColor: '#F4EFE6',
        backgroundImage:
          'radial-gradient(circle at 20% 10%, rgba(124,45,18,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 90%, rgba(28,25,23,0.03) 0%, transparent 50%)',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,700&family=Newsreader:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .shake { animation: shake 0.3s ease-in-out; }
        .reveal-in { opacity: 0; animation: fadeIn 0.7s ease-out forwards; }
      `}</style>

      <div className="max-w-4xl mx-auto px-6 py-10 md:py-14">
        {/* Masthead */}
        <header className="flex items-baseline justify-between border-b-2 border-stone-900 pb-4 mb-8">
          <div>
            <h1
              className="text-4xl md:text-5xl text-stone-900 tracking-tight"
              style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, fontVariationSettings: '"SOFT" 50, "WONK" 0' }}
            >
              Dermdle
            </h1>
            <p
              className="text-[0.7rem] tracking-[0.22em] uppercase text-stone-600 mt-1"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              The daily dermatology case · Vol I
            </p>
          </div>
          <div className="text-right">
            <p
              className="text-[0.65rem] tracking-[0.18em] uppercase text-stone-500"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              Case № {String(puzzleIndex + 1).padStart(3, '0')}
            </p>
            <p
              className="text-[0.65rem] tracking-[0.18em] uppercase text-stone-500"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {puzzle.leadModality === 'image' ? 'Image-led' : 'History-led'}
            </p>
          </div>
        </header>

        {/* Round indicator */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {Array.from({ length: totalRounds }, (_, i) => {
              const r = i + 1;
              const isRevealed = r <= round;
              const isCurrent = r === round && status === 'playing';
              return (
                <div
                  key={r}
                  className={`h-1.5 w-10 transition-colors duration-500 ${
                    isRevealed
                      ? isCurrent
                        ? 'bg-stone-900'
                        : 'bg-stone-600'
                      : 'bg-stone-300'
                  }`}
                />
              );
            })}
          </div>
          <p
            className="text-[0.7rem] tracking-[0.18em] uppercase text-stone-600"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            {status === 'playing'
              ? `Clue ${round} of ${totalRounds}`
              : status === 'won'
              ? `Solved in ${round}`
              : `Unsolved`}
          </p>
        </div>

        {/* Main grid */}
        <div className="grid md:grid-cols-[1fr_280px] gap-8">
          {/* Case panel */}
          <section className="space-y-3">
            {revealedClues.map((clue) => (
              <ClueCard
                key={clue.round}
                clue={clue}
                round={clue.round}
                isNew={clue.round === round && clue.round > 1 && clue.round > prevRound}
              />
            ))}
            {hiddenRounds.map((r) => (
              <LockedSlot key={r} round={r} />
            ))}
          </section>

          {/* Side panel: guess interface + history */}
          <aside className="space-y-6">
            {status === 'playing' && (
              <div className={lastWrong ? 'shake' : ''}>
                <p
                  className="text-[0.65rem] tracking-[0.18em] uppercase text-stone-600 mb-2"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  Your diagnosis
                </p>
                <DiagnosisInput
                  value={input}
                  onChange={setInput}
                  onSubmit={submitGuess}
                  disabled={status !== 'playing'}
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={submitGuess}
                    disabled={!input.trim()}
                    className="flex-1 bg-stone-900 text-stone-50 px-4 py-2.5 text-sm tracking-wide hover:bg-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    SUBMIT <ChevronRight size={14} strokeWidth={2} />
                  </button>
                  <button
                    onClick={skipClue}
                    className="px-3 py-2.5 text-sm tracking-wide border border-stone-400 text-stone-700 hover:bg-stone-200 transition-colors"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    title="Reveal next clue without guessing"
                  >
                    SKIP
                  </button>
                </div>
                {lastWrong && (
                  <p
                    className="text-[0.75rem] text-red-900 mt-2"
                    style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic' }}
                  >
                    Not quite — next clue revealed.
                  </p>
                )}
              </div>
            )}

            {status === 'won' && (
              <div className="border border-stone-900 bg-stone-50 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Check size={16} className="text-emerald-800" strokeWidth={2} />
                  <p
                    className="text-[0.65rem] tracking-[0.18em] uppercase text-stone-700"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    Diagnosis confirmed
                  </p>
                </div>
                <p
                  className="text-2xl text-stone-900 mb-1"
                  style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }}
                >
                  {puzzle.diagnosis}
                </p>
                <p
                  className="text-xs text-stone-600"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  Solved at clue {round} of {totalRounds}
                </p>
              </div>
            )}

            {status === 'lost' && (
              <div className="border border-stone-900 bg-stone-50 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <X size={16} className="text-red-900" strokeWidth={2} />
                  <p
                    className="text-[0.65rem] tracking-[0.18em] uppercase text-stone-700"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    The diagnosis was
                  </p>
                </div>
                <p
                  className="text-2xl text-stone-900"
                  style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }}
                >
                  {puzzle.diagnosis}
                </p>
              </div>
            )}

            <GuessHistory guesses={guesses} />
          </aside>
        </div>

        {/* Teaching point */}
        {(status === 'won' || status === 'lost') && (
          <section
            className="mt-10 border-t border-stone-300 pt-8 reveal-in"
          >
            <p
              className="text-[0.65rem] tracking-[0.22em] uppercase text-stone-600 mb-3"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              Teaching point
            </p>
            <p
              className="text-stone-800 leading-relaxed text-[1.02rem] max-w-3xl"
              style={{ fontFamily: 'Newsreader, serif' }}
            >
              {puzzle.teach}
            </p>
            {puzzle.source && (
              <div className="mt-6 pl-4 border-l-2 border-stone-400 max-w-3xl">
                <p
                  className="text-[0.65rem] tracking-[0.18em] uppercase text-stone-500 mb-1"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  Source case
                </p>
                <p
                  className="text-[0.85rem] text-stone-700 leading-snug"
                  style={{ fontFamily: 'Newsreader, serif' }}
                >
                  {puzzle.source.authors}. <em>{puzzle.source.title}</em>.{' '}
                  {puzzle.source.citation}.{' '}
                  <a
                    href={`https://doi.org/${puzzle.source.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-stone-400 hover:decoration-stone-700"
                  >
                    doi:{puzzle.source.doi}
                  </a>{' '}
                  <span className="text-stone-500">· {puzzle.source.license}</span>
                </p>
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={nextPuzzle}
                className="bg-stone-900 text-stone-50 px-5 py-2.5 text-sm tracking-wide hover:bg-stone-700 transition-colors flex items-center gap-2"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                NEXT CASE <ChevronRight size={14} strokeWidth={2} />
              </button>
              <button
                onClick={() => reset()}
                className="px-5 py-2.5 text-sm tracking-wide border border-stone-400 text-stone-700 hover:bg-stone-200 transition-colors flex items-center gap-2"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                <RotateCcw size={14} strokeWidth={2} /> REPLAY
              </button>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer
          className="mt-16 pt-6 border-t border-stone-300 text-[0.7rem] text-stone-500 italic"
          style={{ fontFamily: 'Newsreader, serif' }}
        >
          Dermdle is an educational prototype. Cases are for teaching purposes only and do not
          constitute medical advice.
        </footer>
      </div>
    </div>
  );
}
