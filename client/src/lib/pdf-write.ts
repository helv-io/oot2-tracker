// Binary PDF assembler. Strings are UTF-8 (content streams stay ASCII);
// font and image streams are raw bytes, so the file is built as a
// Uint8Array rather than a JS string (Blob would otherwise UTF-8-encode
// high bytes and corrupt the embedded fonts).

const te = new TextEncoder();

export function strBytes(s: string): Uint8Array {
  return te.encode(s);
}

export function concat(parts: Uint8Array[]): Uint8Array {
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function asBytes(body: string | Uint8Array): Uint8Array {
  return typeof body === "string" ? strBytes(body) : body;
}

export class PdfDoc {
  private objects = new Map<number, Uint8Array>();
  private nextId = 1;

  add(body: string | Uint8Array): number {
    const id = this.nextId++;
    this.objects.set(id, asBytes(body));
    return id;
  }

  reserve(): number {
    return this.nextId++;
  }

  set(id: number, body: string | Uint8Array): void {
    this.objects.set(id, asBytes(body));
  }

  /** Stream with /Length set to the data byte count. extra is raw dict entries (leading space). */
  addStream(data: Uint8Array, extra = ""): number {
    const header = strBytes(`<< /Length ${data.length}${extra} >>\nstream\n`);
    const tail = strBytes("\nendstream");
    return this.add(concat([header, data, tail]));
  }

  assemble(rootId: number): Uint8Array {
    const maxId = this.nextId - 1;
    const parts: Uint8Array[] = [strBytes("%PDF-1.4\n%\x80\x80\x80\x80\n")];
    let offset = parts[0].length;
    const offsets = new Array<number>(maxId + 1).fill(0);
    for (let id = 1; id <= maxId; id++) {
      const body = this.objects.get(id);
      if (!body) continue;
      const start = strBytes(`${id} 0 obj\n`);
      const end = strBytes("\nendobj\n");
      offsets[id] = offset;
      parts.push(start, body, end);
      offset += start.length + body.length + end.length;
    }
    const xrefStart = offset;
    let xref = `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
    for (let id = 1; id <= maxId; id++) {
      xref += `${String(offsets[id] ?? 0).padStart(10, "0")} 00000 n \n`;
    }
    xref += `trailer\n<< /Size ${maxId + 1} /Root ${rootId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    parts.push(strBytes(xref));
    return concat(parts);
  }
}
