export type CliResult = Record<string, unknown>;

export type CommandIo = {
  printText: (text: string) => void;
  printJson: (result: CliResult) => void;
  printErrorJson: (result: CliResult) => void;
  printErrorText: (text: string) => void;
  printUsage: () => void;
};
