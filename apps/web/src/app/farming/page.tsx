import { Leaf, Sun, Droplets, Wind, TreePine, TrendingUp } from "lucide-react";

const practices = [
  {
    icon: TreePine,
    title: "Agroforestry",
    desc: "Integrate trees into farmland to sequester carbon while improving yields. Native species like acacia and moringa provide shade, nitrogen-fixing, and fruit income.",
    credits: "2–5 tonnes CO₂/ha/year",
    steps: ["Plant native trees between crops", "Maintain 30–50% canopy cover", "Document tree count and species", "Submit annual photo evidence"],
  },
  {
    icon: Leaf,
    title: "No-Till Farming",
    desc: "Avoiding tillage keeps carbon locked in soil organic matter. Combined with cover crops, this can double soil carbon over 5 years.",
    credits: "0.5–2 tonnes CO₂/ha/year",
    steps: ["Use direct seeding instead of plowing", "Plant cover crops in off-season", "Rotate crops to maintain soil health", "Test soil carbon annually"],
  },
  {
    icon: Droplets,
    title: "Wetland & Mangrove Restoration",
    desc: "Mangroves and wetlands are among the highest carbon-density ecosystems. Restoring even 1 hectare can earn premium credits.",
    credits: "5–20 tonnes CO₂/ha/year",
    steps: ["Map degraded wetland areas", "Replant native mangrove species", "Control invasive species", "Monitor water levels and biomass"],
  },
  {
    icon: Wind,
    title: "Savanna Management",
    desc: "Controlled burns and grazing management prevent carbon-releasing wildfires and allow savanna grasses to build deep root carbon stores.",
    credits: "0.5–3 tonnes CO₂/ha/year",
    steps: ["Implement rotational grazing", "Conduct controlled early-season burns", "Remove invasive shrubs", "Monitor grass cover and density"],
  },
  {
    icon: Sun,
    title: "Biochar Production",
    desc: "Converting agricultural waste into biochar and applying it to soil permanently stores carbon and improves fertility.",
    credits: "0.3–1 tonne CO₂/ha/year",
    steps: ["Collect crop residues and wood waste", "Produce biochar using kiln", "Apply biochar to farmland", "Record application rates and location"],
  },
  {
    icon: TrendingUp,
    title: "Community Forest Management",
    desc: "Formalizing community protection of existing forests prevents deforestation — REDD+ credits. The most scalable approach for large communities.",
    credits: "3–10 tonnes CO₂/ha/year",
    steps: ["Map community forest boundaries", "Establish forest governance rules", "Monitor forest cover with satellite data", "Register on CarbonAfrika"],
  },
];

export default function FarmingGuidePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Efficient Farming for Carbon Credits</h1>
        <p className="text-gray-500 max-w-2xl mx-auto">
          Learn how to farm and manage land in ways that earn carbon credits while improving yields,
          soil health, and long-term income for your community.
        </p>
      </div>

      <div className="bg-forest-50 border border-forest-200 rounded-2xl p-6 mb-10">
        <h2 className="font-semibold text-forest-900 mb-2">How Credit Estimation Works</h2>
        <p className="text-sm text-forest-800 leading-relaxed">
          Carbon credits are calculated based on the difference between a <strong>baseline</strong> (what would happen without your project)
          and the actual CO₂ sequestered. Our verifiers use satellite imagery, soil tests, and biomass measurements.
          Ranges below are conservative estimates — your verifier will confirm the exact amount.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {practices.map((p) => (
          <div key={p.title} className="card hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-forest-100 rounded-xl flex items-center justify-center">
                <p.icon className="w-5 h-5 text-forest-700" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{p.title}</h3>
                <span className="badge-green text-xs">{p.credits}</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">{p.desc}</p>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Steps</div>
              <ul className="space-y-1">
                {p.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-forest-500 font-bold mt-0.5">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 card bg-gray-900 text-white text-center">
        <h2 className="text-xl font-bold mb-2">Ready to earn?</h2>
        <p className="text-gray-400 mb-6 text-sm">
          Once you implement any of these practices, submit your land as a project.
          Our verifiers will confirm your sequestration and mint credits to your wallet.
        </p>
        <a href="/projects/new" className="btn-primary inline-block">Submit My Land Project</a>
      </div>
    </div>
  );
}
