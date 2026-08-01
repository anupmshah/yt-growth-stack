export const agentTools = [
  {name:"create_project",approval:"none"},{name:"add_competitor",approval:"none"},
  {name:"start_competitor_research",approval:"cost-threshold"},{name:"get_research_status",approval:"none"},
  {name:"search_project_evidence",approval:"none"},{name:"generate_opportunities",approval:"none"},
  {name:"save_opportunity",approval:"none"},{name:"cancel_research_run",approval:"confirm"},
] as const;
