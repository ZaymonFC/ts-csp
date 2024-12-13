const timestamp = (): string => {
  return new Date().toISOString().split("T")[1].split(".")[0];
};

export const log = (color: string, action: string, message: string): void => {
  console.log(`${color}[${timestamp()}] ${action.padEnd(8)} ${message}\x1b[0m`);
};

export const COLORS = {
  CYAN: "\x1b[36m",
  MAGENTA: "\x1b[35m",
} as const;
