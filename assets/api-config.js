/* ============================================================
   Cancer in the Commonwealth — Server configuration
   ============================================================
   This is the ONE file your IT department needs to edit to turn
   on real sign-in against your own server.

   Set CIC_API_BASE_URL below to the base URL of your auth server
   (no trailing slash), for example:

     window.CIC_API_BASE_URL = "https://cancer-course-api.uky.edu";

   Leave it as an empty string to keep the site's current
   local-only behavior (no server, no real password check —
   sign-in just remembers a name on this device).

   Your server needs to implement two endpoints:
     POST {CIC_API_BASE_URL}/auth/register
     POST {CIC_API_BASE_URL}/auth/login

   The exact request/response format, error codes, required CORS
   headers, and security notes are all documented in
   API-CONTRACT.md at the root of this project. That file is the
   full spec — hand it to whoever is building the server.
   ============================================================ */

window.CIC_API_BASE_URL = "";
