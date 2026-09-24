import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

// Serves `virtual:third-party-notices` — the /licenses page's data — parsed from
// public/third-party-notices.txt at build time, so regenerating that file is the only
// step needed to update the page.
//
// That file lists name, version and license only. The license bodies come from
// license-texts/, one canonical SPDX text per identifier. The build fails when the
// notices file stops parsing or names a license with no text here: add the file from
// https://github.com/spdx/license-list-data/tree/main/text rather than let a package
// render without its license.

const VIRTUAL_ID = 'virtual:third-party-notices'
const RESOLVED_ID = '\0' + VIRTUAL_ID

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

export interface NoticePackage {
  name: string
  version: string
  license: string
  licenseIds: string[]
}

export interface NoticeSection {
  title: string
  packages: NoticePackage[]
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

function parseNotices(raw: string) {
  const lines = raw.split(/\r?\n/)
  const generated = raw.match(/^Last generated: (\S+)/m)?.[1]
  if (!generated) throw new Error('no "Last generated:" line')

  const sections: (NoticeSection & { expected: number })[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const heading = /^\d+\.\s+(.+)$/.exec(line)
    if (heading && lines[i - 1]?.startsWith('====')) {
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
    if (pkg) {
      section.packages.push({
        name: pkg[1],
        version: pkg[2],
        license: pkg[3],
        licenseIds: licenseIds(pkg[3]),
      })
    }
  }

  if (sections.length === 0) throw new Error('no numbered sections found')
  for (const { title, packages, expected } of sections) {
    if (packages.length !== expected) {
      throw new Error(`"${title}" declares ${expected} components but ${packages.length} parsed`)
    }
  }
  return { generated, sections: sections.map(({ title, packages }) => ({ title, packages })) }
}

export function thirdPartyNotices(): Plugin {
  return {
    name: 'third-party-notices',
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined
    },
    load(id) {
      if (id !== RESOLVED_ID) return
      this.addWatchFile(NOTICES_PATH)

      let parsed
      try {
        parsed = parseNotices(fs.readFileSync(NOTICES_PATH, 'utf8'))
      } catch (err) {
        throw new Error(`third-party-notices.txt: ${(err as Error).message}`, { cause: err })
      }

      const texts: Record<string, string> = {}
      for (const { packages } of parsed.sections) {
        for (const pkg of packages) {
          for (const id of pkg.licenseIds) {
            if (id in texts) continue
            const file = path.join(TEXTS_DIR, `${id}.txt`)
            if (!fs.existsSync(file)) {
              throw new Error(
                `third-party-notices.txt: ${pkg.name}@${pkg.version} is ${pkg.license}, ` +
                  `but build-plugins/license-texts/${id}.txt does not exist`,
              )
            }
            this.addWatchFile(file)
            texts[id] = fs.readFileSync(file, 'utf8').trim()
          }
        }
      }

      return `export default ${JSON.stringify({ ...parsed, texts })}`
    },
  }
}
