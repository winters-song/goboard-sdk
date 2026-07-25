import EventEmitter from 'events'

interface IPlay {
  name: string
  buffer?: AudioBuffer | null
  when?: number
  offset?: number
  duration?: number
  volume?: number
  loop?: boolean
  override?: boolean
}

interface IUserPlay {
  name: string
  when?: number
  offset?: number
  duration?: number
  volume?: number
  loop?: boolean
}

const WebAudioContext = window.AudioContext || window.webkitAudioContext || function () {}

export default class Audio {
  static initialized = false
  static enabled = true

  // 缓存正在加载的文件列表
  static audiosLoading = new Set<string>()
  // 音乐buffer
  static audios = new Map<string, AudioBuffer>()
  // 待播放列表
  static events = new Map<string, (...args: any[]) => void>()
  // 播放中列表
  static audiosPlaying = new Map<string, AudioBufferSourceNode>()

  static emitter = new EventEmitter()

  private static context = new WebAudioContext()

  static init() {
    if (this.initialized) {
      return
    }

    this.unlock()

    this.initialized = true
  }

  static unlock() {
    const unlockWebAudio = () => {
      if (this.context.state !== 'running') {
        this.context.resume()
      }
      document.body.removeEventListener('click', unlockWebAudio, true)
    }

    // unlock webaudio autoplay policy
    document.body.addEventListener('click', unlockWebAudio, true)
  }

  // 加载播放列表
  static loadEffects(map: Map<string, string>) {
    map.forEach((value, key) => {
      this.loadEffect(key, value)
    })
  }

  static async loadEffect(key: string, path: string) {
    // 已存在
    if (this.audios.get(key) || this.audiosLoading.has(key)) {
      return
    }
    this.audiosLoading.add(key)

    const effectRes = await fetch(path)
    const effectBuffer = await effectRes.arrayBuffer()

    this.context.decodeAudioData(
      effectBuffer,
      (data) => {
        this.audiosLoading.delete(key)
        this.audios.set(key, data)

        if (this.events.has(key)) {
          this.emitter.emit(key)
          this.events.delete(key)
          this.emitter.removeAllListeners(key)
        }
      },
      (e) => {
        // reject(e);
      },
    )
  }

  /**
   *  设置声音可用
   */
  static enable() {
    this.enabled = true
  }

  static disable() {
    this.enabled = false
  }

  /**
   *  播放声音
   * @param {String} name 文件名称
   */
  static play(name: string, when = 0, offset = 0, duration?: number, volume = 0.5) {
    if (!this.enabled) {
      return
    }
    if (this.audios.has(name)) {
      this.doPlay({
        buffer: this.audios.get(name),
        name,
        when,
        offset,
        duration,
        volume,
      })
    }
  }

  /**
   *  播放音效（默认音量 0.1）
   */
  static playEffect(
    name: string,
    when?: number,
    offset?: number,
    duration?: number,
    volume?: number,
  ) {
    this.play(name, when, offset, duration, volume || 0.2)
  }

  static doPlay({
    buffer = null,
    name,
    when,
    offset,
    duration,
    volume,
    loop = false,
    override = true,
  }: IPlay) {
    if (override && this.audiosPlaying.has(name)) {
      const sourceNode = this.audiosPlaying.get(name)
      if (sourceNode) {
        this.stop(sourceNode)
      }
    }
    // 调整播放音量
    const gainNode = this.context.createGain()
    // 默认为 1/2 的音量
    gainNode.gain.setValueAtTime(volume || 0.5, this.context.currentTime)
    gainNode.connect(this.context.destination)

    // this.gainNode.gain.setValueAtTime(volume || 0.5, this.context.currentTime);
    const sourceNode = this.context.createBufferSource()
    sourceNode.buffer = buffer
    sourceNode.loop = loop || false
    sourceNode.connect(gainNode)

    this.audiosPlaying.set(name, sourceNode)

    sourceNode.start(when, offset, duration)
    sourceNode.onended = () => {
      // 结束播放，清除
      this.stopByName(name)
    }
    return sourceNode
  }

  static playAsnyc(cfg: IUserPlay, cb?: (audio: AudioBufferSourceNode) => void) {
    if (!this.enabled) {
      return
    }
    if (this.audios.has(cfg.name)) {
      const audio = this.doPlay({ ...cfg, buffer: this.audios.get(cfg.name) })
      cb && cb(audio)
    } else if (this.audiosLoading.has(cfg.name)) {
      const event = () => {
        const audio = this.doPlay({ ...cfg, buffer: this.audios.get(cfg.name) })
        cb && cb(audio)
      }
      this.events.set(cfg.name, event)
      this.emitter.once(cfg.name, event)
    }
  }

  static stop(sourceNode: AudioBufferSourceNode) {
    if (sourceNode) {
      try {
        sourceNode.stop()
        sourceNode.disconnect()
      } catch (e) {}
    }
  }

  static stopByName(key: string) {
    if (this.audiosPlaying.has(key)) {
      const sourceNode = this.audiosPlaying.get(key)
      if (sourceNode) {
        this.stop(sourceNode)
      }
      this.audiosPlaying.delete(key)
    }
  }

  static remove(key: string) {
    this.stopByName(key)

    if (this.audios.has(key)) {
      this.audios.delete(key)
    }
    if (this.events.has(key)) {
      this.events.delete(key)
      this.emitter.removeAllListeners(key)
    }

    if (this.audiosLoading.has(key)) {
      this.audiosLoading.delete(key)
    }
  }
}
