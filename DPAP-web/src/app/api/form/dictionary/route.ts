/** Mock data-dictionary export (DEV-ONLY) from the vendored schema. */
import { NextResponse, type NextRequest } from "next/server";
import { MOCK_ENABLED, notFound, unauthorized, hasBearer } from "@/lib/mock/http";
import { schema, optionsFor } from "@/form/schema-model";

export async function GET(request: NextRequest) {
  if (!MOCK_ENABLED) return notFound();
  if (!hasBearer(request)) return unauthorized();
  const format = request.nextUrl.searchParams.get("format") ?? "json";

  if (format === "csv") {
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const header = ["module", "id", "var", "name", "label_pt", "type", "required", "options"];
    const lines = [header.join(",")];
    for (const m of schema.modules) {
      for (const f of m.fields) {
        const opts = f.list ? `list:${f.list}` : optionsFor(f).map((o) => `${o.code}=${o.label_pt}`).join("; ");
        lines.push([m.key, f.id, f.var, f.name, f.label_pt, f.type, f.required, opts].map((x) => esc(String(x))).join(","));
      }
    }
    return new NextResponse("﻿" + lines.join("\r\n") + "\r\n", {
      headers: { "Content-Type": "text/csv; charset=UTF-8", "Content-Disposition": 'attachment; filename="dicionario-dados.csv"' },
    });
  }

  return new NextResponse(JSON.stringify(schema), {
    headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="dicionario-dados.json"' },
  });
}
