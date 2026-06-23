type AirbrakeContext = Record<string, string | number | boolean | null | undefined>;

type ErrorWithAirbrakeContext = Error & {
  airbrakeContext?: AirbrakeContext;
};

export function attachAirbrakeContext<T extends Error>(
  error: T,
  context: AirbrakeContext,
): T {
  const target = error as ErrorWithAirbrakeContext;
  target.airbrakeContext = {
    ...(target.airbrakeContext || {}),
    ...context,
  };

  return error;
}

export function getAirbrakeContext(error: unknown): AirbrakeContext | undefined {
  if (!(error instanceof Error)) {
    return undefined;
  }

  const context = (error as ErrorWithAirbrakeContext).airbrakeContext;
  return context && Object.keys(context).length ? context : undefined;
}
