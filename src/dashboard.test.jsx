// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthLayout } from './lib/auth'
import Dashboard from './Dashboard'

const mount = () => render(
  <MemoryRouter initialEntries={['/']}>
    <Routes><Route element={<AuthLayout />}><Route path="/" element={<Dashboard />} /></Route></Routes>
  </MemoryRouter>,
)
const q = (sel) => document.querySelectorAll(sel)
const key = (k, extra = {}) => fireEvent.keyDown(window, { key: k, ...extra })

beforeEach(() => { localStorage.clear(); sessionStorage.clear() })
afterEach(cleanup)

describe('editor', () => {
  it('shows the demo circuit and a code view without coordinates', () => {
    mount()
    expect(q('.part').length).toBe(6)
    expect(q('.wirehit').length).toBe(5)
    expect(document.querySelector('textarea').value).not.toContain('@')
  })

  it('holding D and clicking a wire deletes it, and releasing D stops erasing', () => {
    mount()
    key('d')
    expect(q('.circuit.erasing').length).toBe(1)
    fireEvent.pointerDown(q('.wirehit')[0])
    expect(q('.wirehit').length).toBe(4)
    fireEvent.keyUp(window, { key: 'd' })
    expect(q('.circuit.erasing').length).toBe(0)
    fireEvent.pointerDown(q('.wirehit')[0]) // not holding D: nothing happens
    expect(q('.wirehit').length).toBe(4)
  })

  it('undo and redo bring the wire back and take it away again', () => {
    mount()
    key('d'); fireEvent.pointerDown(q('.wirehit')[0]); fireEvent.keyUp(window, { key: 'd' })
    expect(q('.wirehit').length).toBe(4)
    key('z', { ctrlKey: true })
    expect(q('.wirehit').length).toBe(5)
    key('y', { ctrlKey: true })
    expect(q('.wirehit').length).toBe(4)
    key('z', { ctrlKey: true })
    key('z', { ctrlKey: true, shiftKey: true })
    expect(q('.wirehit').length).toBe(4)
  })

  it('the Undo and Redo buttons follow the history', () => {
    mount()
    const undo = screen.getByRole('button', { name: /^Undo/ })
    expect(undo.disabled).toBe(true)
    key('d'); fireEvent.pointerDown(q('.wirehit')[0]); fireEvent.keyUp(window, { key: 'd' })
    expect(undo.disabled).toBe(false)
    fireEvent.click(undo)
    expect(q('.wirehit').length).toBe(5)
    expect(screen.getByRole('button', { name: /^Redo/ }).disabled).toBe(false)
  })

  it('single-key shortcuts switch tools (X erases, P pokes) and Erase removes a part', () => {
    mount()
    key('x')
    expect(q('.circuit.tool-erase').length).toBe(1)
    fireEvent.pointerDown(q('.part')[0])
    expect(q('.part').length).toBe(5)
    key('p')
    expect(q('.circuit.tool-poke').length).toBe(1)
  })

  it('wiring is no longer a tool', () => {
    mount()
    expect(screen.queryByRole('button', { name: /^Wire/ })).toBeNull()
  })

  it('editing the code changes the canvas, and undo restores it', () => {
    mount()
    const area = document.querySelector('textarea')
    fireEvent.change(area, { target: { value: 'A = input(1)\nY = output(A)' } })
    expect(q('.part').length).toBe(2)
    key('z', { ctrlKey: true })
    expect(q('.part').length).toBe(6)
  })
})

describe('settings', () => {
  const open = () => fireEvent.click(screen.getByRole('button', { name: /Settings/ }))

  it('hides the grid and part names when switched off, and remembers the choice', () => {
    mount()
    expect(document.querySelector('rect[fill="url(#dots)"]')).not.toBeNull()
    open()
    const dialog = screen.getByRole('dialog', { name: 'Settings' })
    fireEvent.click(within(dialog).getByLabelText(/Show grid dots/))
    fireEvent.click(within(dialog).getByLabelText(/Show part names/))
    expect(document.querySelector('rect[fill="url(#dots)"]')).toBeNull()
    expect(q('.lbl').length).toBe(0)
    expect(JSON.parse(localStorage.getItem('stutr-settings'))).toMatchObject({ grid: false, names: false })
  })

  it('straight wires change the wire shape', () => {
    mount()
    const before = q('.wire')[0].getAttribute('d')
    open()
    fireEvent.change(screen.getByLabelText(/Wire style/), { target: { value: 'straight' } })
    expect(q('.wire')[0].getAttribute('d')).not.toBe(before)
    expect(q('.wire')[0].getAttribute('d')).toContain('L')
  })

  it('lists the shortcuts, including hold D', () => {
    mount()
    open()
    expect(screen.getByText('Hold D')).toBeTruthy()
  })
})

describe('menu, projects and new circuit', () => {
  it('saves a project in this browser when not signed in, then opens it again', async () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: /Projects/ }))
    const dialog = screen.getByRole('dialog', { name: 'Projects' })
    fireEvent.change(within(dialog).getByLabelText('Project name'), { target: { value: 'My demo' } })
    fireEvent.submit(within(dialog).getByLabelText('Project name').closest('form'))
    expect(await within(dialog).findByText('My demo')).toBeTruthy()
    expect(JSON.parse(localStorage.getItem('stutr-projects'))[0].name).toBe('My demo')
  })

  it('Create asks first and can be undone', () => {
    const ask = vi.spyOn(window, 'confirm').mockReturnValue(true)
    mount()
    fireEvent.click(screen.getByRole('button', { name: /Create/ }))
    expect(ask).toHaveBeenCalled()
    expect(q('.part').length).toBe(0)
    key('z', { ctrlKey: true })
    expect(q('.part').length).toBe(6)
  })

  it('the Examples panel opens the Mini CPU', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: /Examples/ }))
    const dialog = screen.getByRole('dialog', { name: 'Examples' })
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Open' })[0])
    expect(q('.part').length).toBeGreaterThan(30)
  })
})
