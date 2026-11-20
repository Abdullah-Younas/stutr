// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { makeStore } from './lib/store'
import { sanitize } from './lib/settings'

describe('version history (browser storage)', () => {
  beforeEach(() => localStorage.clear())
  it('keeps a new version only when the circuit changed, newest first', async () => {
    const s = makeStore(null)
    await s.saveProject('Adder', 'a = input(1)')
    await s.saveProject('Adder', 'a = input(1)') // unchanged: no new version
    await s.saveProject('Adder', 'a = input(0)')
    const v = await s.listVersions('Adder')
    expect(v.map((x) => x.code)).toEqual(['a = input(0)', 'a = input(1)'])
  })
  it('keeps only the last 20, and deleting a project deletes its history', async () => {
    const s = makeStore(null)
    for (let i = 0; i < 25; i++) await s.saveProject('P', `a = input(${i % 2})\n# ${i}`)
    expect((await s.listVersions('P')).length).toBe(20)
    await s.deleteProject('P')
    expect(await s.listVersions('P')).toEqual([])
  })
  it('only knows the real themes', () => {
    expect(sanitize({ theme: 'terminal' }).theme).toBe('terminal')
    expect(sanitize({ theme: '<script>' }).theme).toBe('midnight')
  })
})
