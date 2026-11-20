// One interface, two backends: Supabase when someone is signed in, this browser's localStorage otherwise.
import { supabase } from './supabase'

const PROJECTS = 'stutr-projects'
const VERSIONS = 'stutr-versions'
const KEEP = 20 // versions kept per project
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
    const all = read(VERSIONS, {}), mine = all[name] || []
    if (mine[0]?.code !== code) write(VERSIONS, { ...all, [name]: [{ code, saved: Date.now() }, ...mine].slice(0, KEEP) })
  },
  async listVersions(name) { return (read(VERSIONS, {})[name] || []).map((v) => ({ id: String(v.saved), code: v.code, saved_at: new Date(v.saved).toISOString() })) },
  async deleteProject(id) {
    write(PROJECTS, read(PROJECTS, []).filter((p) => p.name !== id))
    const { [id]: gone, ...rest } = read(VERSIONS, {}) // eslint-disable-line no-unused-vars
    write(VERSIONS, rest)
  },
  async loadState() { return { settings: null, draft: localStorage.getItem(DRAFT) } },
  async saveState(patch) { if (patch.draft != null) localStorage.setItem(DRAFT, patch.draft) },
  async exportAll() { return { projects: read(PROJECTS, []), draft: localStorage.getItem(DRAFT), settings: read('stutr-settings', null) } },
  async eraseAll() { [PROJECTS, VERSIONS, DRAFT, 'stutr-settings'].forEach((k) => localStorage.removeItem(k)) },
})

const cloud = (user) => ({
  cloud: true,
  async listProjects() {
    return check(await supabase.from('projects').select('id,name,code,updated_at').order('updated_at', { ascending: false }))
  },
  async saveProject(name, code) {
    check(await supabase.from('projects').upsert({ user_id: user.id, name, code, updated_at: new Date().toISOString() }, { onConflict: 'user_id,name' }))
    try { // history is a bonus: if its table is missing, saving the project still works
      const last = (await supabase.from('project_versions').select('code').eq('project_name', name).order('saved_at', { ascending: false }).limit(1)).data?.[0]
      if (last?.code !== code) {
        await supabase.from('project_versions').insert({ user_id: user.id, project_name: name, code })
        const old = (await supabase.from('project_versions').select('id').eq('project_name', name).order('saved_at', { ascending: false }).range(KEEP, KEEP + 50)).data || []
        if (old.length) await supabase.from('project_versions').delete().in('id', old.map((v) => v.id))
      }
    } catch { /* ignore */ }
  },
  async listVersions(name) {
    const { data, error } = await supabase.from('project_versions').select('id,code,saved_at').eq('project_name', name).order('saved_at', { ascending: false }).limit(KEEP)
    return error ? [] : data
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
    await supabase.from('project_versions').delete().eq('user_id', user.id)
    check(await supabase.from('user_settings').delete().eq('user_id', user.id))
  },
})

export const makeStore = (user) => (user && supabase ? cloud(user) : local())
