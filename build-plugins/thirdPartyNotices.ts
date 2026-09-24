import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

// Serves the /licenses page's data, parsed from public/third-party-notices.txt at build
// time, so regenerating that file (scripts/generate-third-party-notices.mjs) is the only
// step needed to update the page:
//
//   virtual:third-party-notices        the component lists, small, loaded with the page
//   virtual:third-party-notices/texts  every license text, deduplicated; the page imports
//                                      it the first time a component is opened
//
// A component's text is the license file it ships, from section 3 of the notices file.
// Only a component with no such file (and every backend one — section 2 has no texts)
// falls back to the canonical SPDX text in license-texts/, and the page labels it as a
// standard text. The build fails when the notices file stops parsing, or a component
// without a file names a license with no SPDX text here: add the file from
// https://github.com/spdx/license-list-data/tree/main/text rather than let a package
// render without its license.

const VIRTUAL_ID = 'virtual:third-party-notices'
const TEXTS_ID = 'virtual:third-party-notices/texts'
const RESOLVED = '\0'

const NOTICES_PATH = path.resolve(__dirname, '../public/third-party-notices.txt')
const TEXTS_DIR = path.resolve(__dirname, 'license-texts')

// Declarations that are not SPDX identifiers, mapped to the one they mean.
const ALIASES: Record<string, string> = {
  'Apache 2.0': 'Apache-2.0',
}

// LGPL-3.0's SPDX text already carries the GPL-3.0 text it amends.
const TEXT_FOR: Record<string, string> = {
  'LGPL-3.0-or-later': 'LGPL-3.0-only',
}

interface ListedPackage {
  name: string
  version: string
  license: string
}

/** Where a license body comes from: a file the package ships, or a standard SPDX text. */
interface TextRef {
  /** The file name, e.g. "LICENSE", or the SPDX identifier for a standard text. */
  label: string
  standard: boolean
  /** Index into the texts module's array. */
  text: number
}

/** The identifiers a license expression names, e.g. "(MIT AND Zlib)" -> MIT, Zlib. */
function licenseIds(expression: string): string[] {
  // "BSD-3-Clause (chosen from BSD-3-Clause OR GPL-2.0)" — only the chosen one applies.
  const chosen = expression.replace(/\s*\(chosen from .*\)$/, '')
  const normalised = ALIASES[chosen] ?? chosen
  const ids = normalised
    .replace(/[()]/g, ' ')
    .split(/\s+/)
    .filter((token) => token && !['AND', 'OR', 'WITH'].includes(token))
    .map((id) => TEXT_FOR[id] ?? id)
  return [...new Set(ids)]
}

// Section 3's blocks: "----- BEGIN <name>@<version> <file> -----", a "License:" line, a
// blank line, the text, then "----- END <name>@<version> -----".
const TEXT_BLOCK = /^----- BEGIN (\S+) (\S+) -----\nLicense: .*\n\n([\s\S]*?)\n----- END \1 -----$/gm

function parseNotices(raw: string) {
  raw = raw.replace(/\r\n?/g, '\n')
  const lines = raw.split('\n')
  const generated = raw.match(/^Last generated: (\S+)/m)?.[1]
  if (!generated) throw new Error('no "Last generated:" line')

  const files = new Map<string, { file: string; text: string }[]>()
  for (const [, key, file, text] of raw.matchAll(TEXT_BLOCK)) {
    files.set(key, [...(files.get(key) ?? []), { file, text }])
  }
  const blocks = raw.match(/^----- BEGIN /gm)?.length ?? 0
  const parsedBlocks = [...files.values()].reduce((n, list) => n + list.length, 0)
  if (blocks !== parsedBlocks) throw new Error(`${blocks} license text blocks but ${parsedBlocks} parsed`)

  const sections: { title: string; packages: ListedPackage[]; expected: number }[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const heading = /^\d+\.\s+(.+)$/.exec(line)
    if (heading && lines[i - 1]?.startsWith('====')) {
      // The texts section holds license bodies, not a component list.
      if (heading[1].startsWith('LICENSE TEXTS')) break
      sections.push({ title: heading[1].trim(), packages: [], expected: NaN })
      continue
    }
    const section = sections.at(-1)
    if (!section) continue
    const count = /^(\d+) components\./.exec(line)
    if (count) {
      section.expected = Number(count[1])
      continue
    }
    // "  @babel/core@7.29.0      MIT" — the greedy name keeps a scope's leading "@".
    const pkg = /^ {2}(\S+)@(\S+)\s{2,}(\S.*?)\s*$/.exec(line)
    if (pkg) section.packages.push({ name: pkg[1], version: pkg[2], license: pkg[3] })
  }

  if (sections.length === 0) throw new Error('no numbered sections found')
  for (const { title, packages, expected } of sections) {
    if (packages.length !== expected) {
      throw new Error(`"${title}" declares ${expected} components but ${packages.length} parsed`)
    }
  }
  const listed = new Set(sections.flatMap(({ packages }) => packages.map((p) => `${p.name}@${p.version}`)))
  for (const key of files.keys()) {
    if (!listed.has(key)) throw new Error(`section 3 has a text for ${key}, which no section lists`)
  }
  return { generated, sections, files }
}

function build(addWatchFile: (file: string) => void) {
  addWatchFile(NOTICES_PATH)
  let parsed
  try {
    parsed = parseNotices(fs.readFileSync(NOTICES_PATH, 'utf8'))
  } catch (err) {
    throw new Error(`third-party-notices.txt: ${(err as Error).message}`, { cause: err })
  }

  // Many packages ship byte-identical files; each distinct text is sent once.
  const texts: string[] = []
  const indexOf = new Map<string, number>()
  const intern = (text: string) => {
    if (!indexOf.has(text)) indexOf.set(text, texts.push(text) - 1)
    return indexOf.get(text)!
  }

  const sections = parsed.sections.map(({ title, packages }) => ({
    title,
    packages: packages.map((pkg) => {
      const shipped = parsed.files.get(`${pkg.name}@${pkg.version}`)
      const refs: TextRef[] = shipped
        ? shipped.map(({ file, text }) => ({ label: file, standard: false, text: intern(text) }))
        : licenseIds(pkg.license).map((id) => {
            const file = path.join(TEXTS_DIR, `${id}.txt`)
            if (!fs.existsSync(file)) {
              throw new Error(
                `third-party-notices.txt: ${pkg.name}@${pkg.version} ships no license file and is ` +
                  `${pkg.license}, but build-plugins/license-texts/${id}.txt does not exist`,
              )
            }
            addWatchFile(file)
            return { label: id, standard: true, text: intern(fs.readFileSync(file, 'utf8').trim()) }
          })
      return { ...pkg, texts: refs }
    }),
  }))

  return { index: { generated: parsed.generated, sections }, texts }
}

export function thirdPartyNotices(): Plugin {
  return {
    name: 'third-party-notices',
    resolveId(id) {
      return id === VIRTUAL_ID || id === TEXTS_ID ? RESOLVED + id : undefined
    },
    load(id) {
      if (id !== RESOLVED + VIRTUAL_ID && id !== RESOLVED + TEXTS_ID) return
      const { index, texts } = build((file) => this.addWatchFile(file))
      return `export default ${JSON.stringify(id === RESOLVED + VIRTUAL_ID ? index : texts)}`
    },
  }
}
