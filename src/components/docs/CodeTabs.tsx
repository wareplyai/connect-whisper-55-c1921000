import { useState } from "react";
import { CopyButton } from "./CopyButton";
import { cn } from "@/lib/utils";

export type Snippet = { lang: string; code: string };

export function CodeTabs({ snippets, defaultLang = "Bash" }: { snippets: Snippet[]; defaultLang?: string }) {
  const [active, setActive] = useState(defaultLang);
  const current = snippets.find((s) => s.lang === active) ?? snippets[0];
  return (
    <div className="my-5 overflow-hidden rounded-lg border bg-code">
      <div className="flex items-center justify-between border-b border-code-muted/20 bg-code">
        <div className="flex w-full overflow-x-auto">
          {snippets.map((s) => (
            <button
              key={s.lang}
              onClick={() => setActive(s.lang)}
              className={cn(
                "shrink-0 px-3 py-2 text-xs font-medium transition-colors",
                s.lang === active
                  ? "border-b-2 border-primary text-code-foreground"
                  : "border-b-2 border-transparent text-code-muted hover:text-code-foreground",
              )}
            >
              {s.lang}
            </button>
          ))}
        </div>
        <CopyButton text={current.code} className="mr-2 shrink-0 text-code-muted hover:text-code-foreground" />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-code-foreground">
        <code>{current.code}</code>
      </pre>
    </div>
  );
}

export function buildSnippets(method: string, path: string, body?: Record<string, unknown>, baseUrl: string = "https://api.wareplyai.com"): Snippet[] {
  const url = `${baseUrl}${path}`;
  const json = body ? JSON.stringify(body, null, 2) : "";
  const hasBody = !!body;

  const bash = hasBody
    ? `curl -X ${method} "${url}" \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${json}'`
    : `curl -X ${method} "${url}" \\\n  -H "Authorization: Bearer YOUR_API_KEY"`;

  const python = `import requests\n\nurl = "${url}"\nheaders = {"Authorization": "Bearer YOUR_API_KEY", "Content-Type": "application/json"}${
    hasBody ? `\npayload = ${json}\n\nresp = requests.${method.toLowerCase()}(url, headers=headers, json=payload)` : `\n\nresp = requests.${method.toLowerCase()}(url, headers=headers)`
  }\nprint(resp.json())`;

  const js = `const res = await fetch("${url}", {\n  method: "${method}",\n  headers: {\n    "Authorization": "Bearer YOUR_API_KEY",\n    "Content-Type": "application/json"\n  }${hasBody ? `,\n  body: JSON.stringify(${json})` : ""}\n});\nconst data = await res.json();\nconsole.log(data);`;

  const ts = js;

  const php = `<?php\n$ch = curl_init("${url}");\ncurl_setopt($ch, CURLOPT_CUSTOMREQUEST, "${method}");\ncurl_setopt($ch, CURLOPT_HTTPHEADER, [\n  "Authorization: Bearer YOUR_API_KEY",\n  "Content-Type: application/json"\n]);${hasBody ? `\ncurl_setopt($ch, CURLOPT_POSTFIELDS, '${json}');` : ""}\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\n$response = curl_exec($ch);\ncurl_close($ch);\necho $response;`;

  const ruby = `require 'net/http'\nrequire 'json'\n\nuri = URI("${url}")\nreq = Net::HTTP::${method[0]}${method.slice(1).toLowerCase()}.new(uri)\nreq["Authorization"] = "Bearer YOUR_API_KEY"\nreq["Content-Type"] = "application/json"${hasBody ? `\nreq.body = ${json}.to_json` : ""}\nres = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) { |http| http.request(req) }\nputs res.body`;

  const go = `package main\n\nimport (\n  "bytes"\n  "fmt"\n  "io"\n  "net/http"\n)\n\nfunc main() {\n  ${hasBody ? `payload := []byte(\`${json}\`)\n  ` : ""}req, _ := http.NewRequest("${method}", "${url}", ${hasBody ? "bytes.NewBuffer(payload)" : "nil"})\n  req.Header.Set("Authorization", "Bearer YOUR_API_KEY")\n  req.Header.Set("Content-Type", "application/json")\n  resp, _ := http.DefaultClient.Do(req)\n  defer resp.Body.Close()\n  body, _ := io.ReadAll(resp.Body)\n  fmt.Println(string(body))\n}`;

  const csharp = `using System.Net.Http;\nusing System.Text;\n\nvar client = new HttpClient();\nvar req = new HttpRequestMessage(HttpMethod.${method[0]}${method.slice(1).toLowerCase()}, "${url}");\nreq.Headers.Add("Authorization", "Bearer YOUR_API_KEY");${hasBody ? `\nreq.Content = new StringContent(@"${json.replace(/"/g, '""')}", Encoding.UTF8, "application/json");` : ""}\nvar resp = await client.SendAsync(req);\nvar body = await resp.Content.ReadAsStringAsync();\nConsole.WriteLine(body);`;

  const java = `OkHttpClient client = new OkHttpClient();\n${hasBody ? `RequestBody body = RequestBody.create(MediaType.parse("application/json"), "${json.replace(/"/g, '\\"').replace(/\n/g, "\\n")}");\n` : ""}Request request = new Request.Builder()\n  .url("${url}")\n  .addHeader("Authorization", "Bearer YOUR_API_KEY")\n  .${method.toLowerCase()}(${hasBody ? "body" : ""})\n  .build();\nResponse response = client.newCall(request).execute();\nSystem.out.println(response.body().string());`;

  const swift = `var request = URLRequest(url: URL(string: "${url}")!)\nrequest.httpMethod = "${method}"\nrequest.addValue("Bearer YOUR_API_KEY", forHTTPHeaderField: "Authorization")\nrequest.addValue("application/json", forHTTPHeaderField: "Content-Type")${hasBody ? `\nrequest.httpBody = """\n${json}\n""".data(using: .utf8)` : ""}\nlet (data, _) = try await URLSession.shared.data(for: request)\nprint(String(data: data, encoding: .utf8) ?? "")`;

  const powershell = `$headers = @{\n  "Authorization" = "Bearer YOUR_API_KEY"\n  "Content-Type" = "application/json"\n}\n${hasBody ? `$body = '${json}'\nInvoke-RestMethod -Uri "${url}" -Method ${method} -Headers $headers -Body $body` : `Invoke-RestMethod -Uri "${url}" -Method ${method} -Headers $headers`}`;

  const rust = `use reqwest::Client;\n\n#[tokio::main]\nasync fn main() -> Result<(), Box<dyn std::error::Error>> {\n  let client = Client::new();\n  let resp = client.${method.toLowerCase()}("${url}")\n    .header("Authorization", "Bearer YOUR_API_KEY")${hasBody ? `\n    .json(&serde_json::json!(${json}))` : ""}\n    .send().await?\n    .text().await?;\n  println!("{}", resp);\n  Ok(())\n}`;

  return [
    { lang: "Bash", code: bash },
    { lang: "Python", code: python },
    { lang: "Javascript", code: js },
    { lang: "Php", code: php },
    { lang: "Ruby", code: ruby },
    { lang: "Go", code: go },
    { lang: "Csharp", code: csharp },
    { lang: "Java", code: java },
    { lang: "Swift", code: swift },
    { lang: "Powershell", code: powershell },
    { lang: "Typescript", code: ts },
    { lang: "Rust", code: rust },
  ];
}
