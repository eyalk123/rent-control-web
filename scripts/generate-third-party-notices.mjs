// Regenerates the client part of public/third-party-notices.txt — the component list and
// the license text each component ships with — from the installed dependencies of this
// app and the mobile app (../rent-control). The backend section is carried over as it
// stands; it is generated separately (see the file's header).
//
//   node scripts/generate-third-party-notices.mjs
//
// Run `npm ci` in both repos first: the list is exactly what node_modules holds.
//
// A license text is only ever copied from a LICENSE / LICENCE / COPYING file inside the
// package. Packages without one are written to scripts/third-party-notices-missing.txt
// and get no text here; the /licenses page shows the standard SPDX text for them instead,
// marked as such (build-plugins/thirdPartyNotices.ts).

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPOS = [WEB, path.resolve(WEB, '../rent-control')]
const NOTICES = path.join(WEB, 'public/third-party-notices.txt')
const MISSING_REPORT = path.join(WEB, 'scripts/third-party-notices-missing.txt')
const LICENSE_CHECKER = 'license-checker-rseidelsohn@4.3.0'

const LICENSE_FILE = /^(licen[cs]e|copying)([.\-_].*)?$/i

// Dual-licensed packages where the choice is ours to record.
const CHOSEN = {
  'node-forge': 'BSD-3-Clause (chosen from BSD-3-Clause OR GPL-2.0)',
}

// Never published, whatever a license file says: the operator's own contact address.
const REDACT = [/eyalkook@gmail\.com/gi]

const RULE = '='.repeat(80)

function installed(repo) {
  const out = execFileSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['--yes', LICENSE_CHECKER, '--production', '--json'],
    { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: process.platform === 'win32' },
  )
  return JSON.parse(out)
}

function readText(file) {
  let text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  for (const re of REDACT) text = text.replace(re, '[redacted]')
  return text.replace(/[ \t]+$/gm, '').trim()
}

const components = new Map()
for (const repo of REPOS) {
  for (const [key, info] of Object.entries(installed(repo))) {
    if (info.private || components.has(key)) continue
    const at = key.lastIndexOf('@')
    const name = key.slice(0, at)
    const files = fs
      .readdirSync(info.path)
      .filter((f) => LICENSE_FILE.test(f) && fs.statSync(path.join(info.path, f)).isFile())
      .sort()
      .map((f) => ({ file: f, text: readText(path.join(info.path, f)) }))
      .filter(({ text }) => text)
    components.set(key, {
      key,
      name,
      version: key.slice(at + 1),
      license: CHOSEN[name] ?? String(info.licenses),
      files,
    })
  }
}
const byVersion = new Intl.Collator('en', { numeric: true })
const list = [...components.values()].sort(
  (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : byVersion.compare(a.version, b.version)),
)

for (const { key, files } of list) {
  for (const { text } of files) {
    if (/^-{5} (BEGIN|END) /m.test(text)) throw new Error(`${key}: license text contains a block marker`)
  }
}

// Section 1: the component list, in the format the backend section also uses.
const counts = new Map()
for (const { license } of list) counts.set(license, (counts.get(license) ?? 0) + 1)
const breakdown = [...counts]
  .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
  .map(([license, n]) => `  ${String(n).padStart(4)}  ${license}`)
const width = Math.max(...list.map(({ key }) => key.length)) + 1
const rows = list.map(({ key, license }) => `  ${key.padEnd(width)} ${license}`)

// Section 3: the text of every license file, verbatim apart from line endings.
const texts = list
  .filter(({ files }) => files.length)
  .flatMap(({ key, license, files }) =>
    files.map(({ file, text }) => [`----- BEGIN ${key} ${file} -----`, `License: ${license}`, '', text, `----- END ${key} -----`, ''].join('\n')),
  )
const missing = list.filter(({ files }) => files.length === 0)

const previous = fs.readFileSync(NOTICES, 'utf8').replace(/\r\n?/g, '\n')
const backend = /\n(={80}\n2\. BACKEND SERVICE\n[\s\S]*?)(?=\n={80}\n\d+\. |\s*$)/.exec(previous)?.[1]
if (!backend) throw new Error('could not find section 2 (BACKEND SERVICE) in the current file to carry over')

const today = new Date().toISOString().slice(0, 10)
const out = `RENTVANCE — THIRD-PARTY OPEN SOURCE NOTICES
Last generated: ${today}

RentVance is built on open source software. The components listed below are the
property of their respective authors and are used under the licenses named beside
them; they are not owned by the operator of the service.

Section 3 reproduces, for every client component that ships one, the license file
found in that component (LICENSE, LICENCE or COPYING), including its copyright
notice. ${missing.length} client components ship no license file; they are listed in section 1
under the license they declare and have no entry in section 3. All license texts are
also published at https://rentvance.app/licenses.

This list is generated from the installed dependencies, not maintained by hand.
To regenerate it:

  rent-control-web/     npm ci here and in ../rent-control, then:
                        node scripts/generate-third-party-notices.mjs
                        (rewrites sections 1 and 3; section 2 is carried over)
  rent-control-backend/ pip install -r requirements.txt in a clean virtualenv,
                        then: pip-licenses --from=mixed --format=plain
                        and paste the result into section 2 by hand

Legacy PyPI classifier strings ("MIT License", "Apache Software License") are
rewritten to their SPDX identifiers, and declarations that name no BSD variant are
resolved by reading the package's own LICENSE file.


${RULE}
1. CLIENT APPLICATIONS (web and mobile)
${RULE}
${list.length} components. License breakdown:

${breakdown.join('\n')}

${rows.join('\n')}

${backend.trimEnd()}


${RULE}
3. LICENSE TEXTS (client applications)
${RULE}

${texts.join('\n')}`

fs.writeFileSync(NOTICES, out.trimEnd() + '\n')

fs.writeFileSync(
  MISSING_REPORT,
  `Client components with no LICENSE, LICENCE or COPYING file — generated ${today} by
generate-third-party-notices.mjs. They have no entry in section 3 of
public/third-party-notices.txt, and /licenses shows the standard SPDX text for the license
they declare, marked as such. Nothing here was invented or copied from elsewhere.

${missing.length} components:

${missing.map(({ key, license }) => `  ${key.padEnd(width)} ${license}`).join('\n')}
`,
)

console.log(`${list.length} components, ${texts.length} license files, ${missing.length} without one`)
