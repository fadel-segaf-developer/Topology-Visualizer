/**
 * Insight rules normalise LLM output and add deterministic findings.
 * Each rule receives the graph and can emit node- or edge-scoped insights.
 * Implementations should always return data that conforms to topology.schema.json.
 */

export const insightRules = [
  {
    id: 'module-with-many-dependents',
    level: 'medium',
    kind: 'risk',
    description: 'Flags medium-level modules with excessive fan-in and open issues.',
    evaluate(graph) {
      // Placeholder: wire into correlation.json deltas once available.
      return [];
    }
  },
  {
    id: 'hotspot-issues-open',
    level: 'high',
    kind: 'priority',
    description: 'Highlights high-level services with multiple linked open issues.',
    evaluate(graph) {
      // Placeholder: inspect node.work.issues when integrating with the agent.
      return [];
    }
  }
];

export function runInsightRules(graph) {
  return insightRules.flatMap((rule) => {
    try {
      return rule.evaluate(graph) || [];
    } catch (error) {
      console.warn(`Insight rule ${rule.id} failed`, error);
      return [];
    }
  });
}
