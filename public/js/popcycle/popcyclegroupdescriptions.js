// =====================================================
// [MODULE: POPCYCLE_GROUP_DESCRIPTIONS]
// Converts actual loaded ped and vehicle group names into
// plain-English descriptions. It never adds groups that are
// not present in the selected Popcycle row.
// =====================================================

const POPCYCLE_PED_GROUP_RULES = [
  {
    pattern: /(tramp|homeless|transient)/i,
    label: "Transients and unhoused residents",
    detail: "Late-night and street-level transient population."
  },
  {
    pattern: /(dealer|drug)/i,
    label: "Drug dealers and street activity",
    detail: "Street-level illicit activity represented by the loaded group."
  },
  {
    pattern: /(cop|police|security|sheriff)/i,
    label: "Police and security",
    detail: "Law-enforcement or security pedestrian groups."
  },
  {
    pattern: /(business|office|executive)/i,
    label: "Business and office workers",
    detail: "Commuters, office staff, and business-district pedestrians."
  },
  {
    pattern: /(worker|construction|dock|industrial|factory|labor)/i,
    label: "Workers and laborers",
    detail: "Industrial, construction, service, or manual-labor pedestrians."
  },
  {
    pattern: /(tourist|visitor)/i,
    label: "Tourists and visitors",
    detail: "Visitors, sightseers, and leisure pedestrians."
  },
  {
    pattern: /(beach|surfer)/i,
    label: "Beachgoers",
    detail: "Beach, boardwalk, and coastal leisure pedestrians."
  },
  {
    pattern: /(hipster|art|creative)/i,
    label: "Hipsters and creative residents",
    detail: "Alternative, creative, and neighborhood social groups."
  },
  {
    pattern: /(gang|ballas|vagos|families|lost|salva)/i,
    label: "Gang-affiliated pedestrians",
    detail: "Gang-related pedestrians represented by the loaded group."
  },
  {
    pattern: /(rich|bevhills|wealth|upper|vinewood)/i,
    label: "Affluent residents",
    detail: "Wealthier residents and upscale-area pedestrians."
  },
  {
    pattern: /(club|nightlife|party|raver)/i,
    label: "Nightlife crowds",
    detail: "Clubgoers, party crowds, and late-evening social groups."
  },
  {
    pattern: /(jog|fitness|sport|athletic)/i,
    label: "Joggers and fitness pedestrians",
    detail: "Exercise, sports, and outdoor-fitness pedestrians."
  },
  {
    pattern: /(rural|country|farmer|hillbilly)/i,
    label: "Rural residents and workers",
    detail: "Country, agricultural, and rural-area pedestrians."
  },
  {
    pattern: /(streetgeneral|general|average|genfat|genthin)/i,
    label: "General street population",
    detail: "Average local pedestrians without a specialized role."
  }
];

const POPCYCLE_VEHICLE_GROUP_RULES = [
  {
    pattern: /(police|cop|sheriff|emergency)/i,
    label: "Police and emergency vehicles",
    detail: "Law-enforcement or emergency-response vehicle groups."
  },
  {
    pattern: /(poor|budget|beater|low)/i,
    label: "Budget and older vehicles",
    detail: "Lower-value, older, and economy traffic."
  },
  {
    pattern: /(mid|normal|common)/i,
    label: "Mid-range everyday vehicles",
    detail: "Typical daily-driver cars forming ordinary city traffic."
  },
  {
    pattern: /(rich|luxury|exotic|super)/i,
    label: "Luxury and high-end vehicles",
    detail: "Premium, luxury, sports, and exotic traffic."
  },
  {
    pattern: /(transport|taxi|bus|metro)/i,
    label: "Public and commercial transport",
    detail: "Taxis, buses, shuttles, and other passenger transport."
  },
  {
    pattern: /(large_city|largecity|commercial)/i,
    label: "Large city and commercial vehicles",
    detail: "Larger commercial vehicles used in city traffic."
  },
  {
    pattern: /(haulage|truck|freight|industrial)/i,
    label: "Freight and heavy trucks",
    detail: "Haulage, delivery, industrial, and heavy-truck traffic."
  },
  {
    pattern: /(bike|motorcycle|cycle)/i,
    label: "Bikes and motorcycles",
    detail: "Two-wheeled traffic represented by the loaded group."
  },
  {
    pattern: /(utility|service|maintenance)/i,
    label: "Utility and service vehicles",
    detail: "Municipal, maintenance, and service traffic."
  },
  {
    pattern: /(beach|offroad|recreational)/i,
    label: "Beach and recreational vehicles",
    detail: "Leisure, coastal, and recreational traffic."
  }
];

function getFriendlyPopulationGroup(
  groupName,
  type
) {
  const rules =
    type === "ped"
      ? POPCYCLE_PED_GROUP_RULES
      : POPCYCLE_VEHICLE_GROUP_RULES;

  const match =
    rules.find(rule =>
      rule.pattern.test(groupName)
    );

  if (match) {
    return {
      label: match.label,
      detail: match.detail
    };
  }

  return {
    label: humanizePopulationGroupName(
      groupName
    ),
    detail:
      type === "ped"
        ? "Pedestrian group loaded by this schedule and time period."
        : "Vehicle group loaded by this schedule and time period."
  };
}

function humanizePopulationGroupName(name) {
  const words = String(name || "")
    .replace(/^VEH_/i, "")
    .replace(/^[^_]+_/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim();

  return words
    .split(/\s+/)
    .filter(Boolean)
    .map(word =>
      word.charAt(0).toUpperCase() +
      word.slice(1).toLowerCase()
    )
    .join(" ") || "Unclassified group";
}

function buildPopulationMixItems(
  groups,
  type
) {
  const validGroups =
    (groups || [])
      .map((group, sourceIndex) => ({
        group,
        sourceIndex
      }))
      .filter(item =>
        item.group &&
        item.group.name &&
        Number.isFinite(
          Number(item.group.weight)
        )
      );

  const totalWeight =
    validGroups.reduce(
      (sum, item) =>
        sum +
        Number(item.group.weight),
      0
    );

  return validGroups
    .map(item => {
      const friendly =
        getFriendlyPopulationGroup(
          item.group.name,
          type
        );

      return {
        sourceIndex:
          item.sourceIndex,
        sourceName:
          item.group.name,
        weight:
          Number(item.group.weight),
        percentage:
          totalWeight > 0
            ? (
                Number(
                  item.group.weight
                ) /
                totalWeight
              ) * 100
            : 0,
        label:
          friendly.label,
        detail:
          friendly.detail
      };
    })
    .sort(
      (a, b) =>
        b.weight - a.weight
    );
}

function buildPopulationMixSentence(
  items,
  type
) {
  if (!items.length) {
    return type === "ped"
      ? "No pedestrian groups are assigned to this hour."
      : "No vehicle groups are assigned to this hour.";
  }

  const leading =
    items.slice(0, 3);

  const phrases =
    leading.map(item =>
      `${item.label.toLowerCase()} (${Math.round(item.percentage)}%)`
    );

  const subject =
    type === "ped"
      ? "The pedestrian mix favors"
      : "The traffic mix favors";

  return `${subject} ${joinPopulationPhrases(phrases)}.`;
}

function joinPopulationPhrases(phrases) {
  if (phrases.length === 1) {
    return phrases[0];
  }

  if (phrases.length === 2) {
    return `${phrases[0]} and ${phrases[1]}`;
  }

  return (
    `${phrases.slice(0, -1).join(", ")}, and ` +
    phrases.at(-1)
  );
}

// [END MODULE: POPCYCLE_GROUP_DESCRIPTIONS]
