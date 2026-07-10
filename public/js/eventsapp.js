'use strict';
/* =====================================================
   eventsapp.js — events.meta Decision Maker Editor
   ===================================================== */

/* ─── Embedded vanilla NPC profiles ─── */
const VANILLA_PROFILES = {
  PLAYER: { parent: null, category: 'law', responses: [] },
  COP: { parent: 'HOSTILE', category: 'law', responses: [
    'COP_RESPONSE_WANTED','COP_RESPONSE_EXPLOSION','COP_RESPONSE_STUDIO_BOMB',
    'COP_RESPONSE_SHOCKING_INJURED_PED','COP_RESPONSE_SHOCKING_PED_RUN_OVER',
    'COP_RESPONSE_SHOCKING_DEAD_BODY','COP_RESPONSE_CRIME_CRY_FOR_HELP',
    'COP_RESPONSE_SEEN_PED_KILLED','COP_RESPONSE_SHOCKING_SEEN_MELEE_ACTION',
    'COP_RESPONSE_SHOCKING_VISIBLE_WEAPON','DEFAULT_RESPONSE_SHOCKING_SEEN_WEAPON_THREAT',
    'INVESTIGATE_RESPONSE_MUGGING','DEFAULT_RESPONSE_SHOCKING_SIREN',
    'COP_RESPONSE_SHOCKING_CAR_ALARM','AGITATED_RESPONSE_SHOCKING_PED_KNOCKED_INTO',
    'COP_RESPONSE_PROPERTY_DAMAGE','COP_RESPONSE_BROKEN_GLASS','COP_RESPONSE_DISTURBANCE',
    'COP_RESPONSE_SUSPICIOUS_ACTIVITY','COP_RESPONSE_COP_CAR_BEING_STOLEN',
    'COP_RESPONSE_SHOCKING_CAR_CRASH','COP_RESPONSE_SHOCKING_BICYCLE_CRASH',
    'COP_RESPONSE_SHOCKING_MAD_DRIVER_BICYCLE','COP_RESPONSE_SHOCKING_MAD_DRIVER',
    'COP_RESPONSE_SHOCKING_MAD_DRIVER_EXTREME'
  ]},
  FIREMAN: { parent: null, category: 'emergency', responses: [
    'DEFAULT_RESPONSE_DAMAGE','FIREMAN_RESPONSE_SHOT_FIRED',
    'FIREMAN_RESPONSE_SHOT_FIRED_WHIZZED_BY','FIREMAN_RESPONSE_SHOT_FIRED_BULLET_IMPACT',
    'DEFAULT_RESPONSE_GUN_AIMED_AT','DEFAULT_RESPONSE_HATE','DEFAULT_RESPONSE_VEHICLE_ON_FIRE',
    'DEFAULT_RESPONSE_POTENTIAL_WALK_INTO_FIRE','DEFAULT_RESPONSE_MELEE',
    'DEFAULT_RESPONSE_EVENT_DRAGGED_OUT_CAR','DEFAULT_RESPONSE_EVENT_PED_ENTERED_MY_VEHICLE',
    'DEFAULT_RESPONSE_POTENTIAL_GET_RUN_OVER','DEFAULT_RESPONSE_POTENTIAL_WALK_INTO_VEHICLE',
    'DEFAULT_RESPONSE_OBJECT_COLLISION','DEFAULT_RESPONSE_AGITATED',
    'DEFAULT_RESPONSE_SHOCKING_SEEN_MELEE_ACTION','DEFAULT_RESPONSE_SHOCKING_PED_KILLED',
    'DEFAULT_RESPONSE_SHOCKING_SEEN_WEAPON_THREAT','DEFAULT_RESPONSE_MUGGING',
    'DEFAULT_RESPONSE_SHOCKING_SIREN','DEFAULT_RESPONSE_SHOCKING_CAR_ALARM',
    'DEFAULT_RESPONSE_SHOCKING_DANGEROUS_ANIMAL','DEFAULT_RESPONSE_VEHICLE_DAMAGE_WEAPON',
    'FIRE_RESPONSE_SHOCKING_SEEN_CAR_STOLEN'
  ]},
  MEDIC: { parent: null, category: 'emergency', responses: [
    'DEFAULT_RESPONSE_DAMAGE','MEDIC_RESPONSE_SHOT_FIRED',
    'MEDIC_RESPONSE_SHOT_FIRED_WHIZZED_BY','MEDIC_RESPONSE_SHOT_FIRED_BULLET_IMPACT',
    'DEFAULT_RESPONSE_GUN_AIMED_AT','DEFAULT_RESPONSE_HATE','DEFAULT_RESPONSE_VEHICLE_ON_FIRE',
    'DEFAULT_RESPONSE_POTENTIAL_WALK_INTO_FIRE','DEFAULT_RESPONSE_MELEE',
    'DEFAULT_RESPONSE_EVENT_DRAGGED_OUT_CAR','DEFAULT_RESPONSE_EVENT_PED_ENTERED_MY_VEHICLE',
    'DEFAULT_RESPONSE_POTENTIAL_GET_RUN_OVER','DEFAULT_RESPONSE_POTENTIAL_WALK_INTO_VEHICLE',
    'DEFAULT_RESPONSE_OBJECT_COLLISION','DEFAULT_RESPONSE_AGITATED',
    'DEFAULT_RESPONSE_SHOCKING_PED_KILLED','MEDIC_RESPONSE_INJURED_PED',
    'DEFAULT_RESPONSE_SHOCKING_SEEN_WEAPON_THREAT','DEFAULT_RESPONSE_MUGGING',
    'DEFAULT_RESPONSE_SHOCKING_SIREN','DEFAULT_RESPONSE_SHOCKING_CAR_ALARM',
    'MEDIC_RESPONSE_SHOCKING_SEEN_CAR_STOLEN','DEFAULT_RESPONSE_SHOCKING_DANGEROUS_ANIMAL',
    'DEFAULT_RESPONSE_VEHICLE_DAMAGE_WEAPON'
  ]},
  OFFDUTY_EMT: { parent: 'DEFAULT', category: 'emergency', responses: [
    'FIREMAN_RESPONSE_SHOT_FIRED','FIREMAN_RESPONSE_SHOT_FIRED_WHIZZED_BY',
    'FIREMAN_RESPONSE_SHOT_FIRED_BULLET_IMPACT','OFFDUTY_EMT_RESPONSE_DEAD_BODY'
  ]},
  Security: { parent: 'HOSTILE', category: 'law', responses: [
    'SECURITY_RESPONSE_WANTED','SECURITY_RESPONSE_EXPLOSION',
    'DEFAULT_RESPONSE_SHOCKING_EXPLOSION','SECURITY_RESPONSE_STUDIO_BOMB',
    'SECURITY_RESPONSE_SHOCKING_INJURED_PED','SECURITY_RESPONSE_SHOCKING_PED_RUN_OVER',
    'SECURITY_RESPONSE_SHOCKING_DEAD_BODY','SECURITY_RESPONSE_CRIME_CRY_FOR_HELP',
    'COP_RESPONSE_SHOCKING_CAR_CRASH','COP_RESPONSE_SHOCKING_BICYCLE_CRASH',
    'COP_RESPONSE_SHOCKING_MAD_DRIVER','COP_RESPONSE_SHOCKING_MAD_DRIVER_EXTREME',
    'COP_RESPONSE_SHOCKING_MAD_DRIVER_BICYCLE','SECURITY_RESPONSE_SHOCKING_PED_KILLED',
    'SECURITY_RESPONSE_SHOCKING_SEEN_MELEE_ACTION','DEFAULT_RESPONSE_SHOCKING_SEEN_WEAPON_THREAT',
    'INVESTIGATE_RESPONSE_MUGGING','DEFAULT_RESPONSE_SHOCKING_SIREN',
    'DEFAULT_RESPONSE_SHOCKING_CAR_ALARM','AGITATED_RESPONSE_SHOCKING_PED_KNOCKED_INTO',
    'COP_RESPONSE_PROPERTY_DAMAGE','COP_RESPONSE_BROKEN_GLASS',
    'SECURITY_RESPONSE_SHOCKING_VISIBLE_WEAPON','COP_RESPONSE_DISTURBANCE',
    'COP_RESPONSE_SUSPICIOUS_ACTIVITY'
  ]},
  SWAT: { parent: null, category: 'law', responses: [
    'SWAT_RESPONSE_WANTED','SWAT_RESPONSE_DAMAGE','SWAT_RESPONSE_SHOT_FIRED',
    'SWAT_RESPONSE_SHOT_FIRED_WHIZZED_BY','SWAT_RESPONSE_SHOT_FIRED_BULLET_IMPACT',
    'SWAT_RESPONSE_GUN_AIMED_AT','DEFAULT_RESPONSE_VEHICLE_ON_FIRE',
    'DEFAULT_RESPONSE_POTENTIAL_WALK_INTO_FIRE','SWAT_RESPONSE_SHOUT_TARGET_POSITION',
    'SWAT_RESPONSE_MELEE','SWAT_RESPONSE_VEHICLE_DAMAGE_WEAPON','SWAT_RESPONSE_DRAGGED_OUT_CAR',
    'SWAT_RESPONSE_PED_ENTERED_MY_VEHICLE','DEFAULT_RESPONSE_POTENTIAL_WALK_INTO_VEHICLE',
    'DEFAULT_RESPONSE_OBJECT_COLLISION','COP_RESPONSE_CRIME_CRY_FOR_HELP',
    'COP_RESPONSE_SEEN_PED_KILLED','DEFAULT_RESPONSE_SHOCKING_SEEN_WEAPON_THREAT',
    'INVESTIGATE_RESPONSE_MUGGING','DEFAULT_RESPONSE_SHOCKING_SIREN',
    'COP_RESPONSE_SHOCKING_CAR_ALARM','AGITATED_RESPONSE_SHOCKING_PED_KNOCKED_INTO',
    'COP_RESPONSE_PROPERTY_DAMAGE','COP_RESPONSE_BROKEN_GLASS',
    'COP_RESPONSE_SHOCKING_VISIBLE_WEAPON','COP_RESPONSE_EXPLOSION',
    'SWAT_RESPONSE_PED_JACKING_MY_VEHICLE','SWAT_RESPONSE_COP_CAR_BEING_STOLEN',
    'DEFAULT_RESPONSE_SHOCKING_DANGEROUS_ANIMAL','DEFAULT_RESPONSE_HATE',
    'DEFAULT_RESPONSE_SHOCKING_EXPLOSION','COP_RESPONSE_STUDIO_BOMB',
    'COP_RESPONSE_SHOCKING_INJURED_PED','SECURITY_RESPONSE_SHOCKING_PED_RUN_OVER',
    'COP_RESPONSE_SHOCKING_DEAD_BODY','COP_RESPONSE_SHOCKING_SEEN_MELEE_ACTION',
    'COP_RESPONSE_DISTURBANCE','COP_RESPONSE_SUSPICIOUS_ACTIVITY',
    'COP_RESPONSE_SHOCKING_CAR_CRASH','COP_RESPONSE_SHOCKING_BICYCLE_CRASH',
    'COP_RESPONSE_SHOCKING_MAD_DRIVER_BICYCLE','COP_RESPONSE_SHOCKING_MAD_DRIVER',
    'COP_RESPONSE_SHOCKING_MAD_DRIVER_EXTREME','COMBAT_RESPONSE_PROVIDING_COVER'
  ]},
  EMPTY:   { parent: null, category: 'abstract', responses: [] },
  BASE: { parent: null, category: 'abstract', responses: [
    'DEFAULT_RESPONSE_DAMAGE','DEFAULT_RESPONSE_EXPLOSION','DEFAULT_RESPONSE_SHOT_FIRED',
    'DEFAULT_RESPONSE_SHOT_FIRED_WHIZZED_BY','DEFAULT_RESPONSE_SHOT_FIRED_BULLET_IMPACT',
    'DEFAULT_RESPONSE_GUN_AIMED_AT','DEFAULT_RESPONSE_HATE','DEFAULT_RESPONSE_VEHICLE_ON_FIRE',
    'DEFAULT_RESPONSE_POTENTIAL_WALK_INTO_FIRE','DEFAULT_RESPONSE_SHOUT_TARGET_POSITION',
    'DEFAULT_RESPONSE_INJURED_CRY_FOR_HELP','DEFAULT_RESPONSE_MELEE',
    'DEFAULT_RESPONSE_VEHICLE_DAMAGE_WEAPON','DEFAULT_RESPONSE_EVENT_DRAGGED_OUT_CAR',
    'DEFAULT_RESPONSE_EVENT_PED_ENTERED_MY_VEHICLE','DEFAULT_RESPONSE_POTENTIAL_GET_RUN_OVER',
    'DEFAULT_RESPONSE_POTENTIAL_WALK_INTO_VEHICLE','DEFAULT_RESPONSE_OBJECT_COLLISION',
    'DEFAULT_RESPONSE_AGITATED','DEFAULT_RESPONSE_REQUEST_HELP_WITH_CONFRONTATION',
    'FRIENDLY_RESPONSE_GUN_AIMED_AT','FRIENDLY_RESPONSE_TASK_NEAR_MISS',
    'DEFAULT_RESPONSE_SHOCKING_DANGEROUS_ANIMAL','DEFAULT_RESPONSE_SHOCKING_SIREN',
    'DEFAULT_RESPONSE_SHOCKING_POTENTIAL_BLAST','DEFAULT_RESPONSE_PLAYER_DEATH',
    'COMBAT_RESPONSE_FOOT_STEP_HEARD'
  ]},
  HOSTILE: { parent: null, category: 'abstract', responses: [
    'DEFAULT_RESPONSE_DAMAGE','DEFAULT_RESPONSE_EXPLOSION','COMBAT_RESPONSE_SHOT_FIRED',
    'COMBAT_RESPONSE_SHOT_FIRED_WHIZZED_BY','COMBAT_RESPONSE_SHOT_FIRED_BULLET_IMPACT',
    'COMBAT_RESPONSE_GUN_AIMED_AT','DEFAULT_RESPONSE_HATE','DEFAULT_RESPONSE_VEHICLE_ON_FIRE',
    'DEFAULT_RESPONSE_POTENTIAL_WALK_INTO_FIRE','DEFAULT_RESPONSE_SHOUT_TARGET_POSITION',
    'DEFAULT_RESPONSE_INJURED_CRY_FOR_HELP','DEFAULT_RESPONSE_MELEE',
    'DEFAULT_RESPONSE_VEHICLE_DAMAGE_WEAPON','DEFAULT_RESPONSE_EVENT_DRAGGED_OUT_CAR',
    'DEFAULT_RESPONSE_EVENT_PED_ENTERED_MY_VEHICLE','DEFAULT_RESPONSE_POTENTIAL_GET_RUN_OVER',
    'DEFAULT_RESPONSE_POTENTIAL_WALK_INTO_VEHICLE','DEFAULT_RESPONSE_OBJECT_COLLISION',
    'DEFAULT_RESPONSE_AGITATED','DEFAULT_RESPONSE_REQUEST_HELP_WITH_CONFRONTATION',
    'FRIENDLY_RESPONSE_GUN_AIMED_AT','FRIENDLY_RESPONSE_TASK_NEAR_MISS',
    'DEFAULT_RESPONSE_SHOCKING_DANGEROUS_ANIMAL','DEFAULT_RESPONSE_SHOCKING_SIREN',
    'DEFAULT_RESPONSE_SHOCKING_POTENTIAL_BLAST','DEFAULT_RESPONSE_PLAYER_DEATH',
    'COMBAT_RESPONSE_FOOT_STEP_HEARD','COMBAT_RESPONSE_PROVIDING_COVER'
  ]},
  DEFAULT: { parent: 'BASE', category: 'civilian', responses: [
    'DEFAULT_RESPONSE_SHOCKING_ENGINE_REVVED','DEFAULT_RESPONSE_SHOCKING_EXPLOSION',
    'DEFAULT_RESPONSE_SHOCKING_GUN_FIGHT','DEFAULT_RESPONSE_SHOCKING_PED_SHOT',
    'DEFAULT_RESPONSE_SHOCKING_GUNSHOT_FIRED','DEFAULT_RESPONSE_SHOCKING_FIRE',
    'DEFAULT_RESPONSE_SHOCKING_CAR_CHASE','DEFAULT_RESPONSE_SHOCKING_CAR_PILE_UP',
    'DEFAULT_RESPONSE_SHOCKING_CAR_CRASH','DEFAULT_RESPONSE_SHOCKING_BICYCLE_CRASH',
    'DEFAULT_RESPONSE_SHOCKING_CAR_ON_CAR','DEFAULT_RESPONSE_SHOCKING_MAD_DRIVER',
    'DEFAULT_RESPONSE_SHOCKING_MAD_DRIVER_EXTREME','DEFAULT_RESPONSE_SHOCKING_MAD_DRIVER_BICYCLE',
    'DEFAULT_RESPONSE_SHOCKING_INJURED_PED','DEFAULT_RESPONSE_SHOCKING_PED_RUN_OVER',
    'DEFAULT_RESPONSE_SHOCKING_SEEN_GANG_FIGHT','DEFAULT_RESPONSE_SHOCKING_SEEN_MELEE_ACTION',
    'DEFAULT_RESPONSE_SHOCKING_SEEN_CONFRONTATION','DEFAULT_RESPONSE_SHOCKING_SEEN_INSULT',
    'DEFAULT_RESPONSE_SHOCKING_SEEN_NICE_CAR','DEFAULT_RESPONSE_SHOCKING_SEEN_VEHICLE_TOWED',
    'DEFAULT_RESPONSE_SHOCKING_SEEN_WEAPON_THREAT','DEFAULT_RESPONSE_SHOCKING_SEEN_WEIRD_PED',
    'DEFAULT_RESPONSE_SHOCKING_HELICOPTER_OVERHEAD','DEFAULT_RESPONSE_SHOCKING_PARACHUTER_OVERHEAD',
    'DEFAULT_RESPONSE_SHOCKING_SEEN_CAR_STOLEN','DEFAULT_RESPONSE_SHOCKING_DEAD_BODY',
    'DEFAULT_RESPONSE_SHOCKING_PED_KILLED','DEFAULT_RESPONSE_SHOCKING_PLANE_FLY_BY',
    'DEFAULT_RESPONSE_SHOCKING_HORN_SOUNDED','DEFAULT_RESPONSE_SHOCKING_VISIBLE_WEAPON',
    'DEFAULT_RESPONSE_SHOCKING_RUNNING_PED','DEFAULT_RESPONSE_SHOCKING_RUNNING_STAMPEDE',
    'DEFAULT_RESPONSE_STUDIO_BOMB','DEFAULT_RESPONSE_CRIME_CRY_FOR_HELP',
    'DEFAULT_RESPONSE_MUGGING','DEFAULT_RESPONSE_SHOCKING_NON_VIOLENT_WEAPON_AIMED_AT',
    'DEFAULT_RESPONSE_SHOCKING_SIREN','DEFAULT_RESPONSE_SHOCKING_IN_DANGEROUS_VEHICLE',
    'DEFAULT_RESPONSE_SHOCKING_CAR_ALARM','DEFAULT_RESPONSE_SHOCKING_PED_KNOCKED_INTO',
    'DEFAULT_RESPONSE_PROPERTY_DAMAGE','DEFAULT_RESPONSE_BROKEN_GLASS'
  ]},
  GANG: { parent: 'HOSTILE', category: 'gang', responses: [
    'GANG_RESPONSE_SHOT_FIRED','GANG_RESPONSE_SHOT_FIRED_WHIZZED_BY',
    'GANG_RESPONSE_GUN_AIMED_AT','GANG_RESPONSE_SHOCKING_GUN_FIGHT',
    'GANG_RESPONSE_SHOCKING_GUNSHOT_FIRED','DEFAULT_RESPONSE_SHOCKING_EXPLOSION',
    'GANG_RESPONSE_SHOCKING_PED_SHOT','DEFAULT_RESPONSE_SHOCKING_FIRE',
    'DEFAULT_RESPONSE_SHOCKING_CAR_CHASE','GANG_RESPONSE_SHOCKING_CAR_CRASH',
    'GANG_RESPONSE_SHOCKING_BICYCLE_CRASH','DEFAULT_RESPONSE_SHOCKING_CAR_ON_CAR',
    'DEFAULT_RESPONSE_SHOCKING_MAD_DRIVER','GANG_RESPONSE_SHOCKING_MAD_DRIVER_EXTREME',
    'DEFAULT_RESPONSE_SHOCKING_MAD_DRIVER_BICYCLE','GANG_RESPONSE_SHOCKING_INJURED_PED',
    'GANG_RESPONSE_SHOCKING_PED_RUN_OVER','GANG_RESPONSE_SHOCKING_SEEN_MELEE_ACTION',
    'GANG_RESPONSE_SHOCKING_SEEN_CONFRONTATION','DEFAULT_RESPONSE_SHOCKING_SEEN_INSULT',
    'DEFAULT_RESPONSE_SHOCKING_SEEN_NICE_CAR','DEFAULT_RESPONSE_SHOCKING_SEEN_VEHICLE_TOWED',
    'GANG_RESPONSE_SHOCKING_SEEN_WEAPON_THREAT','GANG_RESPONSE_SHOCKING_HELICOPTER_OVERHEAD',
    'DEFAULT_RESPONSE_SHOCKING_PARACHUTER_OVERHEAD','GANG_RESPONSE_SHOCKING_SEEN_CAR_STOLEN',
    'GANG_RESPONSE_SHOCKING_DEAD_BODY','GANG_RESPONSE_SHOCKING_PLANE_FLY_BY',
    'DEFAULT_RESPONSE_SHOCKING_HORN_SOUNDED','GANG_RESPONSE_SHOCKING_VISIBLE_WEAPON',
    'DEFAULT_RESPONSE_SHOCKING_RUNNING_PED','DEFAULT_RESPONSE_SHOCKING_RUNNING_STAMPEDE',
    'GANG_RESPONSE_CRIME_CRY_FOR_HELP','GANG_RESPONSE_SHOCKING_PED_KILLED',
    'TURN_TO_FACE_RESPONSE_MUGGING','TURN_TO_FACE_RESPONSE_SHOCKING_NON_VIOLENT_WEAPON_AIMED_AT',
    'DEFAULT_RESPONSE_SHOCKING_SIREN','DEFAULT_RESPONSE_SHOCKING_CAR_ALARM',
    'AGITATED_RESPONSE_SHOCKING_PED_KNOCKED_INTO','GANG_RESPONSE_PROPERTY_DAMAGE',
    'GANG_RESPONSE_BROKEN_GLASS'
  ]},
  GANG_SEARCH: { parent: 'GANG', category: 'gang', responses: ['SWAT_RESPONSE_WANTED'] },
  FAMILY: { parent: 'GANG', category: 'gang', responses: [
    'FAMILY_RESPONSE_DAMAGE','FAMILY_RESPONSE_EXPLOSION',
    'FAMILY_RESPONSE_FRIENDLY_AIMED_AT','FAMILY_RESPONSE_FRIENDLY_FIRE_NEAR_MISS',
    'FAMILY_RESPONSE_MELEE_ACTION','FAMILY_RESPONSE_SHOCKING_DEAD_BODY',
    'FAMILY_RESPONSE_SHOCKING_EXPLOSION','FAMILY_RESPONSE_SHOCKING_INJURED_PED',
    'FAMILY_RESPONSE_SHOCKING_SEEN_MELEE_ACTION','FAMILY_RESPONSE_SHOCKING_SEEN_PED_KILLED',
    'FAMILY_RESPONSE_SHOCKING_SEEN_WEAPON_THREAT','FAMILY_RESPONSE_SHOCKING_PED_SHOT',
    'FAMILY_RESPONSE_SHOT_FIRED','FAMILY_RESPONSE_VEHICLE_DAMAGE_WEAPON'
  ]},
  GULL: { parent: null, category: 'animal', responses: [
    'GULL_RESPONSE_FLEE','GULL_RESPONSE_EXPLOSION','GULL_RESPONSE_GUNSHOT',
    'GULL_RESPONSE_SHOT_FIRED_WHIZZED_BY','GULL_RESPONSE_SHOT_FIRED_BULLET_IMPACT'
  ]},
  HEN: { parent: null, category: 'animal', responses: [
    'FLEE_RESPONSE_DAMAGE','FLEE_RESPONSE_EXPLOSION','FLEE_RESPONSE_SHOT_FIRED',
    'FLEE_RESPONSE_SHOT_FIRED_WHIZZED_BY','FLEE_RESPONSE_SHOT_FIRED_BULLET_IMPACT',
    'HEN_RESPONSE_FLEE','DEFAULT_RESPONSE_SHOCKING_DANGEROUS_ANIMAL'
  ]},
  RAT:  { parent: null, category: 'animal', responses: ['RAT_RESPONSE_FLEE'] },
  FISH: { parent: null, category: 'animal', responses: [
    'FISH_RESPONSE_FLEE','FISH_RESPONSE_EXPLOSION','FISH_RESPONSE_GUNSHOT',
    'FISH_RESPONSE_SHOCKING_EXPLOSION'
  ]},
  Shark: { parent: null, category: 'animal', responses: [
    'SHARK_ATTACK_ENCROACHING','SHARK_ATTACK_HATE'
  ]},
  HORSE: { parent: null, category: 'animal', responses: [
    'HORSE_FLEE_RESPONSE_DAMAGE','HORSE_FLEE_RESPONSE_EXPLOSION','HORSE_FLEE_RESPONSE_SHOT_FIRED',
    'HORSE_FLEE_RESPONSE_SHOT_FIRED_WHIZZED_BY','HORSE_FLEE_RESPONSE_SHOT_FIRED_BULLET_IMPACT',
    'HORSE_FLEE_RESPONSE_SHOCKING_MELEE_ACTION','DEFAULT_RESPONSE_SHOCKING_DANGEROUS_ANIMAL'
  ]},
  DomesticAnimal: { parent: null, category: 'animal', responses: [
    'EXHAUSTED_FLEE_RESPONSE_DAMAGE','EXHAUSTED_FLEE_RESPONSE_EXPLOSION',
    'EXHAUSTED_FLEE_RESPONSE_SHOT_FIRED','EXHAUSTED_FLEE_RESPONSE_SHOT_FIRED_WHIZZED_BY',
    'EXHAUSTED_FLEE_RESPONSE_SHOT_FIRED_BULLET_IMPACT',
    'EXHAUSTED_FLEE_RESPONSE_SHOCKING_MELEE_ACTION','EXHAUSTED_FLEE_RESPONSE_HORN',
    'EXHAUSTED_FLEE_RESPONSE_CAR_CRASH','EXHAUSTED_FLEE_RESPONSE_SEEN_PED_RUN_OVER',
    'EXHAUSTED_FLEE_RESPONSE_INJURED_PED','EXHAUSTED_FLEE_RESPONSE_SHOCKING_EXPLOSION',
    'EXHAUSTED_FLEE_RESPONSE_HELICOPTER','EXHAUSTED_FLEE_RESPONSE_PLANE',
    'WALK_AWAY_RESPONSE_ENCROACHMENT','DEFAULT_RESPONSE_SHOCKING_DANGEROUS_ANIMAL'
  ]},
  DOG: { parent: null, category: 'animal', responses: [
    'DEFAULT_RESPONSE_DAMAGE','FLEE_RESPONSE_EXPLOSION','DEFAULT_RESPONSE_SHOT_FIRED',
    'DEFAULT_RESPONSE_SHOT_FIRED_WHIZZED_BY','DEFAULT_RESPONSE_SHOT_FIRED_BULLET_IMPACT',
    'DEFAULT_RESPONSE_HATE','DEFAULT_RESPONSE_AGITATED','DEFAULT_RESPONSE_SHOUT_TARGET_POSITION',
    'DEFAULT_RESPONSE_SHOCKING_DANGEROUS_ANIMAL','DOG_RESPONSE_CAR_CRASH',
    'DOG_RESPONSE_INJURED_PED','DOG_RESPONSE_SEEN_PED_KILLED'
  ]},
  POLICE_DOG: { parent: 'DOG', category: 'law', responses: ['POLICE_DOG_RESPONSE_WANTED'] },
  WildAnimal: { parent: null, category: 'animal', responses: [
    'FLEE_RESPONSE_DAMAGE','FLEE_RESPONSE_CAR_CRASH','FLEE_RESPONSE_EXPLOSION',
    'FLEE_RESPONSE_SHOT_FIRED','FLEE_RESPONSE_SHOT_FIRED_WHIZZED_BY',
    'FLEE_RESPONSE_SHOT_FIRED_BULLET_IMPACT','FLEE_RESPONSE_FOOT_STEP_HEARD',
    'FLEE_RESPONSE_ENCROACHMENT','FLEE_RESPONSE_HORN','FLEE_RESPONSE_SHOCKING_MELEE_ACTION',
    'FLEE_RESPONSE_SEEN_PED_RUN_OVER','FLEE_RESPONSE_INJURED_PED',
    'FLEE_RESPONSE_SHOCKING_EXPLOSION','FLEE_RESPONSE_HELICOPTER','FLEE_RESPONSE_PLANE',
    'DEFAULT_RESPONSE_SHOCKING_DANGEROUS_ANIMAL'
  ]},
  Cougar: { parent: null, category: 'animal', responses: [
    'DEFAULT_RESPONSE_DAMAGE','FLEE_RESPONSE_EXPLOSION','FLEE_RESPONSE_SHOT_FIRED',
    'FLEE_RESPONSE_SHOT_FIRED_WHIZZED_BY','FLEE_RESPONSE_SHOT_FIRED_BULLET_IMPACT',
    'COMBAT_RESPONSE_FOOT_STEP_HEARD','COMBAT_RESPONSE_ENCROACHMENT',
    'FLEE_RESPONSE_HORN','FLEE_RESPONSE_CAR_CRASH','FLEE_RESPONSE_SHOCKING_EXPLOSION',
    'FLEE_RESPONSE_HELICOPTER','FLEE_RESPONSE_PLANE','DEFAULT_RESPONSE_HATE'
  ]},
  SmallAnimal: { parent: null, category: 'animal', responses: [
    'FLEE_RESPONSE_DAMAGE','FLEE_RESPONSE_CAR_CRASH','FLEE_RESPONSE_EXPLOSION',
    'FLEE_RESPONSE_SHOT_FIRED','FLEE_RESPONSE_SHOT_FIRED_WHIZZED_BY',
    'FLEE_RESPONSE_SHOT_FIRED_BULLET_IMPACT','FLEE_RESPONSE_HORN',
    'FLEE_RESPONSE_SHOCKING_MELEE_ACTION','FLEE_RESPONSE_SHOCKING_EXPLOSION',
    'FLEE_RESPONSE_HELICOPTER','FLEE_RESPONSE_PLANE','DEFAULT_RESPONSE_SHOCKING_DANGEROUS_ANIMAL'
  ]},
  Cat:    { parent: 'SmallAnimal', category: 'animal', responses: ['CAT_RESPONSE_ENCROACHMENT'] },
  Rabbit: { parent: 'SmallAnimal', category: 'animal', responses: [
    'FLEE_RESPONSE_FOOT_STEP_HEARD','RABBIT_RESPONSE_FLEE'
  ]}
};

/* ─── Vanilla task types ─── */
const VANILLA_TASK_TYPES = [
  'RESPONSE_TASK_GUN_AIMED_AT','RESPONSE_TASK_TURN_TO_FACE','RESPONSE_POLICE_TASK_WANTED',
  'RESPONSE_SWAT_TASK_WANTED','RESPONSE_TASK_CROUCH','RESPONSE_TASK_COWER',
  'RESPONSE_TASK_WALK_ROUND_FIRE','RESPONSE_TASK_HANDS_UP','RESPONSE_TASK_LEAVE_CAR_AND_FLEE',
  'RESPONSE_TASK_COMBAT','RESPONSE_TASK_THREAT','RESPONSE_TASK_FLEE',
  'RESPONSE_TASK_SCENARIO_FLEE','RESPONSE_TASK_FLY_AWAY','RESPONSE_TASK_WALK_ROUND_ENTITY',
  'RESPONSE_TASK_HEAD_TRACK','RESPONSE_TASK_SHOCKING_EVENT_GOTO',
  'RESPONSE_TASK_SHOCKING_EVENT_HURRY_AWAY','RESPONSE_TASK_SHOCKING_EVENT_WATCH',
  'RESPONSE_TASK_EVASIVE_STEP','RESPONSE_TASK_SHOCKING_POLICE_INVESTIGATE',
  'RESPONSE_TASK_ESCAPE_BLAST','RESPONSE_TASK_AGITATED','RESPONSE_TASK_EXPLOSION',
  'RESPONSE_TASK_DUCK_AND_COVER','RESPONSE_TASK_SHOCKING_EVENT_REACT_TO_AIRCRAFT',
  'RESPONSE_TASK_SHOCKING_EVENT_REACT','RESPONSE_TASK_SHOCKING_EVENT_BACK_AWAY',
  'RESPONSE_TASK_SHOCKING_EVENT_STOP_AND_STARE','RESPONSE_TASK_SHARK_ATTACK',
  'RESPONSE_TASK_EXHAUSTED_FLEE','RESPONSE_TASK_GROWL_AND_FLEE','RESPONSE_TASK_WALK_AWAY',
  'RESPONSE_TASK_AGGRESSIVE_RUBBERNECK','RESPONSE_TASK_SHOCKING_NICE_CAR',
  'RESPONSE_TASK_FRIENDLY_NEAR_MISS','RESPONSE_TASK_FRIENDLY_AIMED_AT',
  'RESPONSE_TASK_DEFER_TO_SCENARIO_POINT_FLAGS','RESPONSE_TASK_SHOCKING_EVENT_THREAT_RESPONSE',
  'RESPONSE_TASK_PLAYER_DEATH'
];

/* ─── Category metadata ─── */
const CAT_META = {
  law:       { label: 'Law',       icon: '🚓' },
  emergency: { label: 'Emergency', icon: '🚑' },
  gang:      { label: 'Gang',      icon: '🔫' },
  civilian:  { label: 'Civilian',  icon: '👤' },
  animal:    { label: 'Animal',    icon: '🐾' },
  abstract:  { label: 'Abstract',  icon: '⚙' }
};

/* ─── Precompute: which profiles use each rule ─── */
const RULE_USERS = {};
for (const [pName, profile] of Object.entries(VANILLA_PROFILES)) {
  for (const ruleName of profile.responses) {
    if (!RULE_USERS[ruleName]) RULE_USERS[ruleName] = [];
    RULE_USERS[ruleName].push(pName);
  }
}

/* ─── App state ─── */
let state = {
  activeTab: 'profiles',
  filterCat: 'all',
  filterEvent: '',
  searchQuery: '',
  editMode: false,
  fileLoaded: false,
  rulesData: {},       // ruleName → { event, decisions[] } from parsed file
  taskTypes: [...VANILLA_TASK_TYPES],
  modifications: {}    // ruleName → decision[] with modified values
};

/* ─── Parser ─── */
function parseEventsMeta(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');

  const err = doc.querySelector('parsererror');
  if (err) throw new Error('XML parse error: ' + err.textContent.slice(0, 120));

  const rules = {};

  // Parse eventDecisionMakerResponseData
  const ruleItems = doc.querySelectorAll('eventDecisionMakerResponseData > Item');
  ruleItems.forEach(item => {
    const name    = item.querySelector(':scope > Name')?.textContent?.trim() || '';
    const event   = item.querySelector(':scope > Event')?.textContent?.trim() || '';
    const decisions = [];

    item.querySelectorAll(':scope > Decision > Item').forEach(d => {
      decisions.push({
        task:   d.querySelector('TaskRef')?.textContent?.trim() || '',
        player: parseFloat(d.querySelector('Chance_SourcePlayer')?.getAttribute('value') || '0'),
        friend: parseFloat(d.querySelector('Chance_SourceFriend')?.getAttribute('value') || '0'),
        threat: parseFloat(d.querySelector('Chance_SourceThreat')?.getAttribute('value') || '0'),
        other:  parseFloat(d.querySelector('Chance_SourceOther')?.getAttribute('value') || '0'),
        distMin: parseFloat(d.querySelector('DistanceMinSq')?.getAttribute('value') || '-1'),
        distMax: parseFloat(d.querySelector('DistanceMaxSq')?.getAttribute('value') || '-1'),
        flags:  (d.querySelector('EventResponseDecisionFlags')?.textContent?.trim() || '').split(/\s+/).filter(Boolean)
      });
    });

    if (name) rules[name] = { event, decisions };
  });

  // Parse task types from eventResponseTaskData
  const taskItems = doc.querySelectorAll('eventResponseTaskData > Item');
  const tasks = [];
  taskItems.forEach(item => {
    const n = item.querySelector('Name')?.textContent?.trim();
    if (n) tasks.push(n);
  });

  return { rules, tasks };
}

/* ─── Export builder ─── */
function buildXml() {
  if (!state.fileLoaded) return null;

  // Merge modifications into rulesData
  const merged = {};
  for (const [name, rule] of Object.entries(state.rulesData)) {
    const mod = state.modifications[name];
    merged[name] = mod ? { event: rule.event, decisions: mod } : rule;
  }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\r\n<CEventDecisionMakerResponseDataFile>\r\n';

  // Task types section
  xml += '\t<eventResponseTaskData>\r\n';
  for (const t of state.taskTypes) {
    xml += `\t\t<Item type="CEventResponseTaskData">\r\n\t\t\t<Name>${t}</Name>\r\n\t\t</Item>\r\n`;
  }
  xml += '\t</eventResponseTaskData>\r\n\r\n';

  // Response rules section
  xml += '\t<eventDecisionMakerResponseData>\r\n';
  for (const [name, rule] of Object.entries(merged)) {
    xml += `\t\t<Item type="CEventDecisionMakerResponse">\r\n`;
    xml += `\t\t\t<Name>${name}</Name>\r\n`;
    xml += `\t\t\t<Event>${rule.event}</Event>\r\n`;
    xml += `\t\t\t<Decision>\r\n`;
    for (const d of rule.decisions) {
      xml += `\t\t\t\t<Item>\r\n`;
      xml += `\t\t\t\t\t<TaskRef>${d.task}</TaskRef>\r\n`;
      xml += `\t\t\t\t\t<Chance_SourcePlayer value="${d.player.toFixed(6)}"/>\r\n`;
      xml += `\t\t\t\t\t<Chance_SourceFriend value="${d.friend.toFixed(6)}"/>\r\n`;
      xml += `\t\t\t\t\t<Chance_SourceThreat value="${d.threat.toFixed(6)}"/>\r\n`;
      xml += `\t\t\t\t\t<Chance_SourceOther value="${d.other.toFixed(6)}"/>\r\n`;
      xml += `\t\t\t\t\t<DistanceMinSq value="${d.distMin.toFixed(6)}"/>\r\n`;
      xml += `\t\t\t\t\t<DistanceMaxSq value="${d.distMax.toFixed(6)}"/>\r\n`;
      if (d.flags.length) {
        xml += `\t\t\t\t\t<EventResponseDecisionFlags>${d.flags.join(' ')}</EventResponseDecisionFlags>\r\n`;
      }
      xml += `\t\t\t\t</Item>\r\n`;
    }
    xml += `\t\t\t</Decision>\r\n\t\t</Item>\r\n`;
  }
  xml += '\t</eventDecisionMakerResponseData>\r\n\r\n';

  // Decision makers section
  xml += '\t<eventDecisionMaker>\r\n';
  for (const [pName, profile] of Object.entries(VANILLA_PROFILES)) {
    xml += `\t\t<Item type="CEventDataDecisionMaker">\r\n`;
    xml += `\t\t\t<Name>${pName}</Name>\r\n`;
    xml += `\t\t\t<DecisionMakerParentRef>${profile.parent || ''}</DecisionMakerParentRef>\r\n`;
    if (profile.responses.length) {
      xml += `\t\t\t<EventResponse>\r\n`;
      for (const r of profile.responses) {
        xml += `\t\t\t\t<Item>${r}</Item>\r\n`;
      }
      xml += `\t\t\t</EventResponse>\r\n`;
    } else {
      xml += `\t\t\t<EventResponse/>\r\n`;
    }
    xml += `\t\t</Item>\r\n`;
  }
  xml += '\t</eventDecisionMaker>\r\n';
  xml += '</CEventDecisionMakerResponseDataFile>\r\n';

  return xml;
}

/* ─── Helpers ─── */
function pct(v) { return Math.round(v * 100); }

function flagClass(f) {
  if (f === 'ValidOnFoot')               return 'valid-foot';
  if (f === 'ValidInCar')                return 'valid-car';
  if (f === 'ValidInHeli')               return 'valid-heli';
  if (f === 'ValidOnBicycle')            return 'valid-bike';
  if (f === 'NotValidInComplexScenario') return 'not-complex';
  if (f === 'ValidOnlyInComplexScenario')return 'only-complex';
  if (f === 'ValidOnlyIfSourceIsPlayer') return 'player-only';
  if (f === 'ValidOnlyIfRandom')         return 'random-only';
  return 'other';
}

function probBars(d, name, decIdx, editable) {
  const sources = [
    { key: 'player', label: 'Player', cls: 'player', val: d.player },
    { key: 'friend', label: 'Friend', cls: 'friend', val: d.friend },
    { key: 'threat', label: 'Threat', cls: 'threat', val: d.threat },
    { key: 'other',  label: 'Other',  cls: 'other',  val: d.other  }
  ];

  if (editable) {
    return `<div class="events-prob-bars">${sources.map(s =>
      `<div class="events-prob-item">
        <div class="events-prob-label">${s.label}</div>
        <input class="events-prob-input" type="number" min="0" max="1" step="0.05"
          data-rule="${name}" data-dec="${decIdx}" data-src="${s.key}"
          value="${s.val.toFixed(2)}">
      </div>`).join('')}</div>`;
  }

  return `<div class="events-prob-bars">${sources.map(s =>
    `<div class="events-prob-item">
      <div class="events-prob-label">${s.label}</div>
      <div class="events-prob-track">
        <div class="events-prob-fill ${s.cls}" style="width:${pct(s.val)}%"></div>
      </div>
      <div class="events-prob-num">${pct(s.val)}%</div>
    </div>`).join('')}</div>`;
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('eventsToast');
  if (!t) return;
  t.textContent = msg;
  t.className = `dispatch-toast ${type} show`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ─── RENDER: Profiles tab ─── */
function renderProfiles() {
  const grid = document.getElementById('eventsProfileGrid');
  if (!grid) return;

  const cat = state.filterCat;
  const profiles = Object.entries(VANILLA_PROFILES).filter(([, p]) =>
    cat === 'all' || p.category === cat
  );

  if (!profiles.length) {
    grid.innerHTML = '<div style="color:var(--color-text-muted);padding:20px">No profiles match.</div>';
    return;
  }

  grid.innerHTML = profiles.map(([name, p]) => {
    const catMeta  = CAT_META[p.category] || { label: p.category, icon: '•' };
    const respCount = p.responses.length;
    const parentLine = p.parent
      ? `<div class="events-profile-parent">inherits → <span class="parent-name">${p.parent}</span></div>`
      : '';

    const pills = respCount
      ? p.responses.map(r =>
          `<span class="events-response-pill" title="${r}">${r}</span>`
        ).join('')
      : '<span style="font-size:var(--text-xs);color:var(--color-text-muted)">No responses (inherits all from parent)</span>';

    return `
      <div class="events-profile-card" data-profile="${name}">
        <div class="events-profile-header">
          <span class="events-profile-name">${name}</span>
          <span class="events-cat-badge ${p.category}">${catMeta.label}</span>
        </div>
        ${parentLine}
        <div class="events-profile-meta">
          ${catMeta.icon} ${respCount} response rule${respCount !== 1 ? 's' : ''}
          ${p.parent ? ` · parent: <code>${p.parent}</code>` : ''}
        </div>
        <div class="events-profile-expand">
          <div class="events-response-list">${pills}</div>
        </div>
      </div>`;
  }).join('');

  // Expand/collapse cards
  grid.querySelectorAll('.events-profile-card').forEach(card => {
    card.addEventListener('click', () => {
      card.classList.toggle('expanded');
    });
  });

  // Response pills jump to rules tab
  grid.querySelectorAll('.events-response-pill').forEach(pill => {
    pill.addEventListener('click', e => {
      e.stopPropagation();
      const ruleName = pill.textContent.trim();
      switchTab('rules');
      document.getElementById('eventsSearch').value = ruleName;
      state.searchQuery = ruleName;
      renderRules();
    });
  });
}

/* ─── RENDER: Rules tab ─── */
function renderRules() {
  const list = document.getElementById('eventsRulesList');
  if (!list) return;

  const source = state.fileLoaded
    ? Object.entries(state.rulesData)
    : [];

  if (!state.fileLoaded) {
    // Show all rule names from profile data (without probability details)
    renderRulesFromProfiles();
    return;
  }

  const q      = state.searchQuery.toLowerCase();
  const evFilt = state.filterEvent;
  const editable = state.editMode;

  let rules = source.filter(([name, r]) => {
    if (evFilt && r.event !== evFilt) return false;
    if (q && !name.toLowerCase().includes(q) && !r.event.toLowerCase().includes(q)) return false;
    return true;
  });

  document.getElementById('eventsRuleCount').textContent =
    `${rules.length} of ${source.length} rule${source.length !== 1 ? 's' : ''}`;

  if (!rules.length) {
    list.innerHTML = '<div style="color:var(--color-text-muted);padding:20px 0">No rules match the current filter.</div>';
    return;
  }

  list.innerHTML = rules.map(([name, rule]) => {
    const users   = RULE_USERS[name] || [];
    const isModified = !!state.modifications[name];
    const decisions = isModified ? state.modifications[name] : rule.decisions;

    const userTags = users.map(u => {
      const cat = VANILLA_PROFILES[u]?.category || 'abstract';
      return `<span class="events-user-tag ${cat}">${u}</span>`;
    }).join('');

    const decRows = decisions.map((d, i) => {
      const flagHtml = d.flags.map(f =>
        `<span class="events-flag ${flagClass(f)}">${f}</span>`
      ).join('');
      return `<tr>
        <td><span class="events-task-ref">${d.task}</span></td>
        <td>${probBars(d, name, i, editable)}</td>
        <td><div class="events-flags">${flagHtml}</div></td>
      </tr>`;
    }).join('');

    return `
      <div class="events-rule-card${isModified ? ' modified' : ''}" data-rule="${name}">
        <div class="events-rule-header">
          <span class="events-rule-name">${name}</span>
          <span class="events-event-badge">${rule.event.replace('EVENT_', '')}</span>
          <span class="events-users-badge">${users.length} profile${users.length !== 1 ? 's' : ''}</span>
          <span class="events-expand-icon">▾</span>
        </div>
        <div class="events-rule-body">
          ${users.length ? `<div class="events-rule-users">${userTags}</div>` : ''}
          <table class="events-decision-table">
            <thead><tr>
              <th>Task</th>
              <th>Probability</th>
              <th>Flags</th>
            </tr></thead>
            <tbody>${decRows}</tbody>
          </table>
        </div>
      </div>`;
  }).join('');

  // Toggle expand
  list.querySelectorAll('.events-rule-card').forEach(card => {
    card.querySelector('.events-rule-header').addEventListener('click', () => {
      card.classList.toggle('expanded');
    });
  });

  // Probability inputs
  if (editable) {
    list.querySelectorAll('.events-prob-input').forEach(input => {
      input.addEventListener('change', onProbChange);
    });
  }
}

function renderRulesFromProfiles() {
  // Show rules list without probability data (no file loaded)
  const list = document.getElementById('eventsRulesList');
  const q = state.searchQuery.toLowerCase();
  const evFilt = state.filterEvent;

  // Collect all unique rule names referenced in profiles
  const allRuleNames = [...new Set(
    Object.values(VANILLA_PROFILES).flatMap(p => p.responses)
  )].sort();

  const filtered = allRuleNames.filter(name => {
    if (q && !name.toLowerCase().includes(q)) return false;
    return true;
  });

  document.getElementById('eventsRuleCount').textContent =
    `${filtered.length} of ${allRuleNames.length} rules (load file for probability details)`;

  list.innerHTML = filtered.map(name => {
    const users  = RULE_USERS[name] || [];
    const userTags = users.map(u => {
      const cat = VANILLA_PROFILES[u]?.category || 'abstract';
      return `<span class="events-user-tag ${cat}">${u}</span>`;
    }).join('');

    return `
      <div class="events-rule-card" data-rule="${name}">
        <div class="events-rule-header">
          <span class="events-rule-name">${name}</span>
          <span class="events-users-badge">${users.length} profile${users.length !== 1 ? 's' : ''}</span>
          <span class="events-expand-icon">▾</span>
        </div>
        <div class="events-rule-body">
          ${users.length
            ? `<div class="events-rule-users">${userTags}</div>`
            : '<span style="color:var(--color-text-muted);font-size:var(--text-xs)">Not used by any profile directly.</span>'
          }
          <div class="events-no-file" style="padding:12px 0;border:none;text-align:left">
            <strong>Drop events.meta to see probability values</strong>
            Load the file above to view and edit the decision items for this rule.
          </div>
        </div>
      </div>`;
  }).join('');

  list.querySelectorAll('.events-rule-card').forEach(card => {
    card.querySelector('.events-rule-header').addEventListener('click', () => {
      card.classList.toggle('expanded');
    });
  });
}

/* ─── Probability input handler ─── */
function onProbChange(e) {
  const input  = e.target;
  const rule   = input.dataset.rule;
  const decIdx = parseInt(input.dataset.dec, 10);
  const src    = input.dataset.src;
  const val    = Math.max(0, Math.min(1, parseFloat(input.value) || 0));
  input.value  = val;

  if (!state.modifications[rule]) {
    // Deep-clone original
    state.modifications[rule] = JSON.parse(JSON.stringify(state.rulesData[rule].decisions));
  }
  state.modifications[rule][decIdx][src] = val;
  input.classList.add('modified');

  // Mark card modified
  const card = document.querySelector(`.events-rule-card[data-rule="${rule}"]`);
  if (card) card.classList.add('modified');
}

/* ─── RENDER: Task types tab ─── */
function renderTaskTypes() {
  const grid = document.getElementById('eventsTaskGrid');
  if (!grid) return;
  grid.innerHTML = state.taskTypes.map((t, i) =>
    `<div class="events-task-item">
      <div class="task-num">#${String(i + 1).padStart(2, '0')}</div>
      ${t}
    </div>`
  ).join('');
}

/* ─── Tab switching ─── */
function switchTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.events-tab-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.tab === tab)
  );
  document.querySelectorAll('.events-tab-panel').forEach(panel =>
    panel.classList.toggle('active', panel.id === `eventsTab-${tab}`)
  );
  if (tab === 'profiles') renderProfiles();
  if (tab === 'rules') renderRules();
  if (tab === 'tasks') renderTaskTypes();
}

/* ─── Drop zone ─── */
function initDropZone() {
  const zone  = document.getElementById('eventsDropZone');
  const input = document.getElementById('eventsFileInput');
  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') input.click(); });

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  });
  input.addEventListener('change', () => {
    if (input.files[0]) loadFile(input.files[0]);
  });
}

function loadFile(file) {
  const zone      = document.getElementById('eventsDropZone');
  const stateText = zone.querySelector('.events-drop-state');
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const { rules, tasks } = parseEventsMeta(e.target.result);
      state.rulesData   = rules;
      state.taskTypes   = tasks.length ? tasks : [...VANILLA_TASK_TYPES];
      state.fileLoaded  = true;
      state.modifications = {};

      zone.classList.add('loaded');
      stateText.textContent = `✓ Loaded ${Object.keys(rules).length} response rules from ${file.name}`;
      showToast(`Loaded ${file.name} — ${Object.keys(rules).length} rules`, 'success');

      // Re-render active tab
      switchTab(state.activeTab);
    } catch (err) {
      showToast('Parse error: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

/* ─── Edit mode toggle ─── */
function initEditToggle() {
  const btn = document.getElementById('eventsEditToggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    state.editMode = !state.editMode;
    btn.classList.toggle('active', state.editMode);
    btn.querySelector('.events-edit-dot').style.background =
      state.editMode ? 'var(--color-brand)' : '';
    btn.childNodes[0].textContent = state.editMode ? 'Edit Mode ON ' : 'Edit Mode ';
    if (state.activeTab === 'rules') renderRules();
  });
}

/* ─── Export ─── */
function initExport() {
  const exportBtn = document.getElementById('eventsExportBtn');
  const resetBtn  = document.getElementById('eventsResetBtn');

  exportBtn?.addEventListener('click', () => {
    if (!state.fileLoaded) {
      showToast('Drop an events.meta file first to export', 'error');
      return;
    }
    const xml  = buildXml();
    const blob = new Blob([xml], { type: 'application/xml' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = 'events.meta';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Exported events.meta', 'success');
  });

  resetBtn?.addEventListener('click', () => {
    state.modifications = {};
    state.editMode = false;
    const toggle = document.getElementById('eventsEditToggle');
    if (toggle) {
      toggle.classList.remove('active');
      toggle.childNodes[0].textContent = 'Edit Mode ';
    }
    if (state.activeTab === 'rules') renderRules();
    showToast('Modifications cleared', 'success');
  });
}

/* ─── Category filter ─── */
function initCatFilters() {
  document.querySelectorAll('.events-cat-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.events-cat-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.filterCat = chip.dataset.cat;
      if (state.activeTab === 'profiles') renderProfiles();
    });
  });
}

/* ─── Rules filter/search ─── */
function initRulesFilter() {
  const search = document.getElementById('eventsSearch');
  const evSel  = document.getElementById('eventsEventSelect');

  search?.addEventListener('input', () => {
    state.searchQuery = search.value.trim();
    if (state.activeTab === 'rules') renderRules();
  });

  evSel?.addEventListener('change', () => {
    state.filterEvent = evSel.value;
    if (state.activeTab === 'rules') renderRules();
  });

  // Populate event dropdown
  if (evSel) {
    const ALL_EVENTS = [
      'EVENT_ACQUAINTANCE_PED_HATE','EVENT_ACQUAINTANCE_PED_WANTED','EVENT_AGITATED',
      'EVENT_COP_CAR_BEING_STOLEN','EVENT_CRIME_CRY_FOR_HELP','EVENT_DAMAGE',
      'EVENT_DISTURBANCE','EVENT_DRAGGED_OUT_CAR','EVENT_ENCROACHING_PED',
      'EVENT_EXPLOSION','EVENT_FOOT_STEP_HEARD','EVENT_FRIENDLY_AIMED_AT',
      'EVENT_FRIENDLY_FIRE_NEAR_MISS','EVENT_GUN_AIMED_AT','EVENT_INJURED_CRY_FOR_HELP',
      'EVENT_MELEE_ACTION','EVENT_OBJECT_COLLISION','EVENT_PED_ENTERED_MY_VEHICLE',
      'EVENT_PED_JACKING_MY_VEHICLE','EVENT_PLAYER_DEATH','EVENT_POTENTIAL_GET_RUN_OVER',
      'EVENT_POTENTIAL_WALK_INTO_FIRE','EVENT_POTENTIAL_WALK_INTO_VEHICLE',
      'EVENT_PROVIDING_COVER','EVENT_REQUEST_HELP_WITH_CONFRONTATION',
      'EVENT_SHOCKING_BICYCLE_CRASH','EVENT_SHOCKING_BICYCLE_ON_PAVEMENT',
      'EVENT_SHOCKING_BROKEN_GLASS','EVENT_SHOCKING_CAR_ALARM','EVENT_SHOCKING_CAR_CHASE',
      'EVENT_SHOCKING_CAR_CRASH','EVENT_SHOCKING_CAR_ON_CAR','EVENT_SHOCKING_CAR_PILE_UP',
      'EVENT_SHOCKING_DANGEROUS_ANIMAL','EVENT_SHOCKING_DEAD_BODY',
      'EVENT_SHOCKING_DRIVING_ON_PAVEMENT','EVENT_SHOCKING_ENGINE_REVVED',
      'EVENT_SHOCKING_EXPLOSION','EVENT_SHOCKING_FIRE','EVENT_SHOCKING_GUNSHOT_FIRED',
      'EVENT_SHOCKING_GUN_FIGHT','EVENT_SHOCKING_HELICOPTER_OVERHEAD',
      'EVENT_SHOCKING_HORN_SOUNDED','EVENT_SHOCKING_INJURED_PED',
      'EVENT_SHOCKING_IN_DANGEROUS_VEHICLE','EVENT_SHOCKING_MAD_DRIVER',
      'EVENT_SHOCKING_MAD_DRIVER_BICYCLE','EVENT_SHOCKING_MAD_DRIVER_EXTREME',
      'EVENT_SHOCKING_MUGGING','EVENT_SHOCKING_NON_VIOLENT_WEAPON_AIMED_AT',
      'EVENT_SHOCKING_PARACHUTER_OVERHEAD','EVENT_SHOCKING_PED_KNOCKED_INTO_BY_PLAYER',
      'EVENT_SHOCKING_PED_RUN_OVER','EVENT_SHOCKING_PED_SHOT','EVENT_SHOCKING_PLANE_FLY_BY',
      'EVENT_SHOCKING_POTENTIAL_BLAST','EVENT_SHOCKING_PROPERTY_DAMAGE',
      'EVENT_SHOCKING_RUNNING_PED','EVENT_SHOCKING_RUNNING_STAMPEDE',
      'EVENT_SHOCKING_SEEN_CAR_STOLEN','EVENT_SHOCKING_SEEN_CONFRONTATION',
      'EVENT_SHOCKING_SEEN_GANG_FIGHT','EVENT_SHOCKING_SEEN_INSULT',
      'EVENT_SHOCKING_SEEN_MELEE_ACTION','EVENT_SHOCKING_SEEN_NICE_CAR',
      'EVENT_SHOCKING_SEEN_PED_KILLED','EVENT_SHOCKING_SEEN_VEHICLE_TOWED',
      'EVENT_SHOCKING_SEEN_WEAPON_THREAT','EVENT_SHOCKING_SEEN_WEIRD_PED',
      'EVENT_SHOCKING_SIREN','EVENT_SHOCKING_STUDIO_BOMB','EVENT_SHOCKING_VISIBLE_WEAPON',
      'EVENT_SHOT_FIRED','EVENT_SHOT_FIRED_BULLET_IMPACT','EVENT_SHOT_FIRED_WHIZZED_BY',
      'EVENT_SHOUT_TARGET_POSITION','EVENT_SUSPICIOUS_ACTIVITY',
      'EVENT_VEHICLE_DAMAGE_WEAPON','EVENT_VEHICLE_ON_FIRE'
    ];
    evSel.innerHTML = '<option value="">All events</option>' +
      ALL_EVENTS.map(e => `<option value="${e}">${e}</option>`).join('');
  }
}

/* ─── Tab buttons ─── */
function initTabs() {
  document.querySelectorAll('.events-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

/* ─── Init ─── */
document.addEventListener('DOMContentLoaded', () => {
  initDropZone();
  initTabs();
  initCatFilters();
  initRulesFilter();
  initEditToggle();
  initExport();

  // Set first cat chip active
  const allChip = document.querySelector('.events-cat-chip[data-cat="all"]');
  if (allChip) allChip.classList.add('active');

  // Initial render
  renderProfiles();
});
