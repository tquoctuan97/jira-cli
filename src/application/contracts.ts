export type OutputFormat = "json" | "raw" | "markdown" | "text";

export type GlobalOptions = {
  config?: string;
  output: OutputFormat;
  outputFile?: string;
  timeout?: number;
  quiet: boolean;
  verbose: boolean;
};

export type CommandResult = {
  value: unknown;
  /** The command consumed --output-file for binary output. */
  outputFileHandled?: boolean;
};

export type Session = {
  baseUrl: string;
  account: string;
  displayName?: string;
  credentialKey: string;
};
