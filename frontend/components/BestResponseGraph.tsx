import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import * as d3 from "d3";
import {
  getBestResponseGraph,
  BestResponseRequest,
  BestResponseResponse,
} from "../lib/api";
import styles from "../styles/BestResponseGraph.module.css";

interface BestResponseGraphProps {
  sessionId: string;
  payoffMatrix: Record<string, number[]>;
  actions: Record<string, string[]>;
}

export default function BestResponseGraph({
  sessionId,
  payoffMatrix,
  actions,
}: BestResponseGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [graphData, setGraphData] = useState<BestResponseResponse | null>(null);

  const graphMutation = useMutation({
    mutationFn: (request: BestResponseRequest) => getBestResponseGraph(request),
    onSuccess: (data) => {
      setGraphData(data);
    },
  });

  useEffect(() => {
    if (
      Object.keys(payoffMatrix).length > 0 &&
      Object.keys(actions).length > 0
    ) {
      const request: BestResponseRequest = {
        payoff_matrix: payoffMatrix,
        player_actions: actions,
      };
      graphMutation.mutate(request);
    }
  }, [payoffMatrix, actions]);

  useEffect(() => {
    if (!graphData || !svgRef.current) return;
    
    // Validate graph data
    if (!graphData.nodes || graphData.nodes.length === 0) return;
    if (!graphData.edges) graphData.edges = [];

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const width = 800;
    const height = 600;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create a node map for quick lookup
    const nodeMap = new Map(graphData.nodes.map((node: any) => [node.id, node]));
    
    // Transform edges from {from, to} to {source, target} format expected by D3
    // D3 forceLink expects source/target to be node IDs (numbers or strings) that match the node.id
    // Filter out edges that reference non-existent nodes
    const validEdges = graphData.edges
      .filter((edge: any) => nodeMap.has(edge.from) && nodeMap.has(edge.to))
      .map((edge: any) => ({
        source: edge.from,  // Use the ID directly - D3 will resolve it via .id()
        target: edge.to,    // Use the ID directly - D3 will resolve it via .id()
        player_id: edge.player_id,
        action: edge.action,
        deviation_payoff: edge.deviation_payoff,
        base_payoff: edge.base_payoff,
      }));

    // Initialize nodes with positions if they don't have them
    const nodes = graphData.nodes.map((node: any) => ({
      ...node,
      x: node.x || width / 2,
      y: node.y || height / 2,
    }));

    // Create force simulation
    const simulation = d3
      .forceSimulation(nodes as any)
      .force(
        "link",
        d3
          .forceLink(validEdges as any)
          .id((d: any) => d.id)
          .distance(100)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2 - margin.left, height / 2 - margin.top));

    // Draw edges
    const link = g
      .append("g")
      .selectAll("line")
      .data(validEdges)
      .enter()
      .append("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrowhead)");

    // Draw arrow marker
    g.append("defs")
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#999");

    // Draw nodes
    const node = g
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("g")
      .call(
        d3
          .drag<any, any>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended) as any
      );

    node
      .append("circle")
      .attr("r", 20)
      .attr("fill", (d: any) =>
        graphData.nash_nodes && graphData.nash_nodes.includes(d.id) ? "#ffc107" : "#0070f3"
      )
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    // Add labels
    node
      .append("text")
      .text((d: any) => d.profile_key)
      .attr("dx", 25)
      .attr("dy", 5)
      .attr("font-size", "12px")
      .attr("fill", "#333");

    // Tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", styles.tooltip)
      .style("opacity", 0);

    node
      .on("mouseover", function (event, d: any) {
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip
          .html(
            `Profile: ${d.profile_key}<br/>` +
              Object.entries(d.payoffs)
                .map(([pid, payoff]: [string, any]) => `Player ${pid}: ${payoff.toFixed(2)}`)
                .join("<br/>") +
              (graphData.nash_nodes && graphData.nash_nodes.includes(d.id)
                ? "<br/><strong>Nash Equilibrium</strong>"
                : "")
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseout", function () {
        tooltip.transition().duration(500).style("opacity", 0);
      });

    // Update positions on simulation tick
    // After D3 resolves the links, source and target will be node objects
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => (typeof d.source === 'object' && d.source ? d.source.x : 0))
        .attr("y1", (d: any) => (typeof d.source === 'object' && d.source ? d.source.y : 0))
        .attr("x2", (d: any) => (typeof d.target === 'object' && d.target ? d.target.x : 0))
        .attr("y2", (d: any) => (typeof d.target === 'object' && d.target ? d.target.y : 0));

      node.attr("transform", (d: any) => `translate(${d.x || 0},${d.y || 0})`);
    });
    
    // Cleanup function
    return () => {
      simulation.stop();
      d3.select("body").selectAll(`.${styles.tooltip}`).remove();
    };

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }, [graphData]);

  if (graphMutation.isPending) {
    return (
      <div className="card">
        <h2>Best Response Graph</h2>
        <p>Loading graph data...</p>
      </div>
    );
  }

  if (!graphData) {
    return (
      <div className="card">
        <h2>Best Response Graph</h2>
        <p>No graph data available.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Best Response Graph</h2>
      <p className={styles.description}>
        Nodes are action profiles. Arrows show profitable deviations. Yellow nodes are Nash equilibria.
      </p>
      <svg ref={svgRef} className={styles.graph}></svg>
      <div className={styles.legend}>
        <span>
          <span className={styles.legendColor} style={{ background: "#ffc107" }}></span>
          Nash Equilibrium
        </span>
        <span>
          <span className={styles.legendColor} style={{ background: "#0070f3" }}></span>
          Other Profiles
        </span>
      </div>
    </div>
  );
}

