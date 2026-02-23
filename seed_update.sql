DELETE FROM public.rollout_phases;

INSERT INTO public.rollout_phases (order_index, name, description, planned_start, planned_end, status, completion_percentage, weight) VALUES
(1, 'Foundation & Framework Design', 'Definition of the SDLC governance model, intake framework, documentation standards, and Jira workflow configuration to establish the structural baseline for enterprise rollout.', '2026-01-01', '2026-02-15', 'completed', 100, 20),
(2, 'Wave 1 – Pilot Implementation (MAPS & EG)', 'Initial rollout of the SDLC framework within pilot workstreams (MAPS and EG) to validate workflows, governance controls, automation, and reporting standards.', '2026-02-16', '2026-03-31', 'in_progress', 50, 20),
(3, 'Post-Wave 1 Optimization & Governance Calibration', 'Formal review of pilot results, identification of gaps, refinement of workflows, documentation adjustments, and governance improvements before broader expansion.', '2026-04-01', '2026-04-20', 'pending', 0, 10),
(4, 'Wave 2 – Enterprise Expansion', 'Structured rollout of the optimized SDLC framework to PCE, Banking & Treasury, and Global Markets workstreams, including training, adoption tracking, and operational monitoring.', '2026-04-21', '2026-07-15', 'pending', 0, 25),
(5, 'Post-Wave 2 Stabilization & Adoption Review', 'Assessment of execution quality, KPI alignment, risk exposure, and adoption maturity across Wave 2 workstreams. Includes corrective actions and performance calibration.', '2026-07-16', '2026-08-05', 'pending', 0, 10),
(6, 'Wave 3 – Enterprise Completion', 'Rollout of the SDLC framework to all remaining workstreams not included in Waves 1 and 2, ensuring standardized execution and governance across the organization.', '2026-08-06', '2026-10-15', 'pending', 0, 10),
(7, 'Enterprise Stabilization & Institutionalization', 'Final governance embedding, KPI visibility, documentation consolidation, training completion, and operational ownership transfer to ensure long-term sustainability.', '2026-10-16', '2026-11-30', 'pending', 0, 5),
(8, 'SDLC Program Completion', 'Formal closure of the SDLC transformation program, confirmation of enterprise adoption, governance integration, and transition to steady-state operations.', '2026-12-01', '2026-12-15', 'pending', 0, 0);

