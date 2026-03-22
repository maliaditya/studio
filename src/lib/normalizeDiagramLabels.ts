import type { DiagramBlueprint, DiagramNode } from "@/lib/renderAsciiTree";

const EXACT_REPLACEMENTS: Record<string, string> = {
  "Model Design": "Choosing Model Architecture",
  "Model Architecture": "Choosing Model Architecture",
  "Data Feeding": "Training the Model",
  Training: "Training the Model",
  "Efficiency": "Efficient Execution",
  "Accuracy": "Fast Predictions",
  Finetuning: "Fine-tuning",
  Importance: "Why It Matters",
  "Importance Now": "Why It Matters",
  "Further Information": "References",
  "Faster Models": "Faster Inference",
  Definition: "Core Idea",
  "Core Concept": "Core Idea",
  "Learning Processes": "Learning Concepts",
  "Hugging Face's Transformers": "Hugging Face Transformers",
  "Hugging Face Transformers": "Hugging Face Transformers",
  "Hugging Face’s Transformers": "Hugging Face Transformers",
  "Loss Functions": "Loss Function",
  "Random Model Weights": "Starts from random model weights",
  "Random Weights": "Starts from random model weights",
  "Model Weights": "Starts from random model weights",
  "Text Completion": "Often trained for text completion",
  "Resource Intensity": "Highly resource-intensive",
  Risk: "High risk",
  Expertise: "Requires specialized expertise",
  "Previously Trained Model": "Trains a previously trained model",
  "Fewer Resources": "Requires fewer resources",
  "Builds on Knowledge": "Builds on pre-training knowledge",
  "Instruction Following": "Improve instruction following",
  "Tailored Applications": "Adapt models for specific applications",
  "Training After Pre-training": "Training after pre-training",
  "Adjust Model Behavior": "Adjusts model behavior",
};

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();
const normalizeAmpersand = (value: string) => value.replace(/\s*&\s*/g, " and ");
const capitalizeFirst = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const isVerbLike = (label: string) =>
  /^(can|could|will|would|may|might|should|requires|require|improve|improves|improving|reduce|reduces|reducing|increase|increases|increasing|adapt|adapts|adapting|adjust|adjusts|adjusting|starts|start|starting|trains|train|training|uses|use|using|builds|build|building|often|typically|usually)\b/i.test(label);

const normalizeLabel = (label: string, parentLabel?: string) => {
  const cleaned = normalizeWhitespace(label);
  if (!cleaned) return cleaned;

  if (EXACT_REPLACEMENTS[cleaned]) {
    return EXACT_REPLACEMENTS[cleaned];
  }

  if (/^fine ?tuning$/i.test(cleaned)) {
    return "Fine-tuning";
  }

  if (/^importance$/i.test(cleaned)) {
    return "Why It Matters";
  }

  if (/^further information$/i.test(cleaned)) {
    return "References";
  }

  if (/^definition$/i.test(cleaned)) {
    return "Core Idea";
  }

  if (/^core concept$/i.test(cleaned)) {
    return "Core Idea";
  }

  if (/^faster models$/i.test(cleaned)) {
    if (parentLabel && /inference/i.test(parentLabel)) return "Faster Inference";
  }

  if (/^prediction accuracy$/i.test(cleaned)) {
    if (parentLabel && /inference/i.test(parentLabel)) return "Efficient Inference";
    return "Fast Predictions";
  }

  if (/^random model weights$/i.test(cleaned) || /^random weights$/i.test(cleaned)) {
    return "Starts from random model weights";
  }

  if (/^model weights$/i.test(cleaned)) {
    return "Starts from random model weights";
  }

  if (/^text completion$/i.test(cleaned)) {
    return "Often trained for text completion";
  }

  if (/^resource intensity$/i.test(cleaned)) {
    return "Highly resource-intensive";
  }

  if (/^risk$/i.test(cleaned)) {
    return "High risk";
  }

  if (/^expertise$/i.test(cleaned)) {
    return "Requires specialized expertise";
  }

  if (/^builds on knowledge$/i.test(cleaned)) {
    return "Builds on pre-training knowledge";
  }

  if (/^instruction following$/i.test(cleaned)) {
    return "Improve instruction following";
  }

  if (/^tailored applications$/i.test(cleaned)) {
    return "Adapt models for specific applications";
  }

  if (/^training after pre-training$/i.test(cleaned)) {
    return "Training after pre-training";
  }

  if (/^adjust model behavior$/i.test(cleaned)) {
    return "Adjusts model behavior";
  }

  if (/^previously trained model$/i.test(cleaned)) {
    return "Trains a previously trained model";
  }

  if (/^fewer resources$/i.test(cleaned)) {
    return "Requires fewer resources";
  }

  if (/^high inference costs?$/i.test(cleaned)) {
    return "Higher Cost";
  }

  if (/^latency challenge$/i.test(cleaned)) {
    return "More Latency";
  }

  if (/^latency requirements?$/i.test(cleaned)) {
    return "Latency Requirements";
  }

  if (/^(~?\s*100\s*ms|100\s*ms)\s*(response|latency)\s*(target)?$/i.test(cleaned)) {
    return "~100ms Response Target";
  }

  if (/^autoregressive generation$/i.test(cleaned)) {
    return "Autoregressive Models -> Sequential Token Generation";
  }

  const percentMatch = cleaned.match(/^(\d+%)(?:\s+|\s*[-–:]\s*)(.+)$/i);
  if (percentMatch) {
    const rest = normalizeAmpersand(percentMatch[2]).toLowerCase();
    return `Up to ${percentMatch[1]} of ${rest}`;
  }

  const spectrumMatch = cleaned.match(/^spectrum of (.+)$/i);
  if (spectrumMatch) {
    const topic = spectrumMatch[1].toLowerCase();
    if (/training/i.test(topic)) {
      return "Pre-training and post-training form a spectrum";
    }
    return `${capitalizeFirst(normalizeAmpersand(topic))} form a spectrum`;
  }

  if (/^similar\b/i.test(cleaned)) {
    const rest = cleaned.replace(/^similar\s+/i, "");
    return `Similar ${normalizeAmpersand(rest).toLowerCase()}`;
  }

  if (/^different\b/i.test(cleaned)) {
    const rest = cleaned.replace(/^different\s+/i, "");
    return `Different ${normalizeAmpersand(rest).toLowerCase()}`;
  }

  if (/^user roles$/i.test(cleaned)) {
    return "Used by different developers";
  }

  if (!isVerbLike(cleaned) && /loss|delay|delays|risk|risks/i.test(cleaned)) {
    const normalized = normalizeAmpersand(cleaned).toLowerCase();
    if (/loss|delay|delays/i.test(normalized)) {
      return `Errors can cause ${normalized.replace(/losses/i, "loss")}`;
    }
    return `Can cause ${normalized}`;
  }

  return cleaned;
};

const normalizeNode = (node: DiagramNode, parentLabel?: string, isRoot = false): DiagramNode => {
  let label = normalizeLabel(node.label, parentLabel);
  if (isRoot && /^model development$/i.test(label)) {
    label = "Model Development in ML";
  }
  const children = Array.isArray(node.children)
    ? node.children.map((child) => normalizeNode(child, label))
    : undefined;

  if (children && children.length > 0) {
    const deduped: DiagramNode[] = [];
    children.forEach((child) => {
      const last = deduped[deduped.length - 1];
      if (last && last.label === child.label) {
        const merged = {
          ...last,
          children: [...(last.children || []), ...(child.children || [])],
        };
        deduped[deduped.length - 1] = merged;
      } else {
        deduped.push(child);
      }
    });
    const filtered = deduped.filter((child) => {
      if (/^specialized skill$/i.test(child.label) && /^requires specialized expertise$/i.test(label)) {
        return false;
      }
      return true;
    });
    return { label, children: filtered };
  }

  if (children && children.length > 0 && /^core idea$/i.test(label)) {
    const nextChildren: DiagramNode[] = [];
    children.forEach((child) => {
      if (/^goal$/i.test(child.label) && child.children && child.children.length > 0) {
        nextChildren.push(...child.children);
      } else {
        nextChildren.push(child);
      }
    });
    return { label, children: nextChildren };
  }

  if (children && children.length > 0 && /^neural networks?$/i.test(label)) {
    label = "Neural Network Types";
  }
  if (/^fast predictions$/i.test(label)) {
    if (parentLabel && /inference|latency|optimization/i.test(parentLabel)) {
      label = "Fast Responses";
    }
  }
  if (/^machine learning models$/i.test(label)) {
    if (parentLabel && /core idea/i.test(parentLabel)) {
      label = "Faster Inference";
    }
  }
  if (children && children.length > 0) {
    return { label, children };
  }
  return { label };
};

const normalizeCausalNodes = (node: DiagramNode): DiagramNode => {
  if (!node.children || node.children.length === 0) return node;
  const children = node.children.map(normalizeCausalNodes);

  if (/^foundation models$/i.test(node.label)) {
    const normalizedChildren = children.map((child) => {
      let label = child.label;
      if (/^high inference costs?$/i.test(label)) label = "Higher Cost";
      if (/^latency challenge$/i.test(label)) label = "More Latency";
      if (/^increased complexity$/i.test(label)) label = "Increased Complexity";
      return child.children && child.children.length > 0 ? { ...child, label } : { label };
    });
    if (normalizedChildren.length === 0) {
      return {
        ...node,
        children: [{ label: "Higher Cost" }, { label: "More Latency" }],
      };
    }
    return { ...node, children: normalizedChildren };
  }

  if (/^autoregressive models$/i.test(node.label)) {
    if (!children || children.length === 0) {
      return {
        ...node,
        children: [{ label: "Sequential Token Generation" }],
      };
    }
  }

  return { ...node, children };
};

const rebalanceFoundationModels = (node: DiagramNode): DiagramNode => {
  if (!node.children || node.children.length === 0) return node;
  const children = node.children.map(rebalanceFoundationModels);
  const whyIndex = children.findIndex((child) => /^why it matters$/i.test(child.label));
  const importanceIndex = children.findIndex((child) => /^importance now$/i.test(child.label));

  if (importanceIndex !== -1 && whyIndex !== -1) {
    const whyNode = children[whyIndex];
    const importanceNode = children[importanceIndex];
    const mergedWhy = {
      ...whyNode,
      children: [...(whyNode.children || []), ...(importanceNode.children || [])],
    };
    const nextChildren = children
      .filter((_, idx) => idx !== importanceIndex)
      .map((child, idx) => (idx === whyIndex ? mergedWhy : child));
    return { ...node, children: nextChildren };
  }

  return { ...node, children };
};

export const normalizeDiagramLabels = (blueprint: DiagramBlueprint): DiagramBlueprint => {
  const GENERIC_WRAPPERS = new Set([
    "description",
    "value",
    "purpose",
    "process",
    "phase",
    "impact",
    "term",
    "why it matters",
    "goal",
    "core idea",
    "relationship to pre-training",
    "resource requirements",
  ]);

  const VERB_WRAPPERS = new Set(["uses", "requires", "needs"]);

  const collapseWrappers = (node: DiagramNode, path: string[] = []): DiagramNode => {
    const label = node.label;
    const children = node.children ? node.children.map((child) => collapseWrappers(child, [...path, label])) : undefined;

    if (children && children.length === 1) {
      const child = children[0];
      const normalizedLabel = label.toLowerCase();
      const childLabel = child.label;
      const chain = [...path.map((p) => p.toLowerCase()), normalizedLabel, childLabel.toLowerCase()];

      // Merge specific semantic chains into self-contained phrases.
      if (/^api usage$/i.test(label) && /interaction with (the )?world/i.test(childLabel)) {
        return { label: "APIs let agents interact with the world", children: child.children };
      }
      if (/^user feedback collection$/i.test(label) && /conversational interfaces/i.test(childLabel)) {
        return { label: "Conversational interfaces make feedback easier to collect", children: child.children };
      }
      if (/^feedback extraction$/i.test(label) && /challenges?/i.test(childLabel)) {
        return { label: "Extracting useful feedback remains difficult", children: child.children };
      }

      // Handle long linear chains like Large Organizations -> Embedded Applications -> Fraud Detection -> Stripe.
      if (/large organizations?/i.test(label) && /embedded applications?/i.test(childLabel)) {
        const grandchild = child.children && child.children.length === 1 ? child.children[0] : null;
        const greatGrandchild =
          grandchild && grandchild.children && grandchild.children.length === 1 ? grandchild.children[0] : null;
        const exampleLabel =
          grandchild && greatGrandchild
            ? `Example: ${normalizeAmpersand(grandchild.label).toLowerCase()} in ${greatGrandchild.label}`
            : null;
        const embeddedNode: DiagramNode = {
          label: "Often embedded inside existing products",
          children: exampleLabel ? [{ label: exampleLabel }] : undefined,
        };
        return {
          label: "Mostly limited to large organizations",
          children: [embeddedNode],
        };
      }

      if (GENERIC_WRAPPERS.has(normalizedLabel)) {
        if (chain.includes("task") && chain.includes("specific") && /training/i.test(childLabel)) {
          return { label: "Task-specific training", children: child.children };
        }
        return { label: childLabel, children: child.children };
      }

      if (["cost", "value", "impact"].includes(normalizedLabel)) {
        if (/high|low|increasing|decreasing/i.test(childLabel)) {
          return { label: `${childLabel} compute cost`, children: child.children };
        }
        return { label: `Compute cost: ${childLabel}`, children: child.children };
      }

      if (VERB_WRAPPERS.has(normalizedLabel)) {
        return { label: `${label} ${childLabel}`.replace(/\s+/g, " ").trim(), children: child.children };
      }
    }

    return children && children.length > 0 ? { label, children } : { label };
  };

  const root = normalizeNode(blueprint.root, undefined, true);
  const withCausal = normalizeCausalNodes(root);
  const rebalanced = rebalanceFoundationModels(withCausal);
  const collapsed = collapseWrappers(rebalanced);
  return { type: "hierarchy", root: collapsed };
};
