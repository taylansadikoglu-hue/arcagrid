import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  generateSkyPilotTaskYaml,
  type SkyPilotTaskInput,
} from "./skypilot.server";

const inputSchema = z.object({
  userWallet: z.string().min(4).max(256),
  clusterName: z.string().min(1).max(64).optional(),
  gpusPerNode: z.number().int().min(1).max(8).optional(),
  accelerators: z.array(z.string().min(1).max(32)).max(20).optional(),
  clouds: z.array(z.string().min(1).max(16)).max(8).optional(),
  diskGb: z.number().int().min(20).max(2048).optional(),
});

export const generateSkyPilotManifest = createServerFn({ method: "POST" })
  .inputValidator((data: SkyPilotTaskInput) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const yaml = generateSkyPilotTaskYaml(data);
    return { yaml };
  });