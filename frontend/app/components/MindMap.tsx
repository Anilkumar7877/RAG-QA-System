"use client";
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface Node {
  id: string;
  label: string;
  type: "root" | "topic" | "concept";
}

interface Edge {
  source: string;
  target: string;
  label: string;
}

interface MindMapData {
  title: string;
  nodes: Node[];
  edges: Edge[];
}

interface Props {
  data: MindMapData;
}

const NODE_COLORS = {
  root: "#3b82f6", // Indigo/blue
  topic: "#8b5cf6", // Purple
  concept: "#10b981", // Emerald green
};

const CARD_DIMENSIONS = {
  root: { w: 180, h: 50 },
  topic: { w: 150, h: 42 },
  concept: { w: 130, h: 36 },
};

export default function MindMap({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<((action: "in" | "out" | "reset") => void) | null>(null);

  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  // Resize observer to make visualization fully responsive and avoid mount size collapse
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(container);

    // Initial check
    if (container.clientWidth > 0 && container.clientHeight > 0) {
      setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    } else {
      // Fallback default during initial mount before style calculations
      setDimensions({ width: 800, height: 600 });
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!svgRef.current || !data || !dimensions) return;

    const { width, height } = dimensions;

    // 1. Initialize node and link objects
    const simNodes: any[] = data.nodes.map((n) => ({ ...n }));
    const nodeById = new Map(simNodes.map((n) => [n.id, n]));

    const simLinks: any[] = data.edges
      .map((e) => ({
        source: nodeById.get(e.source),
        target: nodeById.get(e.target),
        label: e.label,
      }))
      .filter((e) => e.source && e.target);

    // 2. Force simulation structured as a staggered hierarchical mindmap
    const simulation = d3
      .forceSimulation(simNodes)
      // Link distance and strong centering pull
      .force("link", d3.forceLink(simLinks).distance(150).strength(1.0))
      // Moderate charge repulsion to spread nodes out naturally
      .force("charge", d3.forceManyBody().strength(-800))
      // Weak Y guide force to create layered flow, but allow vertical staggering to fit text cards
      .force(
        "y",
        d3.forceY((d: any) => {
          if (d.type === "root") return height * 0.15;
          if (d.type === "topic") return height * 0.48;
          return height * 0.82;
        }).strength(0.65)
      )
      // Horizontal centering guide force
      .force("x", d3.forceX(width / 2).strength(0.4))
      // Dynamic collision avoidance - generous radius to completely prevent overlapping card boxes
      .force(
        "collision",
        d3.forceCollide().radius((d: any) => {
          if (d.type === "root") return 110;
          if (d.type === "topic") return 95;
          return 85; // 85px radius = 170px minimum spacing between centers (concepts are 130px wide, leaves 40px gap)
        })
      );

    // Stop automatic ticking and run ticks synchronously to static equilibrium
    simulation.stop();
    for (let i = 0; i < 400; ++i) {
      simulation.tick();
    }

    // 3. Find bounding box of simulated nodes to set custom canvas dimensions
    let minX = d3.min(simNodes, (d: any) => d.x - CARD_DIMENSIONS[d.type as keyof typeof CARD_DIMENSIONS].w / 2) ?? 0;
    let maxX = d3.max(simNodes, (d: any) => d.x + CARD_DIMENSIONS[d.type as keyof typeof CARD_DIMENSIONS].w / 2) ?? width;
    let minY = d3.min(simNodes, (d: any) => d.y - CARD_DIMENSIONS[d.type as keyof typeof CARD_DIMENSIONS].h / 2) ?? 0;
    let maxY = d3.max(simNodes, (d: any) => d.y + CARD_DIMENSIONS[d.type as keyof typeof CARD_DIMENSIONS].h / 2) ?? height;

    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;

    const padding = 80;
    const canvasWidth = Math.max(width, graphWidth + padding * 2);
    const canvasHeight = Math.max(height, graphHeight + padding * 2);

    // Shift all nodes to be centered exactly on the newly sized viewport canvas
    const shiftX = (canvasWidth - graphWidth) / 2 - minX;
    const shiftY = (canvasHeight - graphHeight) / 2 - minY;

    simNodes.forEach((n) => {
      n.x += shiftX;
      n.y += shiftY;
    });

    // Clear previous render
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", `0 0 ${canvasWidth} ${canvasHeight}`)
      .attr("width", "100%")
      .attr("height", "100%");

    // Main group to contain all drawn links, labels and nodes for zooming
    const zoomContainer = svg.append("g").attr("class", "zoom-container");

    // D3 Zoom behaviour
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 4]) // Zoom bounds (15% to 400%)
      .on("zoom", (event) => {
        zoomContainer.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Expose programmatic zoom actions
    zoomRef.current = (action) => {
      if (!svgRef.current) return;
      const svgSelection = d3.select<SVGSVGElement, any>(svgRef.current) as any;
      if (action === "in") {
        svgSelection.transition().duration(300).call(zoom.scaleBy, 1.3);
      } else if (action === "out") {
        svgSelection.transition().duration(300).call(zoom.scaleBy, 0.7);
      } else if (action === "reset") {
        svgSelection.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
      }
    };

    // Arrow marker defined on main svg defs
    svg
      .append("defs")
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8) // Position at card edge since curves stop exactly at the target's boundary
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#4b5563");

    // Draw flowchart links (gorgeous bezier curves connecting top-bottom boundaries)
    const link = zoomContainer
      .append("g")
      .selectAll("path")
      .data(simLinks)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", "#4b5563")
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrow)")
      .attr("d", (d: any) => {
        const sH = CARD_DIMENSIONS[d.source.type as keyof typeof CARD_DIMENSIONS].h;
        const tH = CARD_DIMENSIONS[d.target.type as keyof typeof CARD_DIMENSIONS].h;

        // Curve leaves bottom center of source card
        const x1 = d.source.x;
        const y1 = d.source.y + sH / 2;

        // Curve enters top center of target card
        const x2 = d.target.x;
        const y2 = d.target.y - tH / 2;

        // Flowchart S-curve (Cubic Bezier)
        return `M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`;
      });

    // Edge relationship labels
    const edgeLabel = zoomContainer
      .append("g")
      .selectAll("text")
      .data(simLinks)
      .join("text")
      .attr("font-size", 8)
      .attr("fill", "#6b7280")
      .attr("text-anchor", "middle")
      .attr("dy", "-4px")
      .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
      .attr("y", (d: any) => (d.source.y + d.target.y) / 2)
      .text((d: any) => d.label);

    // Draw node cards (containers)
    const node = zoomContainer
      .append("g")
      .selectAll("g")
      .data(simNodes)
      .join("g")
      .attr("transform", (d: any) => `translate(${d.x},${d.y})`);

    // Flowchart card rectangles with gradients/shadows
    node
      .append("rect")
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("width", (d: any) => CARD_DIMENSIONS[d.type as keyof typeof CARD_DIMENSIONS].w)
      .attr("height", (d: any) => CARD_DIMENSIONS[d.type as keyof typeof CARD_DIMENSIONS].h)
      .attr("x", (d: any) => -CARD_DIMENSIONS[d.type as keyof typeof CARD_DIMENSIONS].w / 2)
      .attr("y", (d: any) => -CARD_DIMENSIONS[d.type as keyof typeof CARD_DIMENSIONS].h / 2)
      .attr("fill", "#0f172a") // Deep slate-900 background
      .attr("stroke", (d: any) => NODE_COLORS[d.type as keyof typeof NODE_COLORS] || "#6b7280")
      .attr("stroke-width", 2)
      .attr("filter", "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.4))")
      .style("transition", "stroke-width 0.2s, filter 0.2s");

    // Flowchart text labels centered vertically and horizontally
    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", (d: any) => (d.type === "root" ? 11 : 9))
      .attr("fill", "#f1f5f9") // Slate-100 text
      .attr("font-weight", (d: any) => (d.type === "root" ? "bold" : "600"))
      .text((d: any) => d.label)
      .style("pointer-events", "none");

    // Interactivity: High-quality focus and highlighting
    node
      .on("mouseover", (event, d: any) => {
        // Highlight active links and fade others
        link
          .style("stroke", (l: any) =>
            l.source.id === d.id || l.target.id === d.id ? "#818cf8" : "#1e293b"
          )
          .style("stroke-width", (l: any) =>
            l.source.id === d.id || l.target.id === d.id ? 2.5 : 0.8
          )
          .style("opacity", (l: any) =>
            l.source.id === d.id || l.target.id === d.id ? 1.0 : 0.15
          );

        // Highlight active nodes and neighbors, fade others
        const neighbors = new Set<string>();
        neighbors.add(d.id);
        simLinks.forEach((l) => {
          if (l.source.id === d.id) neighbors.add(l.target.id);
          if (l.target.id === d.id) neighbors.add(l.source.id);
        });

        node.style("opacity", (n: any) => (neighbors.has(n.id) ? 1.0 : 0.25));

        // Scale and glow hovered card
        d3.select(event.currentTarget)
          .select("rect")
          .style("stroke-width", "3px")
          .style("filter", "drop-shadow(0 0 10px rgba(129, 140, 248, 0.6))");
      })
      .on("mouseout", (event) => {
        // Reset links
        link
          .style("stroke", "#4b5563")
          .style("stroke-width", 1.5)
          .style("opacity", 1.0);

        // Reset nodes
        node.style("opacity", 1.0);

        // Reset hovered card
        d3.select(event.currentTarget)
          .select("rect")
          .style("stroke-width", "2px")
          .style("filter", "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.4))");
      });

    return () => {};
  }, [data, dimensions]);

  const handleZoom = (action: "in" | "out" | "reset") => {
    if (zoomRef.current) {
      zoomRef.current(action);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#070b13] overflow-hidden relative">
      {/* Legend & Stats Header */}
      <div className="px-6 py-3 bg-[#0f172a]/40 backdrop-blur border-b border-slate-800/80 flex items-center justify-between shrink-0 select-none z-10">
        <div>
          <h3 className="text-sm font-semibold text-white">{data.title}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {data.nodes.length} concepts · {data.edges.length} relationships · Hover to focus, scroll/pinch or click to zoom/pan
          </p>
        </div>
        <div className="flex gap-4 text-xs">
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <span key={type} className="flex items-center gap-1.5 text-slate-400">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ background: color }}
              />
              <span className="capitalize">{type}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Floating Zoom controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-10">
        <button
          onClick={() => handleZoom("in")}
          className="w-10 h-10 rounded-lg bg-slate-900/85 backdrop-blur border border-slate-800 hover:border-slate-700 text-white flex items-center justify-center font-bold text-lg shadow-lg hover:bg-slate-800/90 transition active:scale-95 cursor-pointer select-none"
          title="Zoom In"
        >
          ＋
        </button>
        <button
          onClick={() => handleZoom("out")}
          className="w-10 h-10 rounded-lg bg-slate-900/85 backdrop-blur border border-slate-800 hover:border-slate-700 text-white flex items-center justify-center font-bold text-lg shadow-lg hover:bg-slate-800/90 transition active:scale-95 cursor-pointer select-none"
          title="Zoom Out"
        >
          －
        </button>
        <button
          onClick={() => handleZoom("reset")}
          className="w-10 h-10 rounded-lg bg-slate-900/85 backdrop-blur border border-slate-800 hover:border-slate-700 text-white flex items-center justify-center text-[10px] font-semibold shadow-lg hover:bg-slate-800/90 transition active:scale-95 cursor-pointer select-none"
          title="Reset View"
        >
          RESET
        </button>
      </div>

      {/* Responsive Canvas Container */}
      <div ref={containerRef} className="flex-1 min-h-0 w-full relative">
        <svg ref={svgRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />
      </div>
    </div>
  );
}