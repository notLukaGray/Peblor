import { spawn } from "child_process";
import { devApiDisabledResponse, isDevApiEnabled } from "@/core/lib/dev-api-enabled";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DialogRequest = {
  mode?: unknown;
};

type SpawnResult = { stdout: string; stderr: string; code: number };

function runSpawn(command: string, args: string[]): Promise<SpawnResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      resolve({ stdout: "", stderr: error.message, code: 1 });
    });
    child.on("close", (code) => {
      resolve({ stdout, stderr, code: code ?? 1 });
    });
  });
}

async function pickPathMac(mode: "file" | "folder"): Promise<SpawnResult> {
  const script =
    mode === "file"
      ? 'POSIX path of (choose file with prompt "Select source video")'
      : 'POSIX path of (choose folder with prompt "Select HLS output folder")';
  return runSpawn("osascript", ["-e", script]);
}

async function pickPathLinux(mode: "file" | "folder"): Promise<SpawnResult> {
  const args: string[] = ["--file-selection", "--title"];
  if (mode === "folder") {
    args.push("Select HLS output folder", "--directory");
  } else {
    args.push("Select source video");
  }
  return runSpawn("zenity", args);
}

export async function POST(request: Request) {
  if (!isDevApiEnabled()) {
    return devApiDisabledResponse();
  }

  let body: DialogRequest;
  try {
    body = (await request.json()) as DialogRequest;
  } catch (err) {
    console.warn("[studio] Failed to parse dialog request JSON", err);
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const mode = body.mode === "folder" ? "folder" : body.mode === "file" ? "file" : null;
  if (!mode) {
    return Response.json({ error: "Dialog mode must be file or folder." }, { status: 400 });
  }

  const platform = process.platform;
  let result: SpawnResult;

  if (platform === "darwin") {
    result = await pickPathMac(mode);
  } else if (platform === "linux") {
    result = await pickPathLinux(mode);
  } else {
    return Response.json(
      {
        error:
          "Native path picker is not available on this platform. Use the file browser instead.",
      },
      { status: 400 }
    );
  }

  if (result.code === 0 && result.stdout.trim()) {
    return Response.json({ path: result.stdout.trim() });
  }

  if (result.stderr.includes("-128") || result.code === 1) {
    return Response.json({ cancelled: true });
  }

  return Response.json({ error: result.stderr.trim() || "Dialog failed." }, { status: 500 });
}
