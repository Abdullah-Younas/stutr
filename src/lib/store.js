// One interface, two backends: Supabase when someone is signed in, this browser's localStorage otherwise.
import { supabase } from './supabase'

const PROJECTS = 'stutr-projects'
const DRAFT = 'stutr-draft'
const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback } catch { return fallback } }
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v))
const check = ({ error, data }) => { if (error) throw error; return data }

const local = () => ({
  cloud: false,
  async listProjects() {
    return read(PROJECTS, []).map((p) => ({ id: p.name, name: p.name, code: p.code, updated_at: new Date(p.saved).toISOString() }))
  },
  async saveProject(name, code) {
    write(PROJECTS, [{ name, code, saved: Date.now() }, ...read(PROJECTS, []).filter((p) => p.name !== name)])
  },
  async deleteProject(id) { write(PROJECTS, read(PROJECTS, []).filter((p) => p.name !== id)) },
  async loadState() { return { settings: null, draft: localStorage.getItem(DRAFT) } },
  async saveState(patch) { if (patch.draft != null) localStorage.setItem(DRAFT, patch.draft) },
  async exportAll() { return { projects: read(PROJECTS, []), draft: localStorage.getItem(DRAFT), settings: read('stutr-settings', null) } },
  async eraseAll() { [PROJECTS, DRAFT, 'stutr-settings'].forEach((k) => localStorage.removeItem(k)) },
})

const cloud = (user) => ({
  cloud: true,
  async listProjects() {
    return check(await supabase.from('projects').select('id,name,code,updated_at').order('updated_at', { ascending: false }))
  },
  async saveProject(name, code) {
    check(await supabase.from('projects').upsert({ user_id: user.id, name, code, updated_at: new Date().toISOString() }, { onConflict: 'user_id,name' }))
  },
  async deleteProject(id) { check(await supabase.from('projects').delete().eq('id', id)) },
  async loadState() {
    const row = check(await supabase.from('user_settings').select('settings,draft').maybeSingle())
    return { settings: row?.settings ?? null, draft: row?.draft ?? null }
  },
  async saveState(patch) {
    check(await supabase.from('user_settings').upsert({ user_id: user.id, ...patch, updated_at: new Date().toISOString() }))
  },
  async exportAll() {
    const [projects, state] = [await this.listProjects(), await this.loadState()]
    return { account: user.email, projects, ...state }
  },
  async eraseAll() {
    check(await supabase.from('projects').delete().eq('user_id', user.id))
    check(await supabase.from('user_settings').delete().eq('user_id', user.id))
  },
})

export const makeStore = (user) => (user && supabase ? cloud(user) : local())
