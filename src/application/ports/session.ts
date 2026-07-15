import type { Session } from "../contracts.js";

export interface CredentialStore {
  save(key: string, secret: string): Promise<void>;
  load(key: string): Promise<string>;
  delete(key: string): Promise<void>;
}

export interface SessionRepository {
  load(): Promise<Session>;
  save(session: Session): Promise<void>;
  delete(): Promise<void>;
}
