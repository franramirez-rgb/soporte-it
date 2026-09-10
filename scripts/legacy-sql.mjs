import fs from 'node:fs/promises'

export async function readLegacyDump(filePath) {
  return fs.readFile(filePath, 'utf8')
}

function splitColumns(text) {
  const result = []
  let current = ''
  let inString = false
  let escaped = false
  for (const ch of text) {
    if (inString) {
      current += ch
      if (ch === "'" && !escaped) inString = false
      escaped = ch === '\\' && !escaped
      if (ch !== '\\') escaped = false
      continue
    }
    if (ch === "'") { inString = true; current += ch }
    else if (ch === ',') { result.push(current.trim().replace(/^`|`$/g, '')); current = '' }
    else current += ch
  }
  if (current.trim()) result.push(current.trim().replace(/^`|`$/g, ''))
  return result
}

function parseTuple(tuple) {
  const inner = tuple.slice(1, -1)
  const values = []
  let current = ''
  let inString = false
  let escaped = false
  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i]
    if (inString) {
      if (ch === "'" && !escaped) { inString = false; continue }
      if (ch === '\\' && !escaped) {
        const next = inner[i + 1]
        if (next === 'n') { current += '\n'; i += 1; continue }
        if (next === 'r') { current += '\r'; i += 1; continue }
        if (next === 't') { current += '\t'; i += 1; continue }
        if (next === "'") { current += "'"; i += 1; continue }
        if (next === '\\') { current += '\\'; i += 1; continue }
      }
      current += ch
      escaped = ch === '\\' && !escaped
      if (ch !== '\\') escaped = false
      continue
    }
    if (ch === "'") { inString = true; continue }
    if (ch === ',') { values.push(current.trim()); current = ''; continue }
    current += ch
  }
  values.push(current.trim())
  return values.map(value => value.toUpperCase() === 'NULL' ? null : value)
}

export function parseTableInsert(dump, table) {
  const pattern = 'INSERT INTO `'+table+'` \((.*?)\) VALUES\n([\s\S]*?);'
  const match = dump.match(new RegExp(pattern, 'm'))
  if (!match) return { columns: [], rows: [] }
  const columns = splitColumns(match[1])
  const body = match[2]
  const tuples = []
  let depth = 0
  let inString = false
  let escaped = false
  let start = -1
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i]
    if (inString) {
      if (ch === "'" && !escaped) inString = false
      escaped = ch === '\\' && !escaped
      if (ch !== '\\') escaped = false
      continue
    }
    if (ch === "'") { inString = true; continue }
    if (ch === '(') { if (depth === 0) start = i; depth += 1 }
    if (ch === ')') { depth -= 1; if (depth === 0 && start >= 0) tuples.push(body.slice(start, i + 1)) }
  }
  return { columns, rows: tuples.map(parseTuple) }
}

export function rowsAsObjects(columns, rows) {
  return rows.map(values => Object.fromEntries(columns.map((column, index) => [column, values[index] ?? null])))
}
