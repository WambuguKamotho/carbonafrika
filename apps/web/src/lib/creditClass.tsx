import { Sprout, Factory, Clock, ShieldCheck } from "lucide-react";

/**
 * Classifies a project's carbon credits the way serious buyers (and standards
 * like Puro / ICVCM) now expect: is it a REMOVAL (carbon physically taken out
 * of the atmosphere and stored) or a REDUCTION/avoidance (emissions that were
 * prevented)? Plus a plain-language durability rating, since biological storage
 * carries reversal risk that avoided emissions do not.
 *
 * Derived from existing project fields, so no schema/DB change is needed.
 */
export type CreditInput = {
  projectType: string;
  landType?: string | null;
  energyType?: string | null;
};

export type CreditClass = "REMOVAL" | "REDUCTION";

export interface CreditClassification {
  creditClass: CreditClass;
  classLabel: string;
  classBlurb: string;
  durabilityLabel: string;
  durabilityBlurb: string;
  tier: "high" | "medium" | "avoided";
}

export function classifyCredit(p: CreditInput): CreditClassification {
  // Biochar locks carbon into stable char → durable, century-scale removal.
  if (p.energyType === "BIOCHARCOAL") {
    return {
      creditClass: "REMOVAL",
      classLabel: "Removal",
      classBlurb: "Carbon is physically removed from the atmosphere and stored.",
      durabilityLabel: "Durable · 100+ yrs",
      durabilityBlurb:
        "Biochar locks carbon into stable char that resists decay for centuries.",
      tier: "high",
    };
  }

  // Clean energy (solar, wind, biogas, cookstoves, hydro) displaces fossil or
  // wood-fuel emissions that would otherwise be released → avoidance.
  if (p.projectType === "CLEAN_ENERGY") {
    return {
      creditClass: "REDUCTION",
      classLabel: "Avoided emissions",
      classBlurb:
        "Clean energy that displaces fossil- or wood-fuel emissions that would otherwise be released.",
      durabilityLabel: "No reversal risk",
      durabilityBlurb:
        "Avoided emissions cannot be re-released — there is nothing stored that could reverse.",
      tier: "avoided",
    };
  }

  // Land restoration draws carbon down into biomass and soil → removal, but
  // with reversal risk (fire, clearing) covered by the permanence buffer pool.
  return {
    creditClass: "REMOVAL",
    classLabel: "Removal",
    classBlurb:
      "Carbon is drawn down into trees, plants, and soil as the land is restored.",
    durabilityLabel: "Buffer-backed · decades",
    durabilityBlurb:
      "Biological storage carries reversal risk (fire, clearing); a permanence buffer is held against it.",
    tier: "medium",
  };
}

/** Compact Removal/Avoidance + durability badges for cards and detail pages. */
export function CreditClassBadges({
  project,
  className = "",
}: {
  project: CreditInput;
  className?: string;
}) {
  const c = classifyCredit(project);
  const isRemoval = c.creditClass === "REMOVAL";
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span
        title={c.classBlurb}
        className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
          isRemoval ? "bg-forest-100 text-forest-700" : "bg-blue-100 text-blue-700"
        }`}
      >
        {isRemoval ? <Sprout className="w-3 h-3" /> : <Factory className="w-3 h-3" />}
        {c.classLabel}
      </span>
      <span
        title={c.durabilityBlurb}
        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600"
      >
        {c.tier === "avoided" ? <ShieldCheck className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
        {c.durabilityLabel}
      </span>
    </div>
  );
}
