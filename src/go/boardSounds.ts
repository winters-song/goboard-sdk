import playForbidden from '../assets/sound/playForbidden.mp3'
import stone1 from '../assets/sound/stone1.mp3'
import stone2 from '../assets/sound/stone2.mp3'
import stone3 from '../assets/sound/stone3.mp3'
import stone4 from '../assets/sound/stone4.mp3'
import stone5 from '../assets/sound/stone5.mp3'
import eat1 from '../assets/sound/eat1.mp3'
import eat2 from '../assets/sound/eat2.mp3'

/** 音效 URL；由动态 import 拉取，避免进入首屏主包解析路径 */
export const SOUND_URLS: Record<string, string> = {
  playForbidden,
  stone1,
  stone2,
  stone3,
  stone4,
  stone5,
  eat1,
  eat2,
}
