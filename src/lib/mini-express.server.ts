// Minimalny shim zgodny z API Expressa (req/res), aby oryginalne handlery
// z projektu Stark Focus OS działały bez zmian w środowisku Workers.

export type MiniRequest = {
  query: Record<string, string>;
  body: any;
  headers: Headers;
  method: string;
  url: string;
};

export class MiniResponse {
  status_ = 200;
  headers = new Headers();
  result: Response | null = null;

  setHeader(name: string, value: string) {
    this.headers.set(name, value);
    return this;
  }

  status(code: number) {
    this.status_ = code;
    return this;
  }

  json(payload: unknown) {
    this.headers.set("content-type", "application/json; charset=utf-8");
    this.result = new Response(JSON.stringify(payload), {
      status: this.status_,
      headers: this.headers,
    });
    return this;
  }

  send(payload: unknown) {
    if (payload instanceof ArrayBuffer || ArrayBuffer.isView(payload as any)) {
      this.result = new Response(payload as BodyInit, {
        status: this.status_,
        headers: this.headers,
      });
      return this;
    }
    if (typeof payload === "object" && payload !== null) return this.json(payload);
    this.result = new Response(String(payload), {
      status: this.status_,
      headers: this.headers,
    });
    return this;
  }

  redirect(location: string) {
    this.headers.set("location", location);
    this.result = new Response(null, { status: 302, headers: this.headers });
    return this;
  }
}

type Handler = (req: MiniRequest, res: MiniResponse) => unknown | Promise<unknown>;

export function createApp() {
  const routes: { method: string; path: string; handler: Handler }[] = [];

  const app = {
    get(path: string, handler: Handler) {
      routes.push({ method: "GET", path, handler });
    },
    post(path: string, handler: Handler) {
      routes.push({ method: "POST", path, handler });
    },
    async handle(request: Request): Promise<Response> {
      const url = new URL(request.url);
      const route = routes.find((r) => r.method === request.method && r.path === url.pathname);
      if (!route) return new Response("Not found", { status: 404 });

      let body: any = undefined;
      if (request.method === "POST") {
        try {
          body = await request.json();
        } catch {
          body = {};
        }
      }

      const req: MiniRequest = {
        query: Object.fromEntries(url.searchParams.entries()),
        body,
        headers: request.headers,
        method: request.method,
        url: request.url,
      };
      const res = new MiniResponse();

      try {
        await route.handler(req, res);
      } catch (err) {
        console.error("[stark-api]", err);
        if (!res.result) {
          return new Response(JSON.stringify({ error: String(err) }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      }

      return res.result ?? new Response(null, { status: 204 });
    },
  };

  return app;
}
