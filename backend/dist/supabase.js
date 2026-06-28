"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseForUser = exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key)
    throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en .env');
// Admin client — bypasses RLS (only used in backend, never exposed to frontend)
exports.supabase = (0, supabase_js_1.createClient)(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
});
// Create a client scoped to a specific user JWT (respects RLS)
const supabaseForUser = (jwt) => (0, supabase_js_1.createClient)(url, process.env.SUPABASE_ANON_KEY || key, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { autoRefreshToken: false, persistSession: false }
});
exports.supabaseForUser = supabaseForUser;
