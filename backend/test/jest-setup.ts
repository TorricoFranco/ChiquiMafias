import { File } from 'buffer'

if (typeof global.File === 'undefined') {
  global.File = File as any
}
