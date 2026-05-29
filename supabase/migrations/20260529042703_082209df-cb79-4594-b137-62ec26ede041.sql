-- Reusable timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Status enum
CREATE TYPE public.node_status AS ENUM ('active', 'syncing', 'idle', 'offline');

-- Fleet nodes
CREATE TABLE public.nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  hardware TEXT NOT NULL DEFAULT 'RTX 4070 Ti',
  wallet TEXT,
  status public.node_status NOT NULL DEFAULT 'idle',
  idle_redirect BOOLEAN NOT NULL DEFAULT false,
  power_cap_w INTEGER NOT NULL DEFAULT 160,
  matmul_backend TEXT NOT NULL DEFAULT 'cuda',
  solve_batch_size INTEGER NOT NULL DEFAULT 16,
  mine_batch_size INTEGER NOT NULL DEFAULT 80,
  min_peers INTEGER NOT NULL DEFAULT 1,
  ld_library_path TEXT NOT NULL DEFAULT '/usr/local/cuda-12.0/targets/x86_64-linux/lib',
  cuda_runtime_pin TEXT NOT NULL DEFAULT 'cuda-cudart-12-0',
  daily_cost_usd NUMERIC(10,2) NOT NULL DEFAULT 3.00,
  blocks_found INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nodes TO authenticated;
GRANT ALL ON public.nodes TO service_role;
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own nodes" ON public.nodes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own nodes" ON public.nodes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own nodes" ON public.nodes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own nodes" ON public.nodes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_nodes_updated_at
BEFORE UPDATE ON public.nodes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Telemetry samples
CREATE TABLE public.node_telemetry (
  id BIGSERIAL PRIMARY KEY,
  node_id UUID NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  hashrate_ns NUMERIC(10,2) NOT NULL,
  power_w NUMERIC(6,2) NOT NULL,
  gpu_temp_c NUMERIC(5,2) NOT NULL,
  vram_temp_c NUMERIC(5,2) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_node_telemetry_node_time ON public.node_telemetry(node_id, recorded_at DESC);

GRANT SELECT, INSERT, DELETE ON public.node_telemetry TO authenticated;
GRANT ALL ON public.node_telemetry TO service_role;
ALTER TABLE public.node_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own telemetry" ON public.node_telemetry FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own telemetry" ON public.node_telemetry FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own telemetry" ON public.node_telemetry FOR DELETE TO authenticated USING (auth.uid() = user_id);