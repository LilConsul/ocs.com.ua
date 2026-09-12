import { experimental_createIslandRoute } from "@tinacms/astro/experimental";
import type { APIRoute } from "astro";
import { islands } from "../../lib/tina/islands";

export const prerender = false;
export const ALL: APIRoute = experimental_createIslandRoute(islands);
