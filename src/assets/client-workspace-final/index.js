import part00 from './00.b64?raw'
import part01 from './01.b64?raw'
import part02 from './02.b64?raw'
import part03 from './03.b64?raw'
import part04 from './04.b64?raw'
import part05 from './05.b64?raw'
import part06a from './06a.b64?raw'
import part06b0 from './06b0.b64?raw'
import part06b1 from './06b1.b64?raw'
import part06b2 from './06b2.b64?raw'
import part06b3 from './06b3.b64?raw'
import part06b4 from './06b4.b64?raw'

const payload = [
  part00, part01, part02, part03, part04, part05,
  part06a, part06b0, part06b1, part06b2, part06b3, part06b4
].join('').replace(/\s+/g, '')

export default 'data:image/webp;base64,' + payload
