 import { authenticate } from "../auth/apiKey";
 import { requireScope } from "../auth/scopes";
 import { listDiaries } from "../db/diaries_db";
 import type { Env, KeyProfile } from "../types";
 import { json, openAiError } from "../utils/json";
 import { readPositiveInt, resolveNamespace } from "../utils/request";

 async function handleListDiaries(
   request: Request,
   env: Env,
   profile: KeyProfile
 ): Promise<Response> {
   const scopeError = requireScope(profile, "memory:read");
   if (scopeError) return scopeError;

   const url = new URL(request.url);
   const namespace = resolveNamespace(profile, url.searchParams.get("namespace"));
   const limit = readPositiveInt(url.searchParams.get("limit"), 30, 100);
   const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

   const { entries, hasMore } = await listDiaries(env.DB, { namespace, limit, offset });

   return json({
     data: entries,
     paging: { has_more: hasMore, next_offset: hasMore ? offset + entries.length : null }
   });
 }

 export async function handleDiaries(request: Request, env: Env): Promise<Response> {
   const auth = await authenticate(request, env);
   if (!auth.ok) return openAiError("Unauthorized", 401, "authentication_error");

   return handleListDiaries(request, env, auth.profile);
 }