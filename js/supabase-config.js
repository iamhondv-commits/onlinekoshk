/* ==========================================================================
   أونلاين كشك - Supabase Main Configuration File
   ========================================================================== */

const SUPABASE_URL = "https://wofwzvnoedgroouzhkzw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZnd6dm5vZWRncm9vdXpoa3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2Mjk1MTYsImV4cCI6MjEwMDIwNTUxNn0.m0s0S7UYDb7aWlK6qVlUFfdpfItuPjIkKoeQKkzwNj4";

// إنشاء العميل العام المربوط بقاعدة البيانات
var supabaseClient = null;

if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("✅ Supabase Client Initialized Successfully!");
} else {
    console.error("⚠️ Supabase JS SDK is missing. Make sure to include the CDN script.");
}