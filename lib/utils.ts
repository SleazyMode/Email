export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function formatDate(value?: Date | string | null) {
  if (!value) {
    return "Not recorded";
  }

  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function titleCase(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getAppUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

export function getSessionCookieName() {
  return process.env.SESSION_COOKIE_NAME ?? "municipal_notice_session";
}

export function addHours(value: Date, hours: number) {
  return new Date(value.getTime() + hours * 60 * 60 * 1000);
}
