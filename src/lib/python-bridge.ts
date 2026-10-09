import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

/**
 * Talks to connectors/bridge.py over stdin/stdout (one JSON object per line).
 * The child stays alive between calls so a Garmin login can wait for its
 * verification code; it is restarted automatically if it exits.
 */

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../connectors/bridge.py');

interface Pending {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
  timer: NodeJS.Timeout;
}

export class PythonBridge {
  private child: ChildProcessWithoutNullStreams | undefined;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();

  constructor(
    private readonly python = process.env.PYTHON_BIN ?? 'python3',
    private readonly log: (msg: string) => void = () => {},
  ) {}

  private start(): ChildProcessWithoutNullStreams {
    if (this.child) return this.child;
    const child = spawn(this.python, ['-u', SCRIPT], { stdio: ['pipe', 'pipe', 'pipe'] });
    createInterface({ input: child.stdout }).on('line', (line) => {
      let msg: { id?: number; result?: unknown; error?: string };
      try {
        msg = JSON.parse(line);
      } catch {
        return;
      }
      const p = msg.id === undefined ? undefined : this.pending.get(msg.id);
      if (!p) return;
      clearTimeout(p.timer);
      this.pending.delete(msg.id as number);
      if (msg.error !== undefined) p.reject(new Error(msg.error));
      else p.resolve(msg.result);
    });
    // Tracebacks go to the server log only; they can contain request details.
    createInterface({ input: child.stderr }).on('line', (line) => this.log(line));
    const fail = (err: Error) => {
      for (const [id, p] of this.pending) {
        clearTimeout(p.timer);
        p.reject(err);
        this.pending.delete(id);
      }
      this.child = undefined;
    };
    child.on('error', (err) =>
      fail(new Error(`Could not start the connector helper (${err.message}). Is Python 3 installed with connectors/requirements.txt?`)),
    );
    child.on('exit', (code) => fail(new Error(`Connector helper stopped (exit ${code ?? 'signal'})`)));
    this.child = child;
    return child;
  }

  call<T>(method: string, params: Record<string, unknown> = {}, timeoutMs = 120_000): Promise<T> {
    const child = this.start();
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Connector helper timed out on ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
      child.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
    });
  }

  stop(): void {
    this.child?.kill();
    this.child = undefined;
  }
}
