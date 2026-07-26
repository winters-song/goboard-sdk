import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

const ASSET_RE = /\.(?:mp3|png)(?:\?.*)?$/i

/**
 * Vite library mode always inlines assets as base64.
 * Emit mp3/png as real files under dist/assets and keep URL exports instead.
 */
export function emitLibAssets(): Plugin {
  return {
    name: 'emit-lib-assets',
    enforce: 'pre',
    apply: 'build',
    load(id) {
      const filePath = id.split('?')[0]
      if (!ASSET_RE.test(filePath)) {
        return null
      }
      if (!filePath.includes(`${path.sep}assets${path.sep}`)) {
        return null
      }
      if (!fs.existsSync(filePath)) {
        return null
      }

      const source = fs.readFileSync(filePath)
      const fileName = `assets/${path.basename(filePath)}`
      const referenceId = this.emitFile({
        type: 'asset',
        fileName,
        source,
      })
      return `export default import.meta.ROLLUP_FILE_URL_${referenceId};`
    },
  }
}
