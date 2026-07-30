import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listClasses from "./tools/list-classes";
import listCalendarEvents from "./tools/list-calendar-events";
import listTimetable from "./tools/list-timetable";
import createCalendarEvent from "./tools/create-calendar-event";

// The OAuth issuer must be the direct Supabase host; the project ref is the
// only value that survives publish unchanged.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "noble-smart-voice",
  title: "Noble Smart Voice",
  version: "0.1.0",
  instructions:
    "Tools for Noble Smart Voice's School Dashboard. Read the academic calendar, class list and timetable, and add new calendar events. Callers must be signed in.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listClasses, listCalendarEvents, listTimetable, createCalendarEvent],
});
