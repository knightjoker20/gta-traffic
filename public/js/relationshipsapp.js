/* =====================================================
   GTA-Traffic.com — Relationships Editor
   relationshipsapp.js  v1.0
   Parses, renders, and edits GTA 5 relationships.dat
   ===================================================== */

// ── Tier cycle order ──────────────────────────────────
const TIERS      = ['Hate', 'Dislike', 'Like', 'Respect'];
const TIER_CYCLE = ['', ...TIERS]; // '' = no relationship (click cycles through this)

// ── All known groups, in display order ───────────────
const ALL_GROUPS = [
  // Civilians
  'PLAYER', 'CIVMALE', 'CIVFEMALE',
  // Law & Services
  'COP', 'ARMY', 'SECURITY_GUARD', 'PRIVATE_SECURITY', 'FIREMAN', 'MEDIC',
  // Special / Criminal
  'DEALER', 'PRISONER', 'HATES_PLAYER', 'AGGRESSIVE_INVESTIGATE', 'GUARD_DOG',
  // Street Gangs
  'AMBIENT_GANG_FAMILY', 'AMBIENT_GANG_BALLAS', 'AMBIENT_GANG_LOST',
  'AMBIENT_GANG_MEXICAN', 'AMBIENT_GANG_MARABUNTE', 'AMBIENT_GANG_CULT',
  'AMBIENT_GANG_SALVA', 'AMBIENT_GANG_WEICHENG', 'AMBIENT_GANG_HILLBILLY',
  'AMBIENT_GANG_JUGGALOS', 'AMBIENT_GANG_LTR', 'AMBIENT_GANG_AZTECA',
  'AMBIENT_GANG_CARTEL',
  // Animals
  'DOMESTIC_ANIMAL', 'CAT', 'HEN', 'WILD_ANIMAL', 'DEER',
  'SHARK', 'COUGAR', 'PANTHER', 'PREDATOR',
  // Mission / Misc
  'GANG_1', 'GANG_2', 'GANG_9', 'GANG_10',
  'MISSION2', 'MISSION3', 'MISSION4', 'MISSION5', 'MISSION6', 'MISSION7', 'MISSION8',
  'NO_RELATIONSHIP', 'SPECIAL',
];

// ── Group metadata ────────────────────────────────────
const GROUP_META = {
  PLAYER:                  { label: 'Player',           cat: 'civilian' },
  CIVMALE:                 { label: 'Civ Male',         cat: 'civilian' },
  CIVFEMALE:               { label: 'Civ Female',       cat: 'civilian' },
  COP:                     { label: 'Cop',               cat: 'law'      },
  ARMY:                    { label: 'Army',              cat: 'law'      },
  SECURITY_GUARD:          { label: 'Sec. Guard',        cat: 'law'      },
  PRIVATE_SECURITY:        { label: 'Priv. Security',   cat: 'law'      },
  FIREMAN:                 { label: 'Fireman',           cat: 'law'      },
  MEDIC:                   { label: 'Medic',             cat: 'law'      },
  DEALER:                  { label: 'Dealer',            cat: 'special'  },
  PRISONER:                { label: 'Prisoner',          cat: 'special'  },
  HATES_PLAYER:            { label: 'Hates Player',     cat: 'special'  },
  AGGRESSIVE_INVESTIGATE:  { label: 'Aggrv. Invest.',   cat: 'special'  },
  GUARD_DOG:               { label: 'Guard Dog',        cat: 'special'  },
  AMBIENT_GANG_FAMILY:     { label: 'Families',         cat: 'gang'     },
  AMBIENT_GANG_BALLAS:     { label: 'Ballas',           cat: 'gang'     },
  AMBIENT_GANG_LOST:       { label: 'Lost MC',          cat: 'gang'     },
  AMBIENT_GANG_MEXICAN:    { label: 'Mexican Mafia',    cat: 'gang'     },
  AMBIENT_GANG_MARABUNTE:  { label: 'Marabunta',        cat: 'gang'     },
  AMBIENT_GANG_CULT:       { label: 'Altruist Cult',    cat: 'gang'     },
  AMBIENT_GANG_SALVA:      { label: 'Vagos (Salva)',    cat: 'gang'     },
  AMBIENT_GANG_WEICHENG:   { label: 'Wei Cheng',        cat: 'gang'     },
  AMBIENT_GANG_HILLBILLY:  { label: 'Hillbilly',        cat: 'gang'     },
  AMBIENT_GANG_JUGGALOS:   { label: 'Juggalos',         cat: 'gang'     },
  AMBIENT_GANG_LTR:        { label: 'LTR',              cat: 'gang'     },
  AMBIENT_GANG_AZTECA:     { label: 'Aztecas',          cat: 'gang'     },
  AMBIENT_GANG_CARTEL:     { label: 'Cartel',           cat: 'gang'     },
  DOMESTIC_ANIMAL:         { label: 'Domestic Animal',  cat: 'animal'   },
  CAT:                     { label: 'Cat',              cat: 'animal'   },
  HEN:                     { label: 'Hen',              cat: 'animal'   },
  WILD_ANIMAL:             { label: 'Wild Animal',      cat: 'animal'   },
  DEER:                    { label: 'Deer',             cat: 'animal'   },
  SHARK:                   { label: 'Shark',            cat: 'animal'   },
  COUGAR:                  { label: 'Cougar',           cat: 'animal'   },
  PANTHER:                 { label: 'Panther',          cat: 'animal'   },
  PREDATOR:                { label: 'Predator',         cat: 'animal'   },
  GANG_1:                  { label: 'Gang 1',           cat: 'mission'  },
  GANG_2:                  { label: 'Gang 2',           cat: 'mission'  },
  GANG_9:                  { label: 'Gang 9',           cat: 'mission'  },
  GANG_10:                 { label: 'Gang 10',          cat: 'mission'  },
  MISSION2:                { label: 'Mission 2',        cat: 'mission'  },
  MISSION3:                { label: 'Mission 3',        cat: 'mission'  },
  MISSION4:                { label: 'Mission 4',        cat: 'mission'  },
  MISSION5:                { label: 'Mission 5',        cat: 'mission'  },
  MISSION6:                { label: 'Mission 6',        cat: 'mission'  },
  MISSION7:                { label: 'Mission 7',        cat: 'mission'  },
  MISSION8:                { label: 'Mission 8',        cat: 'mission'  },
  NO_RELATIONSHIP:         { label: 'No Relationship',  cat: 'mission'  },
  SPECIAL:                 { label: 'Special',          cat: 'mission'  },
};

// ── Vanilla relationships (source → targets) ──────────
// Parsed from GTA 5 vanilla relationships.dat
// Format: VANILLA_RULES[sourceGroup][targetGroup] = 'Hate'|'Dislike'|'Like'|'Respect'
const VANILLA_RULES = {
  PLAYER: {
    PLAYER: 'Like',
  },
  CIVMALE: {},
  CIVFEMALE: {},
  COP: {
    COP: 'Respect', ARMY: 'Respect', MEDIC: 'Respect', FIREMAN: 'Respect',
    SECURITY_GUARD: 'Like', PRIVATE_SECURITY: 'Like',
    AMBIENT_GANG_FAMILY: 'Dislike', AMBIENT_GANG_MEXICAN: 'Dislike',
    AMBIENT_GANG_MARABUNTE: 'Dislike', AMBIENT_GANG_LOST: 'Dislike',
    AMBIENT_GANG_BALLAS: 'Dislike', AMBIENT_GANG_CULT: 'Dislike',
    AMBIENT_GANG_SALVA: 'Dislike', AMBIENT_GANG_WEICHENG: 'Dislike',
    AMBIENT_GANG_HILLBILLY: 'Dislike', DEALER: 'Dislike',
    AMBIENT_GANG_JUGGALOS: 'Dislike',
  },
  ARMY: {
    COP: 'Respect', ARMY: 'Respect', MEDIC: 'Respect', FIREMAN: 'Respect',
    SECURITY_GUARD: 'Like', PRIVATE_SECURITY: 'Like',
  },
  SECURITY_GUARD: {
    SECURITY_GUARD: 'Respect',
    COP: 'Like', ARMY: 'Like', PRIVATE_SECURITY: 'Like', GUARD_DOG: 'Like',
  },
  PRIVATE_SECURITY: {
    PRIVATE_SECURITY: 'Respect',
    COP: 'Like', ARMY: 'Like', SECURITY_GUARD: 'Like', GUARD_DOG: 'Like',
    AMBIENT_GANG_CARTEL: 'Hate',
  },
  FIREMAN: {
    COP: 'Respect', ARMY: 'Respect', MEDIC: 'Respect', FIREMAN: 'Respect',
    SECURITY_GUARD: 'Like', PRIVATE_SECURITY: 'Like',
  },
  MEDIC: {
    COP: 'Respect', ARMY: 'Respect', MEDIC: 'Respect', FIREMAN: 'Respect',
    SECURITY_GUARD: 'Like', PRIVATE_SECURITY: 'Like',
  },
  GANG_1:   { GANG_1:   'Respect' },
  GANG_2:   { GANG_2:   'Respect' },
  GANG_9:   { GANG_9:   'Respect' },
  GANG_10:  { GANG_10:  'Respect' },
  MISSION2: {},
  MISSION3: {},
  MISSION4: {},
  MISSION5: {},
  MISSION6: {},
  MISSION7: {},
  MISSION8: {},
  NO_RELATIONSHIP: {},
  SPECIAL: {},
  DEALER: {
    DEALER: 'Like',
    COP: 'Dislike',
    AMBIENT_GANG_SALVA: 'Hate',
  },
  PRISONER: {
    PRISONER: 'Like',
    COP: 'Dislike', SECURITY_GUARD: 'Dislike', GUARD_DOG: 'Dislike', ARMY: 'Dislike',
    PLAYER: 'Hate',
  },
  HATES_PLAYER: {
    PLAYER: 'Hate',
    HATES_PLAYER: 'Like', AGGRESSIVE_INVESTIGATE: 'Like',
  },
  AGGRESSIVE_INVESTIGATE: {
    PLAYER: 'Hate',
    HATES_PLAYER: 'Like', AGGRESSIVE_INVESTIGATE: 'Like',
  },
  GUARD_DOG: {
    GUARD_DOG: 'Like', CIVMALE: 'Like', CIVFEMALE: 'Like',
    SECURITY_GUARD: 'Like', PRIVATE_SECURITY: 'Like',
    AMBIENT_GANG_LOST: 'Like', AMBIENT_GANG_MEXICAN: 'Like',
    AMBIENT_GANG_FAMILY: 'Like', AMBIENT_GANG_BALLAS: 'Like',
    AMBIENT_GANG_MARABUNTE: 'Like', AMBIENT_GANG_CULT: 'Like',
    AMBIENT_GANG_SALVA: 'Like', AMBIENT_GANG_AZTECA: 'Like',
    AMBIENT_GANG_WEICHENG: 'Like', AMBIENT_GANG_HILLBILLY: 'Like',
    AMBIENT_GANG_CARTEL: 'Like',
  },
  AMBIENT_GANG_FAMILY: {
    AMBIENT_GANG_FAMILY: 'Respect',
    GUARD_DOG: 'Like', PLAYER: 'Like', AMBIENT_GANG_JUGGALOS: 'Like',
    COP: 'Dislike',
    AMBIENT_GANG_LTR: 'Hate', AMBIENT_GANG_AZTECA: 'Hate',
    AMBIENT_GANG_BALLAS: 'Hate', AMBIENT_GANG_CULT: 'Hate',
    AMBIENT_GANG_LOST: 'Hate', AMBIENT_GANG_WEICHENG: 'Hate',
    AMBIENT_GANG_SALVA: 'Hate', AMBIENT_GANG_HILLBILLY: 'Hate',
    AMBIENT_GANG_MARABUNTE: 'Hate', AMBIENT_GANG_MEXICAN: 'Hate',
  },
  AMBIENT_GANG_BALLAS: {
    AMBIENT_GANG_BALLAS: 'Respect',
    GUARD_DOG: 'Like', AMBIENT_GANG_HILLBILLY: 'Like', AMBIENT_GANG_LOST: 'Like',
    PLAYER: 'Dislike', COP: 'Dislike',
    AMBIENT_GANG_LTR: 'Hate', AMBIENT_GANG_AZTECA: 'Hate',
    AMBIENT_GANG_CULT: 'Hate', AMBIENT_GANG_FAMILY: 'Hate',
    AMBIENT_GANG_WEICHENG: 'Hate', AMBIENT_GANG_SALVA: 'Hate',
    AMBIENT_GANG_MARABUNTE: 'Hate', AMBIENT_GANG_MEXICAN: 'Hate',
    AMBIENT_GANG_JUGGALOS: 'Hate',
  },
  AMBIENT_GANG_LOST: {
    AMBIENT_GANG_LOST: 'Respect',
    GUARD_DOG: 'Like', AMBIENT_GANG_BALLAS: 'Like',
    COP: 'Dislike',
    AMBIENT_GANG_LTR: 'Hate', AMBIENT_GANG_AZTECA: 'Hate',
    AMBIENT_GANG_CULT: 'Hate', AMBIENT_GANG_FAMILY: 'Hate',
    AMBIENT_GANG_WEICHENG: 'Hate', AMBIENT_GANG_HILLBILLY: 'Hate',
    AMBIENT_GANG_MARABUNTE: 'Hate', AMBIENT_GANG_MEXICAN: 'Hate',
    AMBIENT_GANG_JUGGALOS: 'Hate', AMBIENT_GANG_SALVA: 'Hate',
  },
  AMBIENT_GANG_MEXICAN: {
    AMBIENT_GANG_MEXICAN: 'Respect',
    GUARD_DOG: 'Like', AMBIENT_GANG_WEICHENG: 'Like',
    PLAYER: 'Dislike', COP: 'Dislike',
    AMBIENT_GANG_LTR: 'Hate', AMBIENT_GANG_AZTECA: 'Hate',
    AMBIENT_GANG_BALLAS: 'Hate', AMBIENT_GANG_CULT: 'Hate',
    AMBIENT_GANG_FAMILY: 'Hate', AMBIENT_GANG_SALVA: 'Hate',
    AMBIENT_GANG_HILLBILLY: 'Hate', AMBIENT_GANG_MARABUNTE: 'Hate',
    AMBIENT_GANG_LOST: 'Hate', AMBIENT_GANG_JUGGALOS: 'Hate',
  },
  AMBIENT_GANG_MARABUNTE: {
    AMBIENT_GANG_MARABUNTE: 'Respect',
    GUARD_DOG: 'Like',
    PLAYER: 'Dislike', COP: 'Dislike',
    AMBIENT_GANG_LTR: 'Hate', AMBIENT_GANG_AZTECA: 'Hate',
    AMBIENT_GANG_BALLAS: 'Hate', AMBIENT_GANG_CULT: 'Hate',
    AMBIENT_GANG_FAMILY: 'Hate', AMBIENT_GANG_WEICHENG: 'Hate',
    AMBIENT_GANG_SALVA: 'Hate', AMBIENT_GANG_HILLBILLY: 'Hate',
    AMBIENT_GANG_LOST: 'Hate', AMBIENT_GANG_MEXICAN: 'Hate',
    AMBIENT_GANG_JUGGALOS: 'Hate',
  },
  AMBIENT_GANG_CULT: {
    AMBIENT_GANG_CULT: 'Respect',
    GUARD_DOG: 'Like',
    PLAYER: 'Dislike', COP: 'Dislike',
    AMBIENT_GANG_LTR: 'Hate', AMBIENT_GANG_AZTECA: 'Hate',
    AMBIENT_GANG_BALLAS: 'Hate', AMBIENT_GANG_LOST: 'Hate',
    AMBIENT_GANG_FAMILY: 'Hate', AMBIENT_GANG_WEICHENG: 'Hate',
    AMBIENT_GANG_SALVA: 'Hate', AMBIENT_GANG_HILLBILLY: 'Hate',
    AMBIENT_GANG_MARABUNTE: 'Hate', AMBIENT_GANG_MEXICAN: 'Hate',
    AMBIENT_GANG_JUGGALOS: 'Hate',
  },
  AMBIENT_GANG_SALVA: {
    AMBIENT_GANG_SALVA: 'Respect',
    GUARD_DOG: 'Like',
    PLAYER: 'Dislike', COP: 'Dislike',
    AMBIENT_GANG_LTR: 'Hate', AMBIENT_GANG_AZTECA: 'Hate',
    AMBIENT_GANG_BALLAS: 'Hate', AMBIENT_GANG_CULT: 'Hate',
    AMBIENT_GANG_FAMILY: 'Hate', AMBIENT_GANG_WEICHENG: 'Hate',
    AMBIENT_GANG_HILLBILLY: 'Hate', AMBIENT_GANG_MARABUNTE: 'Hate',
    AMBIENT_GANG_MEXICAN: 'Hate', AMBIENT_GANG_JUGGALOS: 'Hate',
    AMBIENT_GANG_LOST: 'Hate',
  },
  AMBIENT_GANG_WEICHENG: {
    AMBIENT_GANG_WEICHENG: 'Respect',
    GUARD_DOG: 'Like', AMBIENT_GANG_MEXICAN: 'Like',
    PLAYER: 'Dislike', COP: 'Dislike',
    AMBIENT_GANG_LTR: 'Hate', AMBIENT_GANG_AZTECA: 'Hate',
    AMBIENT_GANG_BALLAS: 'Hate', AMBIENT_GANG_CULT: 'Hate',
    AMBIENT_GANG_FAMILY: 'Hate', AMBIENT_GANG_LOST: 'Hate',
    AMBIENT_GANG_SALVA: 'Hate', AMBIENT_GANG_HILLBILLY: 'Hate',
    AMBIENT_GANG_MARABUNTE: 'Hate', AMBIENT_GANG_JUGGALOS: 'Hate',
  },
  AMBIENT_GANG_HILLBILLY: {
    AMBIENT_GANG_HILLBILLY: 'Respect',
    GUARD_DOG: 'Like', AMBIENT_GANG_BALLAS: 'Like',
    PLAYER: 'Dislike', COP: 'Dislike',
    AMBIENT_GANG_LTR: 'Hate', AMBIENT_GANG_AZTECA: 'Hate',
    AMBIENT_GANG_CULT: 'Hate', AMBIENT_GANG_FAMILY: 'Hate',
    AMBIENT_GANG_WEICHENG: 'Hate', AMBIENT_GANG_SALVA: 'Hate',
    AMBIENT_GANG_LOST: 'Hate', AMBIENT_GANG_MARABUNTE: 'Hate',
    AMBIENT_GANG_MEXICAN: 'Hate', AMBIENT_GANG_JUGGALOS: 'Hate',
  },
  AMBIENT_GANG_JUGGALOS: {
    AMBIENT_GANG_JUGGALOS: 'Respect',
    PLAYER: 'Like', AMBIENT_GANG_FAMILY: 'Like',
    COP: 'Dislike',
    AMBIENT_GANG_LTR: 'Hate', AMBIENT_GANG_AZTECA: 'Hate',
    AMBIENT_GANG_BALLAS: 'Hate', AMBIENT_GANG_CULT: 'Hate',
    AMBIENT_GANG_WEICHENG: 'Hate', AMBIENT_GANG_SALVA: 'Hate',
    AMBIENT_GANG_LOST: 'Hate', AMBIENT_GANG_MARABUNTE: 'Hate',
    AMBIENT_GANG_MEXICAN: 'Hate', AMBIENT_GANG_HILLBILLY: 'Hate',
  },
  AMBIENT_GANG_LTR: {
    AMBIENT_GANG_LTR: 'Respect',
    COP: 'Dislike', SECURITY_GUARD: 'Dislike',
    // Note: vanilla .dat has typo "AMBIENT_GANG_LOST TR" — corrected here to AMBIENT_GANG_LOST
    AMBIENT_GANG_LOST: 'Hate', AMBIENT_GANG_AZTECA: 'Hate',
    AMBIENT_GANG_BALLAS: 'Hate', AMBIENT_GANG_CULT: 'Hate',
    AMBIENT_GANG_FAMILY: 'Hate', AMBIENT_GANG_WEICHENG: 'Hate',
    AMBIENT_GANG_SALVA: 'Hate', AMBIENT_GANG_MARABUNTE: 'Hate',
    AMBIENT_GANG_MEXICAN: 'Hate', AMBIENT_GANG_HILLBILLY: 'Hate',
    AMBIENT_GANG_JUGGALOS: 'Hate',
  },
  AMBIENT_GANG_AZTECA: {
    AMBIENT_GANG_AZTECA: 'Respect',
    COP: 'Dislike', SECURITY_GUARD: 'Dislike', PLAYER: 'Dislike',
    AMBIENT_GANG_LTR: 'Hate', AMBIENT_GANG_CULT: 'Hate',
    AMBIENT_GANG_FAMILY: 'Hate', AMBIENT_GANG_WEICHENG: 'Hate',
    AMBIENT_GANG_HILLBILLY: 'Hate', AMBIENT_GANG_MARABUNTE: 'Hate',
    AMBIENT_GANG_MEXICAN: 'Hate', AMBIENT_GANG_JUGGALOS: 'Hate',
  },
  AMBIENT_GANG_CARTEL: {
    AMBIENT_GANG_CARTEL: 'Respect',
    GUARD_DOG: 'Like',
    COP: 'Hate', ARMY: 'Hate', PRIVATE_SECURITY: 'Hate',
  },
  DOMESTIC_ANIMAL: {
    PLAYER: 'Like', CIVMALE: 'Like', CIVFEMALE: 'Like', COP: 'Like',
    SECURITY_GUARD: 'Like', DOMESTIC_ANIMAL: 'Like', FIREMAN: 'Like',
    GANG_1: 'Like', GANG_2: 'Like', GANG_9: 'Like', GANG_10: 'Like',
    AMBIENT_GANG_LOST: 'Like', AMBIENT_GANG_MEXICAN: 'Like',
    AMBIENT_GANG_BALLAS: 'Like', AMBIENT_GANG_FAMILY: 'Like',
    DEALER: 'Like', HATES_PLAYER: 'Like',
  },
  CAT: {
    PLAYER: 'Like', CIVMALE: 'Like', CIVFEMALE: 'Like', COP: 'Like',
    SECURITY_GUARD: 'Like', DOMESTIC_ANIMAL: 'Like', FIREMAN: 'Like',
    GANG_1: 'Like', GANG_2: 'Like', GANG_9: 'Like', GANG_10: 'Like',
    AMBIENT_GANG_LOST: 'Like', AMBIENT_GANG_MEXICAN: 'Like',
    AMBIENT_GANG_BALLAS: 'Like', AMBIENT_GANG_FAMILY: 'Like',
    DEALER: 'Like', HATES_PLAYER: 'Like',
  },
  HEN: {
    PLAYER: 'Dislike',
  },
  WILD_ANIMAL: {
    PLAYER: 'Hate', CIVMALE: 'Hate', CIVFEMALE: 'Hate', COP: 'Hate',
    SECURITY_GUARD: 'Hate', FIREMAN: 'Hate',
    GANG_1: 'Hate', GANG_2: 'Hate', GANG_9: 'Hate', GANG_10: 'Hate',
    AMBIENT_GANG_LOST: 'Hate', AMBIENT_GANG_MEXICAN: 'Hate',
    AMBIENT_GANG_BALLAS: 'Hate', AMBIENT_GANG_FAMILY: 'Hate',
    DEALER: 'Hate', HATES_PLAYER: 'Hate',
  },
  DEER: {
    DEER: 'Respect',
    PLAYER: 'Hate', CIVMALE: 'Hate', CIVFEMALE: 'Hate', COP: 'Hate',
    SECURITY_GUARD: 'Hate', FIREMAN: 'Hate',
    GANG_1: 'Hate', GANG_2: 'Hate', GANG_9: 'Hate', GANG_10: 'Hate',
    AMBIENT_GANG_LOST: 'Hate', AMBIENT_GANG_MEXICAN: 'Hate',
    AMBIENT_GANG_BALLAS: 'Hate', AMBIENT_GANG_FAMILY: 'Hate',
    DEALER: 'Hate', HATES_PLAYER: 'Hate',
  },
  SHARK: {
    PLAYER: 'Hate', CIVMALE: 'Hate', CIVFEMALE: 'Hate', COP: 'Hate',
    SECURITY_GUARD: 'Hate', FIREMAN: 'Hate',
    AMBIENT_GANG_LOST: 'Hate', AMBIENT_GANG_MEXICAN: 'Hate',
    AMBIENT_GANG_BALLAS: 'Hate', AMBIENT_GANG_FAMILY: 'Hate',
    DEALER: 'Hate', HATES_PLAYER: 'Hate',
  },
  COUGAR: {
    COUGAR: 'Like',
    PLAYER: 'Hate', CIVMALE: 'Hate', CIVFEMALE: 'Hate',
    SECURITY_GUARD: 'Hate', PRIVATE_SECURITY: 'Hate', COP: 'Hate', ARMY: 'Hate',
    FIREMAN: 'Hate', PRISONER: 'Hate',
    AMBIENT_GANG_LOST: 'Hate', AMBIENT_GANG_MEXICAN: 'Hate',
    AMBIENT_GANG_FAMILY: 'Hate', AMBIENT_GANG_BALLAS: 'Hate',
    AMBIENT_GANG_MARABUNTE: 'Hate', AMBIENT_GANG_CULT: 'Hate',
    AMBIENT_GANG_SALVA: 'Hate', AMBIENT_GANG_WEICHENG: 'Hate',
    AMBIENT_GANG_HILLBILLY: 'Hate',
    CAT: 'Hate', GUARD_DOG: 'Hate', DOMESTIC_ANIMAL: 'Hate',
  },
  PANTHER: {
    PANTHER: 'Like', AMBIENT_GANG_CARTEL: 'Like',
    CIVMALE: 'Hate', CIVFEMALE: 'Hate',
    SECURITY_GUARD: 'Hate', PRIVATE_SECURITY: 'Hate', COP: 'Hate', ARMY: 'Hate',
    FIREMAN: 'Hate', PRISONER: 'Hate',
    AMBIENT_GANG_LOST: 'Hate', AMBIENT_GANG_MEXICAN: 'Hate',
    AMBIENT_GANG_FAMILY: 'Hate', AMBIENT_GANG_BALLAS: 'Hate',
    AMBIENT_GANG_MARABUNTE: 'Hate', AMBIENT_GANG_CULT: 'Hate',
    AMBIENT_GANG_SALVA: 'Hate', AMBIENT_GANG_WEICHENG: 'Hate',
    AMBIENT_GANG_HILLBILLY: 'Hate',
    CAT: 'Hate', GUARD_DOG: 'Hate', DOMESTIC_ANIMAL: 'Hate',
  },
  PREDATOR: {
    CIVMALE: 'Hate', CIVFEMALE: 'Hate',
    SECURITY_GUARD: 'Hate', PRIVATE_SECURITY: 'Hate',
    COP: 'Hate', MEDIC: 'Hate', ARMY: 'Hate',
    FIREMAN: 'Hate', PRISONER: 'Hate',
    AMBIENT_GANG_LOST: 'Hate', AMBIENT_GANG_MEXICAN: 'Hate',
    AMBIENT_GANG_FAMILY: 'Hate', AMBIENT_GANG_BALLAS: 'Hate',
    AMBIENT_GANG_MARABUNTE: 'Hate', AMBIENT_GANG_CULT: 'Hate',
    AMBIENT_GANG_SALVA: 'Hate', AMBIENT_GANG_WEICHENG: 'Hate',
    AMBIENT_GANG_HILLBILLY: 'Hate',
    CAT: 'Hate', GUARD_DOG: 'Hate', DOMESTIC_ANIMAL: 'Hate',
  },
};

// ── State ─────────────────────────────────────────────
let relState = {
  // Deep clone of vanilla rules (current session data)
  rules: null,
  // Overrides vs vanilla { 'PLAYER→BALLAS': 'Hate' }
  mods: {},
  // Active category filters
  activeCats: new Set(['civilian', 'law', 'special', 'gang']),
  // Edit mode
  editMode: false,
  // Loaded file name
  loadedFile: null,
};
window.relState = relState;

// ── Helpers ───────────────────────────────────────────
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getTier(source, target) {
  return (relState.rules[source] || {})[target] || '';
}

function setTier(source, target, tier) {
  if (!relState.rules[source]) relState.rules[source] = {};
  if (tier === '') {
    delete relState.rules[source][target];
  } else {
    relState.rules[source][target] = tier;
  }

  const key = `${source}→${target}`;
  const vanilla = (VANILLA_RULES[source] || {})[target] || '';
  if (tier === vanilla) {
    delete relState.mods[key];
  } else {
    relState.mods[key] = tier;
  }
}

function getModCount() {
  return Object.keys(relState.mods).length;
}

function visibleGroups() {
  return ALL_GROUPS.filter(g => {
    const meta = GROUP_META[g];
    return meta && relState.activeCats.has(meta.cat);
  });
}

// ── Toast ─────────────────────────────────────────────
let _toastTimer = null;
function showToast(msg, type = '') {
  const el = document.getElementById('relToast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'show' + (type ? ' ' + type : '');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = ''; }, 3000);
}

// ── Stats panel ───────────────────────────────────────
function updateStats() {
  let counts = { Hate: 0, Dislike: 0, Like: 0, Respect: 0 };
  for (const src of ALL_GROUPS) {
    const srcRules = relState.rules[src] || {};
    for (const [tgt, tier] of Object.entries(srcRules)) {
      if (counts[tier] !== undefined) counts[tier]++;
    }
  }
  const cont = document.getElementById('relStats');
  if (!cont) return;
  cont.innerHTML = TIERS.map(t =>
    `<span class="rel-stat-pill ${t.toLowerCase()}">${t}: <strong>${counts[t]}</strong></span>`
  ).join('');

  const modCount = document.getElementById('relModCount');
  if (modCount) {
    const n = getModCount();
    modCount.textContent = `${n} unsaved change${n !== 1 ? 's' : ''}`;
    modCount.classList.toggle('visible', n > 0);
  }
}

// ── Matrix render ─────────────────────────────────────
function renderMatrix() {
  const wrap = document.getElementById('relMatrixWrap');
  if (!wrap) return;

  const groups = visibleGroups();
  if (groups.length === 0) {
    wrap.innerHTML = '<div style="padding:24px;text-align:center;color:var(--color-text-muted)">Select at least one category to show groups.</div>';
    return;
  }

  const tbl = document.createElement('table');
  tbl.className = 'rel-matrix';

  // ── Header row ─────────────────────────────────────
  const thead = tbl.createTHead();
  const hr = thead.insertRow();

  // Corner cell
  const corner = document.createElement('th');
  corner.className = 'rel-corner';
  corner.innerHTML = '<span style="font-size:10px;color:var(--color-text-muted)">SOURCE →<br>TARGET ↓</span>';
  hr.appendChild(corner);

  // Column headers
  for (const tgt of groups) {
    const th = document.createElement('th');
    th.className = 'rel-col-header';
    th.title = tgt;
    const cat = (GROUP_META[tgt] || {}).cat || '';
    th.setAttribute('data-cat', cat);

    const label = document.createElement('span');
    label.className = 'rel-col-label';
    label.textContent = (GROUP_META[tgt] || {}).label || tgt;
    th.appendChild(label);
    hr.appendChild(th);
  }

  // ── Body rows ──────────────────────────────────────
  const tbody = tbl.createTBody();
  for (const src of groups) {
    const row = tbody.insertRow();
    const meta = GROUP_META[src] || {};

    // Row header
    const th = document.createElement('th');
    th.className = 'rel-row-header';
    th.title = src;
    th.innerHTML = `<div class="rel-row-label">
      <span class="rel-row-cat-dot" data-cat="${meta.cat || ''}"></span>
      ${meta.label || src}
    </div>`;
    row.appendChild(th);

    // Data cells
    for (const tgt of groups) {
      const td = document.createElement('td');
      td.className = 'rel-cell';
      const isSelf = (src === tgt);

      if (isSelf) {
        td.classList.add('self');
        td.title = `${meta.label || src} → self`;
      } else {
        if (relState.editMode) td.classList.add('editable');
        td.setAttribute('data-src', src);
        td.setAttribute('data-tgt', tgt);
        const tier = getTier(src, tgt);
        td.setAttribute('data-tier', tier);

        const key = `${src}→${tgt}`;
        if (relState.mods[key] !== undefined) td.classList.add('modified');

        const srcLabel = (GROUP_META[src] || {}).label || src;
        const tgtLabel = (GROUP_META[tgt] || {}).label || tgt;
        td.title = `${srcLabel} → ${tgtLabel}: ${tier || 'No relationship'}`;

        if (tier) {
          const chip = document.createElement('span');
          chip.className = `rel-tier-chip ${tier}`;
          chip.textContent = tier;
          td.appendChild(chip);
        }
      }

      row.appendChild(td);
    }
  }

  wrap.innerHTML = '';
  wrap.appendChild(tbl);

  // Attach click handler for edit mode
  tbl.addEventListener('click', onCellClick);
}

// ── Cell click (edit mode) ────────────────────────────
function onCellClick(e) {
  if (!relState.editMode) return;
  const td = e.target.closest('td.rel-cell.editable');
  if (!td) return;

  const src = td.getAttribute('data-src');
  const tgt = td.getAttribute('data-tgt');
  if (!src || !tgt) return;

  const current = getTier(src, tgt);
  const idx = TIER_CYCLE.indexOf(current);
  const next = TIER_CYCLE[(idx + 1) % TIER_CYCLE.length];

  setTier(src, tgt, next);

  // Update cell in-place without full re-render
  td.setAttribute('data-tier', next);
  td.innerHTML = '';
  if (next) {
    const chip = document.createElement('span');
    chip.className = `rel-tier-chip ${next}`;
    chip.textContent = next;
    td.appendChild(chip);
  }

  const key = `${src}→${tgt}`;
  td.classList.toggle('modified', relState.mods[key] !== undefined);

  const srcLabel = (GROUP_META[src] || {}).label || src;
  const tgtLabel = (GROUP_META[tgt] || {}).label || tgt;
  td.title = `${srcLabel} → ${tgtLabel}: ${next || 'No relationship'}`;

  updateStats();
}

// ── Parse .dat file ───────────────────────────────────
function parseDatFile(text) {
  const lines = text.replace(/\r/g, '').split('\n');
  const rules = {};
  let currentSrc = null;

  for (let raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // Indented line = relationship rule
    if (raw.match(/^\s+/) && currentSrc) {
      const parts = line.split(/\s+/);
      const tier = parts[0];
      if (!TIERS.includes(tier)) continue;

      const targets = parts.slice(1);
      if (!rules[currentSrc]) rules[currentSrc] = {};
      for (const t of targets) {
        const tClean = t.trim();
        if (tClean) rules[currentSrc][tClean] = tier;
      }
    } else {
      // Group header — only capture first occurrence (header registry has duplicates)
      const g = line.split(/\s+/)[0];
      if (g && !rules[g]) {
        rules[g] = {};
        currentSrc = g;
      } else if (g && rules[g] !== undefined) {
        // Second pass (body section — same group name again)
        currentSrc = g;
      }
    }
  }

  return rules;
}

// ── Export to .dat ────────────────────────────────────
function exportToDat() {
  const header = [
    '#\tAcquaintance options:',
    '#\t- Hate',
    '#\t- Dislike',
    '#\t- Like',
    '#\t- Respect',
  ];

  // Registry section (all groups, one per line)
  const registry = ALL_GROUPS.map(g => g);

  // Body section
  const bodyLines = [];
  bodyLines.push('#');
  for (const src of ALL_GROUPS) {
    bodyLines.push(src);
    const srcRules = relState.rules[src] || {};
    // Group by tier
    const byTier = { Hate: [], Dislike: [], Like: [], Respect: [] };
    for (const [tgt, tier] of Object.entries(srcRules)) {
      if (byTier[tier]) byTier[tier].push(tgt);
    }
    for (const tier of TIERS) {
      if (byTier[tier].length > 0) {
        bodyLines.push(`\t${tier} ${byTier[tier].join(' ')}`);
      }
    }
  }

  return [...header, ...registry, ...bodyLines].join('\r\n') + '\r\n';
}

// ── Download file ─────────────────────────────────────
function downloadDat(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

// ── Reset to vanilla ──────────────────────────────────
function resetToVanilla() {
  relState.rules = deepClone(VANILLA_RULES);
  relState.mods = {};
  relState.loadedFile = null;
  const dropZone = document.getElementById('relDropZone');
  if (dropZone) {
    dropZone.removeAttribute('data-state');
    dropZone.querySelector('.rel-drop-state-text').textContent = '';
  }
  renderMatrix();
  updateStats();
  showToast('Reset to vanilla GTA 5 relationships', 'success');
}

// ── Drop zone setup ───────────────────────────────────
function initDropZone() {
  const zone = document.getElementById('relDropZone');
  const input = document.getElementById('relFileInput');
  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  });
  input.addEventListener('change', () => {
    if (input.files[0]) loadFile(input.files[0]);
    input.value = '';
  });
}

function loadFile(file) {
  const zone = document.getElementById('relDropZone');
  const stateText = zone && zone.querySelector('.rel-drop-state-text');

  if (!file.name.endsWith('.dat')) {
    if (zone) zone.setAttribute('data-state', 'error');
    if (stateText) stateText.textContent = 'Invalid file — must be a .dat file';
    showToast('Invalid file — must be a .dat file', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = parseDatFile(e.target.result);
      // Merge parsed rules with existing structure (keep ALL_GROUPS order)
      const merged = deepClone(VANILLA_RULES);
      for (const src of Object.keys(parsed)) {
        if (!merged[src]) merged[src] = {};
        merged[src] = parsed[src];
      }
      relState.rules = merged;

      // Compute mods vs vanilla
      relState.mods = {};
      for (const src of ALL_GROUPS) {
        const cur = relState.rules[src] || {};
        const van = VANILLA_RULES[src] || {};
        const allTgts = new Set([...Object.keys(cur), ...Object.keys(van)]);
        for (const tgt of allTgts) {
          if ((cur[tgt] || '') !== (van[tgt] || '')) {
            relState.mods[`${src}→${tgt}`] = cur[tgt] || '';
          }
        }
      }

      relState.loadedFile = file.name;
      if (zone) zone.setAttribute('data-state', 'success');
      if (stateText) stateText.textContent = `Loaded: ${file.name}`;

      renderMatrix();
      updateStats();
      showToast(`Loaded ${file.name}`, 'success');
    } catch (err) {
      if (zone) zone.setAttribute('data-state', 'error');
      if (stateText) stateText.textContent = 'Parse error — check file format';
      showToast('Failed to parse file', 'error');
      console.error('[RelEditor] parse error', err);
    }
  };
  reader.readAsText(file);
}

// ── Category filter chips ─────────────────────────────
function initCatChips() {
  document.querySelectorAll('.rel-cat-chip').forEach(chip => {
    const cat = chip.getAttribute('data-cat');
    if (relState.activeCats.has(cat)) chip.classList.add('active');

    chip.addEventListener('click', () => {
      if (relState.activeCats.has(cat)) {
        // Don't allow deselecting all
        if (relState.activeCats.size <= 1) return;
        relState.activeCats.delete(cat);
        chip.classList.remove('active');
      } else {
        relState.activeCats.add(cat);
        chip.classList.add('active');
      }
      renderMatrix();
    });
  });
}

// ── Edit mode toggle ──────────────────────────────────
function initEditToggle() {
  const btn = document.getElementById('relEditToggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    relState.editMode = !relState.editMode;
    btn.classList.toggle('active', relState.editMode);
    btn.querySelector('.rel-edit-label').textContent = relState.editMode ? 'Editing ON' : 'Edit Mode';
    // Re-render to add/remove editable class
    renderMatrix();
  });
}

// ── Export buttons ────────────────────────────────────
function initExport() {
  const btnExport = document.getElementById('relExportBtn');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const content = exportToDat();
      const name = relState.loadedFile || 'relationships.dat';
      downloadDat(content, name);
      showToast(`Exported ${name}`, 'success');
    });
  }

  const btnReset = document.getElementById('relResetBtn');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (getModCount() > 0) {
        if (!confirm('Reset all changes and restore vanilla relationships?')) return;
      }
      resetToVanilla();
    });
  }
}

// ── Init ──────────────────────────────────────────────
function initRelationshipsEditor() {
  relState.rules = deepClone(VANILLA_RULES);

  initDropZone();
  initCatChips();
  initEditToggle();
  initExport();
  renderMatrix();
  updateStats();
}

document.addEventListener('DOMContentLoaded'